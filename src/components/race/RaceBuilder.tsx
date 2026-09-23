'use client';

import { useMemo, useState } from 'react';
import { buildSegments, FORMATS, type RaceFormat, type SegmentKind } from '@/lib/race-content';
import styles from './RaceBuilder.module.css';

/*
 * "What the watch records": choose a format and whether to split the Roxzone,
 * and see the laps the race will produce, in order, in the watch's colours.
 * Built from the same segment rule the watch uses (lib/race-content.ts).
 */

const KIND_CLASS: Record<SegmentKind, string> = {
  run: styles.run,
  station: styles.station,
  roxIn: styles.rox,
  roxOut: styles.rox,
};

const KIND_NAME: Record<SegmentKind, string> = {
  run: 'Run',
  station: 'Station',
  roxIn: 'Roxzone',
  roxOut: 'Roxzone',
};

export default function RaceBuilder() {
  const [format, setFormat] = useState<RaceFormat>('full');
  const [roxzone, setRoxzone] = useState(false);
  const segments = useMemo(() => buildSegments(format, roxzone), [format, roxzone]);

  return (
    <div className={styles.builder}>
      <div className={styles.controls}>
        <div className={styles.tabs} role="radiogroup" aria-label="Race format">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={format === f.id}
              className={`${styles.tab} ${format === f.id ? styles.tabOn : ''}`}
              onClick={() => setFormat(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={roxzone}
          className={`${styles.switch} ${roxzone ? styles.switchOn : ''}`}
          onClick={() => setRoxzone((on) => !on)}
        >
          <span className={styles.track} aria-hidden="true">
            <span className={styles.thumb} />
          </span>
          Roxzone splits
        </button>

        <p className={styles.count} aria-live="polite">
          <span className={styles.countNumber}>{segments.length}</span>
          <span className={styles.countLabel}>laps recorded</span>
        </p>
      </div>

      <ol className={styles.strip} aria-label={`${segments.length} laps, in race order`}>
        {segments.map((s, i) => (
          <li
            key={`${format}-${roxzone}-${i}`}
            className={`${styles.lap} ${KIND_CLASS[s.kind]}`}
            style={{ animationDelay: `${Math.min(i * 22, 600)}ms` }}
          >
            <span className={styles.lapIndex}>{String(i + 1).padStart(2, '0')}</span>
            <span className={styles.lapLabel}>{s.label}</span>
            <span className={styles.lapWork}>
              <span className={styles.srOnly}>{KIND_NAME[s.kind]}: </span>
              {s.work}
            </span>
          </li>
        ))}
      </ol>

      <ul className={styles.legend} aria-hidden="true">
        <li className={styles.run}>Run</li>
        <li className={styles.station}>Station</li>
        <li className={styles.rox}>Roxzone</li>
      </ul>
    </div>
  );
}
