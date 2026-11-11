import type { Metadata } from 'next';
import { LegalPage } from '@/components/public/LegalPage';
import { getSettings } from '@/lib/server/iwadu/settings';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Mentions légales' };

export default async function LegalNoticePage() {
  const s = await getSettings();
  const pending = 'À compléter dans les paramètres du back-office.';
  return (
    <LegalPage
      title="Mentions légales"
      lead="Qui édite et héberge Iwadu Pharma."
      sections={[
        { title: 'Éditeur', body: <p>{s['legal.publisher'] ?? pending}</p> },
        { title: 'Hébergement', body: <p>{s['legal.host'] ?? pending}</p> },
        {
          title: 'Contact',
          body: (
            <p>
              {[
                s['contact.email'],
                s['contact.whatsapp'] ? `WhatsApp ${s['contact.whatsapp']}` : null,
              ]
                .filter(Boolean)
                .join(' · ') || pending}
            </p>
          ),
        },
        {
          title: 'Données de démonstration',
          body: (
            <p>
              Les pharmacies, stocks et assurances marqués « Exemple fictif » sont des données de
              démonstration.
            </p>
          ),
        },
      ]}
    />
  );
}
