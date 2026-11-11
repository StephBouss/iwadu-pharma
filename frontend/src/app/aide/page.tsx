import type { Metadata } from 'next';
import { Mail, MessageCircle } from 'lucide-react';
import { PublicShell } from '@/components/layout/PublicShell';
import { FaqList, faqItems, type FaqItem } from '@/components/public/Faq';
import { ButtonLink } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { getSettings } from '@/lib/server/iwadu/settings';

// Aide : questions fréquentes (les mêmes que l'accueil, plus quelques-unes),
// à propos, contact. Ancres #a-propos et #contact utilisées par le pied de page.

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Aide',
  description: 'Réponses aux questions fréquentes et contact de l’équipe Iwadu Pharma.',
};

export default async function HelpPage() {
  const s = await getSettings();
  const whatsapp = s['contact.whatsapp']?.replace(/\D+/g, '') ?? '';
  const email = s['contact.email'] ?? '';
  const more: FaqItem[] = [
    {
      q: 'Qu’est-ce qui compte comme une recherche ?',
      a: 'Une nouvelle ordonnance lue, ou une ancienne ordonnance relancée pour vérifier le stock. Rouvrir une ordonnance déjà débloquée, refaire le calcul pour une autre pharmacie ou une autre assurance, consulter les gardes : c’est gratuit.',
    },
    {
      q: 'Combien de temps le résultat reste-t-il valable ?',
      a: s['result.linkHours']
        ? `Une ordonnance débloquée a sa propre adresse, valable ${s['result.linkHours']} heures, à jour à chaque ouverture. Vous pouvez la partager sur WhatsApp : elle ne montre ni votre compte, ni votre assurance enregistrée.`
        : 'Une ordonnance débloquée a sa propre adresse, à jour à chaque ouverture, que vous pouvez partager.',
    },
    {
      q: 'Le paiement n’a pas été confirmé. Que faire ?',
      a: 'Rien n’est débloqué sans la confirmation de l’opérateur. Vérifiez votre solde avant de réessayer. Si vous avez été débité sans déblocage, écrivez-nous avec la date et votre numéro : nous vérifions et remboursons si besoin.',
    },
    {
      q: 'Comment supprimer mon compte ?',
      a: 'Dans « Mon espace », puis « Assurance et profil », section « Supprimer mon compte ». Vos données personnelles sont effacées.',
    },
  ];

  return (
    <PublicShell
      width="wide"
      hero={
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-4xl font-bold md:text-5xl">Aide</h1>
          <p className="type-body text-surface/85 md:text-lg">
            Les réponses aux questions les plus fréquentes, et comment nous joindre.
          </p>
        </div>
      }
      className="pt-10"
    >
      <section aria-labelledby="questions" className="flex flex-col gap-4">
        <h2 id="questions" className="type-title-1 text-brand">
          Vos questions
        </h2>
        <FaqList items={[...faqItems(s), ...more]} />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassPanel
          as="section"
          id="a-propos"
          aria-labelledby="apropos-titre"
          className="flex scroll-mt-6 flex-col gap-2 p-5"
        >
          <h2 id="apropos-titre" className="type-title-3 text-ink">
            À propos
          </h2>
          <p className="type-body text-ink-muted">
            Iwadu Pharma vous dit quelle pharmacie près de chez vous a toute votre ordonnance, et
            combien prévoir, avec ou sans assurance. L’IA aide à lire l’ordonnance ; votre
            pharmacien la valide toujours.
          </p>
        </GlassPanel>

        <GlassPanel
          as="section"
          id="contact"
          aria-labelledby="contact-titre"
          className="flex scroll-mt-6 flex-col gap-3 p-5"
        >
          <h2 id="contact-titre" className="type-title-3 text-ink">
            Nous contacter
          </h2>
          <p className="type-body-small text-ink-muted">
            Pour une urgence médicale, appelez les secours ou une pharmacie de garde.
          </p>
          {whatsapp || email ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              {whatsapp && (
                <ButtonLink
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  leadingIcon={<MessageCircle aria-hidden />}
                >
                  Écrire sur WhatsApp
                </ButtonLink>
              )}
              {email && (
                <ButtonLink
                  href={`mailto:${email}`}
                  variant="secondary"
                  leadingIcon={<Mail aria-hidden />}
                >
                  Écrire un e-mail
                </ButtonLink>
              )}
            </div>
          ) : (
            <p className="type-body-small text-ink-muted">
              Les coordonnées de contact seront bientôt indiquées ici.
            </p>
          )}
        </GlassPanel>
      </div>
    </PublicShell>
  );
}
