import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminActionButton, AdminForm } from '@/components/admin/AdminForm';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { KpiPanel } from '@/components/admin/KpiBlocks';
import { Message } from '@/components/ui/Message';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime, formatFcfa, formatGroupedInt } from '@/lib/format';
import { startOfLocalMonth } from '@/lib/server/iwadu/admin-kpis';
import { getSettings } from '@/lib/server/iwadu/settings';
import { requirePageAdmin } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

export const metadata: Metadata = { title: 'Annonces' };

export default async function AdminAdsPage() {
  await requirePageAdmin('/admin/annonces');
  const now = new Date();
  const monthStart = startOfLocalMonth(now);
  const [settings, campaigns, districts, events] = await Promise.all([
    getSettings(),
    prisma.adCampaign.findMany({ orderBy: [{ active: 'desc' }, { startsAt: 'desc' }], take: 100 }),
    prisma.district.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.adEvent.groupBy({
      by: ['campaignId', 'kind'],
      where: { createdAt: { gte: monthStart } },
      _count: true,
    }),
  ]);
  const perSlot = settings['ads.perSlot'] ?? 0;
  const live = (c: (typeof campaigns)[number]) => c.active && c.startsAt <= now && c.endsAt > now;
  const freeBySlot = [1, 2].map((slot) =>
    Math.max(perSlot - campaigns.filter((c) => c.slot === slot && live(c)).length, 0),
  );

  return (
    <>
      <AdminHeader title="Annonces" />
      {!settings['ads.enabled'] && (
        <Message tone="info" title="Les annonces sont désactivées.">
          Activez-les dans les{' '}
          <Link href="/admin/parametres" className="font-semibold text-action hover:underline">
            paramètres
          </Link>{' '}
          pour les afficher aux patients sans Pass.
        </Message>
      )}
      <p className="type-body-small text-ink-muted">
        Emplacement 1 : pages Gardes et Autour de moi. Emplacement 2 : fiches des pharmacies. Les
        patients qui ont un Pass ne voient pas d’annonce.
        {settings['ads.priceMonthly']
          ? ` Tarif : ${formatFcfa(settings['ads.priceMonthly'])} par mois.`
          : ''}{' '}
        Places libres : emplacement 1 : {freeBySlot[0]}, emplacement 2 : {freeBySlot[1]}.
      </p>

      <KpiPanel title="Campagnes" subtitle="Vues et clics de ce mois">
        {campaigns.length === 0 ? (
          <p className="type-body-small text-ink-muted">Aucune campagne.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left">
              <thead>
                <tr className="type-caption text-ink-muted">
                  <th scope="col" className="pb-2 font-medium">
                    Annonce
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    Période
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    Ciblage
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Vues
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Clics
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    État
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="type-body-small divide-y divide-hairline text-ink">
                {campaigns.map((c) => {
                  const ids = (c.districtIds as string[] | null) ?? [];
                  return (
                    <tr key={c.id}>
                      <th scope="row" className="py-2 font-normal">
                        <span className="block font-semibold">{c.title}</span>
                        <span className="block text-ink-muted">
                          {c.advertiser} · emplacement {c.slot} ·{' '}
                          <a
                            href={c.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-action hover:underline"
                          >
                            lien
                          </a>
                        </span>
                      </th>
                      <td className="py-2">
                        {formatDateTime(c.startsAt)} → {formatDateTime(c.endsAt)}
                      </td>
                      <td className="py-2">
                        {ids.length === 0
                          ? 'Tous les quartiers'
                          : ids
                              .map((i) => districts.find((d) => d.id === i)?.name ?? '?')
                              .join(', ')}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatGroupedInt(
                          events.find((e) => e.campaignId === c.id && e.kind === 'VIEW')?._count ??
                            0,
                        )}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatGroupedInt(
                          events.find((e) => e.campaignId === c.id && e.kind === 'CLICK')?._count ??
                            0,
                        )}
                      </td>
                      <td className="py-2">
                        <StatusBadge
                          status={
                            live(c)
                              ? 'available'
                              : c.active && c.startsAt > now
                                ? 'verify'
                                : 'unavailable'
                          }
                        >
                          {live(c)
                            ? 'En ligne'
                            : c.active && c.startsAt > now
                              ? 'Programmée'
                              : c.active
                                ? 'Terminée'
                                : 'En pause'}
                        </StatusBadge>
                      </td>
                      <td className="py-2">
                        <span className="flex gap-1">
                          <AdminActionButton
                            action="ad.update"
                            body={{ id: c.id, active: !c.active }}
                            label={c.active ? 'Pause' : 'Relancer'}
                            variant="ghost"
                          />
                          <AdminActionButton
                            action="ad.delete"
                            body={{ id: c.id }}
                            label="Supprimer"
                            variant="ghost"
                            confirm="Supprimer cette campagne et ses statistiques ?"
                          />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </KpiPanel>

      <KpiPanel title="Nouvelle campagne" subtitle="Heure locale. Liens en https uniquement.">
        <AdminForm
          action="ad.create"
          submitLabel="Créer la campagne"
          successMessage="Campagne créée."
          resetOnSuccess
          variant="secondary"
          fields={[
            { name: 'advertiser', label: 'Annonceur', type: 'text', required: true },
            { name: 'title', label: 'Texte de l’annonce', type: 'text', required: true },
            {
              name: 'linkUrl',
              label: 'Lien',
              type: 'url',
              required: true,
              placeholder: 'https://',
            },
            {
              name: 'imageUrl',
              label: 'Visuel (adresse de l’image)',
              type: 'url',
              placeholder: 'https://',
            },
            {
              name: 'slot',
              label: 'Emplacement',
              type: 'select',
              required: true,
              defaultValue: '1',
              options: [
                { value: '1', label: '1 · Gardes et Autour de moi' },
                { value: '2', label: '2 · Fiches des pharmacies' },
              ],
            },
            { name: 'startsAt', label: 'Début', type: 'datetime-local', required: true },
            { name: 'endsAt', label: 'Fin', type: 'datetime-local', required: true },
            {
              name: 'districtIds',
              label: 'Quartiers ciblés',
              type: 'multiselect',
              hint: 'Aucun coché : tous les quartiers.',
              options: districts.map((d) => ({ value: d.id, label: d.name })),
            },
          ]}
        />
      </KpiPanel>
    </>
  );
}
