// Shared constants and tiny helpers for the admin analytics (rollup, report,
// insights). Pure, no I/O. Ported from handover/entry-funnel/admin/model.js.

export const STEP_NAMES = ['Goal', 'Starting point', 'What got in the way', 'How you train', 'Anything else'];
export const STEPS = [1, 2, 3, 4, 5];

// Histogram buckets. Order matters: medians and percentiles walk this list,
// never object key order (Firestore and JSON round trips do not preserve it).
export const TIME_BUCKETS = ['0-5s', '5-15s', '15-30s', '30-60s', '60-120s', '120s+'];
export const TIME_EDGES_S = [5, 15, 30, 60, 120];
export const VISIBLE_BUCKETS = ['0-10s', '10-30s', '30-60s', '1-3m', '3-10m', '10m+'];
export const VISIBLE_EDGES_S = [10, 30, 60, 180, 600];
export const BUCKETS = { timeOnStep: TIME_BUCKETS, timeToResult: TIME_BUCKETS, visibleTime: VISIBLE_BUCKETS };

/** Bucket label for a duration in ms. */
export function bucketFor(ms: number, labels: string[], edgesSeconds: number[]): string {
  for (let i = 0; i < edgesSeconds.length; i++) if (ms < edgesSeconds[i] * 1000) return labels[i];
  return labels[labels.length - 1];
}

/**
 * Turn a data value into a safe map key for a rollup doc: capped at 60 chars,
 * and a leading "__" (reserved in Firestore, and "__proto__" in JS) gets one
 * more underscore in front. Keys in value-keyed maps ARE data values: viewport
 * "phone", format id "phone", talk field "email". They are counts of a
 * category, not properties of a person.
 */
export function mapKey(v: unknown): string {
  const k = String(v).slice(0, 60);
  return k.slice(0, 2) === '__' ? '_' + k : k;
}

export const num = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
/** Safe division: null when the denominator is zero. */
export const div = (a: number, b: number): number | null => (b > 0 ? a / b : null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isObj = (x: unknown): x is Record<string, any> => x !== null && typeof x === 'object' && !Array.isArray(x);
