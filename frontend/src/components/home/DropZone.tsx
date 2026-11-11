'use client';

import { useState, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud } from 'lucide-react';
import { keepPendingFile } from '@/lib/client/pending-file';
import { cn } from '@/lib/utils';

// Zone de dépôt (ordinateur seulement) : le fichier déposé ouvre la page
// « Votre ordonnance », où il est recadré avant l'envoi.

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function DropZone() {
  const router = useRouter();
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError('Déposez une image JPG, PNG ou WebP, ou un PDF.');
      return;
    }
    if (await keepPendingFile(file)) router.push('/ordonnance?depart=fichier-depose');
    else setError('Ce fichier est trop lourd. Choisissez-le avec « Importer un fichier ».');
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => void onDrop(e)}
      className={cn(
        'hidden flex-col items-center justify-center gap-2 rounded-field border-2 border-dashed px-6 py-5 transition-colors md:flex',
        over ? 'border-mint bg-mint/15' : 'border-mint/40 bg-mint/5',
      )}
    >
      <UploadCloud aria-hidden className="size-7 text-mint" />
      <p className="type-body text-surface/80">ou glissez le fichier ici</p>
      {error && <p className="type-body-small text-surface">{error}</p>}
    </div>
  );
}
