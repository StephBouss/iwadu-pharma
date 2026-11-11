import type { Metadata } from 'next';
import { AdminActionButton, AdminForm } from '@/components/admin/AdminForm';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { KpiPanel } from '@/components/admin/KpiBlocks';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { normalizeSearch, productLabel } from '@/lib/products';
import { requirePageAdmin } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

export const metadata: Metadata = { title: 'Assurances' };

export default async function AdminInsurancesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePageAdmin('/admin/assurances');
  const { q } = await searchParams;
  const words = normalizeSearch(q ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 5);
  const [insurances, products] = await Promise.all([
    prisma.insurance.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { pharmacies: true, users: true } } },
    }),
    prisma.product.findMany({
      where: words.length ? { AND: words.map((w) => ({ searchKey: { contains: w } })) } : {},
      orderBy: [{ name: 'asc' }, { dosage: 'asc' }],
      take: 60,
    }),
  ]);

  return (
    <>
      <AdminHeader title="Assurances" />
      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        <KpiPanel
          title="Assurances proposées aux patients"
          subtitle="Désactiver retire l’assurance des listes sans effacer l’historique"
        >
          <ul className="flex flex-col divide-y divide-hairline">
            {insurances.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="flex flex-col">
                  <span className="type-body-strong text-ink">{i.name}</span>
                  <span className="type-caption text-ink-muted">
                    {i._count.pharmacies} pharmacie{i._count.pharmacies > 1 ? 's' : ''} ·{' '}
                    {i._count.users} patient{i._count.users > 1 ? 's' : ''}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <StatusBadge status={i.active ? 'available' : 'unavailable'}>
                    {i.active ? 'Active' : 'Désactivée'}
                  </StatusBadge>
                  <AdminActionButton
                    action="insurance.update"
                    body={{ id: i.id, active: !i.active }}
                    label={i.active ? 'Désactiver' : 'Réactiver'}
                    variant="ghost"
                  />
                </span>
              </li>
            ))}
          </ul>
          <AdminForm
            action="insurance.create"
            columns={1}
            submitLabel="Ajouter l’assurance"
            successMessage="Assurance ajoutée."
            resetOnSuccess
            variant="secondary"
            fields={[{ name: 'name', label: 'Nom de l’assurance', type: 'text', required: true }]}
          />
        </KpiPanel>

        <KpiPanel
          title="Médicaments remboursables"
          subtitle="Seuls ceux-là entrent dans la prise en charge estimée"
        >
          <form action="/admin/assurances" className="flex gap-2">
            <label htmlFor="q-med" className="sr-only">
              Chercher un médicament
            </label>
            <input
              id="q-med"
              name="q"
              defaultValue={q ?? ''}
              placeholder="Chercher un médicament…"
              className="type-body-small h-11 w-full rounded-full border border-hairline bg-surface px-4 text-ink"
            />
          </form>
          <ul className="flex flex-col divide-y divide-hairline">
            {products.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                <span className="type-body-small text-ink">{productLabel(p)}</span>
                <span className="flex items-center gap-2">
                  <StatusBadge status={p.reimbursable ? 'available' : 'unavailable'}>
                    {p.reimbursable ? 'Remboursable' : 'Non remboursable'}
                  </StatusBadge>
                  <AdminActionButton
                    action="product.setReimbursable"
                    body={{ productId: p.id, reimbursable: !p.reimbursable }}
                    label="Changer"
                    variant="ghost"
                  />
                </span>
              </li>
            ))}
          </ul>
        </KpiPanel>
      </div>
    </>
  );
}
