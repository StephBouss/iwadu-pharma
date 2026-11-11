'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BellOff, BellRing, Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Message } from '@/components/ui/Message';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api } from '@/lib/api';
import { errorMessage, publicApi } from '@/lib/client/session';
import { formatClock, formatFcfa } from '@/lib/format';
import { formatGabonPhone } from '@/lib/phone';
import { RESERVATION_STATUS_LABELS, reservationTone } from '@/lib/labels';
import type { ProReservation } from '@/lib/server/iwadu/pro';
import { cn } from '@/lib/utils';

// Réservations de la pharmacie, à jour toutes les 10 secondes. Une alerte
// sonore (activée d'un geste, exigence des navigateurs) signale chaque
// nouvelle réservation. Colonnes : à traiter, en préparation, prêtes.

const POLL_MS = 10_000;
const COLUMNS = [
  { key: 'SENT', title: 'À traiter', empty: 'Aucune nouvelle réservation.' },
  { key: 'ACCEPTED', title: 'En préparation', empty: 'Rien en préparation.' },
  { key: 'READY', title: 'Prêtes à retirer', empty: 'Aucune réservation prête.' },
] as const;

function beep(ctx: AudioContext) {
  const now = ctx.currentTime;
  [0, 0.25].forEach((offset) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.22);
  });
}

export function ReservationsBoard({ initial }: { initial: ProReservation[] }) {
  const [rows, setRows] = useState(initial);
  const [offline, setOffline] = useState(false);
  const [sound, setSound] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const known = useRef(new Set(initial.filter((r) => r.status === 'SENT').map((r) => r.id)));
  const audio = useRef<AudioContext | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ reservations: ProReservation[] }>('/api/pro/reservations');
      const fresh = res.reservations.filter((r) => r.status === 'SENT' && !known.current.has(r.id));
      fresh.forEach((r) => known.current.add(r.id));
      if (fresh.length > 0 && audio.current) beep(audio.current);
      if (fresh.length > 0 && document.visibilityState !== 'visible') {
        document.title = `(${fresh.length}) Nouvelle réservation · Iwadu Pharma`;
      }
      setRows(res.reservations);
      setOffline(false);
      setUpdatedAt(new Date());
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => void load(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        document.title = 'Réservations · Espace pharmacie · Iwadu Pharma';
        void load();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  function toggleSound() {
    if (sound) {
      setSound(false);
      void audio.current?.close();
      audio.current = null;
      return;
    }
    const Ctx = window.AudioContext;
    if (!Ctx) return;
    audio.current = new Ctx();
    beep(audio.current);
    setSound(true);
  }

  const history = rows.filter((r) => !['SENT', 'ACCEPTED', 'READY'].includes(r.status));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-caption text-ink-muted" aria-live="polite">
          Mis à jour à {formatClock(updatedAt)} · actualisation automatique
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-pressed={sound}
          leadingIcon={sound ? <BellRing aria-hidden /> : <BellOff aria-hidden />}
          onClick={toggleSound}
        >
          {sound ? 'Alerte sonore activée' : 'Activer l’alerte sonore'}
        </Button>
      </div>
      {offline && (
        <Message tone="offline" title="Connexion perdue. Nouvel essai dans quelques secondes." />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = rows.filter((r) => r.status === col.key);
          return (
            <section
              key={col.key}
              aria-labelledby={`col-${col.key}`}
              className="flex flex-col gap-3"
            >
              <h2 id={`col-${col.key}`} className="type-title-3 flex items-center gap-2 text-ink">
                {col.title}
                <span className="type-label rounded-full bg-mint-soft px-2.5 py-0.5 text-action">
                  {items.length}
                </span>
              </h2>
              {items.length === 0 ? (
                <p className="type-body-small rounded-card border border-dashed border-hairline p-4 text-ink-muted">
                  {col.empty}
                </p>
              ) : (
                items.map((r) => <ReservationCard key={r.id} r={r} onChanged={load} />)
              )}
            </section>
          );
        })}
      </div>

      {history.length > 0 && (
        <details className="group">
          <summary className="type-label cursor-pointer text-action hover:underline">
            Historique récent ({history.length})
          </summary>
          <ul className="mt-3 flex flex-col divide-y divide-hairline rounded-card bg-surface/70">
            {history.map((r) => (
              <li
                key={r.id}
                className="type-body-small flex flex-wrap items-center gap-3 p-3 text-ink"
              >
                <span className="font-semibold">{r.code}</span>
                <span className="text-ink-muted">{formatClock(new Date(r.createdAt))}</span>
                <span className="min-w-0 flex-1 truncate">
                  {r.items.map((i) => `${i.label} × ${i.quantity}`).join(' · ')}
                </span>
                <StatusBadge status={reservationTone(r.status)}>
                  {RESERVATION_STATUS_LABELS[r.status]}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function ReservationCard({ r, onChanged }: { r: ProReservation; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState('');
  const [missing, setMissing] = useState(true);

  async function act(action: 'accept' | 'ready' | 'refuse' | 'picked_up') {
    setBusy(action);
    setError(null);
    try {
      await publicApi(`/api/pro/reservations/${r.id}`, {
        method: 'POST',
        body: {
          action,
          ...(action === 'refuse' ? { reason: reason.trim() || undefined, missing } : {}),
        },
      });
      await onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <GlassPanel
      as="article"
      className={cn('flex flex-col gap-3 p-4', r.status === 'SENT' && 'ring-2 ring-action')}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="type-title-3 text-ink">{r.code}</p>
          <p className="type-caption text-ink-muted">
            Reçue à {formatClock(new Date(r.createdAt))} · expire à{' '}
            {formatClock(new Date(r.expiresAt))}
          </p>
        </div>
        <StatusBadge status={reservationTone(r.status)}>
          {RESERVATION_STATUS_LABELS[r.status]}
        </StatusBadge>
      </div>
      <ul className="flex flex-col gap-1">
        {r.items.map((i) => (
          <li key={i.label} className="type-body-small text-ink">
            {i.label} × {i.quantity}
          </li>
        ))}
      </ul>
      <p className="type-body-small text-ink-muted">
        {r.customer}
        {r.forMember ? ` (pour ${r.forMember})` : ''}
        {r.totalFcfa !== null ? ` · ${formatFcfa(r.totalFcfa)} estimés` : ''}
      </p>
      {r.phone && (
        <a
          href={`tel:${r.phone}`}
          className="type-label flex items-center gap-2 text-action hover:underline"
        >
          <Phone aria-hidden className="size-4" /> {formatGabonPhone(r.phone)}
        </a>
      )}
      {error && (
        <p role="alert" className="type-body-small text-error">
          {error}
        </p>
      )}

      {refusing ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="type-label text-ink">Motif (envoyé au patient)</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              placeholder="Ex. rupture de stock"
              className="type-body h-11 rounded-field border border-outline bg-surface px-3 text-ink"
            />
          </label>
          <label className="type-body-small flex items-center gap-2 text-ink">
            <input
              type="checkbox"
              checked={missing}
              onChange={(e) => setMissing(e.target.checked)}
              className="size-4 accent-action"
            />
            Un médicament manquait alors que le stock l’affichait
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={busy === 'refuse'}
              onClick={() => void act('refuse')}
            >
              Confirmer le refus
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setRefusing(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {r.status === 'SENT' && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={busy === 'accept'}
              onClick={() => void act('accept')}
            >
              Accepter
            </Button>
          )}
          {r.status === 'ACCEPTED' && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={busy === 'ready'}
              onClick={() => void act('ready')}
            >
              Prête
            </Button>
          )}
          {r.status === 'READY' && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="col-span-2"
              loading={busy === 'picked_up'}
              onClick={() => void act('picked_up')}
            >
              Retirée par le patient
            </Button>
          )}
          {(r.status === 'SENT' || r.status === 'ACCEPTED') && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setRefusing(true)}>
              Refuser
            </Button>
          )}
        </div>
      )}
    </GlassPanel>
  );
}
