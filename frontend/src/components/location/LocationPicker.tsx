'use client';

import { useState } from 'react';
import { LocateFixed, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Message } from '@/components/ui/Message';
import { cn } from '@/lib/utils';
import { useLocation } from './LocationProvider';

// Où est le visiteur ? Position actuelle, ou quartier choisi dans la liste.
// Sans position, le choix du quartier est ouvert d'emblée.

export function LocationPicker({ className }: { className?: string | undefined }) {
  const { status, label, districts, districtId, source, requestGps, chooseDistrict } =
    useLocation();
  const [editing, setEditing] = useState(false);
  const ready = status === 'ready' && !editing;

  if (ready) {
    return (
      <GlassPanel className={cn('flex items-center gap-3 py-1 pr-1 pl-4', className)}>
        <MapPin aria-hidden className="size-5 shrink-0 text-action" />
        <p className="type-body-small min-w-0 flex-1 text-ink">{label}</p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex h-12 shrink-0 items-center rounded-full px-4 text-sm font-semibold text-action hover:underline"
        >
          Changer
        </button>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel
      as="section"
      aria-label="Votre position"
      className={cn('flex flex-col gap-4 p-4', className)}
    >
      {status === 'denied' ? (
        <Message tone="warning" title="Nous n’avons pas accès à votre position.">
          Choisissez votre quartier.
        </Message>
      ) : status === 'error' ? (
        <Message tone="warning" title="Votre position n’a pas pu être trouvée.">
          Réessayez, ou choisissez votre quartier.
        </Message>
      ) : (
        <p className="type-body text-ink">
          Indiquez où vous êtes pour voir les pharmacies les plus proches.
        </p>
      )}

      {status !== 'denied' && (
        <Button
          variant="secondary"
          fullWidth
          loading={status === 'locating'}
          leadingIcon={<LocateFixed aria-hidden />}
          onClick={() => {
            setEditing(false);
            requestGps();
          }}
        >
          {status === 'locating' ? 'Recherche de votre position…' : 'Utiliser ma position actuelle'}
        </Button>
      )}

      <label className="flex flex-col gap-2">
        <span className="type-label text-ink">Ou choisissez votre quartier</span>
        <select
          className="h-12 w-full rounded-field border border-outline bg-surface px-4 type-body text-ink"
          value={source === 'district' && districtId ? districtId : ''}
          onChange={(e) => {
            if (!e.target.value) return;
            chooseDistrict(e.target.value);
            setEditing(false);
          }}
        >
          <option value="">Choisir un quartier</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>

      {editing && (
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="h-12 self-start text-sm font-semibold text-action hover:underline"
        >
          Garder {label?.toLowerCase().startsWith('quartier') ? 'ce quartier' : 'ma position'}
        </button>
      )}
    </GlassPanel>
  );
}
