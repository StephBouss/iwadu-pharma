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
    default: 'Iwadu Pharma — la pharmacie qui a toute votre ordonnance',
    template: '%s · Iwadu Pharma',
  },
  description:
    'Avec ou sans assurance. Photographiez votre ordonnance : voyez gratuitement combien de pharmacies ont tous vos médicaments près de vous, et combien prévoir.',
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
    <html lang="fr" className={`${outfit.variable} ${figtree.variable}`} suppressHydrationWarning>
      <head>
        {/* Verre sans flou sur les appareils peu puissants (voir globals.css). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var n=navigator;if((n.deviceMemory&&n.deviceMemory<=2)||(n.hardwareConcurrency&&n.hardwareConcurrency<=4)){document.documentElement.dataset.glass='lite'}}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-dvh">
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
