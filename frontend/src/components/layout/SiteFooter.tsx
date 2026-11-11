import Link from 'next/link';
import { FOOTER_COLUMNS } from './site-nav';

// Pied de page des maquettes Banani : fond encre, nom en menthe, trois
// colonnes de liens. Textes en blanc atténué au contraste AA sur l'encre.

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-12 bg-ink text-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pt-12 pb-8 md:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:gap-16">
          <div className="flex flex-col gap-3 md:flex-1">
            <p className="font-display text-2xl font-bold text-mint">Iwadu Pharma</p>
            <p className="type-body max-w-64 text-surface/70">
              Trouvez la bonne pharmacie avant de sortir de chez vous.
            </p>
          </div>
          <nav
            aria-label="Liens utiles"
            className="grid grid-cols-1 gap-8 sm:grid-cols-3 md:gap-16"
          >
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-1">
                <p className="type-body-strong mb-2 text-surface">{col.title}</p>
                {col.links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="type-body flex min-h-11 items-center text-surface/70 hover:text-mint"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>
        <p className="type-body-small border-t border-surface/10 pt-6 text-surface/60">
          © {year} Iwadu Pharma
        </p>
      </div>
    </footer>
  );
}
