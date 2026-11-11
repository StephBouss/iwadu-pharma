'use client';

import { useState, type SubmitEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Message } from '@/components/ui/Message';
import { errorMessage, publicApi } from '@/lib/client/session';
import {
  formatDayRanges,
  parseDayRanges,
  WEEKDAY_LABELS,
  type WeeklyHours,
} from '@/lib/opening-hours';

// Fiche de la pharmacie : contact, horaires par jour, assurances acceptées,
// affichage des prix. Les gardes sont fixées par l'administration.

export function PharmacyProfileForm({
  initial,
  insurances,
}: {
  initial: {
    phone: string | null;
    address: string | null;
    openingHours: WeeklyHours;
    showPrices: boolean;
    insuranceIds: string[];
  };
  insurances: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [phone, setPhone] = useState(initial.phone ?? '');
  const [address, setAddress] = useState(initial.address ?? '');
  const [days, setDays] = useState(() =>
    Array.from({ length: 7 }, (_, i) => formatDayRanges(initial.openingHours[String(i + 1)])),
  );
  const [dayErrors, setDayErrors] = useState<(string | null)[]>(Array(7).fill(null));
  const [showPrices, setShowPrices] = useState(initial.showPrices);
  const [insuranceIds, setInsuranceIds] = useState(new Set(initial.insuranceIds));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setSaved(false);
    const parsed = days.map(parseDayRanges);
    const errs = parsed.map((p) =>
      p === null ? 'Format attendu : 08:00-12:30, 15:00-20:00' : null,
    );
    setDayErrors(errs);
    if (errs.some(Boolean)) return setError('Corrigez les horaires signalés.');
    const openingHours: Record<string, [string, string][]> = {};
    parsed.forEach((p, i) => {
      openingHours[String(i + 1)] = p ?? [];
    });
    setBusy(true);
    try {
      await publicApi('/api/pro/pharmacy', {
        method: 'PATCH',
        body: {
          phone: phone.trim() || null,
          address: address.trim() || null,
          openingHours,
          showPrices,
          insuranceIds: [...insuranceIds],
        },
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {error && <Message tone="error" title={error} />}
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Téléphone de la pharmacie"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Field
          label="Adresse ou repère"
          autoComplete="street-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="type-title-3 mb-2 text-ink">Horaires d’ouverture</legend>
        <p className="type-body-small text-ink-muted">
          Une ou plusieurs plages par jour, par exemple « 08:00-12:30, 15:00-20:00 ». Laissez vide
          si fermé.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {WEEKDAY_LABELS.map((label, i) => (
            <Field
              key={label}
              label={label}
              value={days[i] ?? ''}
              placeholder="Fermé"
              autoComplete="off"
              error={dayErrors[i] ?? undefined}
              onChange={(e) => {
                const v = e.target.value;
                setDays((d) => d.map((x, j) => (j === i ? v : x)));
                setDayErrors((d) => d.map((x, j) => (j === i ? null : x)));
              }}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="type-title-3 mb-2 text-ink">Assurances acceptées</legend>
        <div className="grid gap-1 sm:grid-cols-2">
          {insurances.map((ins) => (
            <label key={ins.id} className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={insuranceIds.has(ins.id)}
                onChange={(e) =>
                  setInsuranceIds((s) => {
                    const n = new Set(s);
                    if (e.target.checked) n.add(ins.id);
                    else n.delete(ins.id);
                    return n;
                  })
                }
                className="size-5 accent-action"
              />
              <span className="type-body text-ink">{ins.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={showPrices}
          onChange={(e) => setShowPrices(e.target.checked)}
          className="mt-1 size-5 accent-action"
        />
        <span className="flex flex-col">
          <span className="type-body-strong text-ink">Afficher mes prix</span>
          <span className="type-body-small text-ink-muted">
            Sinon, les patients voient « Prix en pharmacie ».
          </span>
        </span>
      </label>

      {saved && (
        <p role="status" className="type-body-small text-available">
          Fiche enregistrée.
        </p>
      )}
      <Button type="submit" fullWidth loading={busy}>
        Enregistrer ma fiche
      </Button>
    </form>
  );
}
