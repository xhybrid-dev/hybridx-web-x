// UTC calendar days as YYYY-MM-DD strings: the unit of the daily rollups.

const DAY_MS = 86_400_000;

export const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const dayMs = (day: string) => Date.parse(day + 'T00:00:00Z');
export const addDays = (day: string, n: number) => isoDay(dayMs(day) + n * DAY_MS);

/** Every day from `from` to `to`, inclusive (at most 400). */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 400; d = addDays(d, 1)) out.push(d);
  return out;
}
