import type { Metadata } from 'next';
import { LegalPage } from '@/components/public/LegalPage';

export const metadata: Metadata = { title: 'Conditions d’utilisation' };

export default function TermsPage() {
  return (
    <LegalPage
      title="Conditions d’utilisation"
      lead="Les règles d’usage d’Iwadu Pharma, en clair."
      sections={[
        {
          title: 'Le service',
          body: (
            <p>
              Iwadu Pharma aide à trouver les pharmacies qui ont vos médicaments, avec une
              estimation du prix. Ce n’est pas une pharmacie : nous ne vendons ni ne délivrons de
              médicaments.
            </p>
          ),
        },
        {
          title: 'Informations affichées',
          body: (
            <p>
              Les stocks proviennent des pharmacies et affichent leur heure de mise à jour. Les prix
              et la prise en charge de l’assurance sont des estimations, confirmées en pharmacie. Le
              pharmacien valide toujours la délivrance.
            </p>
          ),
        },
        {
          title: 'Lecture de l’ordonnance',
          body: (
            <p>
              La lecture automatique peut se tromper : vérifiez toujours la liste avant de lancer la
              recherche. En cas de doute, demandez conseil à votre pharmacien ou à votre médecin.
            </p>
          ),
        },
        {
          title: 'Paiements',
          body: (
            <p>
              Le déblocage d’une recherche et le Pass se paient par Mobile Money. Ils sont activés à
              la confirmation du paiement par l’opérateur. Le Pass couvre une période fixe et
              s’arrête tout seul, sans renouvellement automatique. Les médicaments se paient en
              pharmacie.
            </p>
          ),
        },
        {
          title: 'Estimations',
          body: (
            <p>
              Les stocks affichent leur heure de mise à jour et les prix sont des estimations. Le
              pharmacien confirme la disponibilité et la prise en charge au comptoir.
            </p>
          ),
        },
        {
          title: 'Usage loyal',
          body: (
            <p>
              N’utilisez pas le service pour obtenir des médicaments sans ordonnance quand elle est
              exigée, ni pour perturber son fonctionnement.
            </p>
          ),
        },
      ]}
    />
  );
}
