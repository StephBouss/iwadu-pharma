import { cn } from '@/lib/utils';

// Charte V1.0 — connexion lente : des squelettes plutôt qu'un écran blanc.

export function Skeleton({ className }: { className?: string | undefined }) {
  return (
    <div
      aria-hidden
      className={cn('rounded-card bg-hairline motion-safe:animate-pulse', className)}
    />
  );
}
