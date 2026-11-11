import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Charte V1.0 — boutons en capsule, 48 px de haut, verbe d'action en tête
// (« Voir la pharmacie », « Payer 4 500 FCFA »). Un seul bouton `primary`
// par écran, en vert d'action.

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'lg' | 'md' | 'sm';
/** « dark » : bouton posé sur le bandeau dégradé ou un fond encre. */
export type ButtonTone = 'light' | 'dark';

export interface ButtonStyleOptions {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  fullWidth?: boolean | undefined;
  tone?: ButtonTone | undefined;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-action text-surface hover:bg-deep disabled:bg-unavailable-soft disabled:text-ink-muted',
  secondary:
    'border border-outline bg-surface text-action hover:bg-ivory disabled:border-hairline disabled:text-ink-muted',
  ghost: 'text-action hover:bg-action/5 disabled:text-ink-muted',
};

// Sur fond sombre : le bouton principal passe en menthe (texte encre,
// contraste AAA), les autres en verre clair.
const DARK_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-mint text-ink hover:bg-mint-soft disabled:opacity-50',
  secondary:
    'border border-surface/40 bg-surface/14 text-surface hover:bg-surface/22 disabled:opacity-50',
  ghost: 'text-mint hover:bg-surface/10 disabled:opacity-50',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  lg: 'min-h-14 px-7 py-2 text-lg leading-6', // 56 px : action principale des bandeaux
  md: 'h-12 px-6', // 48 px : cible tactile minimale de la charte
  sm: 'h-10 px-4', // actions secondaires en ligne (« Modifier »)
};

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  tone = 'light',
}: ButtonStyleOptions = {}): string {
  return cn(
    'type-label inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-center transition-colors select-none disabled:cursor-not-allowed [&_svg]:size-5 [&_svg]:shrink-0',
    size === 'lg' ? 'whitespace-normal' : 'whitespace-nowrap',
    (tone === 'dark' ? DARK_VARIANT_CLASSES : VARIANT_CLASSES)[variant],
    variant === 'ghost' ? 'h-12 px-3' : SIZE_CLASSES[size],
    fullWidth && 'w-full',
  );
}

interface ButtonContentProps {
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  loading?: boolean | undefined;
  children: ReactNode;
}

function ButtonContent({ leadingIcon, trailingIcon, loading, children }: ButtonContentProps) {
  return (
    <>
      {loading ? <LoaderCircle aria-hidden className="motion-safe:animate-spin" /> : leadingIcon}
      <span>{children}</span>
      {!loading && trailingIcon}
    </>
  );
}

export type ButtonProps = ComponentProps<'button'> &
  ButtonStyleOptions & {
    /** Désactive le bouton et remplace l'icône par un indicateur de chargement. */
    loading?: boolean | undefined;
    leadingIcon?: ReactNode;
    trailingIcon?: ReactNode;
  };

export function Button({
  variant,
  size,
  fullWidth,
  tone,
  loading = false,
  leadingIcon,
  trailingIcon,
  className,
  disabled,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonStyles({ variant, size, fullWidth, tone }), className)}
      {...props}
    >
      <ButtonContent leadingIcon={leadingIcon} trailingIcon={trailingIcon} loading={loading}>
        {children}
      </ButtonContent>
    </button>
  );
}

export type ButtonLinkProps = ComponentProps<typeof Link> &
  ButtonStyleOptions & {
    leadingIcon?: ReactNode;
    trailingIcon?: ReactNode;
  };

/** Lien de navigation qui a l'apparence d'un bouton. */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  tone,
  leadingIcon,
  trailingIcon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(buttonStyles({ variant, size, fullWidth, tone }), className)} {...props}>
      <ButtonContent leadingIcon={leadingIcon} trailingIcon={trailingIcon}>
        {children}
      </ButtonContent>
    </Link>
  );
}
