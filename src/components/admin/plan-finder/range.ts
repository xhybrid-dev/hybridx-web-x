// The admin's date range, from the query string. Every view reads the same
// range, so the numbers on every page agree.

import { addDays, daysBetween, isoDay } from '@/lib/plan-finder/dates';

export interface Range {
  preset: '7' | '30' | '90' | 'custom';
  from: string;
  to: string;
  days: number;
  /** The period of the same length immediately before, for the change figures. */
  prevFrom: string;
  prevTo: string;
  demo: boolean;
  today: boolean;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function parseRange(q: Record<string, string | string[] | undefined>, now = Date.now()): Range {
  const get = (k: string) => (typeof q[k] === 'string' ? (q[k] as string) : '');
  const today = get('today') === '1';
  const demo = get('demo') === '1';
  // Rollups exist up to yesterday; "today so far" extends the range to today.
  const lastDay = today ? isoDay(now) : isoDay(now - 86_400_000);
  let preset = (['7', '30', '90', 'custom'] as const).find((p) => p === get('range')) ?? '30';
  let from: string;
  let to: string;
  if (preset === 'custom' && DAY.test(get('from')) && DAY.test(get('to')) && get('from') <= get('to')) {
    from = get('from');
    to = get('to') > lastDay ? lastDay : get('to');
    if (daysBetween(from, to).length > 366) from = addDays(to, -365);
  } else {
    if (preset === 'custom') preset = '30';
    to = lastDay;
    from = addDays(to, -(Number(preset) - 1));
  }
  const days = daysBetween(from, to).length;
  return { preset, from, to, days, prevTo: addDays(from, -1), prevFrom: addDays(from, -days), demo, today };
}

/** The query string for a range, with overrides. */
export function rangeQuery(r: Range, over: Partial<Record<'range' | 'from' | 'to' | 'demo' | 'today', string | null>> = {}): string {
  const p = new URLSearchParams();
  const range = over.range !== undefined ? over.range : r.preset;
  if (range && range !== '30') p.set('range', range);
  if ((range ?? r.preset) === 'custom') {
    p.set('from', over.from ?? r.from);
    p.set('to', over.to ?? r.to);
  }
  const demo = over.demo !== undefined ? over.demo : r.demo ? '1' : null;
  const today = over.today !== undefined ? over.today : r.today ? '1' : null;
  if (demo) p.set('demo', demo);
  if (today) p.set('today', today);
  const s = p.toString();
  return s ? '?' + s : '';
}
