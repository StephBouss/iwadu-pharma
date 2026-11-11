import 'server-only';
import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { distanceBand, librevilleNextDay } from '@/lib/entitlement-rules';
import { distanceMeters, nearest, type LatLng } from '@/lib/geo';
import { openingState, type WeeklyHours } from '@/lib/opening-hours';
import { productLabel, stockStatus, type StockStatus } from '@/lib/products';
import { prisma } from '@/lib/server/prisma';
import { track } from './analytics';
import {
  activePass,
  availableCredit,
  offeredUnlockAvailable,
  passState,
  previewAllowance,
} from './entitlements';
import { getSettings, need } from './settings';
import type { Viewer } from './viewer';

// Recherche d'une ordonnance.
//   • Aperçu gratuit (quota par appareil) : combien de pharmacies ont tout,
//     distance de la plus proche, fourchette et écart de prix plein — jamais
//     un nom.
//   • Débloqué (paiement confirmé par webhook, Pass, première ordonnance
//     offerte avec un compte, crédit) : noms, prix exacts, assurance,
//     itinéraire. Le lien du résultat, impossible à deviner, est valable le
//     temps du paramètre et se partage : il ne montre ni le titulaire du
//     compte, ni son assurance enregistrée.
// La position exacte n'est jamais stockée : seulement le quartier.

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface SearchItem {
  productId: string;
  quantity: number;
  /** Texte lu sur l'ordonnance par l'IA (null : saisi par le patient). */
  readText?: string | null;
  confidence?: number | null;
  corrected?: boolean;
}

interface StoredResult {
  pharmacyId: string;
  distanceMeters: number;
  found: string[];
}

export class SearchInputError extends Error {
  constructor(readonly code: 'UNKNOWN_PRODUCT' | 'EMPTY') {
    super(code);
  }
}

/** Pass Famille : nouvelle recherche refusée jusqu'au lendemain (usage raisonnable). */
export class SearchBlockedError extends Error {
  constructor(readonly until: Date) {
    super('DAILY_LIMIT');
  }
}

export type UnlockSource = 'PASS' | 'OFFERED' | 'CREDIT';

export class RedeemError extends Error {
  constructor(
    readonly code:
      | 'NOT_FOUND'
      | 'EXPIRED'
      | 'NO_RESULT'
      | 'ALREADY_UNLOCKED'
      | 'LOGIN_REQUIRED'
      | 'NO_PASS'
      | 'PASS_EXHAUSTED'
      | 'DAILY_LIMIT'
      | 'OFFER_USED'
      | 'NO_CREDIT',
    readonly status: number,
  ) {
    super(code);
  }
}

function linkHours(settings: Awaited<ReturnType<typeof getSettings>>): number {
  return need(settings, 'result.linkHours');
}

export async function createSearch(input: {
  items: SearchItem[];
  source: 'PHOTO' | 'MANUAL' | 'NAME' | 'RELAUNCH';
  position: LatLng;
  label: string | null;
  viewer: Viewer;
  deviceId: string;
}): Promise<{ token: string }> {
  const now = new Date();
  const settings = await getSettings();
  const radiusKm = need(settings, 'search.radiusKm');
  const hours = linkHours(settings);

  // Un même médicament saisi deux fois : quantités additionnées.
  const merged = new Map<string, SearchItem>();
  for (const it of input.items) {
    const prev = merged.get(it.productId);
    merged.set(it.productId, prev ? { ...prev, quantity: prev.quantity + it.quantity } : it);
  }
  const items = [...merged.values()];
  if (items.length === 0) throw new SearchInputError('EMPTY');

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    select: { id: true },
  });
  if (products.length !== items.length) throw new SearchInputError('UNKNOWN_PRODUCT');

  const userId = input.viewer.user?.id ?? null;
  const pass = userId ? await activePass(userId, now) : null;
  const passNow = pass ? await passState(pass, settings, now) : null;
  if (passNow?.block === 'DAILY_MAX') throw new SearchBlockedError(librevilleNextDay(now));

  const [pharmacies, districts] = await Promise.all([
    prisma.pharmacy.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        lat: true,
        lng: true,
        stocks: {
          where: { productId: { in: items.map((i) => i.productId) } },
          select: { productId: true, quantity: true },
        },
      },
    }),
    prisma.district.findMany({ select: { id: true, lat: true, lng: true } }),
  ]);

  const results: StoredResult[] = [];
  for (const p of pharmacies) {
    const d = distanceMeters(input.position, p);
    if (d > radiusKm * 1000) continue;
    const found = items
      .filter(
        (it) => (p.stocks.find((s) => s.productId === it.productId)?.quantity ?? 0) >= it.quantity,
      )
      .map((it) => it.productId);
    if (found.length > 0) results.push({ pharmacyId: p.id, distanceMeters: d, found });
  }
  const total = items.length;
  const ranked = [...results]
    .sort((a, b) => {
      const ca = a.found.length === total ? 0 : 1;
      const cb = b.found.length === total ? 0 : 1;
      return ca - cb || b.found.length - a.found.length || a.distanceMeters - b.distanceMeters;
    })
    .slice(0, 30);
  const completeCount = ranked.filter((r) => r.found.length === total).length;
  const hasResults = ranked.length > 0;

  // Comment s'ouvre ce résultat :
  //   Pass utilisable → débloqué (compte comme une recherche du Pass) ;
  //   sinon aperçu gratuit s'il en reste (un résultat vide ne coûte rien) ;
  //   sinon verrouillé : déblocage, Pass, offert ou crédit.
  const viaPass = Boolean(passNow?.allowed && hasResults);
  const preview = viaPass
    ? null
    : await previewAllowance({ ...input.viewer, deviceId: input.deviceId }, settings, now);
  const freePreview = !viaPass && hasResults && (preview?.remaining ?? 0) > 0;

  const districtId = nearest(input.position, districts)?.id ?? null;
  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(now.getTime() + hours * HOUR_MS);

  const session = await prisma.searchSession.create({
    data: {
      token,
      userId,
      deviceId: input.deviceId,
      items: items as unknown as Prisma.InputJsonValue,
      source: input.source,
      label: userId ? input.label : null,
      districtId,
      results: ranked as unknown as Prisma.InputJsonValue,
      completeCount,
      partialCount: ranked.length - completeCount,
      freePreview,
      unlockedAt: viaPass ? now : null,
      expiresAt,
    },
  });
  if (viaPass) {
    await prisma.unlock.create({
      data: { searchSessionId: session.id, userId, deviceId: input.deviceId, kind: 'PASS' },
    });
  }

  const ctx = { userId, deviceId: input.deviceId, districtId };
  await track('list_validated', ctx, { lines: items.length, source: input.source });
  if (freePreview || !hasResults)
    await track('free_result_shown', ctx, { complete: completeCount });
  return { token };
}

/**
 * Débloque une ordonnance sans paiement : Pass en cours, première
 * ordonnance offerte avec un compte, ou crédit « Trajet utile ». Verrou
 * consultatif par compte : deux demandes simultanées ne consomment qu'une fois.
 */
export async function redeemSearch(
  token: string,
  source: UnlockSource,
  viewer: Viewer,
): Promise<void> {
  const user = viewer.user;
  if (!user) throw new RedeemError('LOGIN_REQUIRED', 401);
  const settings = await getSettings();
  const hours = linkHours(settings);
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`redeem:${user.id}`}))`;
      const now = new Date();
      const session = await tx.searchSession.findUnique({ where: { token } });
      if (!session) throw new RedeemError('NOT_FOUND', 404);
      if (session.expiresAt <= now) throw new RedeemError('EXPIRED', 410);
      if (session.completeCount + session.partialCount === 0) {
        throw new RedeemError('NO_RESULT', 409);
      }
      if ((await tx.unlock.count({ where: { searchSessionId: session.id } })) > 0) {
        throw new RedeemError('ALREADY_UNLOCKED', 409);
      }
      let creditId: string | null = null;
      if (source === 'PASS') {
        const pass = await activePass(user.id, now, tx);
        if (!pass) throw new RedeemError('NO_PASS', 403);
        const state = await passState(pass, settings, now, tx);
        if (state.block === 'SOLO_EXHAUSTED') throw new RedeemError('PASS_EXHAUSTED', 403);
        if (state.block === 'DAILY_MAX') throw new RedeemError('DAILY_LIMIT', 429);
      } else if (source === 'OFFERED') {
        if (!(await offeredUnlockAvailable(user.id, settings, tx))) {
          throw new RedeemError('OFFER_USED', 403);
        }
      } else {
        const credit = await availableCredit(user.id, tx);
        if (!credit) throw new RedeemError('NO_CREDIT', 403);
        const used = await tx.credit.updateMany({
          where: { id: credit.id, usedAt: null },
          data: { usedAt: now, usedOnSessionId: session.id },
        });
        if (used.count !== 1) throw new RedeemError('NO_CREDIT', 403);
        creditId = credit.id;
      }
      await tx.unlock.create({
        data: {
          searchSessionId: session.id,
          userId: user.id,
          deviceId: viewer.deviceId,
          kind: source,
          creditId,
        },
      });
      await tx.searchSession.update({
        where: { id: session.id },
        data: {
          unlockedAt: now,
          expiresAt: new Date(now.getTime() + hours * HOUR_MS),
          userId: session.userId ?? user.id,
        },
      });
    },
    { isolationLevel: 'Serializable', timeout: 15_000 },
  );
  await track('result_unlocked', { userId: user.id, deviceId: viewer.deviceId }, { source });
}

// ─── Lecture d'un résultat ────────────────────────────────────────────────

export interface ResultMedicine {
  productId: string;
  label: string;
  quantity: number;
}

export interface ResultLine extends ResultMedicine {
  status: StockStatus;
  unitPriceFcfa: number | null;
}

export interface ResultPharmacy {
  slug: string;
  name: string;
  districtName: string | null;
  address: string | null;
  phone: string | null;
  lat: number;
  lng: number;
  distanceMeters: number;
  openingLabel: string;
  open: boolean;
  onDuty: boolean;
  found: number;
  lines: ResultLine[];
  stockUpdatedAt: string | null;
  stale: boolean;
  showPrices: boolean;
  /** Prix plein des médicaments disponibles ici (null : prix en pharmacie). */
  invoice: number | null;
  insurances: { id: string; name: string }[];
  /** Assurance du titulaire du compte acceptée ici (null : non connue). */
  acceptsViewerInsurance: boolean | null;
  isDemo: boolean;
}

export interface PreviewSummary {
  completeCount: number;
  partialCount: number;
  /** Meilleure couverture partielle : « 2 pharmacies en ont 2 sur 3 ». */
  bestPartial: { count: number; found: number } | null;
  nearestMeters: number | null;
  priceMin: number | null;
  priceMax: number | null;
  /** Tranche de distance de chaque pharmacie qui a tout, sans nom. */
  bands: string[];
  stockFrom: string | null;
  stockTo: string | null;
  hasDemo: boolean;
}

export type Access =
  | { kind: 'unlocked'; source: string }
  | { kind: 'preview' }
  | { kind: 'locked' };

export interface UnlockOptions {
  price: number | null;
  /** Pass en cours utilisable pour cette ordonnance. */
  pass: { plan: string; remaining: number | null } | null;
  passBlocked: 'SOLO_EXHAUSTED' | 'DAILY_MAX' | null;
  offered: boolean;
  credits: number;
}

export type SearchView =
  | { state: 'missing' }
  | { state: 'expired' }
  | {
      state: 'ready';
      token: string;
      createdAt: string;
      expiresAt: string;
      medicines: ResultMedicine[];
      access: Access;
      summary: PreviewSummary;
      /** Aperçus gratuits restants pour ce visiteur. */
      previewsLeft: number | null;
      options: UnlockOptions;
      pharmacies: ResultPharmacy[];
      isOwner: boolean;
      viewerInsurance: { id: string; name: string; rate: number | null } | null;
      label: string | null;
    };

export async function getSearchView(token: string, viewer: Viewer): Promise<SearchView> {
  const session = await prisma.searchSession.findUnique({
    where: { token },
    include: { unlocks: { orderBy: { createdAt: 'asc' }, take: 1 } },
  });
  if (!session) return { state: 'missing' };
  const now = new Date();
  if (session.expiresAt <= now) return { state: 'expired' };

  const settings = await getSettings();
  const items = session.items as unknown as SearchItem[];
  const stored = session.results as unknown as StoredResult[];
  const total = items.length;
  const unlock = session.unlocks[0] ?? null;
  const access: Access = unlock
    ? { kind: 'unlocked', source: unlock.kind }
    : session.freePreview || stored.length === 0
      ? { kind: 'preview' }
      : { kind: 'locked' };
  const isOwner = ownsSession(session, viewer);

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    select: { id: true, name: true, dosage: true },
  });
  const medicines: ResultMedicine[] = items.map((it) => {
    const p = products.find((x) => x.id === it.productId);
    return {
      productId: it.productId,
      label: p ? productLabel(p) : 'Médicament',
      quantity: it.quantity,
    };
  });

  // Stock à jour à chaque ouverture, parmi les pharmacies trouvées à la recherche.
  const lowMax = settings['stock.lowMax'] ?? 0;
  const staleMs = (settings['stock.staleMinutes'] ?? 0) * 60_000;
  const rows = stored.length
    ? await prisma.pharmacy.findMany({
        where: { id: { in: stored.map((r) => r.pharmacyId) }, status: 'ACTIVE' },
        include: {
          district: { select: { name: true } },
          stocks: { where: { productId: { in: items.map((i) => i.productId) } } },
          insurances: {
            include: { insurance: { select: { id: true, name: true, active: true } } },
          },
          dutyShifts: {
            where: { endsAt: { gt: now }, startsAt: { lt: new Date(now.getTime() + DAY_MS) } },
            select: { startsAt: true, endsAt: true },
          },
        },
      })
    : [];

  const viewerInsurance =
    isOwner && viewer.user?.insuranceId
      ? await prisma.insurance
          .findUnique({ where: { id: viewer.user.insuranceId }, select: { id: true, name: true } })
          .then((i) => (i ? { ...i, rate: viewer.user?.coverageRate ?? null } : null))
      : null;

  const computed: ResultPharmacy[] = rows.map((p) => {
    const r = stored.find((x) => x.pharmacyId === p.id)!;
    const lines: ResultLine[] = medicines.map((m) => {
      const s = p.stocks.find((x) => x.productId === m.productId);
      return {
        ...m,
        status: stockStatus(s?.quantity ?? 0, m.quantity, lowMax),
        unitPriceFcfa: s ? s.priceFcfa : null,
      };
    });
    const available = lines.filter((l) => l.status !== 'unavailable');
    const opening = openingState(p.openingHours as WeeklyHours, now, p.dutyShifts);
    const stockUpdatedAt = p.stocks.reduce<Date | null>(
      (m, s) => (!m || s.updatedAt < m ? s.updatedAt : m),
      null,
    );
    const insurances = p.insurances
      .filter((i) => i.insurance.active)
      .map((i) => ({ id: i.insurance.id, name: i.insurance.name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    return {
      slug: p.slug,
      name: p.name,
      districtName: p.district?.name ?? null,
      address: p.address,
      phone: p.phone,
      lat: p.lat,
      lng: p.lng,
      distanceMeters: r.distanceMeters,
      openingLabel: opening.label,
      open: opening.open,
      onDuty: opening.onDuty,
      found: available.length,
      lines,
      stockUpdatedAt: stockUpdatedAt?.toISOString() ?? null,
      stale: Boolean(
        stockUpdatedAt && staleMs && now.getTime() - stockUpdatedAt.getTime() > staleMs,
      ),
      showPrices: p.showPrices,
      invoice: p.showPrices
        ? available.reduce((sum, l) => sum + (l.unitPriceFcfa ?? 0) * l.quantity, 0)
        : null,
      insurances,
      acceptsViewerInsurance: viewerInsurance
        ? insurances.some((i) => i.id === viewerInsurance.id)
        : null,
      isDemo: p.isDemo,
    };
  });
  const withStock = computed.filter((p) => p.found > 0);
  const complete = withStock.filter((p) => p.found === total);
  const partials = withStock.filter((p) => p.found < total);
  const bestFound = partials.reduce((m, p) => Math.max(m, p.found), 0);
  const prices = complete.flatMap((p) => (p.invoice !== null ? [p.invoice] : []));
  const stockDates = withStock.flatMap((p) => (p.stockUpdatedAt ? [p.stockUpdatedAt] : [])).sort();

  const summary: PreviewSummary = {
    completeCount: complete.length,
    partialCount: partials.length,
    bestPartial:
      bestFound > 0
        ? { count: partials.filter((p) => p.found === bestFound).length, found: bestFound }
        : null,
    nearestMeters: (complete.length ? complete : withStock).reduce<number | null>(
      (m, p) => (m === null || p.distanceMeters < m ? p.distanceMeters : m),
      null,
    ),
    priceMin: prices.length ? Math.min(...prices) : null,
    priceMax: prices.length ? Math.max(...prices) : null,
    bands: complete
      .map((p) => p.distanceMeters)
      .sort((a, b) => a - b)
      .map(distanceBand),
    stockFrom: stockDates[0] ?? null,
    stockTo: stockDates[stockDates.length - 1] ?? null,
    hasDemo: withStock.some((p) => p.isDemo),
  };

  // Options de déblocage du visiteur (sans révéler les droits d'un autre compte).
  const options: UnlockOptions = {
    price: settings['price.unlock'],
    pass: null,
    passBlocked: null,
    offered: false,
    credits: 0,
  };
  let previewsLeft: number | null = null;
  if (access.kind !== 'unlocked') {
    if (viewer.user) {
      const pass = await activePass(viewer.user.id, now);
      if (pass) {
        const st = await passState(pass, settings, now);
        if (st.allowed) options.pass = { plan: pass.plan, remaining: st.remaining };
        else options.passBlocked = st.block;
      }
      options.offered = await offeredUnlockAvailable(viewer.user.id, settings);
      options.credits = await prisma.credit.count({
        where: { userId: viewer.user.id, usedAt: null },
      });
    }
    previewsLeft = (await previewAllowance(viewer, settings, now)).remaining;
  }

  // Ordre : toute l'ordonnance d'abord, puis la distance, puis le prix.
  const pharmacies =
    access.kind === 'unlocked'
      ? [...withStock].sort((a, b) => {
          const ca = a.found === total ? 0 : 1;
          const cb = b.found === total ? 0 : 1;
          return (
            ca - cb ||
            b.found - a.found ||
            a.distanceMeters - b.distanceMeters ||
            (a.invoice ?? Number.MAX_SAFE_INTEGER) - (b.invoice ?? Number.MAX_SAFE_INTEGER)
          );
        })
      : [];

  return {
    state: 'ready',
    token,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    medicines,
    access,
    summary,
    previewsLeft,
    options,
    pharmacies,
    isOwner,
    viewerInsurance: access.kind === 'unlocked' ? viewerInsurance : null,
    label: isOwner ? session.label : null,
  };
}

/** Une pharmacie d'un résultat débloqué, pour sa fiche (« Votre ordonnance ici »). */
export async function getUnlockedPharmacy(
  token: string,
  slug: string,
  viewer: Viewer,
): Promise<{ view: Extract<SearchView, { state: 'ready' }>; pharmacy: ResultPharmacy } | null> {
  const view = await getSearchView(token, viewer);
  if (view.state !== 'ready' || view.access.kind !== 'unlocked') return null;
  const pharmacy = view.pharmacies.find((p) => p.slug === slug);
  return pharmacy ? { view, pharmacy } : null;
}

/**
 * Qui a fait la recherche : son compte, ou, pour une recherche faite sans
 * compte, son appareil. Un lien partagé ne fait pas de son lecteur le
 * propriétaire (ni libellé du carnet, ni assurance, ni garantie).
 */
export function ownsSession(
  session: { userId: string | null; deviceId: string | null },
  viewer: Viewer,
): boolean {
  if (session.userId) return Boolean(viewer.user && session.userId === viewer.user.id);
  return Boolean(viewer.deviceId && session.deviceId === viewer.deviceId);
}

export class ReportError extends Error {
  constructor(
    readonly code:
      | 'NOT_FOUND'
      | 'NOT_OWNER'
      | 'LOGIN_REQUIRED'
      | 'NOT_COMPLETE'
      | 'TOO_LATE'
      | 'ALREADY_REPORTED',
    readonly status: number,
  ) {
    super(code);
  }
}

/**
 * Garantie « Trajet utile » : une pharmacie affichée comme ayant tout ne
 * l'avait pas. Signalée dans le délai du paramètre, elle rend une recherche
 * en crédit au compte (une fois par ordonnance).
 */
export async function reportMissing(
  token: string,
  slug: string,
  viewer: Viewer,
): Promise<{ creditId: string }> {
  if (!viewer.user) throw new ReportError('LOGIN_REQUIRED', 401);
  const settings = await getSettings();
  const hours = need(settings, 'guarantee.tripReportHours');
  const session = await prisma.searchSession.findUnique({
    where: { token },
    include: { unlocks: { take: 1, orderBy: { createdAt: 'asc' } } },
  });
  const unlock = session?.unlocks[0];
  if (!session || !unlock) throw new ReportError('NOT_FOUND', 404);
  // Sinon, chaque compte qui reçoit le lien partagé obtiendrait un crédit.
  if (!ownsSession(session, viewer)) throw new ReportError('NOT_OWNER', 403);
  if (Date.now() - unlock.createdAt.getTime() > hours * HOUR_MS) {
    throw new ReportError('TOO_LATE', 410);
  }
  const items = session.items as unknown as SearchItem[];
  const stored = session.results as unknown as StoredResult[];
  const pharmacy = await prisma.pharmacy.findUnique({ where: { slug }, select: { id: true } });
  const entry = pharmacy ? stored.find((r) => r.pharmacyId === pharmacy.id) : undefined;
  if (!pharmacy || !entry) throw new ReportError('NOT_FOUND', 404);
  if (entry.found.length < items.length) throw new ReportError('NOT_COMPLETE', 409);
  try {
    const credit = await prisma.credit.create({
      data: {
        userId: viewer.user.id,
        reason: 'TRIP_USEFUL',
        searchSessionId: session.id,
        pharmacyId: pharmacy.id,
      },
    });
    await track('trip_reported', { userId: viewer.user.id }, { pharmacyId: pharmacy.id });
    return { creditId: credit.id };
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      throw new ReportError('ALREADY_REPORTED', 409);
    }
    throw err;
  }
}
