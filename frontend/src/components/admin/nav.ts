import {
  Bell,
  CalendarClock,
  ChartColumn,
  CircleHelp,
  FileText,
  LayoutDashboard,
  Handshake,
  ScrollText,
  Settings,
  ShieldCheck,
  Smartphone,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';

// Menu du back-office, partagé entre la barre latérale (ordinateur) et la
// barre de navigation mobile.

export type AdminSection =
  | 'dashboard'
  | 'pharmacies'
  | 'duty'
  | 'prescriptions'
  | 'patients'
  | 'payments'
  | 'statistics'
  | 'alerts'
  | 'insurances'
  | 'ads'
  | 'demo'
  | 'settings'
  | 'journal'
  | 'help'
  | 'search';

export interface AdminNavItem {
  id: AdminSection;
  label: string;
  href: string;
  icon: LucideIcon;
}

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { id: 'dashboard', label: 'Tableau de bord', href: '/admin', icon: LayoutDashboard },
  { id: 'pharmacies', label: 'Pharmacies', href: '/admin/pharmacies', icon: Store },
  { id: 'duty', label: 'Gardes', href: '/admin/gardes', icon: CalendarClock },
  { id: 'prescriptions', label: 'Ordonnances', href: '/admin/ordonnances', icon: FileText },
  { id: 'patients', label: 'Patients', href: '/admin/patients', icon: Users },
  { id: 'payments', label: 'Paiements', href: '/admin/paiements', icon: Smartphone },
  { id: 'statistics', label: 'Statistiques', href: '/admin/statistiques', icon: ChartColumn },
  { id: 'alerts', label: 'Alertes', href: '/admin/alertes', icon: Bell },
  { id: 'demo', label: 'Vue de démonstration', href: '/admin/demo', icon: Handshake },
];

export const ADMIN_NAV_SECONDARY: readonly AdminNavItem[] = [
  { id: 'insurances', label: 'Assurances', href: '/admin/assurances', icon: ShieldCheck },
  { id: 'settings', label: 'Paramètres', href: '/admin/parametres', icon: Settings },
  { id: 'journal', label: 'Journal', href: '/admin/journal', icon: ScrollText },
  { id: 'help', label: 'FAQ', href: '/aide', icon: CircleHelp },
];

/** Rubrique active d'après l'adresse de la page. */
export function adminSectionFor(pathname: string): AdminSection {
  if (pathname === '/admin') return 'dashboard';
  if (pathname.startsWith('/admin/recherche')) return 'search';
  const all = [...ADMIN_NAV, ...ADMIN_NAV_SECONDARY];
  return all.find((n) => n.href !== '/admin' && pathname.startsWith(n.href))?.id ?? 'dashboard';
}
