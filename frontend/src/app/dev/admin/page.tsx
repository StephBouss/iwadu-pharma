import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChevronRight, FileText, List, Smartphone, Store, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { AdminMobileNav } from '@/components/admin/AdminMobileNav';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { OnDutyList } from '@/components/admin/OnDutyList';
import { RecentOrdersTable } from '@/components/admin/RecentOrdersTable';
import { StatCard } from '@/components/admin/StatCard';
import { StatusCounts } from '@/components/admin/StatusCounts';
import { WeeklyBarChart } from '@/components/admin/WeeklyBarChart';
import { BgShapes } from '@/components/brand/BgShapes';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { DEMO_ADMIN_DASHBOARD } from '@/lib/demo/admin-dashboard';
import { formatGroupedInt, formatLongDate } from '@/lib/format';

// Aperçu de la maquette Banani « Dashboard Admin » avec des données
// FICTIVES. Développement uniquement (404 en production) : le vrai tableau
// de bord vivra sous /admin, réservé aux administrateurs, avec des données
// réelles (paiements confirmés, tables métier).

export const metadata: Metadata = {
  title: 'Tableau de bord (aperçu)',
  robots: { index: false, follow: false },
};

const DAY_MS = 24 * 60 * 60 * 1000;

export default function AdminDashboardPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const data = DEMO_ADMIN_DASHBOARD;
  const now = new Date();
  const days = data.last7Days.map((value, i) => ({
    date: new Date(now.getTime() - (data.last7Days.length - 1 - i) * DAY_MS),
    value,
  }));
  const weekTotal = data.last7Days.reduce((sum, v) => sum + v, 0);
  const { kpis } = data;

  return (
    <div className="relative flex min-h-dvh">
      <BgShapes />

      <AdminSidebar
        active="dashboard"
        adminName={data.admin.name}
        adminRole={data.admin.role}
        className="sticky top-0 hidden h-dvh lg:flex"
      />

      <main className="relative flex min-w-0 flex-1 flex-col gap-4 px-4 py-4 lg:gap-5 lg:px-6 lg:py-5">
        <AdminTopBar title="Tableau de bord" date={formatLongDate(now)} hasAlerts />
        <AdminMobileNav active="dashboard" className="lg:hidden" />

        <p className="type-caption text-ink-muted">Exemple fictif : données de démonstration.</p>

        <section
          aria-label="Indicateurs clés"
          className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
        >
          <StatCard
            icon={FileText}
            label="Ordonnances aujourd’hui"
            value={formatGroupedInt(kpis.prescriptionsToday.value)}
            trend={kpis.prescriptionsToday.trend}
            accent
          />
          <StatCard
            icon={Store}
            label="Pharmacies actives"
            value={formatGroupedInt(kpis.activePharmacies.value)}
            unit={`/ ${kpis.activePharmacies.total}`}
            trend={kpis.activePharmacies.trend}
          />
          <StatCard
            icon={Smartphone}
            label="Paiements validés"
            value={formatGroupedInt(kpis.confirmedPayments.amount)}
            unit="FCFA"
            trend={kpis.confirmedPayments.trend}
          />
          <StatCard
            icon={TriangleAlert}
            label="Alertes en cours"
            value={formatGroupedInt(kpis.openAlerts.value)}
            trend={kpis.openAlerts.trend}
          />
        </section>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
          <GlassPanel as="section" className="flex flex-col gap-4 p-5 md:col-span-2 lg:col-span-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="type-title-3 text-ink">Ordonnances — 7 derniers jours</h2>
                <p className="type-caption text-ink-muted">Toutes les pharmacies confondues</p>
              </div>
              <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-[0.8125rem] leading-4 font-semibold text-ink tabular-nums">
                Total : {formatGroupedInt(weekTotal)}
              </span>
            </div>
            <WeeklyBarChart days={days} highlightIndex={days.length - 1} unit="ordonnances" />
          </GlassPanel>

          <OnDutyList pharmacies={data.onDuty} />

          <StatusCounts title="Statuts du jour" rows={data.statusCounts} />
        </div>

        <GlassPanel as="section" className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
            <h2 className="type-title-3 flex items-center gap-2 text-ink">
              <List aria-hidden className="size-4 shrink-0 text-action" />
              Dernières ordonnances
            </h2>
            <Link
              href="/admin/ordonnances"
              className="flex h-12 shrink-0 items-center gap-1 text-sm font-semibold whitespace-nowrap text-action hover:underline"
            >
              Voir tout <ChevronRight aria-hidden className="size-4" />
            </Link>
          </div>
          <RecentOrdersTable rows={data.recentOrders} />
        </GlassPanel>
      </main>
    </div>
  );
}
