import { useId, type ComponentProps, type ReactNode } from 'react';
import { CircleX } from 'lucide-react';
import { cn } from '@/lib/utils';

// Charte V1.0 — champ blanc, rayon 12 px, contour « Bordure », libellé
// au-dessus, aide ou erreur en dessous. L'erreur dit quoi faire :
// « Numéro incomplet : saisissez 8 chiffres après l'indicatif. »

export type FieldProps = Omit<ComponentProps<'input'>, 'size'> & {
  label: string;
  /** Texte d'aide sous le champ, ex. « Ex. : Louis, Nzeng-Ayong, Akanda ». */
  hint?: string | undefined;
  /** Message d'erreur : remplace l'aide et passe le champ en rouge. */
  error?: string | undefined;
  /** Icône Lucide affichée à gauche de la saisie. */
  icon?: ReactNode;
};

export function Field({ label, hint, error, icon, id, className, ...inputProps }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descriptionId = `${inputId}-description`;
  const description = error ?? hint;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={inputId} className="type-label text-ink">
        {label}
      </label>
      <div
        className={cn(
          'flex h-14 items-center gap-3 rounded-field border bg-surface px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-action',
          error ? 'border-error' : 'border-outline',
        )}
      >
        {icon && (
          <span aria-hidden className="shrink-0 text-ink-muted [&_svg]:size-5">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={description ? descriptionId : undefined}
          className="type-body h-full min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-muted focus-visible:outline-none"
          {...inputProps}
        />
      </div>
      {error ? (
        <p id={descriptionId} className="type-body-small flex gap-1.5 text-error">
          <CircleX aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={descriptionId} className="type-body-small text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
