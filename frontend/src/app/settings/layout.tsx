import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { AccountChrome } from '@/components/account/AccountChrome';
import { isAdminRole, requirePageUser } from '@/lib/server/iwadu/viewer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Connexion et sécurité · Mon espace · Iwadu Pharma',
  robots: { index: false, follow: false },
};

const ROLE_LABEL: Record<string, string> = {
  SUPERADMIN: 'Super-administrateur',
  ADMIN: 'Administrateur',
};

// Même cadre que « Mon espace » : cette page en fait partie.
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const user = await requirePageUser('/settings');
  return (
    <AccountChrome
      userName={user.name ?? user.email}
      userRole={ROLE_LABEL[user.role] ?? 'Compte patient'}
      isAdmin={isAdminRole(user.role)}
    >
      {children}
    </AccountChrome>
  );
}
