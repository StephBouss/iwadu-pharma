import { redirect } from 'next/navigation';

// Pass géré par le titulaire : les ordonnances portent un prénom (carnet).
export default function Page() {
  redirect('/compte/ordonnances');
}
