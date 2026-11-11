'use client';

import Link from 'next/link';
import { LogIn, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// Accès au compte dans l'en-tête : « Se connecter » ou « Mon espace ».
// Cible de 48 px ; le libellé disparaît sur les très petits écrans.

export function AccountLink({
  tone = 'light',
  className,
}: {
  tone?: 'light' | 'dark';
  className?: string | undefined;
}) {
  const { user, loading } = useAuth();
  const connected = !loading && user !== null;
  const Icon = connected ? User : LogIn;
  const label = connected ? 'Mon espace' : 'Se connecter';
  const dark = tone === 'dark';
  return (
    <Link
      href={connected ? '/compte' : '/connexion'}
      className={cn(
        'group flex h-12 shrink-0 items-center gap-2 rounded-full px-1 text-sm font-semibold',
        dark ? 'text-surface' : 'text-action',
        className,
      )}
    >
      <span
        className={cn(
          'flex size-9 items-center justify-center rounded-full transition-colors',
          dark ? 'bg-surface/14 group-hover:bg-surface/24' : 'bg-mint-soft group-hover:bg-mint/40',
        )}
      >
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="hidden pr-2 sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </Link>
  );
}
