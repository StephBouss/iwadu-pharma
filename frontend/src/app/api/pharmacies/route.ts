// GET /api/pharmacies?lat=&lng=&onDuty=1 — pharmacies actives avec leur
// état d'ouverture (garde comprise), triées par distance à la position
// donnée. Public, sans compte. La position n'est ni stockée ni journalisée.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { isValidLatLng } from '@/lib/geo';
import { listPharmacies, listUpcomingDuty } from '@/lib/server/iwadu/pharmacies';
import { getSettings } from '@/lib/server/iwadu/settings';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get('lat'));
  const lng = Number(sp.get('lng'));
  const position = sp.has('lat') && isValidLatLng({ lat, lng }) ? { lat, lng } : null;
  const onDutyOnly = sp.get('onDuty') === '1';
  const settings = await getSettings();
  const radiusKm = settings['search.radiusKm'];

  let pharmacies = await listPharmacies({
    position,
    onDutyOnly,
    radiusMeters: !onDutyOnly && position && radiusKm ? radiusKm * 1000 : null,
  });
  // Personne de garde en ce moment : on montre les gardes qui commencent bientôt.
  const upcoming = onDutyOnly && pharmacies.length === 0;
  if (upcoming) pharmacies = await listUpcomingDuty({ position });
  return NextResponse.json(
    {
      pharmacies: pharmacies.slice(0, 60).map((p) => ({
        slug: p.slug,
        name: p.name,
        districtName: p.districtName,
        address: p.address,
        phone: p.phone,
        lat: p.lat,
        lng: p.lng,
        distanceMeters: p.distanceMeters,
        open: p.opening.open,
        onDuty: p.opening.onDuty,
        openingLabel: p.opening.label,
        isDemo: p.isDemo,
      })),
      upcoming,
      generatedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
