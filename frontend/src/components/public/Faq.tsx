import { ChevronDown } from 'lucide-react';
import { formatFcfa } from '@/lib/format';
import type { SettingsValues } from '@/lib/settings-registry';
import { cn } from '@/lib/utils';

// Questions fréquentes (maquette Banani « Accordéon FAQ »), réponses ajustées
// au fonctionnement du MVP. Accordéon natif <details> : utilisable sans
// JavaScript, au clavier et au toucher. Les chiffres viennent des paramètres.

export interface FaqItem {
  q: string;
  a: string;
}

export function faqItems(s: SettingsValues): FaqItem[] {
  const price = s['price.unlock'];
  return [
    {
      q: 'Et si aucune pharmacie n’a mon ordonnance ?',
      a: 'Vous le voyez gratuitement, et vous ne payez rien.',
    },
    {
      q: price ? `Pourquoi payer ${formatFcfa(price)} ?` : 'Pourquoi payer ?',
      a: 'Pour connaître les noms et les prix exacts des pharmacies qui ont tout, et faire un seul déplacement, au bon endroit.',
    },
    {
      q: 'Le stock est-il fiable ?',
      a: 'Chaque pharmacie affiche l’heure de sa dernière mise à jour. Le pharmacien confirme au comptoir.',
    },
    {
      q: 'Et mon assurance ?',
      a: 'Sur la fiche de la pharmacie, choisissez votre assurance parmi celles qu’elle accepte et indiquez le taux inscrit sur votre carte : nous estimons votre reste à payer. La pharmacie confirme la prise en charge.',
    },
    {
      q: 'Je ne suis pas à l’aise avec Internet',
      a: 'Une photo, une liste à vérifier, un bouton. Le lien « FAQ » du menu est sur chaque page.',
    },
    {
      q: 'Faut-il un compte ?',
      a: s['account.firstUnlockOffered']
        ? 'Non, ni pour voir l’aperçu ni pour débloquer une ordonnance. Un compte gratuit vous offre votre première ordonnance complète ; il est nécessaire pour un Pass.'
        : 'Non, ni pour voir l’aperçu ni pour débloquer une ordonnance. Il est nécessaire pour un Pass.',
    },
    {
      q: 'Comment payer ?',
      a: 'Par Airtel Money ou Moov Money. Les médicaments, eux, se paient en pharmacie.',
    },
    {
      q: 'Que devient la photo de mon ordonnance ?',
      a: 'Photographiez seulement la liste des médicaments et les quantités, sans les noms. La photo est effacée dès sa lecture : elle n’est jamais conservée.',
    },
  ];
}

export function FaqList({
  items,
  className,
  firstOpen = false,
}: {
  items: FaqItem[];
  className?: string | undefined;
  firstOpen?: boolean;
}) {
  return (
    // 1 colonne sur mobile, 2 sur tablette, 3 sur grand écran. `items-start` :
    // ouvrir une question ne déforme pas ses voisines de ligne.
    <div className={cn('grid items-start gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3', className)}>
      {items.map((item, i) => (
        <details
          key={item.q}
          open={firstOpen && i === 0}
          className="group rounded-card border border-surface/60 bg-surface/92 shadow-glass supports-backdrop-filter:bg-surface/80 supports-backdrop-filter:backdrop-blur-glass"
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 md:px-6 [&::-webkit-details-marker]:hidden">
            <span className="type-body-strong text-ink md:text-lg">{item.q}</span>
            <ChevronDown
              aria-hidden
              className="size-5 shrink-0 text-action transition-transform group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <p className="type-body px-5 pb-5 text-ink-muted md:px-6">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
