'use client';

import { useId, useMemo, useState } from 'react';
import { daysFromCivil, formatChange, formatKg, Trend, TREND_PERCENT } from '@/lib/weighin-core';
import styles from './OneDay.module.css';

/*
 * One odd morning. A fortnight at a steady 82.0 kg, except the morning in the
 * middle, which the visitor sets with the slider. The trend is the app's own
 * (lib/weighin-core.ts): that morning it moves a fifth of the way to the
 * reading, then eases back as the steady mornings return. The default, +0.9
 * kg, is the sample log's own "salty meal or a late dinner the night before".
 */

const BASE = 8200;
const DAYS = 15;
const ODD = 7;
const DAY0 = daysFromCivil(2026, 10, 1);
const LO = 7950;
const HI = 8450;

const W = 640;
const H = 280;
const P = { left: 60, right: 24, top: 34, bottom: 40 };
const X = (i: number) => P.left + (i / (DAYS - 1)) * (W - P.left - P.right);
const Y = (v: number) => P.top + ((HI - v) / (HI - LO)) * (H - P.top - P.bottom);

export default function OneDay() {
  const id = useId();
  const [offset, setOffset] = useState(90); // 0.01 kg

  const { trend, bump } = useMemo(() => {
    const t = new Trend();
    for (let i = 0; i < DAYS; i++) t.onEntry({ day: DAY0 + i, minute: 7 * 60, hundredths: i === ODD ? BASE + offset : BASE });
    const tr = Array.from({ length: DAYS }, (_, i) => t.at(DAY0 + i)!.trend);
    return { trend: tr, bump: tr[ODD] - BASE };
  }, [offset]);

  const line = trend.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const odd = BASE + offset;
  const scaleText = formatChange(offset, 1);
  const trendText = formatChange(bump, 2);

  return (
    <div className={styles.panel}>
      <div className={styles.chartWrap}>
        <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} role="img" aria-labelledby={`${id}-cap`}>
          {[8000, 8100, 8200, 8300, 8400].map((v) => (
            <g key={v}>
              <line x1={P.left} x2={W - P.right} y1={Y(v)} y2={Y(v)} className={v === BASE ? styles.baseLine : styles.grid} />
              <text x={P.left - 10} y={Y(v) + 4} className={styles.axis} textAnchor="end">
                {formatKg(v, 1)}
              </text>
            </g>
          ))}
          <text x={X(0)} y={H - 12} className={styles.axis} textAnchor="start">
            A WEEK BEFORE
          </text>
          <text x={X(ODD)} y={H - 12} className={styles.axis} textAnchor="middle">
            THAT MORNING
          </text>
          <text x={X(DAYS - 1)} y={H - 12} className={styles.axis} textAnchor="end">
            A WEEK AFTER
          </text>

          {/* The reading's jump, and the trend's. */}
          <line x1={X(ODD)} x2={X(ODD)} y1={Y(BASE)} y2={Y(odd)} className={styles.jump} />
          <polyline points={line} className={styles.trendGlow} />
          <polyline points={line} className={styles.trend} />
          {Array.from({ length: DAYS }, (_, i) =>
            i === ODD ? null : <circle key={i} cx={X(i)} cy={Y(BASE)} r={3.4} className={styles.dot} />,
          )}
          <circle cx={X(ODD)} cy={Y(odd)} r={6} className={styles.odd} />
          <text x={X(ODD) + 12} y={Y(odd) + (offset >= 0 ? -8 : 18)} className={styles.oddLabel}>
            {offset === 0 ? 'no change' : `${scaleText} kg`}
          </text>
          <circle cx={X(ODD)} cy={Y(trend[ODD])} r={4} className={styles.tip} />
        </svg>
        <p id={`${id}-cap`} className={styles.caption}>
          A fortnight at 82.0 kg, and one morning at {formatKg(odd, 1)}. The trend that day moves {trendText} kg.
        </p>
      </div>

      <div className={styles.side}>
        <div className={styles.readings}>
          <p>
            <span>On the scale</span>
            <strong className={styles.scaleBig}>{offset === 0 ? '0.0' : scaleText}</strong>
            <em>kg overnight</em>
          </p>
          <p>
            <span>On the trend</span>
            <strong className={styles.trendBig}>{bump === 0 ? '0.00' : trendText}</strong>
            <em>kg, a fifth of it</em>
          </p>
        </div>
        <p className={styles.sum}>
          {formatKg(BASE, 2)} + ({formatKg(odd, 2)} − {formatKg(BASE, 2)}) × {TREND_PERCENT}% ={' '}
          <b>{formatKg(trend[ODD], 2)}</b>
        </p>
        <label htmlFor={`${id}-range`} className={styles.label}>
          Set that morning’s reading
        </label>
        <input
          id={`${id}-range`}
          type="range"
          min={-200}
          max={200}
          step={10}
          value={offset}
          onChange={(e) => setOffset(Number(e.target.value))}
          className={styles.range}
          aria-valuetext={`${formatKg(odd, 1)} kilograms: ${scaleText} on the scale, ${trendText} on the trend`}
        />
        <div className={styles.rangeEnds} aria-hidden="true">
          <span>−2.0 kg</span>
          <span>+2.0 kg</span>
        </div>
      </div>
    </div>
  );
}
