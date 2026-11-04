import type { ReactNode } from 'react';
import {
  CircleCheck,
  CircleHelp,
  CircleSlash,
  CircleX,
  Moon,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Charte V1.0 — un état ne repose jamais sur la couleur seule : couleur,
// icône ET mot, toujours. « Disponibilité à vérifier » n'est pas
// « Indisponible ».

export type Status = 'available' | 'low' | 'unavailable' | 'verify' | 'on-duty' | 'error';

const STATUS: Record<Status, { icon: LucideIcon; label: string; className: string }> = {
  available: {
    icon: CircleCheck,
    label: 'Disponible',
    className: 'bg-available-soft text-available',
  },
  low: { icon: TriangleAlert, label: 'Stock faible', className: 'bg-low-soft text-low' },
  unavailable: {
    icon: CircleSlash,
    label: 'Indisponible',
    className: 'bg-unavailable-soft text-unavailable',
  },
  verify: {
    icon: CircleHelp,
    label: 'Disponibilité à vérifier',
    className: 'bg-verify-soft text-verify',
  },
  'on-duty': { icon: Moon, label: 'De garde', className: 'bg-on-duty-soft text-on-duty' },
  error: { icon: CircleX, label: 'Erreur', className: 'bg-error-soft text-error' },
};

export interface StatusBadgeProps {
  status: Status;
  /** Remplace le libellé par défaut, ex. « Ordonnance complète · 3/3 ». */
  children?: ReactNode;
  className?: string | undefined;
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  const { icon: Icon, label, className: tone } = STATUS[status];
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold',
        tone,
        className,
      )}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      <span className="truncate">{children ?? label}</span>
    </span>
  );
}
