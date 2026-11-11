import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Prisma } from '@prisma/client';
import { AdminChrome } from '@/components/admin/AdminChrome';
import { requirePageAdmin } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { default: 'Back-office', template: '%s · Back-office · Iwadu Pharma' },
  robots: { index: false, follow: false },
};

/** Des alertes attendent : pastille sur la cloche du bandeau. */
async function hasPendingAlerts(): Promise<boolean> {
  const staleCut = new Date(Date.now() - 15 * 60_000);
  const [row] = await prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
    SELECT (
      (SELECT count(*) FROM "Pharmacy" WHERE status = 'PENDING') +
      (SELECT count(*) FROM "PharmacyApplication" WHERE status = 'NEW') +
      (SELECT count(*) FROM "Reservation" WHERE status = 'SENT' AND "createdAt" < ${staleCut})
    )::int AS total`);
  return (row?.total ?? 0) > 0;
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requirePageAdmin('/admin');
  return (
    <AdminChrome
      adminName={user.name ?? user.email}
      adminRole={user.role === 'SUPERADMIN' ? 'Super-administrateur' : 'Administrateur'}
      hasAlerts={await hasPendingAlerts()}
    >
      {children}
    </AdminChrome>
  );
}
