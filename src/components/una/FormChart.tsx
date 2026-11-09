'use client';

import { useMemo, useState } from 'react';
import { form, formWord, stepLoad, type LoadState } from '@/lib/una-maths';
import styles from './FormChart.module.css';

/*
 * Twelve weeks of an example athlete through X Streak's model: three weeks
 * building, one easy, twice, then a taper. The daily loads are made up; the
 * curves are stepLoad() applied to them, a day at a time, as the watch does.
 *
 * Two panels, one x-axis: fitness and fatigue share a scale; form, their
 * difference, sits below on its own so nothing needs a second y-axis.
 */

const WEEK = [90, 0, 120, 60, 0, 170, 110]; // Monday to Sunday
const WEEK_SCALE = [0.8, 0.95, 1.1, 0.55, 1.0, 1.15, 1.3, 0.6, 1.1, 1.25, 0.8, 0.4];

const FITNESS = '#2346E8';
const FATIGUE = '#C1121F';

type Day = LoadState & { load: number; form: number; word: string };

function simulate(): Day[] {
  const mean = (WEEK.reduce((a, b) => a + b, 0) / 7) * 0.8;
  let state: LoadState = { fitness: mean, fatigue: mean };
  const days: Day[] = [];
  for (const scale of WEEK_SCALE) {
    for (const base of WEEK) {
      const load = Math.round(base * scale);
      state = stepLoad(state, load);
      days.push({ ...state, load, form: form(state), word: formWord(state) });
    }
  }
  return days;
}

const W = 720;
const PAD_L = 34;
const PAD_R = 76;
const TOP = { y: 12, h: 150 };
const BOT = { y: 196, h: 84 };
const H = BOT.y + BOT.h + 26;

export default function FormChart() {
  const days = useMemo(simulate, []);
  const [hover, setHover] = useState<number | null>(null);

  const n = days.length;
  const x = (i: number) => PAD_L + (i / (n - 1)) * (W - PAD_L - PAD_R);
  const hi = Math.ceil(Math.max(...days.map((d) => Math.max(d.fitness, d.fatigue))) / 20) * 20;
  const lo = Math.floor(Math.min(...days.map((d) => Math.min(d.fitness, d.fatigue))) / 20) * 20;
  const yTop = (v: number) => TOP.y + TOP.h - ((v - lo) / (hi - lo)) * TOP.h;
  const fAbs = Math.ceil(Math.max(...days.map((d) => Math.abs(d.form))) / 10) * 10;
  const yBot = (v: number) => BOT.y + BOT.h / 2 - (v / fAbs) * (BOT.h / 2);

  const path = (get: (d: Day) => number, y: (v: number) => number) =>
    days.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(get(d)).toFixed(1)}`).join(' ');

  const last = days[n - 1];
  const h = hover === null ? null : days[hover];
  const sign = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v)}`;

  function move(e: React.PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = Math.round(((px - PAD_L) / (W - PAD_L - PAD_R)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  return (
    <figure className={styles.figure}>
      <ul className={styles.legend}>
        <li>
          <i style={{ background: FITNESS }} /> Fitness <span>42-day average</span>
        </li>
        <li>
          <i style={{ background: FATIGUE }} /> Fatigue <span>7-day average</span>
        </li>
        <li>
          <i style={{ background: '#0a0a0a' }} /> Form <span>fitness − fatigue</span>
        </li>
      </ul>

      <div className={styles.plot}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Fitness, fatigue and form over twelve example weeks. Fatigue swings week to week; fitness climbs slowly; form dips in hard weeks and rises in easy ones."
          onPointerMove={move}
          onPointerLeave={() => setHover(null)}
        >
          {/* grid */}
          {[lo, (lo + hi) / 2, hi].map((v) => (
            <g key={v}>
              <line x1={PAD_L} x2={W - PAD_R} y1={yTop(v)} y2={yTop(v)} className={styles.grid} />
              <text x={PAD_L - 6} y={yTop(v) + 4} textAnchor="end" className={styles.tick}>
                {v}
              </text>
            </g>
          ))}
          {[fAbs, 0, -fAbs].map((v) => (
            <g key={v}>
              <line x1={PAD_L} x2={W - PAD_R} y1={yBot(v)} y2={yBot(v)} className={v === 0 ? styles.zero : styles.grid} />
              <text x={PAD_L - 6} y={yBot(v) + 4} textAnchor="end" className={styles.tick}>
                {sign(v)}
              </text>
            </g>
          ))}
          {WEEK_SCALE.map((_, w) =>
            w % 2 === 0 ? (
              <text key={w} x={x(w * 7)} y={H - 6} className={styles.tick}>
                wk {w + 1}
              </text>
            ) : null,
          )}

          <path d={path((d) => d.fatigue, yTop)} fill="none" stroke={FATIGUE} strokeWidth="2" strokeLinejoin="round" />
          <path d={path((d) => d.fitness, yTop)} fill="none" stroke={FITNESS} strokeWidth="2" strokeLinejoin="round" />
          <path d={path((d) => d.form, yBot)} fill="none" stroke="#0a0a0a" strokeWidth="2" strokeLinejoin="round" />

          {/* direct labels at the line ends, in ink, with a colour key beside */}
          <circle cx={x(n - 1)} cy={yTop(last.fitness)} r="4" fill={FITNESS} />
          <text x={x(n - 1) + 9} y={yTop(last.fitness) + 4} className={styles.end}>
            Fitness {Math.round(last.fitness)}
          </text>
          <circle cx={x(n - 1)} cy={yTop(last.fatigue)} r="4" fill={FATIGUE} />
          <text x={x(n - 1) + 9} y={yTop(last.fatigue) + 4} className={styles.end}>
            Fatigue {Math.round(last.fatigue)}
          </text>
          <circle cx={x(n - 1)} cy={yBot(last.form)} r="4" fill="#0a0a0a" />
          <text x={x(n - 1) + 9} y={yBot(last.form) + 4} className={styles.end}>
            Form {sign(last.form)}
          </text>

          {h && hover !== null ? (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={TOP.y} y2={BOT.y + BOT.h} className={styles.cross} />
              <circle cx={x(hover)} cy={yTop(h.fitness)} r="4" fill={FITNESS} stroke="#fff" strokeWidth="2" />
              <circle cx={x(hover)} cy={yTop(h.fatigue)} r="4" fill={FATIGUE} stroke="#fff" strokeWidth="2" />
              <circle cx={x(hover)} cy={yBot(h.form)} r="4" fill="#0a0a0a" stroke="#fff" strokeWidth="2" />
            </g>
          ) : null}
        </svg>

        {h && hover !== null ? (
          <div
            className={styles.tip}
            style={{ left: `${(x(hover) / W) * 100}%` }}
            data-side={hover > n * 0.6 ? 'left' : 'right'}
          >
            <b>
              Week {Math.floor(hover / 7) + 1}, day {(hover % 7) + 1}
            </b>
            <span>Load that day {h.load}</span>
            <span>Fitness {h.fitness.toFixed(1)}</span>
            <span>Fatigue {h.fatigue.toFixed(1)}</span>
            <span>
              Form {sign(h.form)} · {h.word}
            </span>
          </div>
        ) : null}
      </div>

      <figcaption>
        Twelve example weeks: build for three, ease for one, twice over, then taper. Fatigue follows
        each week; fitness follows the season. Form is lowest at the end of the hardest weeks and
        turns positive in the taper.
      </figcaption>

      <details className={styles.table}>
        <summary>The same, as a table (end of each week)</summary>
        <table>
          <thead>
            <tr>
              <th>Week</th>
              <th>Week’s load</th>
              <th>Fitness</th>
              <th>Fatigue</th>
              <th>Form</th>
              <th>Word</th>
            </tr>
          </thead>
          <tbody>
            {WEEK_SCALE.map((_, w) => {
              const d = days[w * 7 + 6];
              const total = days.slice(w * 7, w * 7 + 7).reduce((a, b) => a + b.load, 0);
              return (
                <tr key={w}>
                  <td>{w + 1}</td>
                  <td>{total}</td>
                  <td>{Math.round(d.fitness)}</td>
                  <td>{Math.round(d.fatigue)}</td>
                  <td>{sign(d.form)}</td>
                  <td>{d.word}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
