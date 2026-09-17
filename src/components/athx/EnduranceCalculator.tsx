'use client';

import { useMemo, useState } from 'react';
import styles from '@/app/athx-2027/athx.module.css';
import { trackEvent } from '@/lib/analytics';
import { markCalculatorUsed } from '@/components/athx/calc-usage';
import {
  COMPARISON_STEP,
  RUN_PACE_DEFAULT,
  RUN_PACE_MAX,
  RUN_PACE_MIN,
  RUN_PACE_STEP,
  SKI_PACE_DEFAULT,
  SKI_PACE_MAX,
  SKI_PACE_MIN,
  SKI_PACE_STEP,
  comparisonRows,
  computeBreakEven,
  computePacing,
  describeRunPace,
  describeSkiPace,
  formatTime,
  formatTimePrecise,
} from '@/lib/athx-pacing';

/**
 * The Endurance Zone pacing calculator.
 *
 * Ungated on purpose, and the one thing on this page that must never move
 * behind the email form. It converts precisely because it is free: it answers a
 * real question in about four seconds, which is what earns the address the form
 * then asks for.
 *
 * Everything is derived from two numbers on every keystroke — no network call,
 * no debounce. The responsiveness is the argument.
 */
export default function EnduranceCalculator() {
  const [runPace, setRunPace] = useState(RUN_PACE_DEFAULT);
  const [skiPace, setSkiPace] = useState(SKI_PACE_DEFAULT);

  const result = useMemo(() => computePacing(runPace, skiPace), [runPace, skiPace]);
  const rows = useMemo(() => comparisonRows(runPace, skiPace), [runPace, skiPace]);
  const breakEven = useMemo(() => computeBreakEven(runPace, skiPace), [runPace, skiPace]);

  const [noted, setNoted] = useState(false);

  /**
   * One event per visitor, not one per slider movement. `markCalculatorUsed`
   * is idempotent, but the analytics event is not, and a slider dragged across
   * its range would otherwise send a hundred of them.
   */
  function noteUse() {
    if (noted) return;
    setNoted(true);
    markCalculatorUsed();
    trackEvent('athx_calculator_used', { magnet: 'athx_2027_guide' });
  }

  return (
    <div className={styles.calc}>
      <div className={styles.calcGrid}>
        {/* ── Inputs ──────────────────────────────────────────────────── */}
        <div>
          <div className={styles.control}>
            <div className={styles.controlHead}>
              <label className={styles.fieldLabel} htmlFor="athx-run-pace">
                3 km run pace
              </label>
              <span className={styles.controlValue}>
                {formatTime(runPace)}
                <span className={styles.controlUnit}>/km</span>
              </span>
            </div>
            <input
              id="athx-run-pace"
              className={styles.slider}
              type="range"
              min={RUN_PACE_MIN}
              max={RUN_PACE_MAX}
              step={RUN_PACE_STEP}
              value={runPace}
              // onChange fires on every drag position in React's synthetic
              // model, which is the `input` event rather than `change`.
              onChange={(e) => {
                setRunPace(Number(e.target.value));
                noteUse();
              }}
              aria-valuetext={describeRunPace(runPace)}
            />
            <div className={styles.sliderScale} aria-hidden="true">
              <span>{formatTime(RUN_PACE_MIN)}</span>
              <span>{formatTime(RUN_PACE_MAX)}</span>
            </div>
          </div>

          <div className={styles.control}>
            <div className={styles.controlHead}>
              <label className={styles.fieldLabel} htmlFor="athx-ski-pace">
                Ski pace
              </label>
              <span className={styles.controlValue}>
                {formatTime(skiPace)}
                <span className={styles.controlUnit}>/500m</span>
              </span>
            </div>
            <input
              id="athx-ski-pace"
              className={styles.slider}
              type="range"
              min={SKI_PACE_MIN}
              max={SKI_PACE_MAX}
              step={SKI_PACE_STEP}
              value={skiPace}
              onChange={(e) => {
                setSkiPace(Number(e.target.value));
                noteUse();
              }}
              aria-valuetext={describeSkiPace(skiPace)}
            />
            <div className={styles.sliderScale} aria-hidden="true">
              <span>{formatTime(SKI_PACE_MIN)}</span>
              <span>{formatTime(SKI_PACE_MAX)}</span>
            </div>
          </div>

          <p className={styles.caption}>
            The zone is 24 minutes. The 3 km run is a buy-in, so whatever it does not use is
            ski time, and only the ski distance is scored.
          </p>
        </div>

        {/* ── Output ──────────────────────────────────────────────────── */}
        <div className={styles.readout} aria-live="polite">
          {result.overCap ? (
            <p className={styles.warning}>
              At {formatTime(runPace)} per kilometre the run uses the whole 24 minutes. There is
              no ski time left, so the zone scores nothing.
            </p>
          ) : null}

          <p className={styles.readoutLabel}>Ski distance</p>
          <p className={styles.readoutNumber}>
            {result.distanceMetres.toLocaleString('en-GB')}
            <span className={styles.readoutUnit}>m</span>
          </p>

          <div className={styles.readoutPair}>
            <div>
              <p className={styles.readoutLabel}>Ski time left</p>
              <p className={styles.readoutSmall}>{formatTime(result.skiSeconds)}</p>
            </div>
            <div>
              <p className={styles.readoutLabel}>One second is worth</p>
              <p className={styles.readoutSmall}>
                {result.metresPerSecond.toFixed(2)}
                <span className={styles.controlUnit}>m</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Comparison table ──────────────────────────────────────────── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption>Your pace, and three steps of 15 s/km either side</caption>
          <thead>
            <tr>
              <th scope="col">Run pace</th>
              <th scope="col">Run time</th>
              <th scope="col">Ski time</th>
              <th scope="col">Ski distance</th>
              <th scope="col">vs yours</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.deltaPerKm}
                className={row.current ? styles.rowCurrent : undefined}
                aria-current={row.current ? 'true' : undefined}
              >
                <th scope="row" style={{ fontWeight: row.current ? 600 : 400 }}>
                  {formatTime(row.runPacePerKm)}
                  {row.current ? ' — yours' : ''}
                </th>
                <td>{formatTime(row.runSeconds)}</td>
                <td>{formatTime(row.skiSeconds)}</td>
                <td>{row.distanceMetres.toLocaleString('en-GB')} m</td>
                <td>
                  {row.current
                    ? '—'
                    : `${row.metresVsCurrent > 0 ? '+' : ''}${row.metresVsCurrent.toLocaleString('en-GB')} m`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Break-even ────────────────────────────────────────────────── */}
      {breakEven ? (
        <div className={styles.callout} aria-live="polite">
          <p>
            Run {COMPARISON_STEP} s/km faster and you can afford to ski{' '}
            <strong>{breakEven.allowableDecayPct.toFixed(1)}%</strong> slower and still score the
            same — that is <strong>{formatTimePrecise(breakEven.allowableSkiPace)} /500m</strong>{' '}
            against your {formatTime(skiPace)}. Nobody arrives at the machine that much worse for
            {' '}{COMPARISON_STEP} seconds a kilometre.
          </p>
        </div>
      ) : null}
    </div>
  );
}
