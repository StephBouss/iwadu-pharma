import type { Metadata } from 'next';
import { LegalPage } from '@/components/public/LegalPage';
import { getSettings } from '@/lib/server/iwadu/settings';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Confidentialité' };

export default async function PrivacyPage() {
  const s = await getSettings();
  const email = s['contact.email'];
  return (
    <LegalPage
      title="Confidentialité"
      lead="Ce que nous collectons, pourquoi, et comment vous gardez la main."
      sections={[
        {
          title: 'Votre ordonnance',
          body: (
            <p>
              Les photos d’ordonnance servent uniquement à lire les médicaments, le temps de la
              lecture. Elles ne sont pas conservées. Seule la liste que vous validez est utilisée
              pour la recherche.
            </p>
          ),
        },
        {
          title: 'Votre position',
          body: (
            <p>
              Votre position sert à classer les pharmacies de la plus proche à la plus éloignée.
              Elle reste dans votre navigateur ; nous n’enregistrons que le quartier le plus proche,
              pour mesurer l’usage par quartier.
            </p>
          ),
        },
        {
          title: 'Votre compte',
          body: (
            <p>
              Avec un compte, nous conservons votre e-mail, et si vous les indiquez : votre nom,
              votre téléphone, votre assurance et votre taux de prise en charge, votre carnet
              d’ordonnances (les médicaments et un prénom libre) et vos paiements. Ces données
              servent au service et ne sont jamais vendues.
            </p>
          ),
        },
        {
          title: 'La photo de votre ordonnance',
          body: (
            <p>
              Photographiez seulement la liste des médicaments, sans les noms. La photo est recadrée
              dans votre téléphone, puis lue par un service de lecture automatique situé hors de
              votre pays ; elle est effacée dès sa lecture et n’est jamais conservée. Si un nom de
              personne apparaît, la photo est effacée et rien n’est affiché.
            </p>
          ),
        },
        {
          title: 'Mesure d’audience',
          body: (
            <p>
              Nous comptons des étapes du parcours (photo envoyée, recherche lancée, paiement…) pour
              améliorer le service. Ces mesures restent chez nous et ne contiennent ni photo ni
              position exacte.
            </p>
          ),
        },
        {
          title: 'Vos droits',
          body: (
            <p>
              Vous pouvez modifier vos informations dans « Mon compte » et supprimer votre compte à
              tout moment.
              {email ? ` Pour toute question : ${email}.` : ''}
            </p>
          ),
        },
      ]}
    />
  );
}
