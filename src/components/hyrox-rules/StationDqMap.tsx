'use client';

import { useState } from 'react';
import { AlertOctagon, Flag, ShieldCheck } from 'lucide-react';
import { STATIONS } from '@/lib/hyrox-rules-2026';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';

/**
 * The eight stations as a race map, with the completion standard for each.
 * Tapping a station swaps the detail panel; all eight standards are also
 * rendered in a visually-hidden list so the page still answers "what counts
 * as finished at the rower" without JavaScript.
 */
export default function StationDqMap() {
  const [activeId, setActiveId] = useState(STATIONS[0].id);
  const active = STATIONS.find((s) => s.id === activeId) ?? STATIONS[0];

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      {/* Rail */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="font-headline text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            The race, station by station
          </p>
          <span className="inline-flex items-center gap-1.5 font-body text-[11px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />
            named in the rulebook as a DQ trigger
          </span>
        </div>

        <ol className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {STATIONS.map((station) => {
            const isActive = station.id === activeId;
            return (
              <li key={station.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(station.id);
                    trackEvent('station_map_select', { station: station.id });
                  }}
                  aria-pressed={isActive}
                  className={cn(
                    'group flex h-full w-full flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-all',
                    isActive
                      ? 'border-foreground bg-foreground text-background shadow-sm'
                      : 'border-border bg-background hover:border-foreground/40 hover:bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'relative flex h-7 w-7 items-center justify-center rounded-full font-headline text-xs font-bold',
                      isActive ? 'bg-background text-foreground' : 'bg-muted text-foreground'
                    )}
                  >
                    {station.order}
                    {station.namedInRulebook && (
                      <span
                        className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-card"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span
                    className={cn(
                      'font-headline text-[10px] font-bold leading-tight sm:text-[11px]',
                      isActive ? 'text-background' : 'text-foreground'
                    )}
                  >
                    {station.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <p className="mt-3 flex items-start gap-2 font-body text-xs leading-relaxed text-muted-foreground">
          <Flag className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          There is a 1km run before each of the eight stations. Missing an entire run is treated the
          same way as missing an entire station.
        </p>
      </div>

      {/* Detail */}
      <div
        key={active.id}
        className="animate-in fade-in slide-in-from-bottom-1 duration-300 rounded-xl border border-border bg-background p-5"
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-foreground px-2.5 py-1 font-headline text-[11px] font-bold uppercase tracking-wider text-background">
            Station {active.order}
          </span>
          <h3 className="font-headline text-xl font-bold text-foreground">{active.name}</h3>
          {active.namedInRulebook && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 font-headline text-[10px] font-bold uppercase tracking-wider text-white">
              <AlertOctagon className="h-3 w-3" aria-hidden="true" />
              Named DQ trigger
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border-l-2 border-emerald-500 bg-emerald-500/[0.06] p-4">
            <p className="mb-1.5 flex items-center gap-1.5 font-headline text-[11px] uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              You are finished when
            </p>
            <p className="font-body text-sm leading-relaxed text-foreground">{active.standard}</p>
          </div>
          <div className="rounded-xl border-l-2 border-rose-500 bg-rose-500/[0.06] p-4">
            <p className="mb-1.5 flex items-center gap-1.5 font-headline text-[11px] uppercase tracking-[0.12em] text-rose-700 dark:text-rose-300">
              <AlertOctagon className="h-3.5 w-3.5" aria-hidden="true" />
              Common mistake
            </p>
            <p className="font-body text-sm leading-relaxed text-foreground">{active.trap}</p>
          </div>
        </div>

        <p className="mt-4 rounded-xl border-l-2 border-accent bg-accent/10 px-4 py-3 font-body text-sm leading-relaxed text-foreground">
          <strong className="font-headline">One habit covers all eight: </strong>
          do not leave a station until a judge confirms you are done. That is already in the rules,
          and it exists for exactly this reason.
        </p>
      </div>

      {/* Crawlable fallback — every standard in the DOM regardless of state. */}
      <ul className="sr-only">
        {STATIONS.map((station) => (
          <li key={station.id}>
            Station {station.order}, {station.name}: {station.standard} {station.trap}
          </li>
        ))}
      </ul>
    </div>
  );
}
