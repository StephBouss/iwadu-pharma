import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Camera, Gift, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { KpiPanel } from '@/components/admin/KpiBlocks';
import { StatCard } from '@/components/admin/StatCard';
import { PageHeading } from '@/components/dashboard/PageHeading';
import { ButtonLink } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDayMonth, formatGroupedInt, formatLongDate } from '@/lib/format';
import { PLAN_LABELS } from '@/lib/labels';
import { accountOverview } from '@/lib/server/iwadu/account';
import { getViewer, requirePageUser } from '@/lib/server/iwadu/viewer';
import { prisma } from '@/lib/server/prisma';

// Mon espace (maquette « Admin – Tableau de bord » appliquée au patient) :
// quatre indicateurs (recherches, carnet, crédits, ordonnance offerte), le
// Pass, les avantages, les dernières ordonnances. Un seul bouton principal :
// « Nouvelle ordonnance ».

export const metadata: Metadata = { title: 'Mon espace' };

export default async function AccountHomePage() {
  const user = await requirePageUser('/compte');
  const viewer = await getViewer();
  const [{ pass, state, upcoming, credits, offered, recent, fairUse }, carnetCount] =
    await Promise.all([
      accountOverview({ ...viewer, user }),
      prisma.searchSession.count({ where: { userId: user.id } }),
    ]);

  // Carte « recherches » : sans Pass, avec Pass illimité, ou compteur restant.
  const searches =
    !pass || !state
      ? { label: 'Mon Pass', value: 'Aucun' }
      : state.remaining === null
        ? { label: 'Recherches du Pass', value: 'Illimitées' }
        : { label: 'Recherches restantes', value: formatGroupedInt(state.remaining) };

  return (
    <>
      <PageHeading
        title={user.name ? `Bonjour ${user.name}` : 'Mon espace'}
        subtitle={formatLongDate(new Date())}
      />

      <section
        aria-label="Mes indicateurs"
        className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 xl:grid-cols-4 xl:gap-6"
      >
        <StatCard icon={Search} label={searches.label} value={searches.value} accent />
        <StatCard
          icon={BookOpen}
          label="Ordonnances au carnet"
          value={formatGroupedInt(carnetCount)}
        />
        <StatCard
          icon={ShieldCheck}
          label="Crédits « Trajet utile »"
          value={formatGroupedInt(credits)}
        />
        <StatCard
          icon={Gift}
          label="Ordonnance offerte"
          value={offered ? '1' : '0'}
          unit={offered ? 'disponible' : 'déjà utilisée'}
        />
      </section>

      <GlassPanel className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center lg:p-6">
        <div className="flex flex-1 flex-col gap-1">
          <h2 className="font-display text-xl leading-7 font-bold text-brand">
            Une nouvelle ordonnance ?
          </h2>
          <p className="type-body-small text-ink-muted">
            Photographiez la liste des médicaments : nous trouvons la pharmacie qui a tout, près de
            vous.
          </p>
        </div>
        <ButtonLink href="/ordonnance?depart=photo" leadingIcon={<Camera aria-hidden />}>
          Nouvelle ordonnance
        </ButtonLink>
      </GlassPanel>

      <div className="grid gap-6 md:grid-cols-2 xl:gap-8">
        <KpiPanel
          title="Mon Pass"
          href="/compte/pass"
          linkLabel={pass ? 'Renouveler mon Pass' : 'Découvrir les Pass'}
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex size-12 shrink-0 items-center justify-center rounded-field bg-action/15 text-action"
            >
              <Sparkles className="size-6" />
            </span>
            <div className="flex min-w-0 flex-col gap-2">
              {pass && state ? (
                <>
                  <p className="type-body-strong text-ink">
                    {PLAN_LABELS[pass.plan] ?? 'Pass'} actif jusqu’au{' '}
                    {formatDayMonth(pass.endsAt).toLowerCase()}.
                  </p>
                  <p className="type-body-small text-ink-muted">
                    {state.remaining === null
                      ? `Recherches illimitées${fairUse ? ` · usage raisonnable : ${fairUse} nouvelles recherches par jour au plus` : ''}. Aujourd’hui : ${state.usedToday}.`
                      : `Recherches utilisées : ${state.usedInPeriod} · il vous en reste ${state.remaining}.`}
                  </p>
                  {state.block === 'SOLO_EXHAUSTED' && (
                    <StatusBadge status="low">Pass Solo épuisé</StatusBadge>
                  )}
                  {state.block === 'DAILY_MAX' && (
                    <StatusBadge status="low">Recherches du jour atteintes</StatusBadge>
                  )}
                </>
              ) : (
                <p className="type-body-small text-ink-muted">
                  Pas de Pass en cours. Un Pass vous évite de payer chaque ordonnance.
                </p>
              )}
              {upcoming && (
                <p className="type-body-small text-ink-muted">
                  Pass suivant à partir du {formatDayMonth(upcoming.startsAt).toLowerCase()}.
                </p>
              )}
            </div>
          </div>
        </KpiPanel>

        <KpiPanel title="Offert et crédits" href="/compte/paiements" linkLabel="Mes reçus">
          <ul className="flex flex-col gap-4">
            <li className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-action/10 text-action"
              >
                <Gift className="size-5" />
              </span>
              <p className="type-body-small text-ink">
                {offered
                  ? 'Votre première ordonnance complète est offerte : utilisez-la depuis un résultat.'
                  : 'Votre ordonnance offerte a été utilisée.'}
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-action/10 text-action"
              >
                <ShieldCheck className="size-5" />
              </span>
              <p className="type-body-small text-ink">
                {credits > 0
                  ? `${credits} crédit${credits > 1 ? 's' : ''} « Trajet utile » à utiliser depuis un résultat.`
                  : 'Aucun crédit. Une pharmacie n’avait pas tout ? Signalez-le depuis le résultat.'}
              </p>
            </li>
          </ul>
        </KpiPanel>
      </div>

      <KpiPanel title="Dernières ordonnances" href="/compte/ordonnances" linkLabel="Tout le carnet">
        {recent.length === 0 ? (
          <p className="type-body-small text-ink-muted">
            Vos ordonnances apparaîtront ici, classées par prénom.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-hairline">
            {recent.map((r) => (
              <li key={r.token} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-action/10 text-action"
                >
                  <BookOpen className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="type-body-strong text-ink">{r.label ?? 'Sans prénom'}</span>
                  <span className="type-caption truncate text-ink-muted">
                    {formatDayMonth(r.createdAt)} · {r.medicines.join(', ')}
                  </span>
                </span>
                <Link
                  href={r.expired ? `/ordonnance?relancer=${r.token}` : `/resultat/${r.token}`}
                  className="type-label min-h-11 shrink-0 content-center text-action hover:underline"
                >
                  {r.expired ? 'Relancer' : 'Rouvrir'}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </KpiPanel>
    </>
  );
}
