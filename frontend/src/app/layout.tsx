import type { Metadata, Viewport } from 'next';
import { Figtree, Outfit } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/contexts/ToastContext';
import { AuthProvider } from '@/contexts/AuthContext';

// Charte V1.0 : Outfit pour les titres, Figtree pour le texte, l'interface et
// les montants. next/font télécharge les fichiers au build et les sert depuis
// le site (woff2, aucun appel à Google côté visiteur). Sans `weight`, on
// obtient la version variable : un seul fichier par police couvre toutes les
// graisses de la charte (Outfit 600–700, Figtree 400–700).
const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Iwadu Pharma — Trouver. Comparer. Réserver.',
    template: '%s · Iwadu Pharma',
  },
  description:
    'Avec ou sans assurance. Photographiez votre ordonnance : nous vous disons où aller et combien vous paierez.',
  applicationName: 'Iwadu Pharma',
};

export const viewport: Viewport = {
  themeColor: '#f5f7f3',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${outfit.variable} ${figtree.variable}`}>
      <body className="min-h-dvh">
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
