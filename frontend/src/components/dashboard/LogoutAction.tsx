'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { syncCsrfFromCookie } from '@/lib/client/session';

/** Déconnexion, puis retour à l'accueil (même logique que LogoutButton). */
export function LogoutAction({
  className,
  children,
}: {
  className?: string | undefined;
  children: ReactNode;
}) {
  const { logout, loggingOut } = useAuth();
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      disabled={loggingOut}
      aria-busy={loggingOut || undefined}
      onClick={async () => {
        syncCsrfFromCookie();
        await logout();
        router.replace('/');
        router.refresh();
      }}
    >
      {children}
    </button>
  );
}
