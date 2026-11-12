import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell';
import { requirePageUser } from '@/lib/server/iwadu/viewer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Connexion et sécurité · Mon espace · Iwadu Pharma',
  robots: { index: false, follow: false },
};

// Même cadre que « Mon espace » : cette page en fait partie.
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const user = await requirePageUser('/settings');
  return <AccountShell user={user}>{children}</AccountShell>;
}
