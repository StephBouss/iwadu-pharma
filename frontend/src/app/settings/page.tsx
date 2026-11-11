// /settings — connexion et sécurité du compte (cadre « Mon espace »).
//
// Two flows live here today:
//   1. Set / change password
//      - If the account was created via OAuth (hasPassword=false), the
//        "Set password" form calls POST /api/auth/set-password — no current
//        password required, because there isn't one.
//      - Otherwise the "Change password" form calls PUT /api/auth/change-password
//        with currentPassword + newPassword.
//   2. Link a provider (Google)
//      - When Google is not already linked, the button kicks the user to
//        GET /api/auth/oauth/google/start?next=/settings, which goes through
//        the normal OAuth dance and lands back on /settings linked.
//      - When already linked, we just show a "linked" pill — no unlink action
//        yet (would need a /api/auth/oauth/google/unlink endpoint with a
//        guard refusing to leave the user without any sign-in method).
'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ChevronRight, CircleCheck } from 'lucide-react';
import { KpiPanel } from '@/components/admin/KpiBlocks';
import { PageHeading } from '@/components/dashboard/PageHeading';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Message } from '@/components/ui/Message';
import { Skeleton } from '@/components/ui/Skeleton';
import { api, ApiError } from '@/lib/api';
import { useAuth, useUser } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export default function SettingsPage() {
  const user = useUser();
  const { refresh } = useAuth();
  const { toast } = useToast();

  // Password form state — fields used by either branch.
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <p className="sr-only">Chargement…</p>
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const hasPassword = user.hasPassword;
  const googleLinked = user.linkedProviders.includes('google');

  async function onSubmitPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length === 0) {
      setError('Saisissez un nouveau mot de passe.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    setSubmitting(true);
    try {
      if (hasPassword) {
        await api('/api/auth/change-password', {
          method: 'PUT',
          body: { currentPassword, newPassword },
        });
        toast('Mot de passe mis à jour.', 'success');
      } else {
        await api('/api/auth/set-password', {
          method: 'POST',
          body: { newPassword },
        });
        toast(
          'Mot de passe défini. Vous pouvez aussi vous connecter avec votre adresse e-mail.',
          'success',
        );
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        const map: Record<string, string> = {
          INVALID_CREDENTIALS: 'Mot de passe actuel incorrect.',
          PASSWORD_BANNED: 'Ce mot de passe est trop courant.',
          PASSWORD_TOO_SHORT: err.message || 'Mot de passe trop court.',
          PASSWORD_PWNED: 'Ce mot de passe a déjà fuité sur Internet. Choisissez-en un autre.',
          PASSWORD_ALREADY_SET:
            'Un mot de passe est déjà défini. Utilisez « Changer le mot de passe ».',
          VALIDATION_FAILED: 'Vérifiez les champs saisis.',
        };
        setError(map[err.code] ?? err.message);
      } else {
        setError('Connexion impossible. Vérifiez votre réseau, puis réessayez.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeading title="Connexion et sécurité" subtitle={`Compte : ${user.email}`} />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start xl:gap-8">
        <KpiPanel
          title={hasPassword ? 'Changer le mot de passe' : 'Définir un mot de passe'}
          subtitle={
            hasPassword
              ? 'Vos autres sessions seront déconnectées.'
              : 'Votre compte utilise la connexion Google. Ajoutez un mot de passe pour vous connecter aussi avec votre adresse e-mail.'
          }
        >
          <form onSubmit={onSubmitPassword} className="flex flex-col gap-4">
            {hasPassword && (
              <Field
                label="Mot de passe actuel"
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            )}
            <Field
              label="Nouveau mot de passe"
              type="password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Field
              label="Confirmer le nouveau mot de passe"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {error && <Message tone="error" title={error} />}
            <Button type="submit" variant="primary" loading={submitting} className="self-start">
              {hasPassword ? 'Changer le mot de passe' : 'Définir le mot de passe'}
            </Button>
          </form>
        </KpiPanel>

        <KpiPanel title="Comptes liés" subtitle="Pour vous connecter en un geste.">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <span className="type-body-strong text-ink">Google</span>
              <span className="type-body-small text-ink-muted">
                {googleLinked
                  ? 'Vous pouvez vous connecter avec Google.'
                  : 'Liez votre compte Google pour vous connecter en un clic.'}
              </span>
            </div>
            {googleLinked ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-available-soft px-3 py-1 text-sm font-semibold text-available">
                <CircleCheck aria-hidden className="size-4" />
                Lié
              </span>
            ) : (
              <a
                href="/api/auth/oauth/google/start?next=/settings"
                className="type-label flex min-h-11 items-center rounded-full border border-outline bg-surface px-5 text-action hover:bg-ivory"
              >
                Lier Google
              </a>
            )}
          </div>
          <Link
            href="/compte/profil"
            className="type-label flex min-h-11 items-center gap-1 text-action hover:underline"
          >
            Assurance et profil <ChevronRight aria-hidden className="size-4" />
          </Link>
        </KpiPanel>
      </div>
    </>
  );
}
