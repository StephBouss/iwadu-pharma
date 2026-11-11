import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth/AuthCard';
import { SignupForm } from '@/components/auth/AuthForms';
import { safeNext } from '@/lib/client/auth-errors';
import { getViewer } from '@/lib/server/iwadu/viewer';

export const metadata: Metadata = {
  title: 'Créer un compte',
  robots: { index: false, follow: true },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string; etape?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if ((await getViewer()).user) redirect(next);
  return (
    <AuthCard
      title="Créer un compte"
      lead="Gratuit. Votre première ordonnance complète est offerte, et votre compte garde votre carnet et votre Pass."
      footer={
        <>
          Déjà un compte ?{' '}
          <Link
            href={`/connexion?next=${encodeURIComponent(next)}`}
            className="font-semibold text-action hover:underline"
          >
            Se connecter
          </Link>
        </>
      }
    >
      <SignupForm
        next={next}
        initialEmail={(params.email ?? '').slice(0, 200)}
        startWithCode={params.etape === 'code'}
      />
    </AuthCard>
  );
}
