import type { Metadata } from 'next';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { PageHeading, SectionTitle } from '@/components/dashboard/PageHeading';
import { ButtonLink } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatClock, formatDayMonth } from '@/lib/format';
import { listCarnet, type CarnetEntry } from '@/lib/server/iwadu/account';
import { requirePageUser } from '@/lib/server/iwadu/viewer';

// Carnet d'ordonnances : classées par prénom (libre, donné par le titulaire).
// Rouvrir une ordonnance encore valable est gratuit ; la relancer pour
// vérifier le stock compte comme une nouvelle recherche.

export const metadata: Metadata = { title: 'Carnet' };

export default async function CarnetPage() {
  const user = await requirePageUser('/compte/ordonnances');
  const rows = await listCarnet(user.id);
  const groups = new Map<string, CarnetEntry[]>();
  for (const r of rows) {
    const key = r.label ?? '';
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const ordered = [...groups.entries()].sort(([a], [b]) =>
    a === '' ? 1 : b === '' ? -1 : a.localeCompare(b, 'fr'),
  );

  return (
    <>
      <PageHeading
        title="Carnet d’ordonnances"
        subtitle="Classées par prénom. Relancez une ordonnance sans nouvelle photo, par exemple pour un traitement à renouveler."
      />
      {rows.length === 0 ? (
        <GlassPanel className="flex flex-col gap-4 p-5 lg:p-6">
          <p className="type-body text-ink">
            Aucune ordonnance pour le moment. Depuis un résultat, donnez-lui un prénom pour la
            classer ici.
          </p>
          <ButtonLink href="/ordonnance?depart=photo" fullWidth>
            Nouvelle ordonnance
          </ButtonLink>
        </GlassPanel>
      ) : (
        ordered.map(([label, entries]) => (
          <section
            key={label || 'sans'}
            aria-label={label || 'Sans prénom'}
            className="flex flex-col gap-4"
          >
            <SectionTitle>{label || 'Sans prénom'}</SectionTitle>
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
              {entries.map((r) => (
                <li key={r.token}>
                  <GlassPanel as="article" className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="type-caption text-ink-muted">
                        {formatDayMonth(r.createdAt)} à {formatClock(r.createdAt)}
                      </p>
                      {r.unlocked ? (
                        <StatusBadge status="available">Débloquée</StatusBadge>
                      ) : (
                        <StatusBadge status="unavailable">Aperçu</StatusBadge>
                      )}
                    </div>
                    <ul className="flex flex-col gap-0.5">
                      {r.medicines.map((m) => (
                        <li key={m} className="type-body-small text-ink">
                          {m}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex flex-wrap gap-x-4">
                      {!r.expired && (
                        <Link
                          href={`/resultat/${r.token}`}
                          className="type-label min-h-11 content-center text-action hover:underline"
                        >
                          Rouvrir
                        </Link>
                      )}
                      <Link
                        href={`/ordonnance?relancer=${r.token}`}
                        className="type-label flex min-h-11 items-center gap-1.5 text-action hover:underline"
                      >
                        <RefreshCw aria-hidden className="size-4" />
                        Relancer le stock
                      </Link>
                    </div>
                    {!r.expired && (
                      <p className="type-caption text-ink-muted">
                        Lien valable jusqu’au {formatDayMonth(r.expiresAt).toLowerCase()} à{' '}
                        {formatClock(r.expiresAt)}.
                      </p>
                    )}
                  </GlassPanel>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
