import Link from 'next/link';
import { User } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

// En-tête de l'application : symbole sur mobile (planche 3 de la charte),
// logo horizontal dès 640 px ; accès au compte à droite. Cibles de 48 px.

export function AppHeader() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
      <Link
        href="/"
        aria-label="Iwadu Pharma, accueil"
        className="-ml-1 flex h-12 items-center rounded-full px-1"
      >
        <Logo variant="symbole-couleur" height={40} priority className="sm:hidden" />
        {/* Sans `priority` : chargé en différé, donc jamais téléchargé sur mobile où il est masqué. */}
        <Logo variant="horizontal-couleur" height={40} className="hidden sm:block" />
      </Link>
      <Link
        href="/compte"
        aria-label="Mon compte"
        className="flex size-12 items-center justify-center rounded-full text-ink hover:bg-surface"
      >
        <User aria-hidden className="size-6" />
      </Link>
    </header>
  );
}
