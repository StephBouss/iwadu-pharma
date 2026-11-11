// Navigation du site public : mêmes entrées dans l'en-tête et le menu mobile.

export const SITE_NAV = [
  { href: '/#comment-ca-marche', label: 'Comment ça marche' },
  { href: '/tarifs', label: 'Tarifs' },
  { href: '/gardes', label: 'Pharmacies de garde' },
] as const;

export const FOOTER_COLUMNS = [
  {
    title: 'Iwadu Pharma',
    links: [
      { href: '/aide#a-propos', label: 'À propos' },
      { href: '/aide#contact', label: 'Contact' },
      { href: '/pharmacies', label: 'Vous êtes pharmacien ?' },
    ],
  },
  {
    title: 'Aide',
    links: [
      { href: '/#comment-ca-marche', label: 'Comment ça marche' },
      { href: '/tarifs', label: 'Tarifs' },
      { href: '/aide', label: 'Vos questions' },
    ],
  },
  {
    title: 'Informations légales',
    links: [
      { href: '/confidentialite', label: 'Confidentialité' },
      { href: '/conditions', label: 'Conditions' },
    ],
  },
] as const;
