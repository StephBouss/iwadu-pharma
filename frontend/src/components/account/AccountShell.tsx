import type { ReactNode } from 'react';
import { isAdminRole, type ViewerUser } from '@/lib/server/iwadu/viewer';
import { AccountChrome } from './AccountChrome';

// Cadre « Mon espace » côté serveur : nom et rôle affichés dans la barre
// latérale. Partagé par /compte, /settings et les pages du parcours
// (ex. /ordonnance) ouvertes par une personne connectée.

const ROLE_LABEL: Record<string, string> = {
  SUPERADMIN: 'Super-administrateur',
  ADMIN: 'Administrateur',
};

export function AccountShell({ user, children }: { user: ViewerUser; children: ReactNode }) {
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
