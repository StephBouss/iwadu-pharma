import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminActionButton, AdminForm } from '@/components/admin/AdminForm';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { KpiPanel } from '@/components/admin/KpiBlocks';
import { SectionTitle } from '@/components/dashboard/PageHeading';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime } from '@/lib/format';
import { formatGabonPhone } from '@/lib/phone';
import { getSettings } from '@/lib/server/iwadu/settings';
import { requirePageAdmin } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Pharmacies' };

const STATUS = {
  ACTIVE: { label: 'Active', tone: 'available' },
  PENDING: { label: 'À valider', tone: 'verify' },
  SUSPENDED: { label: 'Suspendue', tone: 'unavailable' },
} as const;

const APP_STATUS: Record<string, string> = {
  NEW: 'Nouvelle',
  CONTACTED: 'Contactée',
  ACCEPTED: 'Acceptée',
  REJECTED: 'Refusée',
};

export default async function AdminPharmaciesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; q?: string }>;
}) {
  await requirePageAdmin('/admin/pharmacies');
  const { statut, q } = await searchParams;
  const status = statut && statut in STATUS ? statut : undefined;
  const now = new Date();
  const settings = await getSettings();
  const syncAlertMs = (settings['pharmacy.syncAlertMinutes'] ?? 60) * 60_000;
  const [pharmacies, applications, districts] = await Promise.all([
    prisma.pharmacy.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
      include: {
        district: { select: { name: true } },
        _count: { select: { members: true, stocks: true } },
      },
    }),
    prisma.pharmacyApplication.findMany({
      where: { status: { in: ['NEW', 'CONTACTED'] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.district.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  const filters = [
    { href: '/admin/pharmacies', label: 'Toutes', active: !status },
    ...Object.entries(STATUS).map(([k, v]) => ({
      href: `/admin/pharmacies?statut=${k}`,
      label: v.label,
      active: status === k,
    })),
  ];

  return (
    <>
      <AdminHeader title="Pharmacies" />

      <KpiPanel
        title="Importer les stocks (CSV)"
        subtitle="Format prévu pour l’export du logiciel des officines, adaptable dès qu’il sera connu"
      >
        <AdminForm
          action="stock.importCsv"
          columns={1}
          submitLabel="Importer les stocks"
          successMessage="Stocks importés"
          resetOnSuccess
          variant="secondary"
          fields={[
            {
              name: 'csv',
              label: 'Contenu du fichier CSV',
              type: 'textarea',
              required: true,
              placeholder:
                'pharmacie_code,produit_code,designation,dosage,forme,quantite,prix_xaf,mis_a_jour\nPH001,P0001,Paracétamol,500 mg,comprimé,120,1250,2026-11-10T08:30:00+01:00',
              hint: 'Première ligne : les noms de colonnes. Chaque pharmacie doit avoir son code (fiche de la pharmacie). Un produit inconnu est ajouté au catalogue. Exemple fictif.',
            },
          ]}
        />
      </KpiPanel>

      {applications.length > 0 && (
        <KpiPanel
          title={`Demandes d’inscription (${applications.length})`}
          subtitle="Reçues depuis la page « Vous êtes pharmacien ? »"
        >
          <ul className="flex flex-col divide-y divide-hairline">
            {applications.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex flex-col">
                  <span className="type-body-strong text-ink">
                    {a.pharmacyName} · {a.districtName}
                  </span>
                  <span className="type-body-small text-ink-muted">
                    {a.contactName} · {formatGabonPhone(a.phone)}
                    {a.email ? ` · ${a.email}` : ''}
                    {a.softwareId ? ` · Logiciel : ${a.softwareId}` : ''} ·{' '}
                    {formatDateTime(a.createdAt)}
                  </span>
                  {a.message && <span className="type-body-small text-ink">{a.message}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={a.status === 'NEW' ? 'verify' : 'low'}>
                    {APP_STATUS[a.status]}
                  </StatusBadge>
                  {a.status === 'NEW' && (
                    <AdminActionButton
                      action="application.setStatus"
                      body={{ id: a.id, status: 'CONTACTED' }}
                      label="Contactée"
                    />
                  )}
                  <AdminActionButton
                    action="application.setStatus"
                    body={{ id: a.id, status: 'ACCEPTED' }}
                    label="Acceptée"
                  />
                  <AdminActionButton
                    action="application.setStatus"
                    body={{ id: a.id, status: 'REJECTED' }}
                    label="Refuser"
                    variant="ghost"
                    confirm="Refuser cette demande ?"
                  />
                </div>
              </li>
            ))}
          </ul>
        </KpiPanel>
      )}

      <section aria-labelledby="liste" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionTitle id="liste">
            {pharmacies.length} pharmacie{pharmacies.length > 1 ? 's' : ''}
          </SectionTitle>
          <form className="flex gap-2" action="/admin/pharmacies">
            {status && <input type="hidden" name="statut" value={status} />}
            <label className="sr-only" htmlFor="q-pharma">
              Rechercher une pharmacie
            </label>
            <input
              id="q-pharma"
              name="q"
              defaultValue={q ?? ''}
              placeholder="Nom…"
              className="type-body-small h-11 rounded-full border border-hairline bg-surface/85 px-4 text-ink"
            />
          </form>
        </div>
        <GlassPanel className="flex flex-col gap-4 overflow-hidden p-5 lg:p-6">
          <nav aria-label="Filtrer par statut" className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <Link
                key={f.href}
                href={f.href}
                aria-current={f.active ? 'page' : undefined}
                className={cn(
                  'type-label flex h-10 items-center rounded-full border px-4',
                  f.active
                    ? 'border-action bg-action text-surface'
                    : 'border-hairline bg-surface/80 text-ink hover:border-action',
                )}
              >
                {f.label}
              </Link>
            ))}
          </nav>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left">
              <thead>
                <tr className="type-caption text-ink-muted">
                  <th scope="col" className="pb-2 font-medium">
                    Pharmacie
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    Statut
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    Offre
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    Synchronisation
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Stock
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Comptes
                  </th>
                </tr>
              </thead>
              <tbody className="type-body-small divide-y divide-hairline text-ink">
                {pharmacies.map((p) => {
                  const st = STATUS[p.status as keyof typeof STATUS] ?? STATUS.PENDING;
                  const late =
                    p.softwareId &&
                    (!p.lastSyncAt || now.getTime() - p.lastSyncAt.getTime() > syncAlertMs);
                  return (
                    <tr key={p.id}>
                      <th scope="row" className="py-2 font-normal">
                        <Link
                          href={`/admin/pharmacies/${p.id}`}
                          className="font-semibold text-action hover:underline"
                        >
                          {p.name}
                        </Link>
                        <span className="block text-ink-muted">
                          {p.district?.name ?? 'Sans quartier'}
                          {p.isDemo ? ' · Exemple fictif' : ''}
                        </span>
                      </th>
                      <td className="py-2">
                        <StatusBadge status={st.tone}>{st.label}</StatusBadge>
                      </td>
                      <td className="py-2">
                        {p.launchPricing ? 'Lancement' : p.plan === 'ANNUAL' ? 'Annuel' : 'Mensuel'}
                        {p.subscriptionEndsAt && (
                          <span
                            className={cn(
                              'block',
                              p.subscriptionEndsAt < now ? 'text-error' : 'text-ink-muted',
                            )}
                          >
                            jusqu’au {formatDateTime(p.subscriptionEndsAt)}
                          </span>
                        )}
                      </td>
                      <td className={cn('py-2', late && 'text-error')}>
                        {!p.softwareId
                          ? 'Saisie manuelle'
                          : p.lastSyncAt
                            ? formatDateTime(p.lastSyncAt)
                            : 'Jamais'}
                        {late ? ' (en retard)' : ''}
                      </td>
                      <td className="py-2 text-right tabular-nums">{p._count.stocks}</td>
                      <td className="py-2 text-right tabular-nums">{p._count.members}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      </section>

      <KpiPanel
        title="Ajouter une pharmacie"
        subtitle="Elle reste « À valider » tant que vous ne l’activez pas."
      >
        <AdminForm
          action="pharmacy.create"
          submitLabel="Créer la pharmacie"
          successMessage="Pharmacie créée."
          resetOnSuccess
          variant="secondary"
          fields={[
            { name: 'name', label: 'Nom', type: 'text', required: true },
            {
              name: 'districtId',
              label: 'Quartier',
              type: 'select',
              options: districts.map((d) => ({ value: d.id, label: d.name })),
            },
            { name: 'address', label: 'Adresse ou repère', type: 'text' },
            { name: 'phone', label: 'Téléphone', type: 'tel' },
            {
              name: 'lat',
              label: 'Latitude',
              type: 'number',
              required: true,
              placeholder: '0.4162',
              hint: 'Clic droit sur la carte en ligne, puis copier les coordonnées.',
            },
            {
              name: 'lng',
              label: 'Longitude',
              type: 'number',
              required: true,
              placeholder: '9.4673',
            },
            { name: 'softwareId', label: 'Identifiant logiciel de stock', type: 'text' },
            {
              name: 'status',
              label: 'Statut',
              type: 'select',
              required: true,
              defaultValue: 'PENDING',
              options: [
                { value: 'PENDING', label: 'À valider' },
                { value: 'ACTIVE', label: 'Active' },
              ],
            },
          ]}
        />
      </KpiPanel>
    </>
  );
}
