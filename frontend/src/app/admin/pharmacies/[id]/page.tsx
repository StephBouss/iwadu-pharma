import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminActionButton, AdminForm } from '@/components/admin/AdminForm';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { KpiList, KpiPanel } from '@/components/admin/KpiBlocks';
import { formatDateTime } from '@/lib/format';
import { directionsUrl } from '@/lib/geo';
import { requirePageAdmin } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

export const metadata: Metadata = { title: 'Pharmacie' };

function toLocalInput(d: Date | null): string | null {
  if (!d) return null;
  return new Date(d.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default async function AdminPharmacyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePageAdmin(`/admin/pharmacies/${id}`);
  const [p, districts] = await Promise.all([
    prisma.pharmacy.findUnique({
      where: { id },
      include: {
        district: true,
        members: { include: { user: { select: { id: true, email: true, name: true } } } },
        _count: { select: { stocks: true, reservations: true } },
      },
    }),
    prisma.district.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);
  if (!p) notFound();

  return (
    <>
      <AdminHeader title={p.name} />
      <p className="type-body-small">
        <Link href="/admin/pharmacies" className="font-semibold text-action hover:underline">
          ← Toutes les pharmacies
        </Link>
        {p.status === 'ACTIVE' && (
          <>
            {' · '}
            <Link
              href={`/pharmacie/${p.slug}`}
              className="font-semibold text-action hover:underline"
            >
              Fiche publique
            </Link>
          </>
        )}
      </p>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr] xl:items-start">
        <KpiPanel title="Fiche et offre">
          <AdminForm
            action="pharmacy.update"
            hidden={{ id: p.id }}
            submitLabel="Enregistrer"
            fields={[
              { name: 'name', label: 'Nom', type: 'text', required: true, defaultValue: p.name },
              {
                name: 'status',
                label: 'Statut',
                type: 'select',
                required: true,
                defaultValue: p.status,
                options: [
                  { value: 'PENDING', label: 'À valider' },
                  { value: 'ACTIVE', label: 'Active (visible des patients)' },
                  { value: 'SUSPENDED', label: 'Suspendue' },
                ],
              },
              {
                name: 'districtId',
                label: 'Quartier',
                type: 'select',
                nullable: true,
                defaultValue: p.districtId,
                options: districts.map((d) => ({ value: d.id, label: d.name })),
              },
              {
                name: 'address',
                label: 'Adresse ou repère',
                type: 'text',
                nullable: true,
                defaultValue: p.address,
              },
              {
                name: 'phone',
                label: 'Téléphone',
                type: 'tel',
                nullable: true,
                defaultValue: p.phone,
              },
              {
                name: 'code',
                label: 'Code dans le fichier des stocks (ex. PH001)',
                type: 'text',
                nullable: true,
                defaultValue: p.code,
              },
              {
                name: 'softwareId',
                label: 'Identifiant logiciel de stock',
                type: 'text',
                nullable: true,
                defaultValue: p.softwareId,
              },
              {
                name: 'lat',
                label: 'Latitude',
                type: 'number',
                required: true,
                defaultValue: p.lat,
              },
              {
                name: 'lng',
                label: 'Longitude',
                type: 'number',
                required: true,
                defaultValue: p.lng,
              },
              {
                name: 'plan',
                label: 'Formule',
                type: 'select',
                defaultValue: p.plan ?? '',
                options: [
                  { value: 'MONTHLY', label: 'Mensuelle' },
                  { value: 'ANNUAL', label: 'Annuelle' },
                ],
              },
              {
                name: 'subscriptionEndsAt',
                label: 'Abonnement payé jusqu’au',
                type: 'date',
                nullable: true,
                defaultValue: toLocalInput(p.subscriptionEndsAt),
              },
              {
                name: 'launchPricing',
                label: 'Tarif de lancement',
                type: 'checkbox',
                defaultValue: p.launchPricing,
              },
              {
                name: 'isDemo',
                label: 'Exemple fictif (démonstration)',
                type: 'checkbox',
                defaultValue: p.isDemo,
              },
            ]}
          />
        </KpiPanel>

        <div className="flex flex-col gap-4">
          <KpiPanel title="En bref">
            <KpiList
              rows={[
                { label: 'Médicaments en stock', value: p._count.stocks },
                { label: 'Réservations reçues', value: p._count.reservations },
                {
                  label: 'Dernière synchronisation',
                  value: p.lastSyncAt ? formatDateTime(p.lastSyncAt) : 'Aucune',
                },
                { label: 'Créée le', value: formatDateTime(p.createdAt) },
              ]}
            />
            <a
              href={directionsUrl({ lat: p.lat, lng: p.lng })}
              target="_blank"
              rel="noopener noreferrer"
              className="type-label text-action hover:underline"
            >
              Vérifier la position sur la carte
            </a>
          </KpiPanel>

          <KpiPanel title="Comptes de la pharmacie" subtitle="Accès à l’espace pharmacie">
            {p.members.length === 0 ? (
              <p className="type-body-small text-ink-muted">Aucun compte rattaché.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-hairline">
                {p.members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="type-body-small min-w-0 truncate text-ink">
                      {m.user.name ?? m.user.email}
                    </span>
                    <AdminActionButton
                      action="pharmacy.removeMember"
                      body={{ pharmacyId: p.id, userId: m.user.id }}
                      label="Retirer"
                      variant="ghost"
                      confirm="Retirer l’accès de ce compte ?"
                    />
                  </li>
                ))}
              </ul>
            )}
            <AdminForm
              action="pharmacy.addMember"
              hidden={{ pharmacyId: p.id }}
              columns={1}
              submitLabel="Rattacher ce compte"
              successMessage="Compte rattaché."
              resetOnSuccess
              variant="secondary"
              fields={[
                {
                  name: 'email',
                  label: 'E-mail du compte',
                  type: 'email',
                  required: true,
                  hint: 'Le pharmacien crée d’abord son compte sur le site.',
                },
              ]}
            />
          </KpiPanel>
        </div>
      </div>
    </>
  );
}
