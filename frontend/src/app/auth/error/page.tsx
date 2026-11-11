// /auth/error — page d'arrivée des échecs de connexion Google.
//
// Le callback (src/app/api/auth/oauth/google/callback/route.ts) redirige via
// `redirectToAuthError(code)` (src/lib/server/oauth/error-redirect.ts) vers
// `/auth/error?code=<CODE>`, avec cinq codes en majuscules :
//   GOOGLE_EMAIL_NOT_VERIFIED
//   OAUTH_STATE_MISMATCH
//   OAUTH_CODE_EXCHANGE_FAILED
//   OAUTH_PROVIDER_DISABLED
//   OAUTH_GENERIC
// Un code inconnu ou absent donne le message générique.
import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { ButtonLink } from '@/components/ui/Button';
import { Message } from '@/components/ui/Message';

export const metadata: Metadata = {
  title: 'Échec de connexion',
  robots: { index: false, follow: false },
};

const ERROR_MESSAGES: Record<string, string> = {
  GOOGLE_EMAIL_NOT_VERIFIED:
    'Votre adresse Google n’est pas vérifiée. Vérifiez-la sur votre compte Google, puis réessayez.',
  OAUTH_STATE_MISMATCH:
    'La connexion a été interrompue par une vérification de sécurité. Cela arrive quand la page Google reste ouverte trop longtemps. Réessayez.',
  OAUTH_CODE_EXCHANGE_FAILED: 'Google a refusé la connexion. Réessayez dans un instant.',
  OAUTH_PROVIDER_DISABLED:
    'La connexion avec Google n’est pas encore proposée. Connectez-vous avec votre adresse e-mail.',
  OAUTH_GENERIC: 'Une erreur inattendue est survenue pendant la connexion. Réessayez.',
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const params = await searchParams;
  const code = params.code ?? params.error ?? '';
  const message =
    ERROR_MESSAGES[code.toUpperCase()] ??
    'Une erreur inconnue est survenue pendant la connexion. Réessayez.';

  return (
    <AuthCard
      title="Échec de connexion"
      footer={
        <Link href="/" className="type-label text-action hover:underline">
          Retour à l’accueil
        </Link>
      }
    >
      <Message tone="error" title={message}>
        {code && <span className="type-caption text-ink-muted">Code : {code}</span>}
      </Message>
      <ButtonLink href="/connexion" fullWidth>
        Retour à la connexion
      </ButtonLink>
    </AuthCard>
  );
}
