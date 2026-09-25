'use client';

import { useState } from 'react';
import { Poppins } from 'next/font/google';
import {
  coachLine,
  DEFAULT_TARGET,
  MAX_BONUS_PIPS,
  moodFor,
  TARGET_MAX,
  TARGET_MIN,
} from '@/lib/streak-content';
import styles from './WeekPlanner.module.css';

/*
 * "Try a week": set a target, pick today, add sessions, and read the home
 * screen's bottom half as the watch would show it — the pips and the coach
 * line, in the watch's colours (lime when banked, amber when at risk). The
 * words come from lib/streak-content.ts, which mirrors the watch's Coach.cpp.
 */

// The watch's typeface, for the face only.
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '600'], display: 'swap' });

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MOOD_LABEL = {
  done: 'Week banked',
  atRisk: 'At risk',
  climbing: 'On track',
  trial: 'First week',
} as const;

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className={styles.control}>
      <span className={styles.controlLabel}>{label}</span>
      <div className={styles.stepper}>
        <button type="button" aria-label={`${label}: fewer`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <output aria-live="polite">{value}</output>
        <button type="button" aria-label={`${label}: more`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}

export default function WeekPlanner() {
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [sessions, setSessions] = useState(1);
  const [day, setDay] = useState(3); // Thursday

  const maxSessions = target + MAX_BONUS_PIPS;
  const shown = Math.min(sessions, maxSessions);
  const view = { target, sessions: shown, daysLeft: 7 - day };
  const mood = moodFor(view);
  const line = coachLine(view);

  const changeTarget = (t: number) => {
    setTarget(t);
    setSessions((s) => Math.min(s, t + MAX_BONUS_PIPS));
  };

  const pips = [
    ...Array.from({ length: target }, (_, i) => (i < shown ? 'done' : 'todo')),
    ...Array.from({ length: Math.max(0, shown - target) }, () => 'bonus'),
  ];

  return (
    <div className={styles.planner}>
      <div className={styles.controls}>
        <Stepper label="Weekly target" value={target} min={TARGET_MIN} max={TARGET_MAX} onChange={changeTarget} />
        <Stepper label="Sessions so far" value={shown} min={0} max={maxSessions} onChange={setSessions} />
        <div className={styles.control}>
          <span className={styles.controlLabel}>Today is</span>
          <div className={styles.days} role="radiogroup" aria-label="Today is">
            {DAYS.map((d, i) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={day === i}
                className={`${styles.day} ${day === i ? styles.dayOn : ''}`}
                onClick={() => setDay(i)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.readout}>
        <div className={`${styles.face} ${poppins.className}`} data-mood={mood}>
          <p className={styles.pipsRow}>
            <span className={styles.pips} aria-hidden="true">
              {pips.map((p, i) => (
                <span key={i} className={`${styles.pip} ${styles[p]}`} />
              ))}
            </span>
            <span className={styles.thisWeek}>this week</span>
          </p>
          <p className={styles.coach} aria-live="polite">
            {line}
          </p>
        </div>
        <p className={styles.moodTag} data-mood={mood}>
          {MOOD_LABEL[mood]}
          <span className={styles.moodDetail}>
            {' '}· {shown} of {target} · {7 - day} day{7 - day === 1 ? '' : 's'} left
          </span>
        </p>
      </div>
    </div>
  );
}
