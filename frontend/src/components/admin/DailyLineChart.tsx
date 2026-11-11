'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { DEFAULT_TIME_ZONE, formatGroupedInt } from '@/lib/format';
import { cn } from '@/lib/utils';

// Maquette « Admin – Tableau de bord » : « Ordonnances par jour ». Deux
// courbes fines sur un seul axe (recherches, déblocages), grille discrète,
// réticule et info-bulle au survol comme au clavier (flèches), légende
// toujours visible et tableau des valeurs pour les lecteurs d'écran.
// Couleurs : --color-chart-1 / --color-chart-2, validées pour les
// daltonismes sur fond clair.

export interface DailyPoint {
  /** Date ISO (midi local), pour l'affichage. */
  date: string;
  searches: number;
  unlocks: number;
}

const SERIES = [
  { key: 'searches', label: 'Ordonnances cherchées', stroke: 'stroke-chart-1', fill: 'bg-chart-1' },
  { key: 'unlocks', label: 'Ordonnances débloquées', stroke: 'stroke-chart-2', fill: 'bg-chart-2' },
] as const;

const HEIGHT = 240;
const PAD = { top: 12, right: 12, bottom: 28, left: 36 };

const dayFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  timeZone: DEFAULT_TIME_ZONE,
});
const longFmt = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: DEFAULT_TIME_ZONE,
});

/** Pas « rond » des graduations (1, 2 ou 5 × 10^k) : quatre intervalles entiers. */
function niceStep(max: number): number {
  const raw = Math.max(max / 4, 1);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const m = [1, 2, 5, 10].find((k) => k * pow >= raw) ?? 10;
  return m * pow;
}

export function DailyLineChart({ days }: { days: DailyPoint[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(Math.round(entry.contentRect.width), 240));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const count = days.length;
  const step = niceStep(Math.max(0, ...days.flatMap((d) => [d.searches, d.unlocks])));
  const max = step * 4;
  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (count > 1 ? (i / (count - 1)) * innerW : innerW / 2);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, 1, 2, 3, 4].map((t) => t * step);
  // Une date toutes les ~64 px au moins, en partant d'aujourd'hui.
  const labelEvery = Math.max(1, Math.ceil(64 / (innerW / Math.max(count - 1, 1))));

  const path = (key: 'searches' | 'unlocks') =>
    days.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join('');
  const area = `${path('searches')}L${x(count - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;

  function pick(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round(((px - PAD.left) / innerW) * (count - 1));
    setActive(Math.min(Math.max(i, 0), count - 1));
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const step = e.key === 'ArrowRight' ? 1 : -1;
      setActive((a) =>
        Math.min(Math.max((a ?? count - 1) + (a === null ? 0 : step), 0), count - 1),
      );
    } else if (e.key === 'Escape') {
      setActive(null);
    }
  }

  const point = active !== null ? days[active] : undefined;
  const tipLeft = active !== null ? x(active) : 0;
  const tipOnLeft = tipLeft > width * 0.6;
  const totals = {
    searches: days.reduce((a, d) => a + d.searches, 0),
    unlocks: days.reduce((a, d) => a + d.unlocks, 0),
  };

  return (
    <figure className="flex min-w-0 flex-col gap-4" aria-labelledby={titleId}>
      <figcaption id={titleId} className="sr-only">
        Ordonnances cherchées et débloquées par jour, sur les {count} derniers jours.
      </figcaption>

      <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Légende">
        {SERIES.map((s) => (
          <li key={s.key} className="type-body-small flex items-center gap-2 text-ink">
            <span aria-hidden className={cn('h-0.5 w-5 rounded-full', s.fill)} />
            {s.label}
            <span className="font-semibold tabular-nums">{formatGroupedInt(totals[s.key])}</span>
          </li>
        ))}
      </ul>

      <div
        ref={wrapRef}
        // Focus : flèches gauche/droite pour parcourir les jours.
        tabIndex={0}
        role="group"
        aria-label="Graphique : utilisez les flèches gauche et droite pour lire chaque jour"
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        className="relative min-w-0 rounded-field focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action"
      >
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          className="block touch-pan-y"
          aria-hidden
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(t)}
                y2={y(t)}
                className={t === 0 ? 'stroke-outline' : 'stroke-hairline'}
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y(t)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-ink-muted text-[11px] tabular-nums"
              >
                {formatGroupedInt(t)}
              </text>
            </g>
          ))}
          {days.map((d, i) =>
            (count - 1 - i) % labelEvery === 0 ? (
              <text
                key={d.date}
                x={x(i)}
                y={HEIGHT - 8}
                textAnchor={i === 0 ? 'start' : i === count - 1 ? 'end' : 'middle'}
                className="fill-ink-muted text-[11px]"
              >
                {dayFmt.format(new Date(d.date))}
              </text>
            ) : null,
          )}

          <path d={area} className="fill-chart-1/8" />
          {SERIES.map((s) => (
            <path
              key={s.key}
              d={path(s.key)}
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              className={s.stroke}
            />
          ))}

          {point && active !== null && (
            <g>
              <line
                x1={x(active)}
                x2={x(active)}
                y1={PAD.top}
                y2={PAD.top + innerH}
                className="stroke-ink/25"
                strokeWidth={1}
              />
              {SERIES.map((s) => (
                <circle
                  key={s.key}
                  cx={x(active)}
                  cy={y(point[s.key])}
                  r={5}
                  strokeWidth={2}
                  className={cn(
                    'stroke-surface',
                    s.key === 'searches' ? 'fill-chart-1' : 'fill-chart-2',
                  )}
                />
              ))}
            </g>
          )}
        </svg>

        {point && active !== null && (
          <div
            role="status"
            className={cn(
              'pointer-events-none absolute top-2 z-10 flex min-w-44 flex-col gap-1.5 rounded-field border border-hairline bg-surface px-3 py-2 shadow-glass-lg',
            )}
            style={
              tipOnLeft
                ? { right: Math.max(width - tipLeft + 12, 0) }
                : { left: Math.min(tipLeft + 12, width - 180) }
            }
          >
            <p className="type-caption font-semibold text-ink first-letter:uppercase">
              {longFmt.format(new Date(point.date))}
            </p>
            {SERIES.map((s) => (
              <p key={s.key} className="type-caption flex items-center gap-2 text-ink">
                <span aria-hidden className={cn('size-2.5 rounded-full', s.fill)} />
                <span className="flex-1 text-ink-muted">{s.label}</span>
                <span className="font-semibold tabular-nums">{formatGroupedInt(point[s.key])}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <details className="group">
        <summary className="type-body-small flex min-h-11 cursor-pointer items-center font-semibold text-action hover:underline">
          Voir les données en tableau
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] text-left">
            <caption className="sr-only">Ordonnances par jour</caption>
            <thead>
              <tr className="type-caption text-ink-muted">
                <th scope="col" className="pb-2 font-medium">
                  Jour
                </th>
                {SERIES.map((s) => (
                  <th key={s.key} scope="col" className="pb-2 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="type-body-small divide-y divide-hairline text-ink tabular-nums">
              {days.map((d) => (
                <tr key={d.date}>
                  <th scope="row" className="py-1.5 font-normal">
                    {dayFmt.format(new Date(d.date))}
                  </th>
                  <td className="py-1.5 text-right">{formatGroupedInt(d.searches)}</td>
                  <td className="py-1.5 text-right">{formatGroupedInt(d.unlocks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
