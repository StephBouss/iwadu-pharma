// GET /api/districts — quartiers, pour choisir sa position sans GPS.
export const runtime = 'nodejs';
export const revalidate = 3600;

import 'server-only';
import { NextResponse } from 'next/server';
import { listDistricts } from '@/lib/server/iwadu/pharmacies';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ districts: await listDistricts() });
}
