'use client';

import { useId, useState } from 'react';
import {
  VO2_MIN_RESERVE,
  VO2_MIN_SPEED_M_PER_MIN,
  acsmRunningCost,
  edwardsLoad,
  formatPace,
  hrReserveFraction,
  paceToSpeed,
  vo2maxFromMinute,
  type ZoneMinutes,
} from '@/lib/una-maths';
import styles from './Benches.module.css';

/*
 * The two worked calculators on /una/nerdy-bits. Both run the functions in
 * lib/una-maths.ts, the same ones the tests pin to the watch's figures, so the
 * numbers a reader gets here are the numbers the method gives.
 */

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  show: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className={styles.slider}>
      <label htmlFor={id}>{props.label}</label>
      <output htmlFor={id}>{props.show}</output>
      <input
        id={id}
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Vo2Bench() {
  // The reference minute: 5:00 /km on the level at 160 bpm, resting 50, maximum 190.
  const [pace, setPace] = useState(300);
  const [grade, setGrade] = useState(0);
  const [hr, setHr] = useState(160);
  const [rest, setRest] = useState(50);
  const [max, setMax] = useState(190);

  const speed = paceToSpeed(pace);
  const cost = acsmRunningCost(speed, grade / 100);
  const reserve = hrReserveFraction(hr, rest, max);
  const usable = max - rest >= 40 && hr > rest && hr <= max;
  const at = (m: number) => vo2maxFromMinute({ speedMPerMin: speed, grade: grade / 100, hr, restHr: rest, maxHr: m });
  const value = usable ? at(max) : NaN;

  let verdict = 'This minute would count.';
  let ok = true;
  if (!usable) {
    verdict = hr > max ? 'Heart rate above your maximum: the maximum is set too low.' : 'These heart rates do not leave a usable reserve.';
    ok = false;
  } else if (speed < VO2_MIN_SPEED_M_PER_MIN) {
    verdict = 'Slower than 7:28 /km: below the range the running equation covers, so the minute is not used.';
    ok = false;
  } else if (reserve < VO2_MIN_RESERVE) {
    verdict = 'Under half your heart-rate reserve: too easy to estimate from, so the minute is not used.';
    ok = false;
  }

  return (
    <div className={styles.bench}>
      <div className={styles.controls}>
        <Slider label="Pace" value={pace} min={180} max={480} step={5} show={`${formatPace(pace)} /km`} onChange={setPace} />
        <Slider label="Gradient" value={grade} min={0} max={10} step={0.5} show={`${grade.toFixed(1)} %`} onChange={setGrade} />
        <Slider label="Heart rate" value={hr} min={90} max={210} show={`${hr} bpm`} onChange={setHr} />
        <Slider label="Resting heart rate" value={rest} min={35} max={90} show={`${rest} bpm`} onChange={setRest} />
        <Slider label="Maximum heart rate" value={max} min={150} max={215} show={`${max} bpm`} onChange={setMax} />
      </div>
      <div className={styles.readout} aria-live="polite">
        <ol className={styles.working}>
          <li>
            <span>Speed</span>
            <b>{speed.toFixed(0)} m/min</b>
          </li>
          <li>
            <span>Oxygen cost</span>
            <b>{cost.toFixed(1)}</b>
          </li>
          <li>
            <span>Reserve in use</span>
            <b>{usable ? `${(reserve * 100).toFixed(0)} %` : '—'}</b>
          </li>
        </ol>
        <p className={styles.result} data-ok={ok}>
          <span>VO2max from this minute</span>
          <b>{usable ? value.toFixed(1) : '—'}</b>
          <i>ml/kg/min</i>
        </p>
        <p className={styles.verdict} data-ok={ok}>
          {verdict}
        </p>
        {usable ? (
          <p className={styles.sens}>
            If your true maximum were 10 bpm lower, the same minute would read{' '}
            <b>{at(max - 10) > 0 && hr <= max - 10 ? at(max - 10).toFixed(1) : '—'}</b>; 10 bpm higher,{' '}
            <b>{at(max + 10).toFixed(1)}</b>. Nothing else on this panel moves the answer as much.
          </p>
        ) : null}
      </div>
    </div>
  );
}

const ZONE_NAMES = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'];

export function LoadBench() {
  const [zones, setZones] = useState<number[]>([10, 25, 15, 8, 2]);
  const load = edwardsLoad(zones as unknown as ZoneMinutes);
  const minutes = zones.reduce((a, b) => a + b, 0);
  const biggest = Math.max(1, ...zones.map((z, i) => z * (i + 1)));

  return (
    <div className={styles.bench}>
      <div className={styles.controls}>
        {ZONE_NAMES.map((name, i) => (
          <Slider
            key={name}
            label={`${name} · ×${i + 1}`}
            value={zones[i]}
            min={0}
            max={90}
            show={`${zones[i]} min`}
            onChange={(v) => setZones((prev) => prev.map((z, j) => (j === i ? v : z)))}
          />
        ))}
      </div>
      <div className={styles.readout} aria-live="polite">
        <ul className={styles.zoneBars} aria-hidden="true">
          {zones.map((z, i) => (
            <li key={i}>
              <span>Z{i + 1}</span>
              <i style={{ width: `${((z * (i + 1)) / biggest) * 100}%` }} />
              <b>{z * (i + 1)}</b>
            </li>
          ))}
        </ul>
        <p className={styles.result} data-ok="true">
          <span>{minutes} minutes in zones</span>
          <b>{load}</b>
          <i>load</i>
        </p>
        <p className={styles.sens}>
          The same {minutes} minutes all in zone 1 would score <b>{minutes}</b>; all in zone 5,{' '}
          <b>{minutes * 5}</b>.
        </p>
      </div>
    </div>
  );
}
