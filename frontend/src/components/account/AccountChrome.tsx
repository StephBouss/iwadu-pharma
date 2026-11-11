'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  LayoutDashboard,
  Moon,
  Receipt,
  ShieldCheck,
  ShieldUser,
  Sparkles,
  Tag,
} from 'lucide-react';
import { DashboardFrame } from '@/components/dashboard/DashboardFrame';
import { activeNavId, type DashboardNavItem } from '@/components/dashboard/types';

// Cadre de « Mon espace », identique au back-office (maquette « Admin –
// Tableau de bord ») : mêmes barre latérale, bandeau et pastilles mobiles.
// Les liens restent ceux de l'espace patient.

const ACCOUNT_NAV: readonly DashboardNavItem[] = [
  { id: 'home', label: 'Mon espace', href: '/compte', icon: LayoutDashboard },
  { id: 'carnet', label: 'Carnet d’ordonnances', href: '/compte/ordonnances', icon: BookOpen },
  { id: 'pass', label: 'Pass', href: '/compte/pass', icon: Sparkles },
  { id: 'receipts', label: 'Reçus', href: '/compte/paiements', icon: Receipt },
  { id: 'profile', label: 'Assurance et profil', href: '/compte/profil', icon: ShieldCheck },
];

const SITE_NAV: readonly DashboardNavItem[] = [
  { id: 'duty', label: 'Pharmacies de garde', href: '/gardes', icon: Moon },
  { id: 'pricing', label: 'Tarifs', href: '/tarifs', icon: Tag },
];

const ADMIN_LINK: DashboardNavItem = {
  id: 'admin',
  label: 'Administration',
  href: '/admin',
  icon: ShieldUser,
};

export function AccountChrome({
  userName,
  userRole,
  isAdmin,
  children,
}: {
  userName: string;
  userRole: string;
  isAdmin: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const secondary = isAdmin ? [ADMIN_LINK, ...SITE_NAV] : SITE_NAV;
  return (
    <DashboardFrame
      homeHref="/"
      homeLabel="Iwadu Pharma, accueil du site"
      caption="Mon espace"
      navLabel="Mon espace"
      items={ACCOUNT_NAV}
      secondary={secondary}
      activeId={activeNavId(pathname, ACCOUNT_NAV, '/compte')}
      userName={userName}
      userRole={userRole}
    >
      {children}
    </DashboardFrame>
  );
}
