import { redirect } from 'next/navigation';

// Recherche d'un médicament par son nom : désormais dans le parcours
// « Votre ordonnance », en saisie à la main.
export default function MedicineSearchPage() {
  redirect('/ordonnance?depart=saisie');
}
