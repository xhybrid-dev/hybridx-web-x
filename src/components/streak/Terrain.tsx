/*
 * Terrain for the Streak page: mountain ridges, topographic contours and a
 * night sky. Drawn as inline SVG from a seeded generator, so every render
 * (server or client) produces the same shapes.
 *
 * Purely decorative: every export is aria-hidden.
 */

/** A small seeded generator (LCG), so the terrain is identical on every render. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A jagged ridge line across a 1440-wide view, closed down to the bottom. */
function ridgePath(seed: number, baseY: number, amp: number, height: number) {
  const rand = seeded(seed);
  const pts: [number, number][] = [];
  let y = baseY;
  for (let x = 0; x <= 1440; x += 24 + Math.floor(rand() * 36)) {
    // A random walk pulled back towards the base line, with the odd sharp peak.
    y += (rand() - 0.5) * amp;
    y += (baseY - y) * 0.18;
    if (rand() > 0.9) y -= amp * 0.9;
    pts.push([x, Math.round(y)]);
  }
  pts.push([1440, Math.round(y)]);
  return `M0 ${height} L${pts.map(([x, py]) => `${x} ${py}`).join(' L')} L1440 ${height} Z`;
}

export function Ridges({
  className,
  layers,
  height = 260,
}: {
  className?: string;
  layers: { seed: number; baseY: number; amp: number; fill: string }[];
  height?: number;
}) {
  return (
    <svg className={className} viewBox={`0 0 1440 ${height}`} preserveAspectRatio="none" aria-hidden="true">
      {layers.map((l) => (
        <path key={l.seed} d={ridgePath(l.seed, l.baseY, l.amp, height)} fill={l.fill} />
      ))}
    </svg>
  );
}

/** Concentric, wobbling rings, like the contour lines round a summit on a map. */
function contourPath(cx: number, cy: number, r: number, phase: number) {
  const pts: string[] = [];
  for (let i = 0; i <= 72; i++) {
    const t = (i / 72) * Math.PI * 2;
    const rr = r + r * 0.12 * Math.sin(3 * t + phase) + r * 0.06 * Math.sin(5 * t - phase * 1.7);
    pts.push(`${(cx + rr * Math.cos(t)).toFixed(1)} ${(cy + rr * 0.72 * Math.sin(t)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

export function Contours({ className, rings = 11 }: { className?: string; rings?: number }) {
  const summits = [
    { cx: 260, cy: 180, phase: 0.4 },
    { cx: 1180, cy: 360, phase: 2.1 },
  ];
  return (
    <svg className={className} viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {summits.map((s) =>
        Array.from({ length: rings }, (_, k) => (
          <path
            key={`${s.cx}-${k}`}
            d={contourPath(s.cx, s.cy, 28 + k * 34, s.phase + k * 0.35)}
            fill="none"
            stroke="currentColor"
            strokeWidth={k % 5 === 4 ? 1.4 : 0.8}
          />
        )),
      )}
    </svg>
  );
}

export function Stars({ className, count = 70 }: { className?: string; count?: number }) {
  const rand = seeded(7);
  return (
    <svg className={className} viewBox="0 0 1440 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const x = Math.round(rand() * 1440);
        const y = Math.round(rand() * 480);
        const r = rand() > 0.85 ? 1.6 : 0.9;
        return <circle key={i} cx={x} cy={y} r={r} fill="#dbe8f2" opacity={0.35 + rand() * 0.5} data-twinkle={i % 7 === 0 || undefined} />;
      })}
    </svg>
  );
}

/** A single peak with a flag on top, for the summit section. */
export function Peak({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1440 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path d="M0 360 L180 250 L330 290 L520 170 L640 210 L720 90 L800 200 L930 150 L1080 260 L1250 220 L1440 300 L1440 360 Z" fill="#0b1a28" />
      <path d="M520 360 L720 90 L920 360 Z" fill="#12314a" />
      <path d="M720 90 L920 360 L720 360 Z" fill="#0c2336" />
      <path d="M720 90 L676 150 L700 142 L720 158 L742 140 L764 150 Z" fill="#eef4f8" />
      <line x1="720" y1="90" x2="720" y2="44" stroke="#eef4f8" strokeWidth="3" />
      <path d="M720 44 L756 54 L720 64 Z" fill="#b6f23d" />
      <path d="M0 360 L0 320 L140 300 L300 330 L460 300 L600 336 L760 318 L940 340 L1120 306 L1300 330 L1440 316 L1440 360 Z" fill="#07111c" />
    </svg>
  );
}
