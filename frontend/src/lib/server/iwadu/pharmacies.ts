import 'server-only';
import { formatClock } from '@/lib/format';
import { distanceMeters, type LatLng } from '@/lib/geo';
import { openingState, type OpeningState, type WeeklyHours } from '@/lib/opening-hours';
import { prisma } from '@/lib/server/prisma';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PharmacyListItem {
  id: string;
  slug: string;
  name: string;
  districtId: string | null;
  districtName: string | null;
  address: string | null;
  phone: string | null;
  lat: number;
  lng: number;
  distanceMeters: number | null;
  opening: OpeningState;
  showPrices: boolean;
  isDemo: boolean;
}

export interface DistrictOption {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
}

export async function listDistricts(): Promise<DistrictOption[]> {
  return prisma.district.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, slug: true, name: true, lat: true, lng: true },
  });
}

/**
 * Pharmacies actives, avec leur état d'ouverture (garde comprise) et leur
 * distance à la position du visiteur. Triées par distance, ou par nom sans
 * position.
 */
export async function listPharmacies(opts: {
  position?: LatLng | null;
  onDutyOnly?: boolean;
  radiusMeters?: number | null;
  now?: Date;
}): Promise<PharmacyListItem[]> {
  const now = opts.now ?? new Date();
  const rows = await prisma.pharmacy.findMany({
    where: { status: 'ACTIVE' },
    include: {
      district: { select: { name: true } },
      dutyShifts: {
        where: { endsAt: { gt: now }, startsAt: { lt: new Date(now.getTime() + DAY_MS) } },
        select: { startsAt: true, endsAt: true },
      },
    },
  });

  const items = rows.map((p): PharmacyListItem => {
    const opening = openingState(p.openingHours as WeeklyHours, now, p.dutyShifts);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      districtId: p.districtId,
      districtName: p.district?.name ?? null,
      address: p.address,
      phone: p.phone,
      lat: p.lat,
      lng: p.lng,
      distanceMeters: opts.position ? distanceMeters(opts.position, p) : null,
      opening,
      showPrices: p.showPrices,
      isDemo: p.isDemo,
    };
  });

  return items
    .filter((p) => !opts.onDutyOnly || p.opening.onDuty)
    .filter(
      (p) =>
        !opts.radiusMeters || p.distanceMeters === null || p.distanceMeters <= opts.radiusMeters,
    )
    .sort((a, b) =>
      a.distanceMeters !== null && b.distanceMeters !== null
        ? a.distanceMeters - b.distanceMeters
        : a.name.localeCompare(b.name, 'fr'),
    );
}

/**
 * Pharmacies dont la garde commence dans les 24 h : affichées quand
 * personne n'est de garde en ce moment (« De garde de 19 h à 8 h »).
 */
export async function listUpcomingDuty(opts: {
  position?: LatLng | null;
  now?: Date;
}): Promise<PharmacyListItem[]> {
  const now = opts.now ?? new Date();
  const shifts = await prisma.dutyShift.findMany({
    where: {
      startsAt: { gt: now, lt: new Date(now.getTime() + DAY_MS) },
      pharmacy: { status: 'ACTIVE' },
    },
    orderBy: { startsAt: 'asc' },
    include: { pharmacy: { include: { district: { select: { name: true } } } } },
  });
  const seen = new Set<string>();
  const items: PharmacyListItem[] = [];
  for (const s of shifts) {
    const p = s.pharmacy;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    items.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      districtId: p.districtId,
      districtName: p.district?.name ?? null,
      address: p.address,
      phone: p.phone,
      lat: p.lat,
      lng: p.lng,
      distanceMeters: opts.position ? distanceMeters(opts.position, p) : null,
      opening: {
        open: false,
        onDuty: false,
        label: `De garde de ${formatClock(s.startsAt)} à ${formatClock(s.endsAt)}`,
      },
      showPrices: p.showPrices,
      isDemo: p.isDemo,
    });
  }
  return items.sort((a, b) =>
    a.distanceMeters !== null && b.distanceMeters !== null
      ? a.distanceMeters - b.distanceMeters
      : a.name.localeCompare(b.name, 'fr'),
  );
}

export async function getPharmacyBySlug(slug: string, now: Date = new Date()) {
  const p = await prisma.pharmacy.findUnique({
    where: { slug },
    include: {
      district: { select: { name: true } },
      insurances: { include: { insurance: { select: { id: true, name: true, active: true } } } },
      dutyShifts: {
        where: { endsAt: { gt: now }, startsAt: { lt: new Date(now.getTime() + 8 * DAY_MS) } },
        orderBy: { startsAt: 'asc' },
        select: { startsAt: true, endsAt: true },
      },
    },
  });
  if (!p || p.status !== 'ACTIVE') return null;
  return {
    ...p,
    hours: p.openingHours as WeeklyHours,
    opening: openingState(p.openingHours as WeeklyHours, now, p.dutyShifts),
    acceptedInsurances: p.insurances
      .filter((i) => i.insurance.active)
      .map((i) => ({ id: i.insurance.id, name: i.insurance.name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
  };
}
