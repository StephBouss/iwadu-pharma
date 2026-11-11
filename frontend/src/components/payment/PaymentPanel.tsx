'use client';

import { useEffect, useRef, useState, useTransition, type SubmitEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleAlert, FlaskConical, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Message } from '@/components/ui/Message';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api, ApiError } from '@/lib/api';
import { errorMessage, publicApi } from '@/lib/client/session';
import { formatDateTime, formatFcfa } from '@/lib/format';
import { cn } from '@/lib/utils';

// Paiement Mobile Money (maquette Banani « Paiement Mobile Money ») : choix
// de l'opérateur et du numéro, confirmation sur le téléphone, attente (la
// fenêtre se met à jour toute seule), puis reçu — ou refus, sans rien
// débloquer. Seul le webhook vérifié du prestataire débloque : cette
// fenêtre ne fait qu'attendre la réponse du serveur.

export type PaymentPurpose =
  | 'UNLOCK'
  | 'PASS_SOLO'
  | 'PASS_FAMILY'
  | 'PASS_FAMILY_ANNUAL'
  | 'PHARMACY_SUBSCRIPTION';

type Operator = 'AIRTEL' | 'MOOV';

interface Receipt {
  reference: string;
  paidAt: string | null;
  amount: number;
  operator: string | null;
}

type State =
  | { step: 'form' }
  | { step: 'pending'; orderId: string; deadline: number; simulated: boolean }
  | { step: 'paid'; receipt: Receipt | null }
  | { step: 'failed'; message: string };

const OPERATORS: { value: Operator; label: string }[] = [
  { value: 'AIRTEL', label: 'Airtel Money' },
  { value: 'MOOV', label: 'Moov Money' },
];
const OPERATOR_LABELS: Record<string, string> = { AIRTEL: 'Airtel Money', MOOV: 'Moov Money' };
const POLL_MS = 4000;
const FAILED_COPY = 'Aucun montant n’a été débité. Vérifiez votre solde puis réessayez.';

export interface PaymentPanelProps {
  purpose: PaymentPurpose;
  amount: number;
  /** « Cette ordonnance », « Pass Famille »… */
  title?: string | undefined;
  /** Ce que couvre le paiement, en une ligne. */
  description?: string | undefined;
  searchToken?: string | undefined;
  plan?: 'MONTHLY' | 'ANNUAL' | undefined;
  defaultPhone?: string | null | undefined;
  /** Paiement simulé (démonstration) : annoncé avant de payer. */
  simulated?: boolean | undefined;
  submitLabel?: string | undefined;
  /** Bouton du reçu : « Voir mes 4 pharmacies », « Voir mon Pass »… */
  doneLabel?: string | undefined;
  /** Page de connexion avec retour, si le paiement demande un compte. */
  loginHref?: string | undefined;
  /**
   * Après le reçu, une fois la page rechargée (état débloqué) : par exemple
   * fermer la fenêtre. Le rechargement est fait ici, pendant que le bouton
   * affiche son chargement, pour que le patient ne reste pas sans réponse.
   */
  onDone?: (() => void) | undefined;
  onCancel?: (() => void) | undefined;
}

export function PaymentPanel({
  purpose,
  amount,
  title,
  description,
  searchToken,
  plan,
  defaultPhone,
  simulated = false,
  submitLabel,
  doneLabel,
  loginHref,
  onDone,
  onCancel,
}: PaymentPanelProps) {
  const router = useRouter();
  const [operator, setOperator] = useState<Operator>('AIRTEL');
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [state, setState] = useState<State>({ step: 'form' });
  const [sending, setSending] = useState(false);
  const [loginNeeded, setLoginNeeded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const keyRef = useRef<string | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const [refreshing, startRefresh] = useTransition();
  const [leaving, setLeaving] = useState(false);

  // Rechargement terminé : la page montre l'état débloqué, on peut fermer.
  useEffect(() => {
    if (leaving && !refreshing) {
      setLeaving(false);
      onDone?.();
    }
  }, [leaving, refreshing, onDone]);

  async function check(orderId: string): Promise<void> {
    const res = await api<{ status: string; receipt: Receipt | null }>(`/api/payments/${orderId}`);
    if (res.status === 'PAID') setState({ step: 'paid', receipt: res.receipt });
    else if (res.status !== 'PENDING') {
      keyRef.current = null;
      setState({ step: 'failed', message: FAILED_COPY });
    }
  }

  // Attente de la confirmation : interrogation régulière + compte à rebours.
  useEffect(() => {
    if (state.step !== 'pending') return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => void check(state.orderId).catch(() => undefined), POLL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [state]);

  useEffect(() => {
    if (state.step === 'pending' && now > state.deadline) {
      // Dernière vérification, puis le paiement est considéré comme expiré.
      void check(state.orderId)
        .catch(() => undefined)
        .finally(() =>
          setState((s) =>
            s.step === 'pending'
              ? {
                  step: 'failed',
                  message: `Le paiement n’a pas été confirmé à temps. ${FAILED_COPY}`,
                }
              : s,
          ),
        );
    }
  }, [now, state]);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    if (phone.replace(/\D+/g, '').length < 8) {
      setPhoneError('Entrez votre numéro Mobile Money, par exemple 074 82 60 61.');
      phoneRef.current?.focus();
      return;
    }
    setPhoneError(undefined);
    setSending(true);
    setLoginNeeded(false);
    keyRef.current ??= crypto.randomUUID();
    try {
      const res = await publicApi<{
        orderId: string;
        status: string;
        timeoutSeconds: number;
        simulated: boolean;
      }>('/api/payments', {
        method: 'POST',
        headers: { 'Idempotency-Key': keyRef.current },
        body: {
          purpose,
          phone,
          operator,
          ...(searchToken ? { searchToken } : {}),
          ...(plan ? { plan } : {}),
        },
      });
      if (res.status === 'PAID') await check(res.orderId);
      else if (res.status !== 'PENDING') {
        keyRef.current = null;
        setState({ step: 'failed', message: FAILED_COPY });
      } else {
        setNow(Date.now());
        setState({
          step: 'pending',
          orderId: res.orderId,
          deadline: Date.now() + res.timeoutSeconds * 1000,
          simulated: res.simulated,
        });
      }
    } catch (err) {
      const code = err instanceof ApiError ? err.code : '';
      // Réponse claire du serveur : une nouvelle tentative prend une nouvelle clé.
      if (err instanceof ApiError && err.status > 0) keyRef.current = null;
      if (code === 'LOGIN_REQUIRED') setLoginNeeded(true);
      else if (code === 'PHONE_INVALID') {
        setPhoneError('Ce numéro n’est pas valide. Exemple : 074 82 60 61.');
        phoneRef.current?.focus();
      } else if (code === 'ALREADY_UNLOCKED') router.refresh();
      else setState({ step: 'failed', message: errorMessage(err, FAILED_COPY) });
    } finally {
      setSending(false);
    }
  }

  async function simulate(outcome: 'paid' | 'failed') {
    if (state.step !== 'pending') return;
    try {
      await publicApi('/api/dev/payment-simulator', {
        method: 'POST',
        body: { orderId: state.orderId, outcome },
      });
      await check(state.orderId);
    } catch (err) {
      setState({ step: 'failed', message: errorMessage(err, FAILED_COPY) });
    }
  }

  function done() {
    setLeaving(true);
    startRefresh(() => router.refresh());
  }

  const demoBanner = (simulated || (state.step === 'pending' && state.simulated)) && (
    <p className="type-body-small flex items-center gap-2 rounded-field border border-dashed border-outline px-4 py-3 text-ink-muted">
      <FlaskConical aria-hidden className="size-4 shrink-0 text-action" />
      Paiement de démonstration : aucun argent n’est débité.
    </p>
  );

  if (state.step === 'paid') {
    const r = state.receipt;
    return (
      <div role="status" className="flex flex-col gap-6">
        <div className="flex justify-center">
          <StatusBadge status="available">Payé</StatusBadge>
        </div>
        <h3 className="type-title-1 text-center text-ink">Paiement reçu</h3>
        {r && (
          <dl className="flex flex-col rounded-field border border-muted bg-ivory p-5">
            {[
              ['Référence', r.reference],
              ['Date', r.paidAt ? formatDateTime(new Date(r.paidAt)) : '—'],
              ['Montant', formatFcfa(r.amount)],
              ['Opérateur', r.operator ? (OPERATOR_LABELS[r.operator] ?? r.operator) : '—'],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between gap-3 border-b border-muted py-3 first:pt-0 last:border-b-0 last:pb-0"
              >
                <dt className="type-body-small text-ink-muted">{k}</dt>
                <dd
                  className={cn(
                    'type-body-strong text-ink tabular-nums',
                    k === 'Montant' && 'type-amount text-action',
                  )}
                >
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {demoBanner}
        <Button fullWidth size="lg" onClick={done} loading={leaving}>
          {doneLabel ?? 'Continuer'}
        </Button>
        <p className="type-caption text-center text-ink-muted">
          Votre reçu reste disponible dans Mon espace, ou par le lien de cette page.
        </p>
      </div>
    );
  }

  if (state.step === 'pending') {
    const left = Math.max(0, Math.ceil((state.deadline - now) / 1000));
    const minutes = Math.floor(left / 60);
    const seconds = String(left % 60).padStart(2, '0');
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative flex size-20 items-center justify-center">
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border-2 border-mint/60 motion-safe:animate-ping"
          />
          <span className="flex size-16 items-center justify-center rounded-full bg-action/15">
            <Smartphone aria-hidden className="size-8 text-action" />
          </span>
        </div>
        <div role="status" className="flex flex-col gap-2">
          <h3 className="type-title-1 text-ink">Validez le paiement sur votre téléphone</h3>
          <p className="type-body text-ink-muted">
            Saisissez votre code secret Mobile Money pour confirmer {formatFcfa(amount)}.
          </p>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full w-1/3 rounded-full bg-action motion-safe:animate-pulse" />
        </div>
        <p className="type-body-small text-ink-muted" aria-live="polite">
          En attente de la confirmation · {minutes}:{seconds}
        </p>
        {state.simulated && (
          <div className="flex w-full flex-col gap-3 rounded-field border border-dashed border-outline p-4">
            <p className="type-overline text-ink-muted">Paiement de démonstration</p>
            <p className="type-body-small text-ink-muted">
              Jouez le rôle du téléphone : le simulateur envoie une confirmation signée, comme le
              ferait le prestataire.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={() => void simulate('paid')}>
                Valider
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void simulate('failed')}>
                Refuser
              </Button>
            </div>
          </div>
        )}
        <button
          type="button"
          className="type-label min-h-11 text-action hover:underline"
          onClick={() => {
            keyRef.current = null;
            setState({
              step: 'failed',
              message:
                'Vérifiez le numéro et l’opérateur, puis réessayez. Rien n’est débité sans votre code secret.',
            });
          }}
        >
          Je n’ai rien reçu
        </button>
      </div>
    );
  }

  if (state.step === 'failed') {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-center">
          <StatusBadge status="error" />
        </div>
        <div className="flex items-start gap-3 rounded-field border border-error/20 bg-error-soft p-5">
          <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-error" />
          <div role="alert" className="flex flex-col gap-1">
            <p className="type-body-strong text-error">Paiement non confirmé</p>
            <p className="type-body-small text-ink">{state.message}</p>
          </div>
        </div>
        <Button fullWidth size="lg" onClick={() => setState({ step: 'form' })}>
          Réessayer
        </Button>
        <button
          type="button"
          className="type-label min-h-11 text-action hover:underline"
          onClick={() => {
            setPhone('');
            setState({ step: 'form' });
            requestAnimationFrame(() => phoneRef.current?.focus());
          }}
        >
          Utiliser un autre numéro
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {(title || description) && (
        <div className="flex flex-col gap-1 rounded-field border border-mint/20 bg-mint/10 p-4">
          {title && <p className="type-body-strong text-ink">{title}</p>}
          <p className="type-amount-lg text-brand">{formatFcfa(amount)}</p>
          {description && <p className="type-body-small text-ink-muted">{description}</p>}
        </div>
      )}
      {demoBanner}
      {loginNeeded && (
        <Message tone="info" title="Connectez-vous pour continuer.">
          {loginHref ? (
            <Link href={loginHref} className="font-semibold text-action hover:underline">
              Se connecter ou créer un compte
            </Link>
          ) : null}
        </Message>
      )}
      <fieldset className="flex flex-col gap-3">
        <legend className="type-label mb-3 text-ink-muted">Choisissez votre opérateur</legend>
        <div className="grid grid-cols-2 gap-3">
          {OPERATORS.map((op) => (
            <label key={op.value} className="relative flex cursor-pointer">
              <input
                type="radio"
                name="operator"
                value={op.value}
                checked={operator === op.value}
                onChange={() => setOperator(op.value)}
                className="peer sr-only"
              />
              <span className="type-body-strong flex min-h-14 w-full items-center gap-3 rounded-field border border-mint/30 bg-mint/5 px-4 text-ink peer-checked:border-2 peer-checked:border-action peer-checked:bg-action/10 peer-focus-visible:ring-2 peer-focus-visible:ring-action">
                <Smartphone aria-hidden className="size-5 shrink-0 text-action" />
                {op.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        ref={phoneRef}
        label="Numéro Mobile Money"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="074 82 60 61"
        value={phone}
        onChange={(e) => {
          setPhone(e.target.value);
          setPhoneError(undefined);
        }}
        error={phoneError}
        hint="Vous recevrez une demande de paiement sur ce téléphone."
      />
      <Button type="submit" fullWidth size="lg" loading={sending}>
        {submitLabel ?? `Payer ${formatFcfa(amount)}`}
      </Button>
      <p className="type-body-small text-center text-ink-muted">
        Rien n’est débité sans votre code secret.
      </p>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="type-label min-h-11 text-action hover:underline"
        >
          Annuler
        </button>
      )}
    </form>
  );
}
