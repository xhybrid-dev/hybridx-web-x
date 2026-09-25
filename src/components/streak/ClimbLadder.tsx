'use client';

import { useId, useState } from 'react';
import { CLIMBS, climbFor, mountainLine } from '@/lib/streak-content';
import styles from './ClimbLadder.module.css';

/*
 * "The climb": the five mountains, and a slider for weeks completed. The
 * climber sits where the watch would put it (climbFor, mirrored from the
 * watch's Summits.hpp), with the climbed trail in lime and the watch's own
 * mountain line beneath.
 *
 * The drawing is stylised, not to scale: the teal faces, snow and flags follow
 * the watch's Summit scene (DESIGN.md §2), and the heights only rise in order.
 */

// Peak centre (x), half-width and height in a 1000 x 320 view; base at y 300.
const PEAKS = [
  { x: 110, half: 115, h: 95, snow: 0 },
  { x: 305, half: 135, h: 150, snow: 0.18 },
  { x: 505, half: 150, h: 180, snow: 0.24 },
  { x: 715, half: 170, h: 225, snow: 0.44 },
  { x: 895, half: 120, h: 250, snow: 0.32 },
];
const BASE = 300;

// Mountains still ahead are drawn in the watch's far-range greys; climbed and
// current ones in its teal, with white and grey snow.
const LIT = { sun: '#1ba7a0', shade: '#0e5f5b', snow: '#ffffff', snowShade: '#a9a9a9' };
const AHEAD = { sun: '#2b3033', shade: '#1f2326', snow: '#4a4f53', snowShade: '#3a3e42' };
const MAX_WEEKS = 120;

export default function ClimbLadder() {
  const [weeks, setWeeks] = useState(7);
  const id = useId();
  const pos = climbFor(weeks);
  const summited = pos.ascent > 1 ? CLIMBS.length : pos.climb;

  const current = PEAKS[pos.climb];
  const t = pos.stepsClimbed / pos.steps;
  // The trail runs up the sunlit face, from its foot to the summit.
  const startX = current.x - current.half * 0.72;
  const climberX = startX + (current.x - startX) * t;
  const climberY = BASE - current.h * t;

  return (
    <div className={styles.ladder}>
      <svg viewBox="0 0 1000 320" className={styles.scene} role="img" aria-label={`${weeks} weeks completed: ${mountainLine(weeks)}`}>
        {/* stars */}
        {[
          [60, 40], [180, 80], [260, 30], [420, 60], [560, 25], [640, 90], [800, 45], [960, 70], [340, 110], [470, 130],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="#5c5c5c" />
        ))}

        {PEAKS.map((p, i) => {
          const apexY = BASE - p.h;
          const left = p.x - p.half;
          const right = p.x + p.half;
          const snowY = apexY + p.h * p.snow;
          const snowHalf = p.half * p.snow;
          const climbed = i < summited;
          const c = climbed || i === pos.climb ? LIT : AHEAD;
          return (
            <g key={CLIMBS[i].name}>
              <polygon points={`${left},${BASE} ${p.x},${apexY} ${p.x},${BASE}`} fill={c.sun} />
              <polygon points={`${p.x},${apexY} ${right},${BASE} ${p.x},${BASE}`} fill={c.shade} />
              {p.snow > 0 && (
                <>
                  <polygon points={`${p.x - snowHalf},${snowY} ${p.x},${apexY} ${p.x},${snowY}`} fill={c.snow} />
                  <polygon points={`${p.x},${apexY} ${p.x + snowHalf},${snowY} ${p.x},${snowY}`} fill={c.snowShade} />
                </>
              )}
              <line x1={p.x} y1={apexY} x2={p.x} y2={apexY - 26} stroke="#ffffff" strokeWidth="2.5" />
              <polygon
                points={`${p.x},${apexY - 26} ${p.x + 18},${apexY - 20} ${p.x},${apexY - 14}`}
                fill={climbed ? '#b6f23d' : '#6b6b6b'}
              />
            </g>
          );
        })}

        {/* the climbed trail and the climber, on the current mountain */}
        <line
          x1={startX}
          y1={BASE}
          x2={climberX}
          y2={climberY}
          stroke="#b6f23d"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <line
          x1={climberX}
          y1={climberY}
          x2={current.x}
          y2={BASE - current.h}
          stroke="#8a8a8a"
          strokeWidth="1.5"
          strokeDasharray="4 5"
        />
        <circle cx={climberX} cy={climberY} r="15" fill="none" stroke="#b6f23d" strokeOpacity="0.45" className={styles.halo} />
        <circle cx={climberX} cy={climberY} r="9" fill="#b6f23d" stroke="#fff" strokeWidth="3" />
        <rect x="0" y={BASE} width="1000" height="20" fill="#000" />
      </svg>

      <ol className={styles.names}>
        {CLIMBS.map((c, i) => (
          <li key={c.name} className={i < summited ? styles.nameDone : i === pos.climb ? styles.nameNow : ''}>
            <strong>{c.name}</strong>
            <span>{c.summitAt} weeks</span>
          </li>
        ))}
      </ol>

      <div className={styles.control}>
        <label htmlFor={id} className={styles.label}>
          Weeks completed <output>{weeks}</output>
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={MAX_WEEKS}
          value={weeks}
          onChange={(e) => setWeeks(Number(e.target.value))}
          className={styles.range}
        />
        <p className={styles.line} aria-live="polite">
          {mountainLine(weeks)}
        </p>
      </div>
    </div>
  );
}
