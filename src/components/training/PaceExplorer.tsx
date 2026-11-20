'use client';

import { useMemo, useState } from 'react';
import { danielsFitness, formatPace } from '@/lib/una-maths';
import styles from './PaceExplorer.module.css';

// Invert Daniels-Gilbert VO2(v) = -4.60 + 0.182258*v + 0.000104*v^2 for speed in m/min.
function speedForVo2(targetVo2: number): number {
  const a = 0.000104;
  const b = 0.182258;
  const c = -4.6 - targetVo2;
  const disc = b * b - 4 * a * c;
  if (disc <= 0) return 120;
  return (-b + Math.sqrt(disc)) / (2 * a);
}

const ZONES = [
  {
    key: 'easy',
    name: 'Easy / Long',
    note: 'Aerobic base · alerts "too fast" only',
    loFrac: 0.65,
    hiFrac: 0.78,
  },
  {
    key: 'marathon',
    name: 'Marathon / Steady',
    note: 'Sustained aerobic strength',
    loFrac: 0.79,
    hiFrac: 0.84,
  },
  {
    key: 'threshold',
    name: 'Threshold (Cruise)',
    note: 'Comfortably hard · 20–30 min total work',
    loFrac: 0.86,
    hiFrac: 0.89,
  },
  {
    key: 'interval',
    name: 'Interval (VO2)',
    note: '3–5 min high-aerobic intervals',
    loFrac: 0.95,
    hiFrac: 0.99,
  },
  {
    key: 'rep',
    name: 'Repetition / Strides',
    note: 'Fast, relaxed economy & leg turnover',
    loFrac: 1.03,
    hiFrac: 1.08,
  },
] as const;

function formatFiveK(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function PaceExplorer() {
  const [fiveKSec, setFiveKSec] = useState(1380); // 23:00 default
  const [mode, setMode] = useState<'outdoor' | 'treadmill'>('outdoor');

  const computed = useMemo(() => {
    const index = danielsFitness(5000, fiveKSec / 60);
    const rows = ZONES.map((z) => {
      const slowSpeed = speedForVo2(index * z.loFrac); // m/min
      const fastSpeed = speedForVo2(index * z.hiFrac); // m/min
      const slowSecPerKm = 60000 / slowSpeed;
      const fastSecPerKm = 60000 / fastSpeed;
      const slowKmh = (slowSpeed * 60) / 1000;
      const fastKmh = (fastSpeed * 60) / 1000;
      return {
        ...z,
        outdoor: `${formatPace(fastSecPerKm)} – ${formatPace(slowSecPerKm)} /km`,
        treadmill: `${slowKmh.toFixed(1)} – ${fastKmh.toFixed(1)} km/h`,
      };
    });
    return { index, rows };
  }, [fiveKSec]);

  return (
    <div className={styles.card}>
      <div className={styles.controlsBar}>
        <div className={styles.sliderWrap}>
          <div className={styles.sliderHead}>
            <label htmlFor="training-5k-slider">Your recent 5K time</label>
            <output htmlFor="training-5k-slider" className={styles.timeReadout}>
              {formatFiveK(fiveKSec)}
            </output>
          </div>
          <input
            id="training-5k-slider"
            type="range"
            min={960}
            max={2160}
            step={15}
            value={fiveKSec}
            onChange={(e) => setFiveKSec(Number(e.target.value))}
            className={styles.slider}
          />
          <div className={styles.sliderScale} aria-hidden="true">
            <span>16:00</span>
            <span>23:00</span>
            <span>36:00</span>
          </div>
        </div>

        <div className={styles.modeToggle} role="group" aria-label="Display mode">
          <button
            type="button"
            className={styles.modeBtn}
            data-active={mode === 'outdoor'}
            aria-pressed={mode === 'outdoor'}
            onClick={() => setMode('outdoor')}
          >
            Outdoor (/km)
          </button>
          <button
            type="button"
            className={styles.modeBtn}
            data-active={mode === 'treadmill'}
            aria-pressed={mode === 'treadmill'}
            onClick={() => setMode('treadmill')}
          >
            Treadmill (km/h)
          </button>
        </div>
      </div>

      <ul className={styles.zoneList} aria-live="polite">
        {computed.rows.map((row) => (
          <li key={row.key} className={styles.zoneRow}>
            <div>
              <strong className={styles.zoneName}>{row.name}</strong>
              <span className={styles.zoneNote}>{row.note}</span>
            </div>
            <span className={styles.zoneValue}>
              {mode === 'outdoor' ? row.outdoor : row.treadmill}
            </span>
          </li>
        ))}
      </ul>

      <p className={styles.footnote}>
        Computed with the same Daniels–Gilbert equations used on the watch (checked against all 66
        rows of Daniels&apos; running tables). On the watch, Treadmill mode supports both km/h and mph
        belt targets.
      </p>
    </div>
  );
}
