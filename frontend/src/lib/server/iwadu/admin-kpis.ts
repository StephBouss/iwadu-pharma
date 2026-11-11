import 'server-only';
import { Prisma } from '@prisma/client';
import { ADS_ENABLED, PHARMACY_SPACE_ENABLED } from '@/lib/features';
import { productLabel } from '@/lib/products';
import { prisma } from '@/lib/server/prisma';
import { getSettings, missingRequired } from './settings';

// Indicateurs du back-office. Les montants viennent uniquement des
// paiements CONFIRMÉS (jamais d'une saisie) ; les charges et prévisions
// sont saisies par l'administration. Jours et mois en heure de Libreville.
//
// Performance : une douzaine de requêtes lancées EN PARALLÈLE (compteurs
// regroupés dans une seule requête SQL), pour rester rapide même quand la
// base est loin du serveur.

const TZ_OFFSET_MS = 60 * 60 * 1000; // Africa/Libreville : UTC+1, sans heure d'été
const DAY_MS = 24 * 60 * 60 * 1000;

function localParts(d: Date) {
  const l = new Date(d.getTime() + TZ_OFFSET_MS);
  return { y: l.getUTCFullYear(), m: l.getUTCMonth(), d: l.getUTCDate() };
}
export function startOfLocalDay(d: Date): Date {
  const p = localParts(d);
  return new Date(Date.UTC(p.y, p.m, p.d) - TZ_OFFSET_MS);
}
export function startOfLocalMonth(d: Date, offsetMonths = 0): Date {
  const p = localParts(d);
  return new Date(Date.UTC(p.y, p.m + offsetMonths, 1) - TZ_OFFSET_MS);
}
export function monthKey(d: Date): string {
  const p = localParts(d);
  return `${p.y}-${String(p.m + 1).padStart(2, '0')}`;
}

export const REVENUE_SOURCES = [
  { key: 'UNLOCK', label: 'À l’acte', purposes: ['UNLOCK'] },
  { key: 'PASS_SOLO', label: 'Pass Solo', purposes: ['PASS_SOLO'] },
  { key: 'PASS_FAMILY', label: 'Pass Famille', purposes: ['PASS_FAMILY'] },
  { key: 'PASS_FAMILY_ANNUAL', label: 'Pass annuel', purposes: ['PASS_FAMILY_ANNUAL'] },
  { key: 'PHARMACY', label: 'Abonnements des pharmacies', purposes: ['PHARMACY_SUBSCRIPTION'] },
  { key: 'AD', label: 'Annonces', purposes: ['AD'] },
] as const;

/** Lignes affichées : les sources V2 n'apparaissent qu'une fois activées. */
const SHOWN_SOURCES = REVENUE_SOURCES.filter(
  (src) => (src.key !== 'PHARMACY' || PHARMACY_SPACE_ENABLED) && (src.key !== 'AD' || ADS_ENABLED),
);

// Entonnoir du MVP : photos lues, aperçus, déblocages, Pass. Les événements
// de mesure restent pour les visites.
const FUNNEL = [['landing_view', 'Visites']] as const;

type Period = 'day' | 'month' | 'all';
type Num = number | bigint | null;
const n = (v: Num | undefined): number => (v === null || v === undefined ? 0 : Number(v));

interface Scalars {
  usersDay: Num;
  usersMonth: Num;
  passSolo: Num;
  passFamily: Num;
  renewals: Num;
  familyMembers: Num;
  readsOk: Num;
  readsUncorrected: Num;
  readsCorrected: Num;
  readsFailed: Num;
  aiCost: Num;
  manual: Num;
  byName: Num;
  photo: Num;
  phActive: Num;
  phPending: Num;
  phSuspended: Num;
  phLaunch: Num;
  applicationsNew: Num;
  missingReported: Num;
  avgResponseSec: Num;
  adsOnline: Num;
  adViews: Num;
  adClicks: Num;
  staleSent: Num;
  expMonth: Num;
  expAll: Num;
  fPhotos: Num;
  fPreviews: Num;
  fUnlocks: Num;
  fPasses: Num;
}

export async function dashboardKpis(now: Date = new Date()) {
  const settings = await getSettings();
  const dayStart = startOfLocalDay(now);
  const monthStart = startOfLocalMonth(now);
  const weekStart = new Date(dayStart.getTime() - 6 * DAY_MS);
  const staleCut = new Date(now.getTime() - 15 * 60_000);
  const key = monthKey(now);
  const sharePct = settings['share.partnerRatePercent'] ?? 0;
  const syncAlertMs = (settings['pharmacy.syncAlertMinutes'] ?? 60) * 60_000;
  const funnelNames = FUNNEL.map((f) => f[0]);

  const [
    scalarRows,
    groups,
    revenueRows,
    weekRows,
    actualRows,
    forecasts,
    expensesByMonth,
    districts,
    sessions,
    directions,
    syncRows,
  ] = await Promise.all([
    prisma.$queryRaw<Scalars[]>(Prisma.sql`
      SELECT
        (SELECT count(*) FROM "User" WHERE "createdAt" >= ${dayStart} AND "emailVerifiedAt" IS NOT NULL) AS "usersDay",
        (SELECT count(*) FROM "User" WHERE "createdAt" >= ${monthStart} AND "emailVerifiedAt" IS NOT NULL) AS "usersMonth",
        (SELECT count(*) FROM "Pass" WHERE "startsAt" <= ${now} AND "endsAt" > ${now} AND plan = 'SOLO') AS "passSolo",
        (SELECT count(*) FROM "Pass" WHERE "startsAt" <= ${now} AND "endsAt" > ${now} AND plan = 'FAMILY') AS "passFamily",
        (SELECT count(*) FROM "Pass" p WHERE p."createdAt" >= ${monthStart}
           AND EXISTS (SELECT 1 FROM "Pass" q WHERE q."userId" = p."userId" AND q."createdAt" < p."createdAt")) AS "renewals",
        (SELECT count(*) FROM "FamilyMember") AS "familyMembers",
        (SELECT count(*) FROM "PrescriptionRead" WHERE "createdAt" >= ${monthStart} AND NOT failed) AS "readsOk",
        (SELECT count(*) FROM "PrescriptionRead" WHERE "createdAt" >= ${monthStart} AND NOT failed AND "linesCorrected" = 0) AS "readsUncorrected",
        (SELECT count(*) FROM "PrescriptionRead" WHERE "createdAt" >= ${monthStart} AND NOT failed AND "linesCorrected" > 0) AS "readsCorrected",
        (SELECT count(*) FROM "PrescriptionRead" WHERE "createdAt" >= ${monthStart} AND failed) AS "readsFailed",
        (SELECT COALESCE(sum("costMicroUsd"), 0) FROM "PrescriptionRead" WHERE "createdAt" >= ${monthStart}) AS "aiCost",
        (SELECT count(*) FROM "SearchSession" WHERE "createdAt" >= ${monthStart} AND source = 'MANUAL') AS "manual",
        (SELECT count(*) FROM "SearchSession" WHERE "createdAt" >= ${monthStart} AND source = 'NAME') AS "byName",
        (SELECT count(*) FROM "SearchSession" WHERE "createdAt" >= ${monthStart} AND source = 'PHOTO') AS "photo",
        (SELECT count(*) FROM "Pharmacy" WHERE status = 'ACTIVE') AS "phActive",
        (SELECT count(*) FROM "Pharmacy" WHERE status = 'PENDING') AS "phPending",
        (SELECT count(*) FROM "Pharmacy" WHERE status = 'SUSPENDED') AS "phSuspended",
        (SELECT count(*) FROM "Pharmacy" WHERE status = 'ACTIVE' AND "launchPricing") AS "phLaunch",
        (SELECT count(*) FROM "PharmacyApplication" WHERE status = 'NEW') AS "applicationsNew",
        (SELECT count(*) FROM "Reservation" WHERE "createdAt" >= ${monthStart} AND "missingReported") AS "missingReported",
        (SELECT avg(EXTRACT(EPOCH FROM ("respondedAt" - "createdAt")))::float8 FROM "Reservation"
           WHERE "createdAt" >= ${monthStart} AND "respondedAt" IS NOT NULL) AS "avgResponseSec",
        (SELECT count(*) FROM "AdCampaign" WHERE active AND "startsAt" <= ${now} AND "endsAt" > ${now}) AS "adsOnline",
        (SELECT count(*) FROM "AdEvent" WHERE "createdAt" >= ${monthStart} AND kind = 'VIEW') AS "adViews",
        (SELECT count(*) FROM "AdEvent" WHERE "createdAt" >= ${monthStart} AND kind = 'CLICK') AS "adClicks",
        (SELECT count(*) FROM "Reservation" WHERE status = 'SENT' AND "createdAt" < ${staleCut}) AS "staleSent",
        (SELECT COALESCE(sum("amountFcfa"), 0) FROM "Expense" WHERE month = ${key}) AS "expMonth",
        (SELECT COALESCE(sum("amountFcfa"), 0) FROM "Expense") AS "expAll",
        (SELECT count(*) FROM "PrescriptionRead" WHERE "createdAt" >= ${monthStart}) AS "fPhotos",
        (SELECT count(*) FROM "SearchSession" WHERE "createdAt" >= ${monthStart}) AS "fPreviews",
        (SELECT count(*) FROM "Unlock" WHERE "createdAt" >= ${monthStart}) AS "fUnlocks",
        (SELECT count(*) FROM "Pass" WHERE "createdAt" >= ${monthStart}) AS "fPasses"`),
    prisma.$queryRaw<{ g: string; k: string; c: Num }[]>(Prisma.sql`
      SELECT 'res' AS g, status AS k, count(*) AS c FROM "Reservation" WHERE "createdAt" >= ${monthStart} GROUP BY status
      UNION ALL
      SELECT 'evt', name, count(*) FROM "AnalyticsEvent"
        WHERE "createdAt" >= ${monthStart} AND name = ANY(${funnelNames}) GROUP BY name`),
    prisma.$queryRaw<
      {
        purpose: string;
        day: Num;
        dayFees: Num;
        dayShare: Num;
        month: Num;
        monthFees: Num;
        monthShare: Num;
        all: Num;
        allFees: Num;
        allShare: Num;
      }[]
    >(Prisma.sql`
      SELECT purpose,
        COALESCE(SUM(amount) FILTER (WHERE "paidAt" >= ${dayStart}), 0) AS "day",
        COALESCE(SUM(COALESCE("feeAmount", 0)) FILTER (WHERE "paidAt" >= ${dayStart}), 0) AS "dayFees",
        COALESCE(SUM(COALESCE("commissionAmount", 0)) FILTER (WHERE "paidAt" >= ${dayStart}), 0) AS "dayShare",
        COALESCE(SUM(amount) FILTER (WHERE "paidAt" >= ${monthStart}), 0) AS "month",
        COALESCE(SUM(COALESCE("feeAmount", 0)) FILTER (WHERE "paidAt" >= ${monthStart}), 0) AS "monthFees",
        COALESCE(SUM(COALESCE("commissionAmount", 0)) FILTER (WHERE "paidAt" >= ${monthStart}), 0) AS "monthShare",
        COALESCE(SUM(amount), 0) AS "all",
        COALESCE(SUM(COALESCE("feeAmount", 0)), 0) AS "allFees",
        COALESCE(SUM(COALESCE("commissionAmount", 0)), 0) AS "allShare"
      FROM "Order" WHERE status = 'PAID' AND purpose IS NOT NULL GROUP BY purpose`),
    prisma.$queryRaw<{ d: number; c: Num }[]>(Prisma.sql`
      SELECT floor(EXTRACT(EPOCH FROM ("createdAt" - ${weekStart})) / 86400)::int AS d, count(*) AS c
      FROM "SearchSession" WHERE "createdAt" >= ${weekStart} GROUP BY 1`),
    prisma.$queryRaw<{ month: string; revenue: Num }[]>(Prisma.sql`
      SELECT to_char(("paidAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Libreville', 'YYYY-MM') AS month,
             SUM(amount) AS revenue
      FROM "Order" WHERE status = 'PAID' AND purpose IS NOT NULL AND "paidAt" IS NOT NULL GROUP BY 1`),
    prisma.forecast.findMany({ orderBy: { month: 'asc' } }),
    prisma.expense.groupBy({ by: ['month'], _sum: { amountFcfa: true } }),
    prisma.district.findMany({ select: { id: true, name: true } }),
    prisma.searchSession.findMany({
      where: { createdAt: { gte: monthStart } },
      select: {
        districtId: true,
        items: true,
        results: true,
        completeCount: true,
        partialCount: true,
      },
      take: 5000,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.analyticsEvent.groupBy({
      by: ['districtId'],
      where: { name: 'directions_clicked', createdAt: { gte: monthStart } },
      _count: true,
    }),
    prisma.pharmacy.findMany({
      where: { status: 'ACTIVE', softwareId: { not: null } },
      select: { id: true, name: true, slug: true, lastSyncAt: true },
      orderBy: { lastSyncAt: 'asc' },
    }),
  ]);
  const s = scalarRows[0]!;

  // Chiffre d'affaires, frais, part du partenaire (hors annonces), résultat.
  const revenue = Object.fromEntries(
    (['day', 'month', 'all'] as const).map((p) => {
      const feeKey = `${p}Fees` as 'dayFees' | 'monthFees' | 'allFees';
      const shareKey = `${p}Share` as 'dayShare' | 'monthShare' | 'allShare';
      const bySource = SHOWN_SOURCES.map((src) => ({
        key: src.key,
        label: src.label,
        amount: revenueRows
          .filter((r) => (src.purposes as readonly string[]).includes(r.purpose))
          .reduce((a, r) => a + n(r[p]), 0),
      }));
      const total = bySource.reduce((a, x) => a + x.amount, 0);
      const fees = revenueRows.reduce((a, r) => a + n(r[feeKey]), 0);
      // Part du partenaire : somme des parts enregistrées sur chaque paiement
      // confirmé (au taux en vigueur ce jour-là), hors annonces.
      const partner = revenueRows
        .filter((r) => r.purpose !== 'AD')
        .reduce((a, r) => a + n(r[shareKey]), 0);
      const expenses = p === 'month' ? n(s.expMonth) : p === 'all' ? n(s.expAll) : 0;
      return [
        p,
        { bySource, total, fees, partner, expenses, result: total - fees - partner - expenses },
      ];
    }),
  ) as Record<
    Period,
    {
      bySource: { key: string; label: string; amount: number }[];
      total: number;
      fees: number;
      partner: number;
      expenses: number;
      result: number;
    }
  >;

  // Réel et prévision, mois par mois.
  const months = [
    ...new Set([...forecasts.map((f) => f.month), ...actualRows.map((a) => a.month), key]),
  ]
    .sort()
    .slice(-12);
  const plan = months.map((m) => {
    const real = n(actualRows.find((a) => a.month === m)?.revenue);
    const f = forecasts.find((x) => x.month === m);
    return {
      month: m,
      actual: real,
      forecast: f?.revenueFcfa ?? null,
      gap: f ? real - f.revenueFcfa : null,
      expenses: expensesByMonth.find((e) => e.month === m)?._sum.amountFcfa ?? 0,
      forecastExpenses: f?.expensesFcfa ?? null,
    };
  });

  const funnel = [
    ...FUNNEL.map(([name, label]) => ({
      name: name as string,
      label: label as string,
      count: n(groups.find((g) => g.g === 'evt' && g.k === name)?.c),
    })),
    { name: 'photos', label: 'Photos lues', count: n(s.fPhotos) },
    { name: 'previews', label: 'Ordonnances cherchées', count: n(s.fPreviews) },
    { name: 'unlocks', label: 'Déblocages', count: n(s.fUnlocks) },
    { name: 'passes', label: 'Pass pris', count: n(s.fPasses) },
  ];
  const resByStatus = groups
    .filter((g) => g.g === 'res')
    .map((g) => ({ status: g.k, count: n(g.c) }));

  // Carte de la demande : par quartier, ce mois-ci.
  const demand = new Map<
    string,
    { searches: number; notFound: number; partial: number; missing: Map<string, number> }
  >();
  for (const ss of sessions) {
    const id = ss.districtId ?? 'unknown';
    const row = demand.get(id) ?? { searches: 0, notFound: 0, partial: 0, missing: new Map() };
    row.searches++;
    if (ss.completeCount + ss.partialCount === 0) row.notFound++;
    else if (ss.completeCount === 0) row.partial++;
    const found = new Set((ss.results as { found: string[] }[]).flatMap((r) => r.found));
    for (const it of ss.items as { productId: string }[]) {
      if (!found.has(it.productId))
        row.missing.set(it.productId, (row.missing.get(it.productId) ?? 0) + 1);
    }
    demand.set(id, row);
  }
  const missingIds = [...new Set([...demand.values()].flatMap((d) => [...d.missing.keys()]))];
  const missingProducts = missingIds.length
    ? await prisma.product.findMany({
        where: { id: { in: missingIds } },
        select: { id: true, name: true, dosage: true },
      })
    : [];
  const demandRows = [...demand.entries()]
    .map(([id, d]) => ({
      districtId: id,
      district: districts.find((x) => x.id === id)?.name ?? 'Quartier inconnu',
      searches: d.searches,
      notFound: d.notFound,
      partial: d.partial,
      directions: directions.find((x) => (x.districtId ?? 'unknown') === id)?._count ?? 0,
      topMissing: [...d.missing.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([pid, count]) => {
          const p = missingProducts.find((x) => x.id === pid);
          return `${p ? productLabel(p) : 'Médicament'} (${count})`;
        }),
    }))
    .sort((a, b) => b.searches - a.searches);

  const syncAlerts = syncRows.filter(
    (p) => !p.lastSyncAt || now.getTime() - p.lastSyncAt.getTime() > syncAlertMs,
  );
  const pharmacies = {
    active: n(s.phActive),
    pending: n(s.phPending),
    suspended: n(s.phSuspended),
    launch: n(s.phLaunch),
    applicationsNew: n(s.applicationsNew),
    synced: syncRows.length,
    syncAlerts,
    lastSync: syncRows.reduce<Date | null>(
      (m, p) => (p.lastSyncAt && (!m || p.lastSyncAt > m) ? p.lastSyncAt : m),
      null,
    ),
  };

  const perSlot = settings['ads.perSlot'] ?? 0;
  const adsOnline = n(s.adsOnline);
  const week = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(weekStart.getTime() + i * DAY_MS + 12 * 60 * 60 * 1000),
    value: n(weekRows.find((w) => w.d === i)?.c),
  }));
  const missingSettings = missingRequired(settings);

  return {
    monthKey: key,
    revenue,
    sharePct,
    plan,
    accounts: {
      newToday: n(s.usersDay),
      newMonth: n(s.usersMonth),
      passSolo: n(s.passSolo),
      passFamily: n(s.passFamily),
      renewals: n(s.renewals),
      familyMembers: n(s.familyMembers),
    },
    prescriptions: {
      aiRead: n(s.readsOk),
      uncorrected: n(s.readsUncorrected),
      corrected: n(s.readsCorrected),
      failed: n(s.readsFailed),
      manual: n(s.manual),
      byName: n(s.byName),
      photo: n(s.photo),
      aiCostUsd: n(s.aiCost) / 1_000_000,
    },
    funnel,
    demand: demandRows,
    pharmacies,
    reservations: {
      byStatus: resByStatus,
      total: resByStatus.reduce((a, r) => a + r.count, 0),
      avgResponseMinutes: s.avgResponseSec === null ? null : Math.round(n(s.avgResponseSec) / 60),
      missingReported: n(s.missingReported),
    },
    ads: {
      enabled: Boolean(settings['ads.enabled']),
      online: adsOnline,
      views: n(s.adViews),
      clicks: n(s.adClicks),
      freeSlots: Math.max(2 * perSlot - adsOnline, 0),
    },
    week,
    alerts: {
      syncAlerts: syncAlerts.length,
      pendingPharmacies: pharmacies.pending + pharmacies.applicationsNew,
      staleReservations: n(s.staleSent),
      missingSettings,
      total:
        syncAlerts.length +
        pharmacies.pending +
        pharmacies.applicationsNew +
        n(s.staleSent) +
        missingSettings.length,
    },
  };
}

export type DashboardKpis = Awaited<ReturnType<typeof dashboardKpis>>;

export interface FairUseRow {
  userId: string;
  email: string;
  searches: number;
  average: number;
}

/**
 * Comptes au-delà de l'usage raisonnable : moyenne mensuelle des recherches
 * faites avec un Pass, sur les mois glissants du paramètre. Une alerte, sans
 * coupure du service.
 */
export async function fairUseOverages(now: Date = new Date()): Promise<FairUseRow[]> {
  const settings = await getSettings();
  const avg = settings['fairUse.monthlyAverage'];
  const months = settings['fairUse.averageMonths'];
  if (!avg || !months) return [];
  const since = startOfLocalMonth(now, -(months - 1));
  const rows = await prisma.$queryRaw<{ userId: string; email: string; c: Num }[]>(Prisma.sql`
    SELECT u.id AS "userId", u.email, count(*) AS c
    FROM "Unlock" x JOIN "User" u ON u.id = x."userId"
    WHERE x.kind = 'PASS' AND x."createdAt" >= ${since}
    GROUP BY u.id, u.email
    HAVING count(*) > ${avg * months}
    ORDER BY c DESC
    LIMIT 100`);
  return rows.map((r) => ({
    userId: r.userId,
    email: r.email,
    searches: n(r.c),
    average: Math.round((n(r.c) / months) * 10) / 10,
  }));
}
