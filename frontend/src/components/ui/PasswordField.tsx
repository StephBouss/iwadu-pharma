'use client';

import { useId, useState, type ComponentProps } from 'react';
import { CircleX, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

// Champ mot de passe avec bouton « Afficher » (collage autorisé,
// remplissage automatique par le gestionnaire de mots de passe).

export function PasswordField({
  label,
  hint,
  error,
  className,
  id,
  ...inputProps
}: Omit<ComponentProps<'input'>, 'type' | 'size'> & {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descId = `${inputId}-description`;
  const [visible, setVisible] = useState(false);
  const description = error ?? hint;
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={inputId} className="type-label text-ink">
        {label}
      </label>
      <div
        className={cn(
          'flex h-14 items-center gap-2 rounded-field border bg-surface pl-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-action',
          error ? 'border-error' : 'border-outline',
        )}
      >
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={description ? descId : undefined}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="type-body h-full min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-muted focus-visible:outline-none"
          {...inputProps}
        />
        <button
          type="button"
          aria-pressed={visible}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          onClick={() => setVisible((v) => !v)}
          className="flex size-12 shrink-0 items-center justify-center rounded-full text-ink-muted hover:text-action"
        >
          {visible ? (
            <EyeOff aria-hidden className="size-5" />
          ) : (
            <Eye aria-hidden className="size-5" />
          )}
        </button>
      </div>
      {error ? (
        <p id={descId} className="type-body-small flex gap-1.5 text-error">
          <CircleX aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={descId} className="type-body-small text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
