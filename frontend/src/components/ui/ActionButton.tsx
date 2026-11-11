'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { errorMessage, publicApi } from '@/lib/client/session';
import { cn } from '@/lib/utils';
import { Button, type ButtonSize, type ButtonVariant } from './Button';

// Bouton qui appelle une route (POST, PATCH, DELETE), puis recharge les
// données de la page ou change de page. Confirmation facultative pour les
// gestes irréversibles. L'erreur s'affiche sous le bouton.

export function ActionButton({
  path,
  method = 'POST',
  body,
  confirm,
  redirectTo,
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  leadingIcon,
  className,
  children,
}: {
  path: string;
  method?: 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  confirm?: string | undefined;
  redirectTo?: string | undefined;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  className?: string | undefined;
  children: ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (busy) return;
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    setError(null);
    try {
      await publicApi(path, { method, ...(body !== undefined ? { body } : {}) });
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-1', fullWidth && 'w-full', className)}>
      <Button
        type="button"
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        loading={busy}
        leadingIcon={leadingIcon}
        onClick={() => void run()}
      >
        {children}
      </Button>
      {error && (
        <p role="alert" className="type-body-small text-error">
          {error}
        </p>
      )}
    </div>
  );
}
