'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

// Choix unique parmi moins de six options : de vrais boutons radio
// (clavier, lecteurs d'écran), présentés en capsules. Le choix actif est
// signalé par la couleur ET par une coche, jamais par la couleur seule.

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

export function ChoiceChips<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  hint,
  error,
  className,
}: {
  legend: string;
  name: string;
  options: readonly ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  hint?: string | undefined;
  error?: string | undefined;
  className?: string | undefined;
}) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');
  return (
    <fieldset
      className={cn('flex flex-col gap-2', className)}
      aria-describedby={describedBy || undefined}
    >
      <legend className="type-label mb-2 text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className="relative">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                'type-label flex h-12 min-w-16 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-5 transition-colors select-none',
                'border-outline bg-surface/80 text-ink hover:border-action',
                'peer-checked:border-action peer-checked:bg-action peer-checked:text-surface',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-action peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-ivory',
              )}
            >
              {value === option.value && (
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="type-caption text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="type-body-small text-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
