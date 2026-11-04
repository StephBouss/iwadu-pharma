import { Pill } from 'lucide-react';
import { StatusBadge, type Status } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';

// Les médicaments de l'ordonnance et leur état dans une pharmacie donnée.
// Chaque ligne : nom, dosage, nombre de boîtes, badge d'état (couleur +
// icône + mot, jamais la couleur seule).

export interface MedicineLine {
  id: string;
  name: string;
  dosage: string;
  quantity: number;
  status: Status;
}

export interface MedicineListProps {
  medicines: readonly MedicineLine[];
  className?: string | undefined;
}

export function MedicineList({ medicines, className }: MedicineListProps) {
  return (
    <ul className={cn('flex flex-col divide-y divide-hairline', className)}>
      {medicines.map((medicine) => (
        <li key={medicine.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-field bg-mint-soft text-action"
          >
            <Pill className="size-4" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="type-body-strong text-ink">
              {medicine.name} {medicine.dosage}
            </p>
            <p className="type-caption text-ink-muted">
              {medicine.quantity} {medicine.quantity > 1 ? 'boîtes' : 'boîte'}
            </p>
          </div>
          <StatusBadge status={medicine.status} className="shrink-0" />
        </li>
      ))}
    </ul>
  );
}
