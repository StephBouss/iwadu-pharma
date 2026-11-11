import type { ReactNode } from 'react';
import { CircleCheck, CircleX, Info, TriangleAlert, WifiOff, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Charte V1.0 — messages en aplat, titre court + phrase qui dit quoi faire
// ensuite. Ex. : « Paiement refusé — Aucun montant n'a été débité. Vérifiez
// votre solde puis réessayez. »

export type MessageTone = 'info' | 'success' | 'offline' | 'warning' | 'error';

const TONES: Record<MessageTone, { icon: LucideIcon; box: string; iconClass: string }> = {
  info: { icon: Info, box: 'bg-verify-soft', iconClass: 'text-verify' },
  success: { icon: CircleCheck, box: 'bg-available-soft', iconClass: 'text-available' },
  offline: { icon: WifiOff, box: 'bg-unavailable-soft', iconClass: 'text-ink-muted' },
  warning: { icon: TriangleAlert, box: 'bg-low-soft', iconClass: 'text-low' },
  error: { icon: CircleX, box: 'bg-error-soft', iconClass: 'text-error' },
};

export interface MessageProps {
  tone: MessageTone;
  title: string;
  children?: ReactNode;
  className?: string | undefined;
}

export function Message({ tone, title, children, className }: MessageProps) {
  const { icon: Icon, box, iconClass } = TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-card p-4', box, className)}
    >
      <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', iconClass)} />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="type-body-strong text-ink">{title}</p>
        {children && <div className="type-body text-ink">{children}</div>}
      </div>
    </div>
  );
}
