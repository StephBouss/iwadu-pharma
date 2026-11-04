import Image from 'next/image';
import { cn } from '@/lib/utils';

// Logos du kit SVG de la charte V1.0 (public/brand). Ne jamais déformer,
// recolorer ni ajouter d'effet. Symbole seul : 32 px de haut au moins ;
// en dessous, utiliser le symbole réduit (sans les carrés).

const LOGOS = {
  'horizontal-couleur': { src: '/brand/logo-horizontal-couleur.svg', ratio: 1312.5 / 465.6 },
  'horizontal-blanc': { src: '/brand/logo-horizontal-blanc.svg', ratio: 1312.5 / 465.6 },
  'empile-couleur': { src: '/brand/logo-empile-couleur.svg', ratio: 815.5 / 851 },
  'symbole-couleur': { src: '/brand/symbole-couleur.svg', ratio: 491.6 / 541.4 },
  'symbole-blanc': { src: '/brand/symbole-blanc.svg', ratio: 491.6 / 541.4 },
  'symbole-reduit-couleur': { src: '/brand/symbole-reduit-couleur.svg', ratio: 510.8 / 541.4 },
} as const;

export type LogoVariant = keyof typeof LOGOS;

export interface LogoProps {
  variant?: LogoVariant | undefined;
  /** Hauteur affichée en pixels ; la largeur suit les proportions du logo. */
  height?: number | undefined;
  /** À activer pour le logo visible au premier affichage (en-tête). */
  priority?: boolean | undefined;
  className?: string | undefined;
}

export function Logo({
  variant = 'horizontal-couleur',
  height = 40,
  priority = false,
  className,
}: LogoProps) {
  const { src, ratio } = LOGOS[variant];
  return (
    <Image
      src={src}
      alt="Iwadu Pharma"
      height={height}
      width={Math.round(height * ratio)}
      priority={priority}
      className={cn('block', className)}
    />
  );
}
