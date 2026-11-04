import {
  Bell,
  ChartColumn,
  CircleHelp,
  FileText,
  LayoutDashboard,
  Settings,
  Smartphone,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';

// Menu du back-office, partagé entre la barre latérale (ordinateur) et la
// barre de navigation mobile. Les rubriques autres que le tableau de bord
// arrivent avec le lot « back-office ».

export type AdminSection =
  | 'dashboard'
  | 'pharmacies'
  | 'prescriptions'
  | 'patients'
  | 'payments'
  | 'statistics'
  | 'alerts';

export interface AdminNavItem {
  id: AdminSection;
  label: string;
  href: string;
  icon: LucideIcon;
}

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { id: 'dashboard', label: 'Tableau de bord', href: '/admin', icon: LayoutDashboard },
  { id: 'pharmacies', label: 'Pharmacies', href: '/admin/pharmacies', icon: Store },
  { id: 'prescriptions', label: 'Ordonnances', href: '/admin/ordonnances', icon: FileText },
  { id: 'patients', label: 'Patients', href: '/admin/patients', icon: Users },
  { id: 'payments', label: 'Paiements', href: '/admin/paiements', icon: Smartphone },
  { id: 'statistics', label: 'Statistiques', href: '/admin/statistiques', icon: ChartColumn },
  { id: 'alerts', label: 'Alertes', href: '/admin/alertes', icon: Bell },
];

export const ADMIN_NAV_SECONDARY: readonly Omit<AdminNavItem, 'id'>[] = [
  { label: 'Paramètres', href: '/admin/parametres', icon: Settings },
  { label: 'Aide', href: '/aide', icon: CircleHelp },
];
