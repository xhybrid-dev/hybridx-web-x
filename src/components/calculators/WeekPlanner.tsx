'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMagnetCapture } from '@/hooks/use-magnet-capture';
import AppSeedCta from '@/components/AppSeedCta';
import { seedFromPlanner } from '@/lib/app-seed';
import { trackEvent } from '@/lib/analytics';
import { withTracking } from '@/lib/app-links';
import {
  DAY_COUNTS,
  GOALS,
  GOAL_LABELS,
  KITS,
  KIT_LABELS,
  PLANNER_RULES,
  WEEKDAYS,
  nextMonday,
  parsePlannerInput,
  planWeek,
  planWeeks,
  plannerIcs,
  plannerKey,
  plannerQuery,
  type PlannedWeek,
  type PlannerInput,
} from '@/lib/calculators/week-planner';

const DEFAULT: PlannerInput = { days: 4, goal: 'first-hyrox', kit: 'full-gym', longRunDay: 5 };
const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });

const select = 'h-11 w-full rounded-md border border-input bg-background px-3 font-body text-base';

/**
 * The week planner (docs/content-engine-plan.md, step 5). Everything is worked
 * out in the browser from src/lib/calculators/week-planner.ts; nothing is sent
 * anywhere unless the visitor asks for the four weeks by email.
 *
 * The URL carries the choices, so a plan can be shared, and the emailed link
 * opens on the same four weeks (?weeks=4).
 */
export default function WeekPlanner() {
  const [input, setInput] = useState<PlannerInput>(DEFAULT);
  const [allWeeks, setAllWeeks] = useState(false);
  const [week, setWeek] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = parsePlannerInput((k) => params.get(k));
    if (fromUrl) setInput(fromUrl);
    if (params.get('weeks') === '4') setAllWeeks(true);
  }, []);

  const update = (patch: Partial<PlannerInput>) => {
    const next = { ...input, ...patch };
    setInput(next);
    const extra = allWeeks ? '&weeks=4' : '';
    window.history.replaceState(null, '', `?${withTracking(`${plannerQuery(next)}${extra}`, window.location.search)}`);
    trackEvent('week_planner_change', { plan: plannerKey(next) });
  };

  const weeks = useMemo(() => planWeeks(input), [input]);
  const shown: PlannedWeek = allWeeks ? weeks[week - 1] : planWeek(input, 1);
  const start = useMemo(() => nextMonday(new Date()), []);

  const download = () => {
    const ics = plannerIcs(allWeeks ? weeks : [weeks[0]], start);
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = allWeeks ? 'hybridx-four-weeks.ics' : 'hybridx-week.ics';
    a.click();
    URL.revokeObjectURL(url);
    trackEvent('week_planner_calendar', { plan: plannerKey(input), weeks: allWeeks ? 4 : 1 });
  };

  return (
    <div className="space-y-10">
      {/* ── The choices ── */}
      <form className="grid gap-5 rounded-xl border bg-card p-5 md:grid-cols-2 md:p-6" onSubmit={(e) => e.preventDefault()}>
        <fieldset className="md:col-span-2">
          <legend className="mb-2 font-headline text-sm font-bold">Training days a week</legend>
          <div className="flex gap-2">
            {DAY_COUNTS.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={input.days === d}
                onClick={() => update({ days: d })}
                className={`h-11 flex-1 rounded-md border font-headline text-lg font-bold transition-colors ${input.days === d ? 'border-foreground bg-foreground text-background' : 'bg-background hover:border-foreground'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="space-y-2">
          <span className="block font-headline text-sm font-bold">Training for</span>
          <select className={select} value={input.goal} onChange={(e) => update({ goal: e.target.value as PlannerInput['goal'] })}>
            {GOALS.map((g) => (
              <option key={g} value={g}>
                {GOAL_LABELS[g]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="block font-headline text-sm font-bold">Kit</span>
          <select className={select} value={input.kit} onChange={(e) => update({ kit: e.target.value as PlannerInput['kit'] })}>
            {KITS.map((k) => (
              <option key={k} value={k}>
                {KIT_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="block font-headline text-sm font-bold">Long run on</span>
          <select className={select} value={input.longRunDay} onChange={(e) => update({ longRunDay: Number(e.target.value) })}>
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </form>

      {/* ── The week ── */}
      <section id="plan" aria-labelledby="plan-heading" className="scroll-mt-24 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="plan-heading" className="font-headline text-2xl font-bold text-primary">
              {allWeeks ? `Week ${week} of 4` : 'Your week'}
            </h2>
            <p className="font-body text-sm text-muted-foreground">
              {allWeeks ? `Starting Monday ${DATE.format(start)}. ` : ''}
              {shown.totalMinutes} minutes across {input.days} days.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={download}>
            <CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            {allWeeks ? 'Add all four weeks to my calendar' : 'Add this week to my calendar'}
          </Button>
        </div>

        {allWeeks && (
          <div role="tablist" aria-label="Week" className="flex gap-2">
            {[1, 2, 3, 4].map((w) => (
              <button
                key={w}
                role="tab"
                type="button"
                aria-selected={week === w}
                onClick={() => setWeek(w)}
                className={`h-10 flex-1 rounded-md border font-headline font-bold ${week === w ? 'border-foreground bg-foreground text-background' : 'bg-background'}`}
              >
                Week {w}
                {w === 4 ? ' (lighter)' : ''}
              </button>
            ))}
          </div>
        )}

        <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {shown.days.map((day) => (
            <li
              key={day.day}
              className={`rounded-xl border p-4 ${day.sessions.length ? 'bg-card' : 'bg-secondary/40 text-muted-foreground'}`}
            >
              <p className="font-headline text-sm font-bold uppercase tracking-widest">{day.name}</p>
              {day.sessions.length === 0 ? (
                <p className="mt-2 font-body">Rest</p>
              ) : (
                day.sessions.map((s, i) => (
                  <div key={i} className={i ? 'mt-4 border-t pt-4' : 'mt-2'}>
                    <p className="font-headline text-lg font-bold text-foreground">
                      {day.sessions.length > 1 ? `${i + 1}. ` : ''}
                      {s.title}
                    </p>
                    <p className="font-body text-sm text-muted-foreground">
                      About {s.minutes} minutes · {s.effort}
                    </p>
                    <p className="mt-2 font-body">{s.main}</p>
                    {s.moves.length > 0 && (
                      <ul className="mt-2 space-y-1 font-body text-sm">
                        {s.moves.map((m) => (
                          <li key={m.name}>
                            <span className="font-semibold">{m.name}</span>: {m.dose}
                          </li>
                        ))}
                      </ul>
                    )}
                    {s.notes && <p className="mt-2 font-body text-sm text-muted-foreground">{s.notes}</p>}
                  </div>
                ))
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* ── The rules it is built on ── */}
      <section aria-labelledby="rules-heading" className="rounded-xl border-l-4 border-accent bg-secondary/40 p-5">
        <h2 id="rules-heading" className="font-headline text-lg font-bold">
          The rules this week is built on
        </h2>
        <ul className="mt-3 space-y-2 font-body">
          {PLANNER_RULES.map((r) => (
            <li key={r} className="flex gap-2">
              <Check className="mt-1 h-4 w-4 flex-none text-foreground" aria-hidden="true" />
              {r}
            </li>
          ))}
        </ul>
        <p className="mt-3 font-body text-sm text-muted-foreground">
          A starting structure from HybridX&rsquo;s coaching rules, not a prescription for you. Adjust the loads to what you can do well.
        </p>
      </section>

      {!allWeeks && <EmailFourWeeks input={input} />}

      <TrainInTheApp input={input} />
    </div>
  );
}

/** The next rung: the same answers, carried into the app's sign-up (src/lib/app-seed.ts). */
function TrainInTheApp({ input }: { input: PlannerInput }) {
  const athx = input.goal === 'athx';
  return (
    <AppSeedCta
      seed={seedFromPlanner(input)}
      location={`week_planner_${input.goal}`}
      heading={athx ? 'Train for ATHX in the app' : 'Train these weeks in the app'}
      body={
        athx
          ? 'The app has the ATHX 2027 twelve-week plan, with Lite, ATHX or Pro loads, lined up to your event date. Your answers here are filled in for you.'
          : `The app turns this into a full programme matched to your answers, set up for ${input.days} days a week, with every session logged. Your answers here are filled in for you.`
      }
    />
  );
}

/** "Email me this week and the next three": the week_planner magnet. */
function EmailFourWeeks({ input }: { input: PlannerInput }) {
  const capture = useMagnetCapture('week_planner', 'tool');
  const q = new URLSearchParams(plannerQuery(input));

  if (capture.succeeded) {
    return (
      <section role="status" aria-live="polite" className="rounded-xl bg-neutral-950 p-6 text-white md:p-8">
        <h2 className="font-headline text-2xl font-bold">Sent. Check your inbox.</h2>
        <p className="mt-2 font-body text-white/80">
          Your four weeks are on their way to {capture.email || 'your inbox'}.
          {capture.assetUrl && (
            <>
              {' '}
              Or{' '}
              <a href={capture.assetUrl} className="font-semibold text-white underline decoration-accent decoration-2 underline-offset-4">
                open them now
              </a>
              .
            </>
          )}
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="email-heading" className="rounded-xl bg-neutral-950 p-6 text-white md:p-8">
      <h2 id="email-heading" className="font-headline text-2xl font-bold">
        Email me this week and the next three
      </h2>
      <p className="mt-2 max-w-xl font-body text-white/80">
        Four weeks that build, then a lighter one, with a calendar file for all of them.
      </p>
      <form action={capture.formAction} onSubmit={capture.onSubmit} noValidate className="mt-5 space-y-3">
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="planner-company">Company</label>
          <input id="planner-company" type="text" name="company" tabIndex={-1} autoComplete="off" />
        </div>
        {Object.entries(capture.hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        {(['days', 'goal', 'kit', 'long'] as const).map((k) => (
          <input key={k} type="hidden" name={k} value={q.get(k) ?? ''} />
        ))}
        <input type="hidden" name="plan" value={plannerKey(input)} />
        <label htmlFor="planner-email" className="block font-headline text-sm font-bold">
          Email address
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="planner-email"
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="you@email.com"
            onFocus={capture.onFocus}
            aria-invalid={capture.error ? true : undefined}
            aria-describedby={capture.error ? 'planner-error' : undefined}
            className="h-12 flex-1 rounded-md border border-white/20 bg-white px-3 font-body text-base text-black"
          />
          <button
            type="submit"
            disabled={capture.isPending}
            className="h-12 rounded-md bg-accent px-6 font-headline font-bold text-black hover:bg-accent/90 disabled:opacity-60"
          >
            {capture.isPending ? 'Sending…' : 'Email my four weeks'}
          </button>
        </div>
        <div id="planner-error" aria-live="polite">
          {capture.error ? <p className="font-body text-sm text-red-300">{capture.error}</p> : null}
        </div>
        <p className="font-body text-xs text-white/70">
          Signing up means you will get training emails from HybridX. Unsubscribe any time. See our{' '}
          <a href="/privacy-policy" className="underline">
            privacy notice
          </a>
          .
        </p>
      </form>
    </section>
  );
}
