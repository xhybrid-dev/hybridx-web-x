// Building blocks for the plan finder admin: stat tiles, labelled bar lists,
// tables with a CSV link, a sequential grid, and notes. Server Components.
//
// Charts follow one rule set: a single series is drawn in the theme's primary
// colour (black on the light admin, brand yellow in dark mode), every bar
// carries its value as text, and every chart has its numbers in a table on the
// same page. The brand allows no second hue, so there are no multi-series
// colour charts: two measures become two columns of a table instead.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Share } from '@/lib/plan-finder/analytics';

export const pct = (x: number | null | undefined, digits = 1) => (x === null || x === undefined ? '–' : (x * 100).toFixed(digits) + '%');
export const int = (x: number | null | undefined) => (x === null || x === undefined ? '–' : Math.round(x).toLocaleString('en-GB'));
export const points = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(x * 100).toFixed(1) + ' pts';

export function Section({ title, description, children, action }: { title: string; description?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="font-headline text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * A headline number with its change against the previous period of the same
 * length. `upIsGood` decides the wording only: the brand has no red or green,
 * so direction is said in words and an arrow, never in colour.
 */
export function StatTile({ label, value, previous, format = 'pct', upIsGood = true, note }: {
  label: string;
  value: number | null;
  previous?: number | null;
  format?: 'pct' | 'int';
  upIsGood?: boolean;
  note?: string;
}) {
  const shown = format === 'pct' ? pct(value) : int(value);
  let delta: string | null = null;
  if (previous !== undefined && previous !== null && value !== null) {
    // Below a twentieth of a point (or half a visit) the change rounds away: call it unchanged.
    const raw = value - previous;
    const d = Math.abs(raw) < (format === 'pct' ? 0.0005 : 0.5) ? 0 : raw;
    const better = d === 0 ? null : d > 0 === upIsGood;
    const size = format === 'pct' ? points(d) : (d > 0 ? '+' : d < 0 ? '−' : '±') + int(Math.abs(d));
    delta = `${d > 0 ? '▲' : d < 0 ? '▼' : '■'} ${size} vs previous period${better === null ? '' : better ? ', better' : ', worse'}`;
  }
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 font-headline text-3xl font-bold">{shown}</div>
      {delta && <div className="mt-1 text-xs text-muted-foreground">{delta}</div>}
      {note && <div className="mt-1 text-xs text-muted-foreground">{note}</div>}
    </div>
  );
}

/** Horizontal bars, one per row, each labelled with its count and share. */
export function BarList({ rows, label = (k) => k, empty = 'No data in this period.', max, shareLabel = 'share' }: {
  rows: Share[];
  label?: (key: string) => string;
  empty?: string;
  max?: number;
  shareLabel?: string;
}) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const shown = max ? rows.slice(0, max) : rows;
  const top = Math.max(...shown.map((r) => r.share ?? 0), 0.0001);
  return (
    <ul className="space-y-2">
      {shown.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,16rem)_minmax(4rem,1fr)_6.5rem] items-center gap-3 text-sm">
          <span className="truncate" title={label(r.key)}>
            {label(r.key)}
          </span>
          <span className="h-3 rounded-r bg-muted" aria-hidden>
            <span className="block h-3 rounded-r bg-primary" style={{ width: `${Math.max(1, ((r.share ?? 0) / top) * 100)}%` }} />
          </span>
          <span className="text-right tabular-nums" title={`${int(r.count)} (${pct(r.share)} ${shareLabel})`}>
            {pct(r.share, 0)} <span className="text-muted-foreground">· {int(r.count)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export interface Column<Row> {
  key: string;
  label: string;
  value: (row: Row) => ReactNode;
  numeric?: boolean;
}

export function DataTable<Row>({ columns, rows, empty = 'No data in this period.', csvHref }: {
  columns: Column<Row>[];
  rows: Row[];
  empty?: string;
  csvHref?: string;
}) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              {columns.map((c) => (
                <th key={c.key} className={`py-2 pr-4 font-medium ${c.numeric ? 'text-right' : ''}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border/50">
                {columns.map((c) => (
                  <td key={c.key} className={`py-2 pr-4 ${c.numeric ? 'text-right tabular-nums' : ''}`}>
                    {c.value(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {csvHref && (
        <a href={csvHref} className="mt-3 inline-flex items-center text-sm underline underline-offset-4">
          <Download className="mr-1.5 h-4 w-4" aria-hidden /> Download as CSV
        </a>
      )}
    </div>
  );
}

// Validated ordinal ramps (dataviz validate_palette --ordinal): brand greys only,
// light to dark on the white admin, dark to light on the black one.
const RAMP = ['bg-[#B3B3B3] text-black dark:bg-[#4D4D4D] dark:text-white', 'bg-[#808080] text-black dark:bg-[#808080] dark:text-black', 'bg-[#4D4D4D] text-white dark:bg-[#B3B3B3] dark:text-black', 'bg-[#1A1A1A] text-white dark:bg-[#D9D9D9] dark:text-black'];
const RAMP_LABELS = ['under 25%', '25–50%', '50–75%', '75% and over'];
const rampStep = (rate: number) => Math.min(3, Math.floor(rate * 4));

/** A grid of cells shaded by a rate, with the numbers printed in every cell. */
export function RateGrid({ rows, cols, cell, rowLabel, colLabel, minN }: {
  rows: string[];
  cols: string[];
  cell: (row: string, col: string) => { n: number; rate: number | null; detail: string } | null;
  rowLabel: (k: string) => string;
  colLabel: (k: string) => string;
  minN: number;
}) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0.5 text-sm">
          <thead>
            <tr>
              <th />
              {cols.map((c) => (
                <th key={c} className="px-2 py-1 text-left font-medium text-muted-foreground">
                  {colLabel(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r}>
                <th className="pr-3 text-left font-medium">{rowLabel(r)}</th>
                {cols.map((c) => {
                  const x = cell(r, c);
                  if (!x || !x.n) return <td key={c} className="rounded border px-2 py-2 text-muted-foreground">–</td>;
                  const small = x.n < minN || x.rate === null;
                  return (
                    <td key={c} className={`rounded px-2 py-2 tabular-nums ${small ? 'border text-muted-foreground' : RAMP[rampStep(x.rate as number)]}`} title={x.detail}>
                      <div className="font-semibold">{pct(x.rate, 0)}</div>
                      <div className="text-xs opacity-90">{x.detail}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>Click rate:</span>
        {RAMP.map((cls, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-3 w-5 rounded-sm ${cls}`} aria-hidden />
            {RAMP_LABELS[i]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 rounded-sm border" aria-hidden />
          fewer than {minN} results, too few to read
        </span>
      </div>
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">{children}</p>;
}

export function SeeAlso({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm underline underline-offset-4">
      {children}
    </Link>
  );
}
