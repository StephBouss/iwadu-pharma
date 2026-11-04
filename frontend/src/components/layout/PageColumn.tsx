import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Charte V1.0 — conçu pour 360 px, utilisable dès 320 px ; sur ordinateur,
// l'application patient tient dans une colonne centrale de 480 px au plus.
// Marges mobiles de 16 px.

export function PageColumn({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <main className={cn('mx-auto w-full max-w-patient px-4 pb-12', className)}>{children}</main>
  );
}
