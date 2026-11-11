import 'server-only';
import { Prisma } from '@prisma/client';
import { productLabel } from '@/lib/products';
import { prisma } from '@/lib/server/prisma';
import { getSettings } from './settings';

// Vue de démonstration pour le partenaire logiciel : ce que la plateforme
// rapporte (transactions et part cumulée), la demande par quartier, les
// médicaments les plus cherchés et l'aperçu « côté pharmacie » (la demande
// de son quartier et les ordonnances qu'elle aurait pu servir). Montants
// issus des seuls paiements confirmés.

type Num = number | bigint | null;
const n = (v: Num | undefined): number => (v === null || v === undefined ? 0 : Number(v));

export async function demoView(pharmacySlug: string | null) {
  const settings = await getSettings();
  const [totals, byPurpose, recent, districts, sessions, pharmacies] = await Promise.all([
    prisma.$queryRaw<{ count: Num; amount: Num; share: Num; fees: Num }[]>(Prisma.sql`
      SELECT count(*) AS count, COALESCE(sum(amount), 0) AS amount,
             COALESCE(sum(COALESCE("commissionAmount", 0)), 0) AS share,
             COALESCE(sum(COALESCE("feeAmount", 0)), 0) AS fees
      FROM "Order" WHERE status = 'PAID' AND purpose IS NOT NULL AND purpose <> 'AD'`),
    prisma.$queryRaw<{ purpose: string; count: Num; amount: Num; share: Num }[]>(Prisma.sql`
      SELECT purpose, count(*) AS count, COALESCE(sum(amount), 0) AS amount,
             COALESCE(sum(COALESCE("commissionAmount", 0)), 0) AS share
      FROM "Order" WHERE status = 'PAID' AND purpose IS NOT NULL AND purpose <> 'AD'
      GROUP BY purpose ORDER BY 3 DESC`),
    prisma.order.findMany({
      where: { status: 'PAID', purpose: { not: null } },
      orderBy: { paidAt: 'desc' },
      take: 12,
      select: { id: true, purpose: true, amount: true, commissionAmount: true, paidAt: true },
    }),
    prisma.district.findMany({ select: { id: true, name: true } }),
    prisma.searchSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5000,
      select: { districtId: true, items: true, results: true, completeCount: true },
    }),
    prisma.pharmacy.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      select: { id: true, slug: true, name: true, districtId: true, isDemo: true },
    }),
  ]);

  const byDistrict = new Map<string, number>();
  const byProduct = new Map<string, number>();
  for (const s of sessions) {
    const id = s.districtId ?? 'inconnu';
    byDistrict.set(id, (byDistrict.get(id) ?? 0) + 1);
    for (const it of s.items as { productId: string }[]) {
      byProduct.set(it.productId, (byProduct.get(it.productId) ?? 0) + 1);
    }
  }
  const topIds = [...byProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const products = await prisma.product.findMany({
    where: { id: { in: topIds.map(([id]) => id) } },
    select: { id: true, name: true, dosage: true },
  });

  // Côté pharmacie : la demande de son quartier, les ordonnances qu'elle
  // avait en entier ou en partie au moment de la recherche.
  const pharmacy = pharmacySlug
    ? (pharmacies.find((p) => p.slug === pharmacySlug) ?? null)
    : (pharmacies[0] ?? null);
  let side: {
    name: string;
    district: string | null;
    districtSearches: number;
    couldServeFull: number;
    couldServePart: number;
    missingTop: string[];
  } | null = null;
  if (pharmacy) {
    let full = 0;
    let part = 0;
    const missing = new Map<string, number>();
    for (const s of sessions) {
      const items = s.items as { productId: string }[];
      const r = (s.results as { pharmacyId: string; found: string[] }[]).find(
        (x) => x.pharmacyId === pharmacy.id,
      );
      if (!r) continue;
      if (r.found.length === items.length) full++;
      else {
        part++;
        for (const it of items) {
          if (!r.found.includes(it.productId)) {
            missing.set(it.productId, (missing.get(it.productId) ?? 0) + 1);
          }
        }
      }
    }
    const missIds = [...missing.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const missProducts = await prisma.product.findMany({
      where: { id: { in: missIds.map(([id]) => id) } },
      select: { id: true, name: true, dosage: true },
    });
    side = {
      name: pharmacy.name,
      district: districts.find((d) => d.id === pharmacy.districtId)?.name ?? null,
      districtSearches: pharmacy.districtId ? (byDistrict.get(pharmacy.districtId) ?? 0) : 0,
      couldServeFull: full,
      couldServePart: part,
      missingTop: missIds.map(([id, c]) => {
        const p = missProducts.find((x) => x.id === id);
        return `${p ? productLabel(p) : 'Médicament'} (${c})`;
      }),
    };
  }

  const t = totals[0];
  return {
    partnerName: settings['share.partnerName'],
    sharePct: settings['share.partnerRatePercent'],
    feePct: settings['fees.providerRatePercent'],
    totals: { count: n(t?.count), amount: n(t?.amount), share: n(t?.share), fees: n(t?.fees) },
    byPurpose: byPurpose.map((r) => ({
      purpose: r.purpose,
      count: n(r.count),
      amount: n(r.amount),
      share: n(r.share),
    })),
    recent,
    demand: [...byDistrict.entries()]
      .map(([id, count]) => ({
        district: districts.find((d) => d.id === id)?.name ?? 'Quartier inconnu',
        count,
      }))
      .sort((a, b) => b.count - a.count),
    topMedicines: topIds.map(([id, count]) => {
      const p = products.find((x) => x.id === id);
      return { label: p ? productLabel(p) : 'Médicament', count };
    }),
    totalSearches: sessions.length,
    pharmacies: pharmacies.map((p) => ({ slug: p.slug, name: p.name })),
    selectedSlug: pharmacy?.slug ?? null,
    side,
    hasDemo: pharmacies.some((p) => p.isDemo),
  };
}
