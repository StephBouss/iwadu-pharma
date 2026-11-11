import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth/AuthCard';
import { LoginForm } from '@/components/auth/AuthForms';
import { safeNext } from '@/lib/client/auth-errors';
import { getViewer } from '@/lib/server/iwadu/viewer';

export const metadata: Metadata = { title: 'Se connecter', robots: { index: false, follow: true } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  if ((await getViewer()).user) redirect(next);
  return (
    <AuthCard
      title="Se connecter"
      lead="Retrouvez votre Pass, votre carnet d’ordonnances et vos reçus."
      footer={
        <>
          Pas encore de compte ?{' '}
          <Link
            href={`/inscription?next=${encodeURIComponent(next)}`}
            className="font-semibold text-action hover:underline"
          >
            Créer un compte
          </Link>
        </>
      }
    >
      <LoginForm next={next} />
    </AuthCard>
  );
}
