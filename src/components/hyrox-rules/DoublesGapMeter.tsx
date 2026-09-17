'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

const MAX_GAP = 25;
const LIMIT = 10;

/**
 * The doubles togetherness limit shown as distance rather than time, since
 * ten seconds is easier to judge as a gap on the run lane.
 */
export default function DoublesGapMeter() {
  const [gap, setGap] = useState(6);
  const legal = gap <= LIMIT;
  const percent = (gap / MAX_GAP) * 100;
  const limitPercent = (LIMIT / MAX_GAP) * 100;

  // Rough distance equivalent at a 5:00/km run pace — 3.33 m per second.
  const metres = Math.round(gap * 3.33);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-headline text-lg font-bold text-foreground">
            How big is a ten second gap?
          </h3>
          <p className="font-body text-sm text-muted-foreground">
            Drag to set the gap between you and your partner.
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-headline text-xs font-bold uppercase tracking-wider',
            legal ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          )}
          aria-live="polite"
        >
          {legal ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Inside the limit
            </>
          ) : (
            <>
              <X className="h-3.5 w-3.5" aria-hidden="true" /> Infringement
            </>
          )}
        </span>
      </div>

      {/* Track */}
      <div className="relative mb-2 h-20 rounded-xl border border-border bg-background px-4">
        {/* Lane */}
        <div className="absolute inset-x-4 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />

        {/* Legal zone */}
        <div
          className={cn(
            'absolute top-1/2 h-1 -translate-y-1/2 rounded-full transition-colors',
            legal ? 'bg-emerald-500/50' : 'bg-rose-500/40'
          )}
          style={{ left: '1rem', width: `calc((100% - 2rem) * ${limitPercent / 100})` }}
        />

        {/* Limit marker */}
        <div
          className="absolute top-1/2 h-8 w-px -translate-y-1/2 bg-foreground/30"
          style={{ left: `calc(1rem + (100% - 2rem) * ${limitPercent / 100})` }}
          aria-hidden="true"
        />
        <span
          className="absolute bottom-1 -translate-x-1/2 font-headline text-[10px] uppercase tracking-wider text-muted-foreground"
          style={{ left: `calc(1rem + (100% - 2rem) * ${limitPercent / 100})` }}
        >
          10s limit
        </span>

        {/* Partner A */}
        <div className="absolute left-4 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-foreground font-headline text-xs font-bold text-background">
          A
        </div>

        {/* Partner B */}
        <div
          className={cn(
            'absolute top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-headline text-xs font-bold text-white transition-colors duration-200',
            legal ? 'bg-emerald-600' : 'bg-rose-600'
          )}
          style={{ left: `calc(1rem + (100% - 2rem) * ${percent / 100})` }}
        >
          B
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={MAX_GAP}
        step={1}
        value={gap}
        onChange={(e) => setGap(Number(e.target.value))}
        onPointerUp={() => trackEvent('doubles_gap_set', { gap_seconds: gap })}
        aria-label="Gap between partners in seconds"
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[hsl(47,95%,55%)]"
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Gap" value={`${gap}s`} />
        <Stat label="At 5:00/km that is" value={`${metres}m apart`} />
        <Stat
          label="Result"
          value={legal ? 'Within the limit' : 'Infringement logged'}
          tone={legal ? 'good' : 'bad'}
        />
      </div>

      <p className="mt-4 font-body text-sm leading-relaxed text-muted-foreground">
        The gap is measured by the timing equipment going in and out of the RoxZone, and neither of
        you may start a station until you are both there. It tends to catch mismatched teams, where
        the stronger runner gets ahead without realising.
      </p>

      {/* Budget */}
      <div className="mt-5 rounded-xl border border-border bg-background p-4">
        <p className="mb-3 font-headline text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Infringements permitted for the whole race
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 font-headline text-xs font-bold text-amber-700 dark:text-amber-300"
            >
              {n}
            </span>
          ))}
          <span className="font-body text-sm text-muted-foreground">then</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 font-headline text-xs font-bold uppercase tracking-wider text-white">
            <X className="h-3.5 w-3.5" aria-hidden="true" /> Out of competition, no ranking
          </span>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'good' | 'bad';
}) {
  return (
    <div className="rounded-xl border border-border bg-background px-4 py-3">
      <span className="block font-headline text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          'block font-headline text-lg font-bold tabular-nums',
          tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
          tone === 'bad' && 'text-rose-600 dark:text-rose-400',
          tone === 'neutral' && 'text-foreground'
        )}
      >
        {value}
      </span>
    </div>
  );
}
