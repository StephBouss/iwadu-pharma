// Motif décoratif de carte : rues, zone de recherche autour de la position du
// visiteur, trajet en pointillés vers une pharmacie, repères de pharmacies.
// Dessiné à la main (aucune tuile de carte), en traits fins et très
// transparents ; masqué aux lecteurs d'écran.

const ROADS = [
  'M-40 520 C 220 470, 420 560, 640 500 S 1080 380, 1480 430',
  'M-40 300 C 180 330, 360 250, 560 280 S 920 360, 1480 250',
  'M180 -20 C 220 160, 160 360, 240 660',
  'M620 -20 C 600 180, 700 360, 660 660',
  'M1000 -20 C 1040 140, 960 340, 1060 660',
  'M1300 -20 C 1260 200, 1340 420, 1290 660',
  'M-40 120 C 300 150, 700 60, 1480 110',
];

const LANES = [
  'M360 -20 C 380 200, 320 420, 400 660',
  'M820 -20 C 860 240, 780 420, 860 660',
  'M-40 420 C 260 400, 560 440, 860 400 S 1240 330, 1480 350',
  'M1160 -20 C 1140 220, 1200 420, 1160 660',
];

const PHARMACIES = [
  { x: 1010, y: 210 },
  { x: 1240, y: 470 },
  { x: 1150, y: 90 },
  { x: 560, y: 560 },
  { x: 1380, y: 170 },
];

function Pin({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M0 0 C -14 -16 -18 -24 -18 -32 A 18 18 0 1 1 18 -32 C 18 -24 14 -16 0 0 Z"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeOpacity="0.5"
        strokeWidth="1.5"
      />
      <path
        d="M-6 -32 H 6 M0 -38 V -26"
        stroke="currentColor"
        strokeOpacity="0.7"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </g>
  );
}

export function HeroMapPattern({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 1440 640"
      preserveAspectRatio="xMidYMid slice"
      className={className}
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        {ROADS.map((d) => (
          <path key={d} d={d} strokeWidth="10" strokeOpacity="0.22" />
        ))}
        {LANES.map((d) => (
          <path key={d} d={d} strokeWidth="3" strokeOpacity="0.18" />
        ))}
        {/* Zone de recherche autour du visiteur */}
        <circle cx="880" cy="380" r="120" strokeWidth="1.5" strokeOpacity="0.35" />
        <circle
          cx="880"
          cy="380"
          r="240"
          strokeWidth="1.5"
          strokeOpacity="0.22"
          strokeDasharray="4 10"
        />
        {/* Trajet vers la pharmacie la plus proche */}
        <path
          d="M880 380 C 930 330, 960 260, 1010 214"
          strokeWidth="3"
          strokeOpacity="0.6"
          strokeDasharray="2 12"
        />
      </g>
      <circle cx="880" cy="380" r="22" fill="currentColor" fillOpacity="0.14" />
      <circle cx="880" cy="380" r="9" fill="currentColor" fillOpacity="0.6" />
      {PHARMACIES.map((p) => (
        <Pin key={`${p.x}-${p.y}`} x={p.x} y={p.y} />
      ))}
    </svg>
  );
}
