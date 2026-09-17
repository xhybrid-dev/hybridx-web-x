'use client';

import { useMemo, useState } from 'react';
import {
  AlertOctagon,
  Ban,
  Check,
  Copy,
  Minus,
  Plus,
  RotateCcw,
  Timer,
  TriangleAlert,
} from 'lucide-react';
import {
  LAP_CONFIGS,
  PENALTY_ITEMS,
  FORMAT_META,
  formatSeconds,
  type LapConfig,
  type RaceFormat,
} from '@/lib/hyrox-rules-2026';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';

/**
 * "The cost of a bad day" — turns the 2026/27 penalty tables into a number
 * against the visitor's own target finish time. The point is not novelty: a
 * 7 minute missed-lap penalty means nothing until you watch it move your
 * 1:29 to a 1:36.
 */

type Verdict = 'clean' | 'penalised' | 'ranking' | 'dq';

const VERDICT_META: Record<
  Verdict,
  { label: string; sub: string; icon: typeof Check; panel: string; badge: string }
> = {
  clean: {
    label: 'Clean race',
    sub: 'No penalties logged.',
    icon: Check,
    panel: 'border-emerald-500/40 bg-emerald-500/[0.06]',
    badge: 'bg-emerald-600 text-white',
  },
  penalised: {
    label: 'Finish, with penalties',
    sub: 'Your time stands, with the penalties added to it.',
    icon: Timer,
    panel: 'border-amber-500/40 bg-amber-500/[0.06]',
    badge: 'bg-amber-500 text-black',
  },
  ranking: {
    label: 'Out of competition',
    sub: 'More than three togetherness infringements means no ranking at all.',
    icon: Ban,
    panel: 'border-orange-600/40 bg-orange-600/[0.06]',
    badge: 'bg-orange-600 text-white',
  },
  dq: {
    label: 'Disqualified',
    sub: 'No time is recorded.',
    icon: AlertOctagon,
    panel: 'border-rose-500/40 bg-rose-500/[0.06]',
    badge: 'bg-rose-600 text-white',
  },
};

const DEFAULT_TARGET_MINUTES = 90;

export default function PenaltyCalculator() {
  const [format, setFormat] = useState<RaceFormat>('singles');
  const [lapConfig, setLapConfig] = useState<LapConfig>(LAP_CONFIGS[0]);
  const [targetMinutes, setTargetMinutes] = useState(DEFAULT_TARGET_MINUTES);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);

  const items = useMemo(
    () => PENALTY_ITEMS.filter((item) => item.formats.includes(format)),
    [format]
  );

  const countOf = (id: string) => counts[id] ?? 0;

  const secondsFor = (id: string): number | null => {
    const item = PENALTY_ITEMS.find((entry) => entry.id === id);
    if (!item) return null;
    if (item.id === 'missed-lap') return lapConfig.penaltySeconds;
    return item.seconds;
  };

  const result = useMemo(() => {
    const lines: { label: string; detail: string; seconds: number | null }[] = [];
    let penaltySeconds = 0;
    let disqualified = false;
    let outOfRanking = false;

    items.forEach((item) => {
      const n = counts[item.id] ?? 0;
      if (n === 0) return;

      const each = item.id === 'missed-lap' ? lapConfig.penaltySeconds : item.seconds;

      if (item.id === 'incomplete') {
        disqualified = true;
        lines.push({
          label: `${item.label} × ${n}`,
          detail: 'Disqualification — every station must be completed in full.',
          seconds: null,
        });
        return;
      }

      if (item.id === 'missed-lap' && each === null) {
        disqualified = true;
        lines.push({
          label: `${item.label} × ${n}`,
          detail: 'Disqualification — this venue runs one lap per kilometre.',
          seconds: null,
        });
        return;
      }

      if (item.id === 'togetherness') {
        const overBudget = n > 3;
        if (overBudget) outOfRanking = true;
        lines.push({
          label: `${item.label} × ${n}`,
          detail: overBudget
            ? 'Over the limit of three — the team is marked out of competition with no ranking.'
            : `${3 - n} of the three permitted infringements left.`,
          seconds: null,
        });
        return;
      }

      if (item.id === 'transition-zone') {
        lines.push({
          label: `${item.label} × ${n}`,
          detail: 'Automatic penalty. The rulebook does not publish a figure for it.',
          seconds: null,
        });
        return;
      }

      if (each !== null) {
        const total = each * n;
        penaltySeconds += total;
        lines.push({
          label: `${item.label} × ${n}`,
          detail: `${formatSeconds(each)} each`,
          seconds: total,
        });
      }
    });

    const verdict: Verdict = disqualified
      ? 'dq'
      : outOfRanking
        ? 'ranking'
        : penaltySeconds > 0
          ? 'penalised'
          : 'clean';

    return { lines, penaltySeconds, verdict };
  }, [counts, items, lapConfig]);

  const targetSeconds = targetMinutes * 60;
  const adjustedSeconds = targetSeconds + result.penaltySeconds;
  const verdictMeta = VERDICT_META[result.verdict];
  const VerdictIcon = verdictMeta.icon;
  const isRaceOver = result.verdict === 'dq';

  const bump = (id: string, delta: number, max: number) => {
    setCounts((prev) => {
      const next = Math.min(max, Math.max(0, (prev[id] ?? 0) + delta));
      if (delta > 0) trackEvent('penalty_calc_add', { penalty_id: id, count: next, format });
      return { ...prev, [id]: next };
    });
    setCopied(false);
  };

  const reset = () => {
    setCounts({});
    setCopied(false);
    trackEvent('penalty_calc_reset', { format });
  };

  const copySummary = async () => {
    const parts = [
      `HYROX 2026/27 penalty check: ${verdictMeta.label}`,
      `Format: ${FORMAT_META[format].label} · Venue: ${lapConfig.label}`,
      `Target ${formatSeconds(targetSeconds)}${
        isRaceOver ? ' → no time on the board' : ` → ${formatSeconds(adjustedSeconds)}`
      }`,
      ...result.lines.map((line) => `• ${line.label}${line.seconds ? ` (+${formatSeconds(line.seconds)})` : ''}`),
      'Check yours: hybridx.club/hyrox-rule-changes-2026',
    ];
    try {
      await navigator.clipboard.writeText(parts.join('\n'));
      setCopied(true);
      trackEvent('penalty_calc_copy', { verdict: result.verdict, format });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-start">
      {/* ── Inputs ──────────────────────────────────────────────────────── */}
      <div className="space-y-5">
        {/* Format */}
        <Panel title="1. What are you racing?">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FORMAT_META) as RaceFormat[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setFormat(key);
                  trackEvent('penalty_calc_format', { format: key });
                }}
                aria-pressed={format === key}
                className={cn(
                  'rounded-full border px-4 py-2 font-headline text-sm font-semibold transition-colors',
                  format === key
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                )}
              >
                {FORMAT_META[key].label}
              </button>
            ))}
          </div>
        </Panel>

        {/* Venue laps */}
        <Panel
          title="2. How does your venue lay out a kilometre?"
          hint="Check the athlete map before race day. This setting changes a missed lap from a 3 minute penalty to a disqualification."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {LAP_CONFIGS.map((config) => {
              const active = config.lapsPerKm === lapConfig.lapsPerKm;
              const isDq = config.penaltySeconds === null;
              return (
                <button
                  key={config.lapsPerKm}
                  type="button"
                  onClick={() => {
                    setLapConfig(config);
                    trackEvent('penalty_calc_venue', { laps_per_km: config.lapsPerKm });
                  }}
                  aria-pressed={active}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-all',
                    active
                      ? isDq
                        ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/40'
                        : 'border-foreground bg-muted ring-1 ring-foreground/20'
                      : 'border-border bg-background hover:border-foreground/30'
                  )}
                >
                  <span className="block font-headline text-sm font-bold text-foreground">
                    {config.label}
                  </span>
                  <span
                    className={cn(
                      'mt-1 block font-headline text-xs font-bold uppercase tracking-wider',
                      isDq ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                    )}
                  >
                    {config.penaltyLabel} per missed lap
                  </span>
                  <span className="mt-1.5 block font-body text-xs leading-relaxed text-muted-foreground">
                    {config.note}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        {/* Target time */}
        <Panel title="3. What time are you chasing?">
          <div className="flex items-baseline gap-3">
            <span className="font-headline text-4xl font-extrabold tabular-nums text-foreground">
              {formatSeconds(targetSeconds)}
            </span>
            <span className="font-body text-sm text-muted-foreground">target finish</span>
          </div>
          <input
            type="range"
            min={45}
            max={180}
            step={1}
            value={targetMinutes}
            onChange={(e) => setTargetMinutes(Number(e.target.value))}
            aria-label="Target finish time in minutes"
            className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[hsl(47,95%,55%)]"
          />
          <div className="mt-1 flex justify-between font-body text-[11px] text-muted-foreground">
            <span>45:00</span>
            <span>3:00:00</span>
          </div>
        </Panel>

        {/* Infringements */}
        <Panel
          title="4. Log the mistakes"
          hint="There are no warnings in the 2026/27 rulebooks. Each of these applies from the first occurrence."
        >
          <div className="space-y-2">
            {items.map((item) => {
              const n = countOf(item.id);
              const each = secondsFor(item.id);
              const isEnder =
                item.outcome === 'dq' || (item.id === 'missed-lap' && lapConfig.penaltySeconds === null);
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 transition-colors',
                    n > 0
                      ? isEnder
                        ? 'border-rose-500/50 bg-rose-500/[0.06]'
                        : 'border-amber-500/50 bg-amber-500/[0.06]'
                      : 'border-border bg-background'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-headline text-sm font-bold leading-snug text-foreground">
                      {item.label}
                      <span
                        className={cn(
                          'ml-2 whitespace-nowrap font-body text-xs font-normal',
                          isEnder ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'
                        )}
                      >
                        {isEnder
                          ? '· DQ'
                          : item.id === 'togetherness'
                            ? '· 3 max'
                            : each !== null
                              ? `· +${formatSeconds(each)}`
                              : '· penalty'}
                      </span>
                    </p>
                    <p className="mt-0.5 font-body text-xs leading-relaxed text-muted-foreground">
                      {item.hint}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <Stepper
                      label={`Remove one ${item.label}`}
                      onClick={() => bump(item.id, -1, item.max)}
                      disabled={n === 0}
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    </Stepper>
                    <span
                      className="w-7 text-center font-headline text-base font-bold tabular-nums text-foreground"
                      aria-live="polite"
                    >
                      {n}
                    </span>
                    <Stepper
                      label={`Add one ${item.label}`}
                      onClick={() => bump(item.id, 1, item.max)}
                      disabled={n >= item.max}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </Stepper>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* ── Result ──────────────────────────────────────────────────────── */}
      {/* top-32 clears both the site header and the pinned section nav. */}
      <div className="lg:sticky lg:top-32">
        <div className={cn('rounded-2xl border-2 p-5 sm:p-6 shadow-sm', verdictMeta.panel)}>
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-headline text-xs font-bold uppercase tracking-wider',
                verdictMeta.badge
              )}
            >
              <VerdictIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {verdictMeta.label}
            </span>
          </div>

          <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground">
            {verdictMeta.sub}
          </p>

          <div className="mt-5 rounded-xl border border-border bg-background/70 p-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="block font-headline text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Target
                </span>
                <span
                  className={cn(
                    'block font-headline text-2xl font-bold tabular-nums text-muted-foreground',
                    (isRaceOver || result.penaltySeconds > 0) && 'line-through decoration-1'
                  )}
                >
                  {formatSeconds(targetSeconds)}
                </span>
              </div>
              <div className="text-right">
                <span className="block font-headline text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {isRaceOver ? 'Result' : 'On the board'}
                </span>
                <span
                  className={cn(
                    'block font-headline text-3xl font-extrabold tabular-nums sm:text-4xl',
                    isRaceOver ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
                  )}
                >
                  {isRaceOver ? 'DQ' : formatSeconds(adjustedSeconds)}
                </span>
              </div>
            </div>

            {!isRaceOver && result.penaltySeconds > 0 && (
              <p className="mt-3 border-t border-border/70 pt-3 font-headline text-sm font-bold text-amber-600 dark:text-amber-400">
                + {formatSeconds(result.penaltySeconds)} of penalties
              </p>
            )}
          </div>

          {/* Breakdown */}
          <div className="mt-4">
            <h3 className="font-headline text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Breakdown
            </h3>
            {result.lines.length === 0 ? (
              <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
                Nothing logged yet. Add an infringement on the left to see what it does to your
                finish time.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {result.lines.map((line) => (
                  <li
                    key={line.label}
                    className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="font-headline text-sm font-semibold text-foreground">{line.label}</p>
                      <p className="font-body text-xs leading-relaxed text-muted-foreground">
                        {line.detail}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'flex-shrink-0 font-headline text-sm font-bold tabular-nums',
                        line.seconds === null
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-600 dark:text-amber-400'
                      )}
                    >
                      {line.seconds === null ? '—' : `+${formatSeconds(line.seconds)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copySummary}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 font-headline text-xs font-bold text-background transition-opacity hover:opacity-90"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy result
                </>
              )}
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 font-headline text-xs font-bold text-foreground transition-colors hover:bg-muted"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
            </button>
          </div>
        </div>

        <p className="mt-3 flex items-start gap-2 font-body text-xs leading-relaxed text-muted-foreground">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          Penalty values are taken from the 2026/27 rulebooks. Where a rulebook states an automatic
          penalty without publishing a figure — the relay transition zone, for instance — this tool
          flags it rather than estimating a number.
        </p>
      </div>
    </div>
  );
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h3 className="font-headline text-sm font-bold text-foreground">{title}</h3>
      {hint && (
        <p className="mt-1 mb-3 font-body text-xs leading-relaxed text-muted-foreground">{hint}</p>
      )}
      <div className={hint ? '' : 'mt-3'}>{children}</div>
    </section>
  );
}

function Stepper({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}
