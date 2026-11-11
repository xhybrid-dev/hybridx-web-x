'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Mail } from 'lucide-react';
import TrackedLink from '@/components/TrackedLink';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import { DIVISION_PROFILES, finishOptions, formatDuration, fullSplits } from '@/lib/hyrox-pacing';

export interface PackOffer {
  href: string;
  /** "£5". */
  price: string;
  name: string;
}

const select =
  'h-12 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground';

/**
 * The free HYROX pacer (docs/content-engine-plan.md, step 9). The whole split
 * table is free on the page (Jon, D9). A printable download, an emailed copy,
 * the race cards and the finish-time prediction are the Pacing Pack, shown
 * while it is on sale.
 *
 * The URL carries the division and the finish, so a pace plan can be shared.
 */
export default function HyroxPacer({ pack }: { pack: PackOffer | null }) {
  const [division, setDivision] = useState(DIVISION_PROFILES[0].key);
  const [finish, setFinish] = useState(90);
  const used = useRef(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const d = DIVISION_PROFILES.find((p) => p.key === q.get('division'));
    if (d) setDivision(d.key);
    const f = Number(q.get('finish'));
    if (Number.isInteger(f) && f > 0) setFinish(f);
  }, []);

  const profile = DIVISION_PROFILES.find((d) => d.key === division) ?? DIVISION_PROFILES[0];
  const options = useMemo(() => finishOptions(profile), [profile]);
  // Keep the chosen time inside the division's range, on a five-minute step.
  const minutes = Math.min(Math.max(Math.round(finish / 5) * 5, profile.minMinutes), profile.maxMinutes);
  const t = useMemo(() => fullSplits(profile, minutes * 60), [profile, minutes]);

  function change(next: { division?: string; finish?: number }) {
    const d = next.division ?? division;
    const f = next.finish ?? minutes;
    if (next.division) setDivision(next.division);
    if (next.finish) setFinish(next.finish);
    window.history.replaceState(null, '', `?division=${d}&finish=${f}`);
    if (!used.current) {
      used.current = true;
      trackEvent('hyrox_pacer_used', { division: d });
    }
  }

  const tiles: [string, string][] = [
    ['Average run', formatDuration(t.averageRun)],
    ['All 8 runs', formatDuration(t.allRuns)],
    ['All 8 stations', formatDuration(t.allStations)],
    ['Roxzone, all 16 passes', formatDuration(t.roxzone)],
    ['Clock at halfway', formatDuration(t.segments[7].clock)],
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2 sm:p-6">
        <label className="block">
          <span className="mb-1.5 block font-medium">Division</span>
          <select className={select} value={division} onChange={(e) => change({ division: e.target.value })}>
            {DIVISION_PROFILES.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block font-medium">Target finish</span>
          <select className={select} value={minutes} onChange={(e) => change({ finish: Number(e.target.value) })}>
            {options.map((m) => (
              <option key={m} value={m}>
                {formatDuration(m * 60)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <dt className="font-body text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-headline text-2xl font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <section id="splits" aria-labelledby="splits-heading" className="scroll-mt-24 space-y-3">
        <h2 id="splits-heading" className="font-headline text-2xl font-bold text-primary">
          {profile.label}, {formatDuration(minutes * 60)}: every split
        </h2>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-left">
            <thead className="bg-secondary/60 font-headline text-sm">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Segment
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Target
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Race clock
                </th>
              </tr>
            </thead>
            <tbody className="divide-y font-body tabular-nums">
              {t.segments.map((s) => (
                <tr key={s.name} className={s.kind === 'station' ? 'bg-accent/10' : ''}>
                  <th scope="row" className="px-4 py-2.5 font-normal">
                    {s.kind === 'station' ? <span className="font-semibold">{s.name}</span> : s.name}
                  </th>
                  <td className="px-4 py-2.5 text-right">{formatDuration(s.seconds)}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{formatDuration(s.clock)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="font-body text-sm text-muted-foreground">
          The race clock includes the Roxzone ({formatDuration(t.roxzone)} in all), spread evenly across the 16 segments, so it lands on
          your finish. Average run and station profiles for each division, scaled to the time you choose: a planning guide, not a
          prediction.
        </p>
      </section>

      {pack ? (
        <section aria-labelledby="pack-heading" className="rounded-xl bg-neutral-950 p-6 text-white md:p-8">
          <h2 id="pack-heading" className="font-headline text-2xl font-bold">
            Take these splits to the race
          </h2>
          <p className="mt-2 max-w-2xl font-body text-white/80">
            Download them as a printable PDF, or have them emailed, with the {pack.name} ({pack.price}). It has these tables for all 7
            divisions and 40 finish times, race cards to carry, and a finish-time prediction from 9 benchmark tests.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild className="bg-accent text-black hover:bg-accent/90">
              <TrackedLink href={pack.href} event="hyrox_pacer_pack_click" eventParams={{ action: 'download', division }}>
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                Download as PDF ({pack.price})
              </TrackedLink>
            </Button>
            <Button asChild variant="outline" className="border-white bg-transparent text-white hover:bg-white hover:text-black">
              <TrackedLink href={pack.href} event="hyrox_pacer_pack_click" eventParams={{ action: 'email', division }}>
                <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                Email it to me ({pack.price})
              </TrackedLink>
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
