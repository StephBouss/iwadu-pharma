'use client';

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Crop, RotateCcw, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { CropRect } from '@/lib/client/image';
import { cn } from '@/lib/utils';

// Écran « Vérifiez votre photo », obligatoire avant l'envoi : la zone gardée
// est encadrée, le reste assombri. « Recadrer » permet de déplacer le cadre
// et ses coins (doigt ou souris, et flèches du clavier). Le découpage se
// fait dans le navigateur : seule la partie gardée part sur Internet.

type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se';
const MIN = 0.12;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

export function PhotoReview({
  imageUrl,
  initialRect,
  sending,
  note,
  onConfirm,
  onRetake,
}: {
  imageUrl: string;
  initialRect: CropRect;
  sending: boolean;
  note?: string | null | undefined;
  onConfirm: (rect: CropRect) => void;
  onRetake: () => void;
}) {
  const [rect, setRect] = useState<CropRect>(initialRect);
  const [editing, setEditing] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ handle: Handle; x: number; y: number; start: CropRect } | null>(null);

  function begin(handle: Handle, e: ReactPointerEvent) {
    if (!editing) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { handle, x: e.clientX, y: e.clientY, start: rect };
  }

  function move(e: ReactPointerEvent) {
    const d = drag.current;
    const el = box.current;
    if (!d || !el) return;
    const bounds = el.getBoundingClientRect();
    const dx = (e.clientX - d.x) / bounds.width;
    const dy = (e.clientY - d.y) / bounds.height;
    const s = d.start;
    let { x, y, w, h } = s;
    if (d.handle === 'move') {
      x = clamp(s.x + dx, 0, 1 - s.w);
      y = clamp(s.y + dy, 0, 1 - s.h);
    } else {
      const left = d.handle === 'nw' || d.handle === 'sw';
      const top = d.handle === 'nw' || d.handle === 'ne';
      if (left) {
        x = clamp(s.x + dx, 0, s.x + s.w - MIN);
        w = s.x + s.w - x;
      } else {
        w = clamp(s.w + dx, MIN, 1 - s.x);
      }
      if (top) {
        y = clamp(s.y + dy, 0, s.y + s.h - MIN);
        h = s.y + s.h - y;
      } else {
        h = clamp(s.h + dy, MIN, 1 - s.y);
      }
    }
    setRect({ x, y, w, h });
  }

  function nudge(key: string, resize: boolean) {
    const step = 0.02;
    setRect((r) => {
      const dx = key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0;
      const dy = key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : 0;
      if (resize) {
        const w = clamp(r.w + dx, MIN, 1 - r.x);
        const h = clamp(r.h + dy, MIN, 1 - r.y);
        return { ...r, w, h };
      }
      return { ...r, x: clamp(r.x + dx, 0, 1 - r.w), y: clamp(r.y + dy, 0, 1 - r.h) };
    });
  }

  const corners: { id: Handle; className: string; label: string }[] = [
    { id: 'nw', className: '-top-3 -left-3 cursor-nwse-resize', label: 'Coin en haut à gauche' },
    { id: 'ne', className: '-top-3 -right-3 cursor-nesw-resize', label: 'Coin en haut à droite' },
    { id: 'sw', className: '-bottom-3 -left-3 cursor-nesw-resize', label: 'Coin en bas à gauche' },
    { id: 'se', className: '-right-3 -bottom-3 cursor-nwse-resize', label: 'Coin en bas à droite' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="type-title-2 text-ink">Vérifiez votre photo</h3>
        <p className="type-body-small text-ink-muted">
          Seule la zone encadrée sera envoyée. Le nom du patient et celui du médecin ne doivent pas
          y apparaître.
        </p>
      </div>

      <div
        ref={box}
        onPointerMove={move}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        className="relative touch-none overflow-hidden rounded-card bg-ink select-none"
      >
        <img src={imageUrl} alt="Photo de l’ordonnance à vérifier" className="block w-full" />
        <div
          role={editing ? 'slider' : undefined}
          tabIndex={editing ? 0 : -1}
          aria-label={
            editing ? 'Zone gardée : flèches pour déplacer, Maj + flèches pour agrandir' : undefined
          }
          aria-valuetext={
            editing
              ? `${Math.round(rect.w * 100)} % de large, ${Math.round(rect.h * 100)} % de haut`
              : undefined
          }
          onKeyDown={(e) => {
            if (!e.key.startsWith('Arrow')) return;
            e.preventDefault();
            nudge(e.key, e.shiftKey);
          }}
          onPointerDown={(e) => begin('move', e)}
          className={cn(
            'absolute rounded-field border-[3px] border-mint shadow-[0_0_0_100vmax_rgb(2_25_22/0.6)]',
            editing && 'cursor-move',
          )}
          style={{
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.w * 100}%`,
            height: `${rect.h * 100}%`,
          }}
        >
          {editing &&
            corners.map((c) => (
              <span
                key={c.id}
                aria-hidden
                title={c.label}
                onPointerDown={(e) => begin(c.id, e)}
                className={cn(
                  'absolute size-7 rounded-full border-[3px] border-surface bg-mint shadow-card',
                  c.className,
                )}
              />
            ))}
        </div>
      </div>

      {note && <p className="type-body-small text-ink-muted">{note}</p>}

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          size="sm"
          aria-pressed={editing}
          leadingIcon={<Crop aria-hidden />}
          onClick={() => setEditing((v) => !v)}
          disabled={sending}
        >
          {editing ? 'Terminer' : 'Recadrer'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          leadingIcon={<RotateCcw aria-hidden />}
          onClick={onRetake}
          disabled={sending}
        >
          Refaire la photo
        </Button>
      </div>
      <Button
        fullWidth
        loading={sending}
        leadingIcon={<Send aria-hidden />}
        onClick={() => onConfirm(rect)}
        className="h-auto min-h-12 py-2 whitespace-normal"
      >
        {sending ? 'Lecture de vos médicaments…' : 'Aucun nom n’est visible, envoyer'}
      </Button>
    </div>
  );
}
