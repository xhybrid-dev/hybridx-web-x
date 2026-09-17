'use client';

import { useMemo, useState } from 'react';
import { AlertOctagon, Clock, ThumbsUp, Info, Plus, Minus, Sparkles } from 'lucide-react';
import {
  RULE_CHANGES,
  SEVERITY_META,
  FORMAT_META,
  type RaceFormat,
  type Severity,
} from '@/lib/hyrox-rules-2026';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';

/**
 * Every 2026/27 change, triaged by what it actually costs you and filterable
 * by the format you race. All cards stay in the DOM (they are hidden with a
 * class rather than unmounted) so the full text is crawlable and in-page
 * search still finds a rule the visitor has filtered out.
 */

const SEVERITY_ORDER: Severity[] = ['dq', 'time', 'good', 'know'];

const SEVERITY_STYLES: Record<
  Severity,
  { chip: string; chipActive: string; card: string; badge: string; icon: typeof AlertOctagon }
> = {
  dq: {
    chip: 'border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10',
    chipActive: 'bg-rose-600 border-rose-600 text-white hover:bg-rose-600',
    card: 'border-rose-500/40 bg-rose-500/[0.04] dark:bg-rose-500/[0.07]',
    badge: 'bg-rose-600 text-white',
    icon: AlertOctagon,
  },
  time: {
    chip: 'border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10',
    chipActive: 'bg-amber-500 border-amber-500 text-black hover:bg-amber-500',
    card: 'border-amber-500/40 bg-amber-500/[0.04] dark:bg-amber-500/[0.07]',
    badge: 'bg-amber-500 text-black',
    icon: Clock,
  },
  good: {
    chip: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10',
    chipActive: 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-600',
    card: 'border-emerald-500/40 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07]',
    badge: 'bg-emerald-600 text-white',
    icon: ThumbsUp,
  },
  know: {
    chip: 'border-border text-muted-foreground hover:bg-muted',
    chipActive: 'bg-foreground border-foreground text-background hover:bg-foreground',
    card: 'border-border bg-muted/30',
    badge: 'bg-foreground text-background',
    icon: Info,
  },
};

export default function RuleTriageBoard() {
  const [severity, setSeverity] = useState<Severity | 'all'>('all');
  const [format, setFormat] = useState<RaceFormat | 'all'>('all');
  const [openIds, setOpenIds] = useState<string[]>([]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: 0 };
    RULE_CHANGES.forEach((rule) => {
      if (format !== 'all' && !rule.formats.includes(format)) return;
      base.all += 1;
      base[rule.severity] = (base[rule.severity] ?? 0) + 1;
    });
    return base;
  }, [format]);

  const isVisible = (ruleSeverity: Severity, formats: RaceFormat[]) =>
    (severity === 'all' || severity === ruleSeverity) &&
    (format === 'all' || formats.includes(format));

  const visibleCount = RULE_CHANGES.filter((rule) => isVisible(rule.severity, rule.formats)).length;

  const toggleOpen = (id: string, title: string) => {
    setOpenIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!prev.includes(id)) trackEvent('rule_card_expand', { rule_id: id, rule_title: title });
      return next;
    });
  };

  const selectSeverity = (value: Severity | 'all') => {
    setSeverity(value);
    trackEvent('rule_filter', { filter_type: 'severity', value });
  };

  const selectFormat = (value: RaceFormat | 'all') => {
    setFormat(value);
    trackEvent('rule_filter', { filter_type: 'format', value });
  };

  return (
    <div>
      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 mb-8 shadow-sm">
        <div className="flex flex-col gap-4">
          <div>
            <p className="font-headline text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2.5">
              What does it cost me?
            </p>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={severity === 'all'}
                onClick={() => selectSeverity('all')}
                className={severity === 'all' ? SEVERITY_STYLES.know.chipActive : SEVERITY_STYLES.know.chip}
                count={counts.all ?? 0}
              >
                Everything
              </FilterChip>
              {SEVERITY_ORDER.map((key) => {
                const Icon = SEVERITY_STYLES[key].icon;
                const active = severity === key;
                return (
                  <FilterChip
                    key={key}
                    active={active}
                    onClick={() => selectSeverity(key)}
                    className={active ? SEVERITY_STYLES[key].chipActive : SEVERITY_STYLES[key].chip}
                    count={counts[key] ?? 0}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {SEVERITY_META[key].label}
                  </FilterChip>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border/70 pt-4">
            <p className="font-headline text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2.5">
              What do you race?
            </p>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={format === 'all'}
                onClick={() => selectFormat('all')}
                className={format === 'all' ? SEVERITY_STYLES.know.chipActive : SEVERITY_STYLES.know.chip}
              >
                All formats
              </FilterChip>
              {(Object.keys(FORMAT_META) as RaceFormat[]).map((key) => {
                const active = format === key;
                return (
                  <FilterChip
                    key={key}
                    active={active}
                    onClick={() => selectFormat(key)}
                    className={active ? SEVERITY_STYLES.know.chipActive : SEVERITY_STYLES.know.chip}
                  >
                    {FORMAT_META[key].label}
                  </FilterChip>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Showing {visibleCount} of {RULE_CHANGES.length} rule changes.
      </p>

      {/* ── Cards ───────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {RULE_CHANGES.map((rule) => {
          const styles = SEVERITY_STYLES[rule.severity];
          const Icon = styles.icon;
          const open = openIds.includes(rule.id);
          const shown = isVisible(rule.severity, rule.formats);

          return (
            <article
              key={rule.id}
              id={`rule-${rule.id}`}
              className={cn(
                // min-w-0 keeps a long cost value from stretching the grid track
                // past the viewport on narrow screens.
                'min-w-0 rounded-2xl border p-5 transition-all duration-200 scroll-mt-32',
                styles.card,
                shown ? 'opacity-100' : 'hidden'
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-headline font-bold uppercase tracking-wider',
                    styles.badge
                  )}
                >
                  <Icon className="h-3 w-3" aria-hidden="true" />
                  {SEVERITY_META[rule.severity].short}
                </span>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {rule.isNew && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-accent/50 bg-accent/15 px-2 py-0.5 text-[10px] font-headline font-bold uppercase tracking-wider text-foreground">
                      <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                      New
                    </span>
                  )}
                  {rule.formats.length < 3 &&
                    rule.formats.map((f) => (
                      <span
                        key={f}
                        className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-headline font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        {FORMAT_META[f].label}
                      </span>
                    ))}
                </div>
              </div>

              <h3 className="font-headline text-lg font-bold leading-snug text-foreground mb-2">
                {rule.title}
              </h3>

              <p className="font-body text-sm leading-relaxed text-muted-foreground mb-4">
                {rule.summary}
              </p>

              <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                <div className="min-w-0">
                  <span className="block font-headline text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Cost
                  </span>
                  <span className="block font-headline text-sm font-bold leading-snug text-foreground">
                    {rule.cost}
                  </span>
                </div>
                {(rule.detail.length > 0 || rule.doThis) && (
                  <button
                    type="button"
                    onClick={() => toggleOpen(rule.id, rule.title)}
                    aria-expanded={open}
                    aria-controls={`rule-detail-${rule.id}`}
                    className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 font-headline text-xs font-semibold text-foreground transition-colors hover:border-foreground/40 hover:bg-muted"
                  >
                    {open ? (
                      <>
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" /> Less
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Detail
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Kept mounted so the full text is indexable; height-collapsed when closed. */}
              <div
                id={`rule-detail-${rule.id}`}
                className={cn(
                  'grid transition-all duration-300 ease-out',
                  open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                )}
              >
                <div className="overflow-hidden">
                  <div className="space-y-3 pt-4">
                    {rule.detail.map((paragraph, i) => (
                      <p key={i} className="font-body text-sm leading-relaxed text-muted-foreground">
                        {paragraph}
                      </p>
                    ))}
                    {rule.doThis && (
                      <p className="rounded-xl border-l-2 border-accent bg-accent/10 px-4 py-3 font-body text-sm leading-relaxed text-foreground">
                        <strong className="font-headline">Do this: </strong>
                        {rule.doThis}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {visibleCount === 0 && (
        <p className="rounded-2xl border border-dashed border-border py-10 text-center font-body text-muted-foreground">
          Nothing in that combination. Try another filter.
        </p>
      )}
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
  className,
  count,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  className?: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-headline text-xs font-semibold transition-colors',
        className
      )}
    >
      {children}
      {typeof count === 'number' && (
        <span className={cn('font-body text-[11px]', active ? 'opacity-80' : 'opacity-60')}>
          {count}
        </span>
      )}
    </button>
  );
}
