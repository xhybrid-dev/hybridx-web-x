// src/lib/site-health/run.ts
//
// A step of the hourly maintenance job: look at the live site the way a search engine would, a few
// pages at a time, and email Jon when something breaks. The whole sitemap is covered every few
// hours (oldest-checked first, PAGES_PER_RUN a tick), and the checks that concern the site as a
// whole (the www redirect, robots.txt, the sitemap, the 404, the security headers) run every tick,
// because those are the ones a bad deploy or a console change breaks for everything at once.
//
// Everything it needs from the outside comes in as `deps`, so the tests run it against stand-ins.
// Like every step of that job it is safe to run twice and safe to miss.

import { analyseIndexablePage, errorsOf, SITE_TARGETS, type Headers, type HealthIssue, type PageSnapshot, type SiteTarget } from './analyse';

export const PAGES_PER_RUN = 10;
/** A persistent error is mentioned again after this long, not every hour. */
export const ALERT_COOLDOWN_MS = 72 * 60 * 60 * 1000;
/** No new request is started after this long into a run. */
export const WINDOW_MS = 45_000;
const CONCURRENCY = 4;

export interface HealthState {
  /** "page:/guides/x" or "site:www". */
  key: string;
  kind: 'page' | 'site';
  label: string;
  path?: string;
  checkedAt: string;
  issues: HealthIssue[];
  /** When an email last mentioned an error on this target. Cleared on recovery. */
  alertedAt?: string;
}

export interface TargetResponse {
  status: number;
  location: string | null;
  headers: Headers;
  body: string;
}

export interface HealthDeps {
  origin: string;
  paths: () => Promise<string[]>;
  fetchPage: (path: string) => Promise<PageSnapshot>;
  fetchTarget: (target: SiteTarget) => Promise<TargetResponse>;
  loadStates: () => Promise<HealthState[]>;
  saveStates: (states: HealthState[]) => Promise<void>;
  deleteStates: (keys: string[]) => Promise<void>;
  /** Sends one email about everything newly broken. Returns false when there is nobody to send to. */
  alert: (items: { label: string; issues: HealthIssue[] }[]) => Promise<boolean>;
  now: () => Date;
}

export interface HealthRun {
  checked: number;
  errors: number;
  warnings: number;
  alerted: number;
  skipped?: string;
}

const pageKey = (path: string) => `page:${path}`;
const siteKey = (id: string) => `site:${id}`;

/** The pages to look at this tick: never-checked first, then the longest since checked. */
export function pagesDue(paths: readonly string[], states: readonly HealthState[], limit = PAGES_PER_RUN): string[] {
  const checkedAt = new Map(states.map((s) => [s.key, s.checkedAt]));
  return [...paths]
    .sort((a, b) => (checkedAt.get(pageKey(a)) ?? '').localeCompare(checkedAt.get(pageKey(b)) ?? '') || a.localeCompare(b))
    .slice(0, limit);
}

/** Whether a result should be in this run's email: it has an error, and has not been mentioned lately. */
export function needsAlert(next: Pick<HealthState, 'issues'>, prev: Pick<HealthState, 'alertedAt'> | undefined, now: Date): boolean {
  if (errorsOf(next.issues).length === 0) return false;
  if (!prev?.alertedAt) return true;
  return now.getTime() - Date.parse(prev.alertedAt) >= ALERT_COOLDOWN_MS;
}

async function inPool<T, R>(items: T[], run: (item: T) => Promise<R>, started: () => boolean): Promise<(R | undefined)[]> {
  const out: (R | undefined)[] = new Array(items.length).fill(undefined);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length && started()) {
        const i = next++;
        out[i] = await run(items[i]);
      }
    }),
  );
  return out;
}

export async function runSiteHealth(deps: HealthDeps): Promise<HealthRun> {
  const began = deps.now();
  const [paths, states] = await Promise.all([deps.paths(), deps.loadStates()]);
  const byKey = new Map(states.map((s) => [s.key, s]));

  // A page that has left the sitemap (a retired guide) is no longer anyone's concern: drop its record,
  // or its last error would show in the admin for ever.
  const live = new Set(paths.map(pageKey));
  const gone = states.filter((s) => s.kind === 'page' && !live.has(s.key)).map((s) => s.key);
  if (gone.length) await deps.deleteStates(gone);

  const windowOpen = () => deps.now().getTime() - began.getTime() < WINDOW_MS;
  type Job = { key: string; kind: 'page' | 'site'; label: string; path?: string; run: () => Promise<HealthIssue[]> };
  const jobs: Job[] = [
    ...SITE_TARGETS.map<Job>((t) => ({
      key: siteKey(t.id),
      kind: 'site',
      label: t.label,
      run: async () => t.check(await deps.fetchTarget(t), deps.origin, deps.now()),
    })),
    ...pagesDue(paths, states).map<Job>((path) => ({
      key: pageKey(path),
      kind: 'page',
      label: path,
      path,
      run: async () => analyseIndexablePage(deps.origin, await deps.fetchPage(path)),
    })),
  ];

  const results = await inPool(
    jobs,
    async (job) => {
      try {
        return { job, issues: await job.run() };
      } catch (error) {
        // A page that cannot be fetched at all is the worst kind of broken.
        const reason = error instanceof Error ? error.message : String(error);
        return { job, issues: [{ code: 'fetch', severity: 'error' as const, message: `Could not be fetched: ${reason.slice(0, 120)}` }] };
      }
    },
    windowOpen,
  );

  const now = deps.now();
  const next: HealthState[] = [];
  const toAlert: { state: HealthState; label: string }[] = [];
  let errors = 0;
  let warnings = 0;
  for (const r of results) {
    if (!r) continue;
    const prev = byKey.get(r.job.key);
    const state: HealthState = { key: r.job.key, kind: r.job.kind, label: r.job.label, ...(r.job.path ? { path: r.job.path } : {}), checkedAt: now.toISOString(), issues: r.issues };
    const failing = errorsOf(r.issues).length > 0;
    if (failing) {
      errors++;
      if (prev?.alertedAt) state.alertedAt = prev.alertedAt;
      if (needsAlert(state, prev, now)) toAlert.push({ state, label: r.job.label });
    } else if (r.issues.length) warnings++;
    next.push(state);
  }

  let alerted = 0;
  if (toAlert.length > 0 && (await deps.alert(toAlert.map(({ state, label }) => ({ label, issues: errorsOf(state.issues) }))))) {
    for (const { state } of toAlert) state.alertedAt = now.toISOString();
    alerted = toAlert.length;
  }

  if (next.length) await deps.saveStates(next);
  return { checked: next.length, errors, warnings, alerted };
}
