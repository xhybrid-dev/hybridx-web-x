'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { DIVISION_PROFILES, formatDuration, previewSplits } from '@/lib/shop/glasgow-2027-pacing';

/**
 * Free run-split preview, ungated.
 *
 * Same profiles and the same arithmetic as the Pacing Pack's tables, so the
 * numbers here match the pack. Shows the eight runs, the halfway clock and the
 * totals; the station-by-station targets, the prediction worksheet and the
 * race cards stay in the pack.
 */
export default function SplitPreview() {
  const divisionId = useId();
  const finishId = useId();
  const [division, setDivision] = useState(DIVISION_PROFILES[0].key);
  const profile = DIVISION_PROFILES.find((d) => d.key === division) ?? DIVISION_PROFILES[0];
  const [finish, setFinish] = useState(90);
  const used = useRef(false);

  const options = useMemo(() => {
    const out: number[] = [];
    for (let m = profile.minMinutes; m <= profile.maxMinutes; m += 5) out.push(m);
    return out;
  }, [profile]);

  // Keep the chosen time inside the new division's range.
  const minutes = Math.min(Math.max(finish, profile.minMinutes), profile.maxMinutes);
  const result = previewSplits(profile, minutes * 60);

  function touched() {
    if (used.current) return;
    used.current = true;
    trackEvent('split_preview_used', { division });
  }

  const select =
    'h-12 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground';

  return (
    <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={divisionId} className="mb-1.5 block font-medium">
            Division
          </label>
          <select
            id={divisionId}
            className={select}
            value={division}
            onChange={(e) => {
              setDivision(e.target.value);
              touched();
            }}
          >
            {DIVISION_PROFILES.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={finishId} className="mb-1.5 block font-medium">
            Target finish
          </label>
          <select
            id={finishId}
            className={select}
            value={minutes}
            onChange={(e) => {
              setFinish(Number(e.target.value));
              touched();
            }}
          >
            {options.map((m) => (
              <option key={m} value={m}>
                {formatDuration(m * 60)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div aria-live="polite" className="mt-6">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            Run split targets for {profile.label} at {formatDuration(minutes * 60)}
          </caption>
          <thead>
            <tr className="border-b border-border text-sm text-muted-foreground">
              <th scope="col" className="py-2 font-medium">Segment</th>
              <th scope="col" className="py-2 text-right font-medium">Target</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {result.runs.map((s, i) => (
              <tr key={i} className="border-b border-border/60">
                <th scope="row" className="py-1.5 font-normal">Run {i + 1}</th>
                <td className="py-1.5 text-right font-medium">{formatDuration(s)}</td>
              </tr>
            ))}
            <tr className="border-b border-border/60">
              <th scope="row" className="py-1.5 font-normal">Clock at halfway, leaving Station 4</th>
              <td className="py-1.5 text-right font-medium">{formatDuration(result.halfway)}</td>
            </tr>
            <tr className="border-b border-border/60">
              <th scope="row" className="py-1.5 font-normal">All 8 runs</th>
              <td className="py-1.5 text-right font-medium">{formatDuration(result.allRuns)}</td>
            </tr>
            <tr className="border-b border-border/60">
              <th scope="row" className="py-1.5 font-normal">All 8 stations</th>
              <td className="py-1.5 text-right font-medium">{formatDuration(result.allStations)}</td>
            </tr>
            <tr>
              <th scope="row" className="py-1.5 font-normal">Roxzone, all 16 passes</th>
              <td className="py-1.5 text-right font-medium">{formatDuration(result.roxzone)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-sm text-muted-foreground">
          Each run is 1 km, so each run time is also your pace per km. Average run: {formatDuration(result.averageRun)}.
        </p>
      </div>

      <p className="mt-4 text-sm">
        The Pacing Pack gives the target for each of the eight stations at every finish time, a worksheet to
        predict your finish from your own tests, and race cards to fill in.{' '}
        <a href="#buy" className="font-medium underline underline-offset-4">
          See the buying options
        </a>
        .
      </p>
    </div>
  );
}
