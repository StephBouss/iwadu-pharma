import { redirect } from 'next/navigation';

// Réservation reportée en V2 : rien à afficher dans le MVP.
export default function Page() {
  redirect('/compte');
}
