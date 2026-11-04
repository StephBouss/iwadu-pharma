import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_TIME_ZONE } from '@/lib/format';

// Maquette Banani « Mini Bar Chart », revue selon les règles de dataviz :
// - une seule série : pas de légende, le titre du panneau la nomme ;
// - barres de 24 px au plus, coin arrondi de 4 px en haut, carré à la base ;
// - la barre mise en avant en vert Iwadu (validé : chroma et contraste OK),
//   les autres en gris neutre — l'emphase, pas une échelle de couleur ;
// - la valeur de la barre mise en avant est écrite au-dessus, en couleur de
//   texte ; les autres valeurs sont dans l'infobulle et dans le tableau.
// Rendu serveur, sans JavaScript ; barres en SVG (aucun style en ligne).

export interface DayValue {
  date: Date;
  value: number;
}

export interface WeeklyBarChartProps {
  days: readonly DayValue[];
  /** Index de la barre mise en avant (en général aujourd'hui). */
  highlightIndex: number;
  /** Unité au pluriel, pour les infobulles : « ordonnances ». */
  unit: string;
  timeZone?: string | undefined;
  className?: string | undefined;
}

const PLOT_HEIGHT = 104; // px, zone des barres : la plus haute fait 84 px, comme la maquette
const LABEL_ROOM = 20; // px réservés au-dessus de la plus haute barre
const BAR_WIDTH = 24;
const RADIUS = 4;

/** Contour d'une barre : coins du haut arrondis, base carrée. */
function barPath(height: number): string {
  const y = PLOT_HEIGHT - height;
  const r = Math.min(RADIUS, height / 2);
  return [
    `M0 ${PLOT_HEIGHT}`,
    `V${y + r}`,
    `Q0 ${y} ${r} ${y}`,
    `H${BAR_WIDTH - r}`,
    `Q${BAR_WIDTH} ${y} ${BAR_WIDTH} ${y + r}`,
    `V${PLOT_HEIGHT}`,
    'Z',
  ].join(' ');
}

export function WeeklyBarChart({
  days,
  highlightIndex,
  unit,
  timeZone = DEFAULT_TIME_ZONE,
  className,
}: WeeklyBarChartProps) {
  const max = Math.max(...days.map((d) => d.value), 1);
  const shortDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'narrow', timeZone });
  const longDay = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  });

  const bars = days.map((d, i) => {
    const height = Math.max(4, Math.round((d.value / max) * (PLOT_HEIGHT - LABEL_ROOM)));
    const name = longDay.format(d.date);
    const day = `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
    return {
      key: d.date.toISOString(),
      value: d.value,
      height,
      day,
      short: shortDay.format(d.date).toUpperCase(),
      description: `${day} : ${d.value} ${unit}`,
      highlighted: i === highlightIndex,
    };
  });

  return (
    <figure className={cn('flex flex-col gap-3', className)}>
      <ol className="flex items-end">
        {bars.map((bar) => (
          <li key={bar.key} className="flex flex-1 flex-col items-center gap-1">
            <svg
              role="img"
              aria-label={bar.description}
              width={BAR_WIDTH}
              height={PLOT_HEIGHT}
              viewBox={`0 0 ${BAR_WIDTH} ${PLOT_HEIGHT}`}
              className="overflow-visible"
            >
              <title>{bar.description}</title>
              {bar.highlighted && (
                <text
                  x={BAR_WIDTH / 2}
                  y={PLOT_HEIGHT - bar.height - 6}
                  textAnchor="middle"
                  className="fill-ink text-[0.8125rem] font-semibold tabular-nums"
                >
                  {bar.value}
                </text>
              )}
              <path
                d={barPath(bar.height)}
                className={bar.highlighted ? 'fill-brand' : 'fill-outline/45'}
              />
            </svg>
            <span aria-hidden className="type-caption text-ink-muted">
              {bar.short}
            </span>
          </li>
        ))}
      </ol>

      <details className="group">
        <summary className="type-caption flex h-12 w-fit cursor-pointer list-none items-center gap-1 font-semibold text-action [&::-webkit-details-marker]:hidden">
          <ChevronRight
            aria-hidden
            className="size-4 transition-transform motion-safe:duration-200 group-open:rotate-90"
          />
          Voir les données
        </summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="border-b border-hairline">
              <th scope="col" className="type-caption py-1 font-semibold text-ink-muted">
                Jour
              </th>
              <th scope="col" className="type-caption py-1 text-right font-semibold text-ink-muted">
                Nombre
              </th>
            </tr>
          </thead>
          <tbody>
            {bars.map((bar) => (
              <tr key={bar.key} className="border-b border-hairline last:border-0">
                <td className="type-body-small py-1 text-ink">{bar.day}</td>
                <td className="type-body-small py-1 text-right text-ink tabular-nums">
                  {bar.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
