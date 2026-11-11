'use client';

import { useState, type SubmitEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Field } from '@/components/ui/Field';
import { Message } from '@/components/ui/Message';
import { PasswordField } from '@/components/ui/PasswordField';
import { useAuth } from '@/contexts/AuthContext';
import { authErrorMessage } from '@/lib/client/auth-errors';
import { errorMessage, publicApi, syncCsrfFromCookie } from '@/lib/client/session';

// Formulaires de l'espace patient : profil (téléphone, assurance), mot de
// passe, proches, suppression du compte, enregistrement d'une ordonnance.

type Rate = '70' | '80' | '90' | '100' | 'other';
const RATES: { value: Rate; label: string }[] = [
  { value: '70', label: '70 %' },
  { value: '80', label: '80 %' },
  { value: '90', label: '90 %' },
  { value: '100', label: '100 %' },
  { value: 'other', label: 'Autre' },
];

function Saved({ text }: { text: string | null }) {
  return text ? (
    <p role="status" className="type-body-small text-available">
      {text}
    </p>
  ) : null;
}

export function ProfileForm({
  initial,
  insurances,
}: {
  initial: {
    name: string | null;
    phone: string | null;
    insuranceId: string | null;
    coverageRate: number | null;
  };
  insurances: { id: string; name: string }[];
}) {
  const router = useRouter();
  const preset = initial.coverageRate
    ? RATES.find((r) => r.value === String(initial.coverageRate))
    : undefined;
  const [name, setName] = useState(initial.name ?? '');
  const [phone, setPhone] = useState(initial.phone ?? '');
  const [hasInsurance, setHasInsurance] = useState<'yes' | 'no'>(
    initial.coverageRate ? 'yes' : 'no',
  );
  const [insuranceId, setInsuranceId] = useState(initial.insuranceId ?? '');
  const [rate, setRate] = useState<Rate | null>(
    preset ? preset.value : initial.coverageRate ? 'other' : null,
  );
  const [other, setOther] = useState(
    preset || !initial.coverageRate ? '' : String(initial.coverageRate),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setSaved(null);
    let coverageRate: number | null = null;
    if (hasInsurance === 'yes') {
      coverageRate = rate === 'other' ? Number(other) : rate ? Number(rate) : NaN;
      if (!Number.isInteger(coverageRate) || coverageRate < 1 || coverageRate > 100) {
        setError('Indiquez un taux de prise en charge entre 1 et 100.');
        return;
      }
    }
    setBusy(true);
    try {
      await publicApi('/api/me/profile', {
        method: 'PATCH',
        body: {
          name: name.trim() || null,
          phone: phone.trim() || null,
          insuranceId: hasInsurance === 'yes' && insuranceId ? insuranceId : null,
          coverageRate,
        },
      });
      setSaved('Profil enregistré.');
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {error && <Message tone="error" title={error} />}
      <Field
        label="Nom (facultatif)"
        name="name"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Field
        label="Téléphone (facultatif)"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="074 82 60 61"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        hint="Proposé pour vos paiements Mobile Money."
      />
      <ChoiceChips
        legend="Avez-vous une assurance santé ?"
        name="hasInsurance"
        options={[
          { value: 'yes', label: 'Oui' },
          { value: 'no', label: 'Non' },
        ]}
        value={hasInsurance}
        onChange={setHasInsurance}
      />
      {hasInsurance === 'yes' && (
        <>
          <label className="flex flex-col gap-2">
            <span className="type-label text-ink">Votre assurance</span>
            <select
              value={insuranceId}
              onChange={(e) => setInsuranceId(e.target.value)}
              className="type-body h-12 w-full rounded-field border border-outline bg-surface px-4 text-ink"
            >
              <option value="">Je ne sais pas / autre</option>
              {insurances.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
          <ChoiceChips
            legend="Taux de prise en charge"
            name="rate"
            options={RATES}
            value={rate}
            onChange={setRate}
          />
          {rate === 'other' && (
            <Field
              label="Taux en pourcentage"
              inputMode="numeric"
              maxLength={3}
              value={other}
              onChange={(e) => setOther(e.target.value.replace(/\D+/g, ''))}
            />
          )}
        </>
      )}
      <Saved text={saved} />
      <Button type="submit" fullWidth loading={busy}>
        Enregistrer
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const { refresh } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setSaved(null);
    if (next.length < 10)
      return setError('Le nouveau mot de passe doit faire au moins 10 caractères.');
    setBusy(true);
    try {
      await publicApi('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword: current, newPassword: next },
      });
      await refresh();
      setCurrent('');
      setNext('');
      setSaved('Mot de passe modifié. Vos autres appareils sont déconnectés.');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {error && <Message tone="error" title={error} />}
      <input type="text" name="username" autoComplete="username" hidden readOnly />
      <PasswordField
        label="Mot de passe actuel"
        autoComplete="current-password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
      />
      <PasswordField
        label="Nouveau mot de passe"
        autoComplete="new-password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        hint="Au moins 10 caractères."
      />
      <Saved text={saved} />
      <Button type="submit" variant="secondary" fullWidth loading={busy}>
        Changer le mot de passe
      </Button>
    </form>
  );
}

export function FamilyForm({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || disabled) return;
    setError(null);
    if (!name.trim()) return setError('Entrez le prénom de votre proche.');
    setBusy(true);
    try {
      await publicApi('/api/me/family', {
        method: 'POST',
        body: { name: name.trim(), relation: relation.trim() || null },
      });
      setName('');
      setRelation('');
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {error && <Message tone="error" title={error} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Prénom"
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
        />
        <Field
          label="Lien (facultatif)"
          placeholder="Enfant, parent…"
          autoComplete="off"
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
          disabled={disabled}
        />
      </div>
      <Button
        type="submit"
        fullWidth
        loading={busy}
        disabled={disabled}
        leadingIcon={<UserPlus aria-hidden />}
      >
        Ajouter ce proche
      </Button>
    </form>
  );
}

export function DeleteAccountForm() {
  const { logout } = useAuth();
  const router = useRouter();
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (confirm.trim().toUpperCase() !== 'SUPPRIMER')
      return setError('Tapez SUPPRIMER pour confirmer.');
    setBusy(true);
    try {
      await publicApi('/api/me/delete', { method: 'POST', body: { confirm: 'SUPPRIMER' } });
      syncCsrfFromCookie();
      await logout().catch(() => undefined);
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {error && <Message tone="error" title={error} />}
      <p className="type-body-small text-ink">
        Vos données personnelles et votre carnet d’ordonnances seront effacés. Cette action est
        définitive.
      </p>
      <Field
        label="Tapez SUPPRIMER pour confirmer"
        autoComplete="off"
        autoCapitalize="characters"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      <Button type="submit" variant="ghost" fullWidth loading={busy} className="text-error">
        Supprimer mon compte
      </Button>
    </form>
  );
}

export function SavePrescriptionButton({ searchToken }: { searchToken: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  async function save() {
    setState('busy');
    try {
      await publicApi('/api/saved-prescriptions', { method: 'POST', body: { searchToken } });
      setState('done');
      setMessage('Ordonnance enregistrée dans votre compte.');
    } catch (err) {
      setState('error');
      setMessage(errorMessage(err));
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={state === 'busy' || state === 'done'}
        onClick={() => void save()}
        className="type-label flex h-11 items-center gap-2 self-start rounded-full px-3 text-action hover:bg-mint-soft/60 disabled:opacity-60"
      >
        <Bookmark aria-hidden className="size-4" />
        {state === 'done' ? 'Enregistrée' : 'Enregistrer cette ordonnance'}
      </button>
      {message && (
        <p
          role="status"
          className={state === 'error' ? 'type-caption text-error' : 'type-caption text-ink-muted'}
        >
          {message}
        </p>
      )}
    </div>
  );
}

/** Classe l'ordonnance dans le carnet du titulaire, sous un prénom libre. */
export function CarnetLabelForm({
  searchToken,
  initialLabel,
}: {
  searchToken: string;
  initialLabel: string | null;
}) {
  const [label, setLabel] = useState(initialLabel ?? '');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  async function save(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('busy');
    try {
      await publicApi(`/api/searches/${searchToken}`, {
        method: 'PATCH',
        body: { label: label.trim() || null },
      });
      setState('done');
      setMessage(
        label.trim()
          ? `Classée dans votre carnet, pour ${label.trim()}.`
          : 'Classée dans votre carnet, sans prénom.',
      );
    } catch (err) {
      setState('error');
      setMessage(errorMessage(err));
    }
  }
  return (
    <form
      onSubmit={save}
      className="flex flex-col gap-2 rounded-card border border-hairline bg-surface/70 p-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field
          label="Pour qui ? Classer dans mon carnet"
          name="carnet"
          placeholder="Prénom"
          maxLength={40}
          autoComplete="off"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            setState('idle');
          }}
          className="flex-1"
        />
        <Button
          type="submit"
          variant="secondary"
          loading={state === 'busy'}
          leadingIcon={<Bookmark aria-hidden />}
        >
          Enregistrer
        </Button>
      </div>
      {message && (
        <p
          role="status"
          className={state === 'error' ? 'type-caption text-error' : 'type-caption text-ink-muted'}
        >
          {message}
        </p>
      )}
    </form>
  );
}
