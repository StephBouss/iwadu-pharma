import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { ResetPasswordForm } from '@/components/auth/AuthForms';

export const metadata: Metadata = {
  title: 'Mot de passe oublié',
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Mot de passe oublié"
      lead="Recevez un code par e-mail pour choisir un nouveau mot de passe."
      footer={
        <Link href="/connexion" className="font-semibold text-action hover:underline">
          Retour à la connexion
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
