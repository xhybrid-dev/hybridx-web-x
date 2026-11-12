'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMagnetCapture } from '@/hooks/use-magnet-capture';
import { trackEvent } from '@/lib/analytics';
import { withTracking } from '@/lib/app-links';
import AppSeedCta from '@/components/AppSeedCta';
import { seedFromStrengthTest } from '@/lib/app-seed';
import {
  DIVISIONS,
  DIVISION_LABELS,
  LIFTS,
  LIFT_LABELS,
  MAX_REPS,
  focusFor,
  formatTime,
  parseTestInput,
  scoreTest,
  testQuery,
  type TestInput,
} from '@/lib/calculators/strength-engine';

type Fields = Record<'division' | 'bw' | 'sq' | 'sqr' | 'dl' | 'dlr' | 'pr' | 'prr' | '5k', string>;

const EMPTY: Fields = { division: 'men-open', bw: '', sq: '', sqr: '5', dl: '', dlr: '5', pr: '', prr: '5', '5k': '' };
const LIFT_FIELDS = { squat: ['sq', 'sqr'], deadlift: ['dl', 'dlr'], press: ['pr', 'prr'] } as const;

const input = 'h-11 w-full rounded-md border border-input bg-background px-3 font-body text-base';
const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * The strength and engine test (docs/content-engine-plan.md, step 8). Scored
 * in the browser by src/lib/calculators/strength-engine.ts as soon as the
 * form is complete; the URL carries the answers, so the emailed link reopens
 * the same result.
 */
export default function StrengthEngineTest() {
  const [f, setF] = useState<Fields>(EMPTY);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const fromUrl = parseTestInput((k) => q.get(k));
    if (fromUrl) setF(Object.fromEntries(new URLSearchParams(testQuery(fromUrl))) as Fields);
  }, []);

  const parsed = useMemo(() => parseTestInput((k) => f[k as keyof Fields]), [f]);
  const result = useMemo(() => (parsed ? scoreTest(parsed) : null), [parsed]);

  // Counted when the verdict changes, not on every keystroke.
  const lastVerdict = useRef('');
  useEffect(() => {
    if (!parsed || !result) return;
    window.history.replaceState(null, '', `?${withTracking(testQuery(parsed), window.location.search)}`);
    const key = `${parsed.division}:${result.verdict}`;
    if (key !== lastVerdict.current) {
      lastVerdict.current = key;
      trackEvent('strength_engine_scored', { division: parsed.division, verdict: result.verdict });
    }
  }, [parsed, result]);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  return (
    <div className="space-y-10">
      <form className="space-y-5 rounded-xl border bg-card p-5 md:p-6" onSubmit={(e) => e.preventDefault()}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="block font-headline text-sm font-bold">Division</span>
            <select className={input} value={f.division} onChange={set('division')}>
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {DIVISION_LABELS[d]}
                </option>
              ))}
            </select>
            <span className="block font-body text-xs text-muted-foreground">Doubles: your equivalent singles division. Mixed doubles: Men Open.</span>
          </label>
          <label className="space-y-2">
            <span className="block font-headline text-sm font-bold">Bodyweight (kg)</span>
            <input className={input} inputMode="decimal" value={f.bw} onChange={set('bw')} placeholder="80" />
          </label>
        </div>

        <fieldset className="space-y-3">
          <legend className="font-headline text-sm font-bold">A recent set of each lift</legend>
          <p className="font-body text-sm text-muted-foreground">
            Never test a true max for this. Enter a set of 3 to 8 good reps you have done recently; the test estimates your one-rep max from it.
          </p>
          {LIFTS.map((lift) => {
            const [kg, reps] = LIFT_FIELDS[lift];
            return (
              <div key={lift} className="grid grid-cols-[1fr_6rem] items-end gap-3">
                <label className="space-y-1">
                  <span className="block font-body text-sm">{LIFT_LABELS[lift]} (kg)</span>
                  <input className={input} inputMode="decimal" value={f[kg]} onChange={set(kg)} />
                </label>
                <label className="space-y-1">
                  <span className="block font-body text-sm">Reps</span>
                  <select className={input} value={f[reps]} onChange={set(reps)}>
                    {Array.from({ length: MAX_REPS }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            );
          })}
        </fieldset>

        <label className="block space-y-2">
          <span className="block font-headline text-sm font-bold">Your 5 km time (minutes:seconds)</span>
          <input className={input} inputMode="numeric" value={f['5k']} onChange={set('5k')} placeholder="22:30" />
        </label>
      </form>

      {result && parsed ? <Result input={parsed} result={result} /> : (
        <p className="font-body text-muted-foreground">Fill in every box and your result appears here.</p>
      )}
    </div>
  );
}

function Result({ input, result }: { input: TestInput; result: ReturnType<typeof scoreTest> }) {
  const focus = focusFor(result);
  const bars: [string, number][] = [
    ['Strength', result.strength],
    ['Engine', result.engine],
  ];
  return (
    <section id="result" aria-labelledby="result-heading" className="scroll-mt-24 space-y-8">
      <div>
        <p className="font-headline text-sm font-bold uppercase tracking-widest text-muted-foreground">{DIVISION_LABELS[input.division]}</p>
        <h2 id="result-heading" className="font-headline text-3xl font-bold text-primary">
          {focus.headline}
        </h2>
        <p className="mt-2 max-w-2xl font-body text-lg">{focus.why}</p>
      </div>

      <div className="space-y-3">
        {bars.map(([label, score]) => (
          <div key={label}>
            <div className="flex justify-between font-body text-sm">
              <span className="font-semibold">{label}</span>
              <span>{pct(score)} of the {DIVISION_LABELS[input.division]} target</span>
            </div>
            <div className="mt-1 h-3 rounded-full bg-secondary" role="presentation">
              <div className="h-3 rounded-full bg-foreground" style={{ width: `${Math.min(score / 1.2, 1) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-left font-body text-sm tabular-nums">
          <thead className="bg-secondary/60 font-headline">
            <tr>
              <th scope="col" className="px-4 py-3">Lift</th>
              <th scope="col" className="px-4 py-3 text-right">Estimated max</th>
              <th scope="col" className="px-4 py-3 text-right">× bodyweight</th>
              <th scope="col" className="px-4 py-3 text-right">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {result.lifts.map((l) => (
              <tr key={l.lift} className={l.lift === result.weakest ? 'bg-accent/10' : ''}>
                <th scope="row" className="px-4 py-2.5 font-normal">{LIFT_LABELS[l.lift]}</th>
                <td className="px-4 py-2.5 text-right">{l.estimatedMax} kg</td>
                <td className="px-4 py-2.5 text-right">{l.ratio.toFixed(2)}</td>
                <td className="px-4 py-2.5 text-right">{l.target.toFixed(2)}</td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="px-4 py-2.5 font-normal">5 km</th>
              <td className="px-4 py-2.5 text-right" colSpan={2}>{formatTime(input.fiveK)}</td>
              <td className="px-4 py-2.5 text-right">{formatTime(result.targets.fiveK)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="font-headline text-lg font-bold">Your next eight weeks</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 font-body">
            {focus.week.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-headline text-lg font-bold">How they build</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 font-body">
            {focus.blocks.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <p className="mt-2 font-body text-sm text-muted-foreground">{focus.retest}</p>
        </div>
      </div>

      <p className="font-body text-sm text-muted-foreground">
        A coach&rsquo;s rule of thumb built on HybridX targets, not a validated model. If anything hurts, as opposed to being hard, stop and get it
        looked at.
      </p>

      <EmailResult input={input} verdict={result.verdict} />

      <AppSeedCta
        seed={seedFromStrengthTest(input.division, result.verdict)}
        location={`strength_engine_${result.verdict}`}
        heading="Train your limiter in the app"
        body={`The app matches you to a programme from this result, ${
          result.verdict === 'force-limited'
            ? 'built around strength'
            : result.verdict === 'engine-limited'
              ? 'built around your engine'
              : 'balancing strength and engine'
        }, with every session logged. Your answers are filled in for you.`}
      />
    </section>
  );
}

/** "Email me my result": the strength_engine_test magnet. */
function EmailResult({ input, verdict }: { input: TestInput; verdict: string }) {
  const capture = useMagnetCapture('strength_engine_test', 'tool');
  const q = new URLSearchParams(testQuery(input));

  if (capture.succeeded) {
    return (
      <div role="status" aria-live="polite" className="rounded-xl bg-neutral-950 p-6 text-white md:p-8">
        <p className="font-headline text-2xl font-bold">Sent. Check your inbox.</p>
        <p className="mt-2 font-body text-white/80">Your result and your eight weeks are on their way to {capture.email || 'your inbox'}.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-neutral-950 p-6 text-white md:p-8">
      <p className="font-headline text-2xl font-bold">Email me my result and the eight weeks</p>
      <p className="mt-2 max-w-xl font-body text-white/80">So you have it in week 8, when you retest.</p>
      <form action={capture.formAction} onSubmit={capture.onSubmit} noValidate className="mt-5 space-y-3">
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="se-company">Company</label>
          <input id="se-company" type="text" name="company" tabIndex={-1} autoComplete="off" />
        </div>
        {Object.entries(capture.hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        {[...q.entries()].map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <input type="hidden" name="plan" value={`${input.division}-${verdict}`} />
        <label htmlFor="se-email" className="block font-headline text-sm font-bold">
          Email address
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="se-email"
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="you@email.com"
            onFocus={capture.onFocus}
            aria-invalid={capture.error ? true : undefined}
            aria-describedby={capture.error ? 'se-error' : undefined}
            className="h-12 flex-1 rounded-md border border-white/20 bg-white px-3 font-body text-base text-black"
          />
          <button
            type="submit"
            disabled={capture.isPending}
            className="h-12 rounded-md bg-accent px-6 font-headline font-bold text-black hover:bg-accent/90 disabled:opacity-60"
          >
            {capture.isPending ? 'Sending…' : 'Email my result'}
          </button>
        </div>
        <div id="se-error" aria-live="polite">
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
    </div>
  );
}
