import 'server-only';
import { Prisma } from '@prisma/client';
import { formatFcfa } from '@/lib/format';
import { prisma } from '@/lib/server/prisma';
import { startOfLocalDay, startOfLocalMonth } from './admin-kpis';
import { getSettings } from './settings';

// Haut du tableau de bord (maquette « Admin – Tableau de bord ») : cartes
// d'indicateurs avec tendance, ordonnances par jour, répartition des
// résultats, pharmacies qui servent le plus d'ordonnances complètes,
// activité récente. Une seule passe de requêtes lancées en parallèle.
//
// Tendance : début du mois comparé à la même durée du mois précédent
// (comparer un mois entamé à un mois complet ferait croire à une chute).

const DAY_MS = 24 * 60 * 60 * 1000;
export const OVERVIEW_DAYS = 14;

type Num = number | bigint | null;
const n = (v: Num | undefined): number => (v === null || v === undefined ? 0 : Number(v));

export interface Trend {
  current: number;
  previous: number;
  /** Variation en %, arrondie ; null quand la base précédente est nulle. */
  pct: number | null;
}

function trend(current: number, previous: number): Trend {
  return {
    current,
    previous,
    pct: previous > 0 ? Math.round(((current - previous) / previous) * 100) : null,
  };
}

export type SyncState = 'online' | 'late' | 'manual';

export interface ActivityItem {
  id: string;
  kind: 'payment' | 'account' | 'application' | 'search';
  at: Date;
  title: string;
  detail: string;
}

const PURPOSE_LABEL: Record<string, string> = {
  UNLOCK: 'Déblocage à l’acte',
  PASS_SOLO: 'Pass Solo',
  PASS_FAMILY: 'Pass Famille',
  PASS_FAMILY_ANNUAL: 'Pass annuel',
  PHARMACY_SUBSCRIPTION: 'Abonnement pharmacie',
  AD: 'Annonce',
};

const SOURCE_LABEL: Record<string, string> = {
  PHOTO: 'photo lue',
  MANUAL: 'saisie à la main',
  NAME: 'recherche par nom',
  RELAUNCH: 'relancée',
};

export async function dashboardOverview(now: Date = new Date()) {
  const settings = await getSettings();
  const syncAlertMs = (settings['pharmacy.syncAlertMinutes'] ?? 60) * 60_000;
  const monthStart = startOfLocalMonth(now);
  const prevStart = startOfLocalMonth(now, -1);
  const prevCut = new Date(prevStart.getTime() + (now.getTime() - monthStart.getTime()));
  const daysStart = new Date(startOfLocalDay(now).getTime() - (OVERVIEW_DAYS - 1) * DAY_MS);

  const [scalarRows, searchDays, unlockDays, topRows, payments, accounts, applications, searches] =
    await Promise.all([
      prisma.$queryRaw<
        {
          revNow: Num;
          revPrev: Num;
          srcNow: Num;
          srcPrev: Num;
          usrNow: Num;
          usrPrev: Num;
          usrAll: Num;
          phActive: Num;
          phAll: Num;
          complete: Num;
          partial: Num;
          none: Num;
        }[]
      >(Prisma.sql`
        SELECT
          (SELECT COALESCE(sum(amount), 0) FROM "Order" WHERE status = 'PAID' AND purpose IS NOT NULL AND "paidAt" >= ${monthStart}) AS "revNow",
          (SELECT COALESCE(sum(amount), 0) FROM "Order" WHERE status = 'PAID' AND purpose IS NOT NULL AND "paidAt" >= ${prevStart} AND "paidAt" < ${prevCut}) AS "revPrev",
          (SELECT count(*) FROM "SearchSession" WHERE "createdAt" >= ${monthStart}) AS "srcNow",
          (SELECT count(*) FROM "SearchSession" WHERE "createdAt" >= ${prevStart} AND "createdAt" < ${prevCut}) AS "srcPrev",
          (SELECT count(*) FROM "User" WHERE "emailVerifiedAt" IS NOT NULL AND "createdAt" >= ${monthStart}) AS "usrNow",
          (SELECT count(*) FROM "User" WHERE "emailVerifiedAt" IS NOT NULL AND "createdAt" >= ${prevStart} AND "createdAt" < ${prevCut}) AS "usrPrev",
          (SELECT count(*) FROM "User" WHERE "emailVerifiedAt" IS NOT NULL) AS "usrAll",
          (SELECT count(*) FROM "Pharmacy" WHERE status = 'ACTIVE') AS "phActive",
          (SELECT count(*) FROM "Pharmacy") AS "phAll",
          (SELECT count(*) FROM "SearchSession" WHERE "createdAt" >= ${monthStart} AND "completeCount" > 0) AS "complete",
          (SELECT count(*) FROM "SearchSession" WHERE "createdAt" >= ${monthStart} AND "completeCount" = 0 AND "partialCount" > 0) AS "partial",
          (SELECT count(*) FROM "SearchSession" WHERE "createdAt" >= ${monthStart} AND "completeCount" = 0 AND "partialCount" = 0) AS "none"`),
      prisma.$queryRaw<{ d: number; c: Num }[]>(Prisma.sql`
        SELECT floor(EXTRACT(EPOCH FROM ("createdAt" - ${daysStart})) / 86400)::int AS d, count(*) AS c
        FROM "SearchSession" WHERE "createdAt" >= ${daysStart} GROUP BY 1`),
      prisma.$queryRaw<{ d: number; c: Num }[]>(Prisma.sql`
        SELECT floor(EXTRACT(EPOCH FROM ("createdAt" - ${daysStart})) / 86400)::int AS d, count(*) AS c
        FROM "Unlock" WHERE "createdAt" >= ${daysStart} GROUP BY 1`),
      // Une pharmacie « sert une ordonnance complète » quand elle a tous les
      // médicaments de la recherche (results[].found couvre items).
      prisma.$queryRaw<{ id: string; complete: Num; proposed: Num }[]>(Prisma.sql`
        SELECT r->>'pharmacyId' AS id,
               count(*) FILTER (WHERE jsonb_array_length(r->'found') >= jsonb_array_length(s.items)) AS complete,
               count(*) AS proposed
        FROM "SearchSession" s, jsonb_array_elements(s.results) r
        WHERE s."createdAt" >= ${monthStart}
        GROUP BY 1 ORDER BY complete DESC, proposed DESC LIMIT 5`),
      prisma.order.findMany({
        where: { status: 'PAID', purpose: { not: null }, paidAt: { not: null } },
        orderBy: { paidAt: 'desc' },
        take: 6,
        select: { id: true, purpose: true, amount: true, paidAt: true },
      }),
      prisma.user.findMany({
        where: { emailVerifiedAt: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, createdAt: true },
      }),
      prisma.pharmacyApplication.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, createdAt: true, pharmacyName: true, districtName: true },
      }),
      prisma.searchSession.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, createdAt: true, source: true, items: true, completeCount: true },
      }),
    ]);
  const s = scalarRows[0]!;

  const days = Array.from({ length: OVERVIEW_DAYS }, (_, i) => ({
    // Midi local : la date affichée ne glisse jamais au jour voisin.
    date: new Date(daysStart.getTime() + i * DAY_MS + 12 * 60 * 60 * 1000).toISOString(),
    searches: n(searchDays.find((w) => w.d === i)?.c),
    unlocks: n(unlockDays.find((w) => w.d === i)?.c),
  }));

  const topIds = topRows.map((r) => r.id);
  const topPharmacies = topIds.length
    ? await prisma.pharmacy.findMany({
        where: { id: { in: topIds } },
        select: {
          id: true,
          name: true,
          isDemo: true,
          softwareId: true,
          lastSyncAt: true,
          district: { select: { name: true } },
        },
      })
    : [];
  const top = topRows.flatMap((r) => {
    const p = topPharmacies.find((x) => x.id === r.id);
    if (!p) return [];
    const sync: SyncState = !p.softwareId
      ? 'manual'
      : p.lastSyncAt && now.getTime() - p.lastSyncAt.getTime() <= syncAlertMs
        ? 'online'
        : 'late';
    return [
      {
        id: p.id,
        name: p.name,
        district: p.district?.name ?? null,
        isDemo: p.isDemo,
        complete: n(r.complete),
        proposed: n(r.proposed),
        sync,
        lastSyncAt: p.lastSyncAt,
      },
    ];
  });

  const activity: ActivityItem[] = [
    ...payments.map((o) => ({
      id: `pay-${o.id}`,
      kind: 'payment' as const,
      at: o.paidAt!,
      title: 'Paiement confirmé',
      detail: `${PURPOSE_LABEL[o.purpose ?? ''] ?? 'Paiement'}, ${formatFcfa(o.amount)}`,
    })),
    ...accounts.map((u) => ({
      id: `usr-${u.id}`,
      kind: 'account' as const,
      at: u.createdAt,
      title: 'Nouveau compte',
      detail: 'Adresse e-mail vérifiée',
    })),
    ...applications.map((a) => ({
      id: `app-${a.id}`,
      kind: 'application' as const,
      at: a.createdAt,
      title: 'Demande d’inscription',
      detail: `${a.pharmacyName} · ${a.districtName}`,
    })),
    ...searches.map((x) => {
      const count = Array.isArray(x.items) ? x.items.length : 0;
      return {
        id: `src-${x.id}`,
        kind: 'search' as const,
        at: x.createdAt,
        title: 'Ordonnance cherchée',
        detail: `${count} médicament${count > 1 ? 's' : ''}, ${SOURCE_LABEL[x.source] ?? 'recherche'}${x.completeCount > 0 ? ', trouvée complète' : ''}`,
      };
    }),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  return {
    revenue: trend(n(s.revNow), n(s.revPrev)),
    searches: trend(n(s.srcNow), n(s.srcPrev)),
    accounts: { ...trend(n(s.usrNow), n(s.usrPrev)), total: n(s.usrAll) },
    pharmacies: { active: n(s.phActive), total: n(s.phAll) },
    distribution: { complete: n(s.complete), partial: n(s.partial), none: n(s.none) },
    days,
    top,
    activity,
  };
}

export type DashboardOverview = Awaited<ReturnType<typeof dashboardOverview>>;
