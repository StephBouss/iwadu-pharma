import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell';
import { requirePageUser } from '@/lib/server/iwadu/viewer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { default: 'Mon espace', template: '%s · Mon espace · Iwadu Pharma' },
  robots: { index: false, follow: false },
};

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await requirePageUser('/compte');
  return <AccountShell user={user}>{children}</AccountShell>;
}
