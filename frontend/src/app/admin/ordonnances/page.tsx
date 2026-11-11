import type { Metadata } from 'next';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { KpiPanel } from '@/components/admin/KpiBlocks';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime } from '@/lib/format';
import { requirePageAdmin } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

export const metadata: Metadata = { title: 'Ordonnances' };

const SOURCE: Record<string, string> = {
  PHOTO: 'Photo lue par l’IA',
  MANUAL: 'Saisie à la main',
  NAME: 'Recherche par nom',
};
const FAILURE: Record<string, string> = {
  unreadable: 'Illisible',
  refused: 'Refusée par le modèle',
  error: 'Erreur technique',
  unconfigured: 'IA non configurée',
};

export default async function AdminPrescriptionsPage() {
  await requirePageAdmin('/admin/ordonnances');
  const [sessions, reads, districts] = await Promise.all([
    prisma.searchSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        createdAt: true,
        source: true,
        items: true,
        completeCount: true,
        partialCount: true,
        hasInsurance: true,
        districtId: true,
        userId: true,
        unlocks: { select: { kind: true } },
      },
    }),
    prisma.prescriptionRead.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.district.findMany({ select: { id: true, name: true } }),
  ]);

  return (
    <>
      <AdminHeader title="Ordonnances" />
      <p className="type-body-small text-ink-muted">
        Aucune photo n’est conservée. Seuls la liste validée, le quartier et le résultat sont
        gardés.
      </p>
      <KpiPanel title="Dernières recherches">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left">
            <thead>
              <tr className="type-caption text-ink-muted">
                <th scope="col" className="pb-2 font-medium">
                  Date
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Origine
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  Médicaments
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Quartier
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Résultat
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Déblocage
                </th>
              </tr>
            </thead>
            <tbody className="type-body-small divide-y divide-hairline text-ink">
              {sessions.map((s) => {
                const kinds = [...new Set(s.unlocks.map((u) => u.kind))];
                return (
                  <tr key={s.id}>
                    <td className="py-2">{formatDateTime(s.createdAt)}</td>
                    <td className="py-2">
                      {SOURCE[s.source] ?? s.source}
                      {s.hasInsurance ? ' · assuré' : ''}
                      {s.userId ? ' · compte' : ''}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {(s.items as unknown[]).length}
                    </td>
                    <td className="py-2">
                      {districts.find((d) => d.id === s.districtId)?.name ?? '·'}
                    </td>
                    <td className="py-2">
                      {s.completeCount > 0 ? (
                        <StatusBadge status="available">{`${s.completeCount} complète${s.completeCount > 1 ? 's' : ''}`}</StatusBadge>
                      ) : s.partialCount > 0 ? (
                        <StatusBadge status="low">{`${s.partialCount} partielle${s.partialCount > 1 ? 's' : ''}`}</StatusBadge>
                      ) : (
                        <StatusBadge status="unavailable">Rien trouvé</StatusBadge>
                      )}
                    </td>
                    <td className="py-2">
                      {kinds.length === 0
                        ? 'Gratuit seulement'
                        : kinds
                            .map((k) => (k === 'PAID' ? 'Payé' : k === 'PASS' ? 'Pass' : 'Offert'))
                            .join(', ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </KpiPanel>

      <KpiPanel title="Lectures par l’IA" subtitle="Durée, lignes lues et corrigées, coût estimé">
        {reads.length === 0 ? (
          <p className="type-body-small text-ink-muted">Aucune lecture pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left">
              <thead>
                <tr className="type-caption text-ink-muted">
                  <th scope="col" className="pb-2 font-medium">
                    Date
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    Issue
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Durée
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Lignes lues
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Corrigées
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Coût
                  </th>
                </tr>
              </thead>
              <tbody className="type-body-small divide-y divide-hairline text-ink tabular-nums">
                {reads.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2">{formatDateTime(r.createdAt)}</td>
                    <td className="py-2">
                      {r.failed ? (
                        <StatusBadge status="error">
                          {FAILURE[r.failureReason ?? ''] ?? 'Échec'}
                        </StatusBadge>
                      ) : (
                        <StatusBadge status="available">Lue</StatusBadge>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {(r.durationMs / 1000).toFixed(1).replace('.', ',')} s
                    </td>
                    <td className="py-2 text-right">{r.linesRead}</td>
                    <td className="py-2 text-right">{r.linesCorrected ?? '·'}</td>
                    <td className="py-2 text-right">
                      {r.costMicroUsd === null
                        ? '·'
                        : `${(r.costMicroUsd / 1_000_000).toFixed(3).replace('.', ',')} $`}
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
