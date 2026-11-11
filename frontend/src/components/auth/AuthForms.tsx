'use client';

import { useState, type SubmitEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Message } from '@/components/ui/Message';
import { PasswordField } from '@/components/ui/PasswordField';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api';
import { authErrorMessage, safeNext } from '@/lib/client/auth-errors';
import { publicApi, syncCsrfFromCookie } from '@/lib/client/session';

// Connexion, création de compte (code reçu par e-mail, sur la même page)
// et mot de passe oublié. Les cookies de session sont posés par le
// serveur ; on relit ensuite le compte pour mettre à jour l'en-tête.

const PASSWORD_HINT = 'Au moins 10 caractères. Une phrase facile à retenir fonctionne bien.';

function cleanCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .slice(0, 8);
}

function useFinishLogin(next: string) {
  const router = useRouter();
  const { refresh } = useAuth();
  return async () => {
    syncCsrfFromCookie();
    await refresh();
    router.replace(safeNext(next));
    router.refresh();
  };
}

export function LoginForm({ next }: { next: string }) {
  const finish = useFinishLogin(next);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setError(null);
    setUnverified(false);
    if (!email.trim() || !password) {
      setError('Entrez votre e-mail et votre mot de passe.');
      return;
    }
    setSending(true);
    try {
      await publicApi('/api/auth/login', {
        method: 'POST',
        body: { email: email.trim(), password },
      });
      await finish();
    } catch (err) {
      setUnverified(err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED');
      setError(authErrorMessage(err));
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {error && (
        <Message tone="error" title={error}>
          {unverified && (
            <Link
              href={`/inscription?email=${encodeURIComponent(email.trim())}&etape=code&next=${encodeURIComponent(next)}`}
              className="font-semibold text-action hover:underline"
            >
              Entrer mon code
            </Link>
          )}
        </Message>
      )}
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="username"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <PasswordField
        label="Mot de passe"
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Link href="/mot-de-passe" className="type-label self-start text-action hover:underline">
        Mot de passe oublié ?
      </Link>
      <Button type="submit" fullWidth loading={sending}>
        Se connecter
      </Button>
    </form>
  );
}

export function SignupForm({
  next,
  initialEmail,
  startWithCode,
}: {
  next: string;
  initialEmail: string;
  startWithCode: boolean;
}) {
  const finish = useFinishLogin(next);
  const [step, setStep] = useState<'account' | 'code'>(
    startWithCode && initialEmail ? 'code' : 'account',
  );
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function createAccount(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setError(null);
    if (!email.includes('@')) return setError('Entrez une adresse e-mail valide.');
    if (password.length < 10) return setError('Le mot de passe doit faire au moins 10 caractères.');
    setSending(true);
    try {
      await publicApi('/api/auth/signup', {
        method: 'POST',
        body: { email: email.trim(), password },
      });
      setStep('code');
      setInfo(null);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function verify(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setError(null);
    if (code.length !== 8) return setError('Le code compte 8 caractères.');
    setSending(true);
    try {
      await publicApi('/api/auth/verify-email', {
        method: 'POST',
        body: { email: email.trim(), code },
      });
      await finish();
    } catch (err) {
      setError(authErrorMessage(err));
      setSending(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      await publicApi('/api/auth/resend-verification', {
        method: 'POST',
        body: { email: email.trim() },
      });
      setInfo('Un nouveau code vient de partir. Vérifiez aussi vos courriers indésirables.');
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }

  if (step === 'code') {
    return (
      <form onSubmit={verify} noValidate className="flex flex-col gap-4">
        <div className="flex gap-3 rounded-field bg-mint-soft/70 p-4">
          <Mail aria-hidden className="mt-0.5 size-5 shrink-0 text-action" />
          <p className="type-body-small text-ink">
            Nous avons envoyé un code à <strong>{email}</strong>. Il est valable 15 minutes.
          </p>
        </div>
        {error && <Message tone="error" title={error} />}
        {info && <Message tone="info" title={info} />}
        <Field
          label="Code reçu par e-mail"
          name="code"
          autoComplete="one-time-code"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={10}
          value={code}
          onChange={(e) => setCode(cleanCode(e.target.value))}
          hint="8 caractères, lettres et chiffres."
        />
        <Button type="submit" fullWidth loading={sending}>
          Confirmer mon adresse
        </Button>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <button
            type="button"
            onClick={() => void resend()}
            className="type-label text-action hover:underline"
          >
            Renvoyer le code
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('account');
              setError(null);
            }}
            className="type-label text-action hover:underline"
          >
            Changer d’adresse
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={createAccount} noValidate className="flex flex-col gap-4">
      {error && <Message tone="error" title={error} />}
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="username"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <PasswordField
        label="Mot de passe"
        name="password"
        autoComplete="new-password"
        minLength={10}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint={PASSWORD_HINT}
        required
      />
      <p className="type-caption text-ink-muted">
        En créant un compte, vous acceptez les{' '}
        <Link href="/conditions" className="font-semibold text-action hover:underline">
          conditions d’utilisation
        </Link>{' '}
        et la{' '}
        <Link href="/confidentialite" className="font-semibold text-action hover:underline">
          politique de confidentialité
        </Link>
        .
      </p>
      <Button type="submit" fullWidth loading={sending}>
        Créer mon compte
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function requestCode(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setError(null);
    if (!email.includes('@')) return setError('Entrez une adresse e-mail valide.');
    setSending(true);
    try {
      await publicApi('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim() },
      });
      setStep('reset');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function reset(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setError(null);
    if (code.length !== 8) return setError('Le code compte 8 caractères.');
    if (password.length < 10) return setError('Le mot de passe doit faire au moins 10 caractères.');
    setSending(true);
    try {
      await publicApi('/api/auth/reset-password', {
        method: 'POST',
        body: { email: email.trim(), code, newPassword: password },
      });
      setStep('done');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col gap-4">
        <Message tone="info" title="Votre mot de passe est modifié.">
          Connectez-vous avec le nouveau mot de passe.
        </Message>
        <ButtonLink href="/connexion" fullWidth>
          Se connecter
        </ButtonLink>
      </div>
    );
  }

  if (step === 'reset') {
    return (
      <form onSubmit={reset} noValidate className="flex flex-col gap-4">
        <p className="type-body-small text-ink">
          Si un compte existe pour <strong>{email}</strong>, un code vient de lui être envoyé.
        </p>
        {error && <Message tone="error" title={error} />}
        <Field
          label="Code reçu par e-mail"
          name="code"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={10}
          value={code}
          onChange={(e) => setCode(cleanCode(e.target.value))}
        />
        <PasswordField
          label="Nouveau mot de passe"
          name="new-password"
          autoComplete="new-password"
          minLength={10}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={PASSWORD_HINT}
        />
        <Button type="submit" fullWidth loading={sending}>
          Changer mon mot de passe
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={requestCode} noValidate className="flex flex-col gap-4">
      {error && <Message tone="error" title={error} />}
      <Field
        label="E-mail du compte"
        name="email"
        type="email"
        autoComplete="username"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button type="submit" fullWidth loading={sending}>
        Recevoir un code
      </Button>
    </form>
  );
}
