// Données FICTIVES du tableau de bord admin (maquette Banani). Le vrai
// back-office lira les paiements confirmés et les tables métier ; ce module
// disparaîtra alors. Rien ici ne doit être présenté comme réel.

import type { OnDutyPharmacy } from '@/components/admin/OnDutyList';
import type { RecentOrder } from '@/components/admin/RecentOrdersTable';
import type { StatTrend } from '@/components/admin/StatCard';
import type { StatusCount } from '@/components/admin/StatusCounts';
import { formatClock, formatGroupedInt } from '@/lib/format';

/** Heure à Libreville, avec espace insécable (« 7 h »). */
const at = (isoUtc: string) => formatClock(new Date(isoUtc));

export interface DemoAdminDashboard {
  admin: { name: string; role: string };
  kpis: {
    prescriptionsToday: { value: number; trend: StatTrend };
    activePharmacies: { value: number; total: number; trend: StatTrend };
    confirmedPayments: { amount: number; trend: StatTrend };
    openAlerts: { value: number; trend: StatTrend };
  };
  /** Ordonnances par jour, du plus ancien à aujourd'hui (7 valeurs). */
  last7Days: readonly number[];
  onDuty: readonly OnDutyPharmacy[];
  statusCounts: readonly StatusCount[];
  recentOrders: readonly RecentOrder[];
}

export const DEMO_ADMIN_DASHBOARD: DemoAdminDashboard = {
  admin: { name: 'Admin Iwadu', role: 'Super admin' },
  kpis: {
    prescriptionsToday: {
      value: 347,
      trend: { label: '+12 %', tone: 'positive', comparison: 'par rapport à hier' },
    },
    activePharmacies: {
      value: 28,
      total: 34,
      trend: { label: '+2', tone: 'positive', comparison: 'ce mois-ci' },
    },
    confirmedPayments: {
      amount: 1_248_000,
      trend: { label: '+8 %', tone: 'positive', comparison: 'par rapport à hier' },
    },
    openAlerts: {
      value: 5,
      // Moins d'alertes : bonne nouvelle, donc ton « positive ».
      trend: { label: formatGroupedInt(-3), tone: 'positive', comparison: 'par rapport à hier' },
    },
  },
  last7Days: [38, 55, 42, 70, 63, 48, 29],
  onDuty: [
    {
      name: 'Pharmacie de Garde Nord',
      district: 'Akanda',
      until: `Jusqu’à ${at('2026-11-05T06:00:00Z')}`,
    },
    { name: 'Pharmacie Centrale', district: 'Louis', until: 'Garde permanente' },
    {
      name: 'Pharmacie Médicale Est',
      district: 'Nzeng-Ayong',
      until: `Jusqu’à ${at('2026-11-05T05:00:00Z')}`,
    },
  ],
  statusCounts: [
    { status: 'available', label: 'Ordonnances complètes', count: 218 },
    { status: 'low', label: 'En attente de validation', count: 74 },
    { status: 'verify', label: 'À vérifier', count: 31 },
    { status: 'unavailable', label: 'Indisponibles', count: 19 },
    { status: 'error', label: 'Erreurs', count: 5 },
  ],
  recentOrders: [
    {
      ref: '#ORD-4821',
      patient: 'Patient Démo',
      pharmacy: 'Pharmacie Démo',
      amount: 4500,
      status: 'available',
      statusLabel: 'Payé',
      timeLabel: 'Il y a 5 min',
    },
    {
      ref: '#ORD-4820',
      patient: 'Patiente Exemple',
      pharmacy: 'Pharmacie Exemple',
      amount: 6000,
      status: 'low',
      statusLabel: 'En attente',
      timeLabel: 'Il y a 12 min',
    },
    {
      ref: '#ORD-4819',
      patient: 'Patient Test',
      pharmacy: 'Pharmacie Test',
      amount: 2200,
      status: 'verify',
      statusLabel: 'À vérifier',
      timeLabel: 'Il y a 28 min',
    },
    {
      ref: '#ORD-4818',
      patient: 'Patiente Fictive',
      pharmacy: 'Pharmacie Fictive',
      amount: 8100,
      status: 'available',
      statusLabel: 'Payé',
      timeLabel: 'Il y a 45 min',
    },
    {
      ref: '#ORD-4817',
      patient: 'Patient Essai',
      pharmacy: 'Pharmacie Centrale',
      amount: 3750,
      status: 'error',
      statusLabel: 'Erreur',
      timeLabel: 'Il y a 1 h',
    },
  ],
};
