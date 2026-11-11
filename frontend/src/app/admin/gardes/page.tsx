import type { Metadata } from 'next';
import { AdminActionButton, AdminForm } from '@/components/admin/AdminForm';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { KpiPanel } from '@/components/admin/KpiBlocks';
import { formatDateTime } from '@/lib/format';
import { requirePageAdmin } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

export const metadata: Metadata = { title: 'Gardes' };

export default async function AdminDutyPage() {
  await requirePageAdmin('/admin/gardes');
  const now = new Date();
  const [shifts, pharmacies] = await Promise.all([
    prisma.dutyShift.findMany({
      where: { endsAt: { gt: now } },
      orderBy: { startsAt: 'asc' },
      take: 200,
      include: { pharmacy: { select: { name: true, slug: true } } },
    }),
    prisma.pharmacy.findMany({
      where: { status: { not: 'SUSPENDED' } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  return (
    <>
      <AdminHeader title="Gardes" />
      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        <KpiPanel title="Ajouter une garde" subtitle="Heure locale">
          <AdminForm
            action="duty.create"
            submitLabel="Ajouter la garde"
            successMessage="Garde ajoutée."
            fields={[
              {
                name: 'pharmacyId',
                label: 'Pharmacie',
                type: 'select',
                required: true,
                options: pharmacies.map((p) => ({ value: p.id, label: p.name })),
                wide: true,
              },
              { name: 'startsAt', label: 'Début', type: 'datetime-local', required: true },
              { name: 'endsAt', label: 'Fin', type: 'datetime-local', required: true },
            ]}
          />
        </KpiPanel>
        <KpiPanel
          title="Importer le tour de la semaine"
          subtitle="Une ligne par garde : identifiant;date;début;fin"
        >
          <AdminForm
            action="duty.importCsv"
            columns={1}
            submitLabel="Importer"
            successMessage="Gardes importées"
            resetOnSuccess
            variant="secondary"
            fields={[
              {
                name: 'csv',
                label: 'Contenu CSV',
                type: 'textarea',
                required: true,
                placeholder: `${pharmacies[0]?.slug ?? 'pharmacie-exemple'};2026-11-09;19:00;08:00`,
                hint: 'Séparateur « ; ». Une fin plus tôt que le début se termine le lendemain. Identifiants disponibles ci-dessous.',
              },
            ]}
          />
          <details>
            <summary className="type-label cursor-pointer text-action hover:underline">
              Identifiants des pharmacies
            </summary>
            <ul className="type-caption mt-2 grid gap-1 font-mono text-ink-muted sm:grid-cols-2">
              {pharmacies.map((p) => (
                <li key={p.id}>{p.slug}</li>
              ))}
            </ul>
          </details>
        </KpiPanel>
      </div>

      <KpiPanel title={`Gardes à venir (${shifts.length})`}>
        {shifts.length === 0 ? (
          <p className="type-body-small text-ink-muted">Aucune garde prévue.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left">
              <thead>
                <tr className="type-caption text-ink-muted">
                  <th scope="col" className="pb-2 font-medium">
                    Pharmacie
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    Début
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    Fin
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="type-body-small divide-y divide-hairline text-ink">
                {shifts.map((s) => (
                  <tr key={s.id}>
                    <th scope="row" className="py-2 font-normal">
                      {s.pharmacy.name}
                    </th>
                    <td className="py-2">{formatDateTime(s.startsAt)}</td>
                    <td className="py-2">{formatDateTime(s.endsAt)}</td>
                    <td className="py-2 text-right">
                      <AdminActionButton
                        action="duty.delete"
                        body={{ id: s.id }}
                        label="Supprimer"
                        variant="ghost"
                        confirm="Supprimer cette garde ?"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </KpiPanel>
    </>
  );
}
