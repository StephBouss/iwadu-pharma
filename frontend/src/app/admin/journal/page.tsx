import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { KpiPanel } from '@/components/admin/KpiBlocks';
import { formatDateTime } from '@/lib/format';
import { requirePageAdmin } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

export const metadata: Metadata = { title: 'Journal' };

const PAGE = 50;

function show(value: unknown): string {
  if (value === null || value === undefined) return '·';
  if (typeof value === 'string') return value;
  const text = JSON.stringify(value);
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}

export default async function AdminJournalPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  await requirePageAdmin('/admin/journal');
  const { page, action } = await searchParams;
  const n = Math.max(Number(page) || 1, 1);
  const where = action ? { action: { startsWith: action } } : {};
  const [rows, total] = await Promise.all([
    prisma.adminAction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (n - 1) * PAGE,
      take: PAGE,
      include: { actor: { select: { email: true, name: true } } },
    }),
    prisma.adminAction.count({ where }),
  ]);
  const pages = Math.max(Math.ceil(total / PAGE), 1);
  const link = (p: number) =>
    `/admin/journal?page=${p}${action ? `&action=${encodeURIComponent(action)}` : ''}`;

  return (
    <>
      <AdminHeader title="Journal" />
      <KpiPanel
        title={`${total} action${total > 1 ? 's' : ''} d’administration`}
        subtitle="Qui a fait quoi, quand, avec l’ancienne valeur"
      >
        <form action="/admin/journal" className="flex gap-2">
          <label htmlFor="q-action" className="sr-only">
            Filtrer par action
          </label>
          <input
            id="q-action"
            name="action"
            defaultValue={action ?? ''}
            placeholder="Ex. setting, pharmacy, order.refund"
            className="type-body-small h-11 w-full max-w-sm rounded-full border border-hairline bg-surface px-4 text-ink"
          />
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left">
            <thead>
              <tr className="type-caption text-ink-muted">
                <th scope="col" className="pb-2 font-medium">
                  Date
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Par
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Action
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Cible
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Détail (avant → après)
                </th>
              </tr>
            </thead>
            <tbody className="type-body-small divide-y divide-hairline align-top text-ink">
              {rows.map((r) => {
                const meta = (r.metadata ?? {}) as Record<string, unknown>;
                const hasDiff = 'before' in meta || 'after' in meta;
                return (
                  <tr key={r.id}>
                    <td className="py-2 whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                    <td className="py-2">{r.actor.name ?? r.actor.email}</td>
                    <td className="py-2 font-mono text-xs">{r.action}</td>
                    <td className="py-2 font-mono text-xs">
                      {r.targetType
                        ? `${r.targetType}${r.targetId ? ` · ${r.targetId}` : ''}`
                        : '·'}
                    </td>
                    <td className="py-2 font-mono text-xs break-all">
                      {hasDiff ? `${show(meta.before)} → ${show(meta.after)}` : show(meta)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <nav aria-label="Pages du journal" className="flex items-center gap-3">
            {n > 1 && (
              <Link href={link(n - 1)} className="type-label text-action hover:underline">
                ← Plus récentes
              </Link>
            )}
            <span className="type-caption text-ink-muted">
              Page {n} sur {pages}
            </span>
            {n < pages && (
              <Link href={link(n + 1)} className="type-label text-action hover:underline">
                Plus anciennes →
              </Link>
            )}
          </nav>
        )}
      </KpiPanel>
    </>
  );
}
