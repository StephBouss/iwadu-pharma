'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { PaymentPanel, type PaymentPanelProps } from './PaymentPanel';

// Fenêtre de paiement (maquette Banani : fenêtre posée sur la page, fond
// assombri). <dialog> natif : piège le focus, se ferme avec Échap. Sur
// téléphone, elle occupe le bas de l'écran comme une feuille.

export function PaymentDialog({
  open,
  onClose,
  ...panel
}: PaymentPanelProps & { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="paiement-titre"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-sheet border border-surface/60 bg-surface p-5 text-ink shadow-glass backdrop:bg-ink/30 backdrop:supports-backdrop-filter:backdrop-blur-[4px] sm:m-auto sm:max-w-[640px] sm:rounded-sheet sm:p-10"
    >
      {open && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <h2 id="paiement-titre" className="type-title-1 text-brand">
              Payer par Mobile Money
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="flex size-11 items-center justify-center rounded-full text-action hover:bg-mint-soft"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <PaymentPanel {...panel} onCancel={onClose} />
        </div>
      )}
    </dialog>
  );
}
