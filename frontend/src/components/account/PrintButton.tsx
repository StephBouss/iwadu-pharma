'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/** Imprimer ou enregistrer en PDF (boîte d'impression du navigateur). */
export function PrintButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      leadingIcon={<Printer aria-hidden />}
      onClick={() => window.print()}
    >
      Imprimer ou enregistrer en PDF
    </Button>
  );
}
