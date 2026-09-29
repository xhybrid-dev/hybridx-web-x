// src/lib/plan-finder/tracker.ts
//
// The plan finder's anonymous tracker (HXT in the reference). Browser-only.
//
// It sends nothing unless all of these hold, checked on every event:
//   - an endpoint is configured,
//   - the visitor accepted analytics in the consent banner,
//   - the browser sends neither Global Privacy Control nor Do Not Track.
// The on-screen privacy lines follow `tracker.on`, so the page never claims
// answers are saved when they are not, or the reverse.
//
// It stores nothing on the device. The visit id is 32 random hex characters
// made when the page loads and held in memory, so a reload is a new visit.
// Events are batched and sent as text/plain JSON, which skips the CORS
// preflight. What may be sent is defined in events.schema.json, and the
// collector drops anything else (src/lib/plan-finder/collect-core.ts).
//
// Never pass a name, an email or free text other than the scrubbed note.

import { funnel } from './content';
import { VERSION as ROUTE_VERSION } from './routing';
import { getConsent } from '@/lib/consent';

export type Variant = 'A' | 'B' | 'control';
export type Mode = 'entry' | 'page';
type Props = Record<string, unknown>;

export interface TrackerConfig {
  /** Where batches are POSTed. Empty means tracking is off. */
  endpoint: string;
  mode: Mode;
  variant?: Variant | null;
  /** Build label stored with every batch, so changes can be compared. */
  siteVersion: string;
}

export interface Tracker {
  track(name: string, props?: Props): void;
  /** Sends everything queued. `unload` prefers sendBeacon, for page exits. */
  flush(unload?: boolean): void;
  /** True while events are actually being sent. */
  readonly on: boolean;
  readonly sid: string;
}

const MAX_EVENTS = 400;
const BATCH = 50;
const FLUSH_AT = 10;
const FLUSH_MS = 4000;

/** Lower-case and keep only a-z 0-9 . _ - (the collector cleans again). */
export function slug(value: unknown, max = 40): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max);
}

/** Global Privacy Control or Do Not Track: the tracker stays off whatever else is set. */
export function browserOptsOut(): boolean {
  if (typeof navigator === 'undefined') return true;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  const w = window as Window & { doNotTrack?: string };
  return nav.globalPrivacyControl === true || nav.doNotTrack === '1' || w.doNotTrack === '1';
}

function randomId(): string {
  const bytes = new Uint8Array(16);
  try {
    crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function utm(): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  try {
    const params = new URLSearchParams(window.location.search);
    for (const k of ['source', 'medium', 'campaign', 'content', 'term']) {
      const v = slug(params.get('utm_' + k), 60);
      if (v) out['utm_' + k] = v;
    }
  } catch {
    // no usable query string
  }
  return Object.keys(out).length ? out : undefined;
}

export function createTracker(config: TrackerConfig): Tracker {
  const sid = randomId();
  const optOut = browserOptsOut();
  let queue: Props[] = [];
  let seq = 0;
  let sent = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const isOn = () => !!config.endpoint && !optOut && getConsent() === 'granted';

  function context(): Props {
    const w = window.innerWidth || 1024;
    const ctx: Props = {
      site: slug(config.siteVersion, 20) || 'web',
      route: ROUTE_VERSION,
      catalog: slug(funnel.catalogVersion, 20),
      mode: config.mode,
      path: window.location.pathname || '/',
      ref: hostOf(document.referrer),
      vw: w < 640 ? 'phone' : w < 1024 ? 'tablet' : 'desktop',
      lang: slug(document.documentElement.lang || navigator.language || 'en', 10),
    };
    if (config.variant) ctx.variant = config.variant;
    const u = utm();
    if (u) ctx.utm = u;
    return ctx;
  }

  function send(body: string, unload: boolean) {
    try {
      if (unload && navigator.sendBeacon?.(config.endpoint, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) return;
    } catch {
      // fall through to fetch
    }
    try {
      fetch(config.endpoint, {
        method: 'POST',
        body,
        keepalive: true,
        credentials: 'omit',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      }).catch(() => {});
    } catch {
      // The tracker never retries and never surfaces an error.
    }
  }

  function flush(unload = false) {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!isOn()) {
      // Consent withdrawn, or never given: anything queued is dropped, not held.
      queue = [];
      return;
    }
    while (queue.length) {
      const events = queue.splice(0, BATCH);
      send(JSON.stringify({ v: 1, sid, ctx: context(), events }), unload);
    }
  }

  function track(name: string, props?: Props) {
    if (!isOn() || sent >= MAX_EVENTS) return;
    const event: Props = { n: name, t: Date.now(), q: seq++ };
    if (props) {
      for (const [k, v] of Object.entries(props)) if (v !== undefined && v !== null) event[k] = v;
    }
    queue.push(event);
    sent++;
    if (queue.length >= FLUSH_AT) flush(false);
    else if (!timer) timer = setTimeout(() => flush(false), FLUSH_MS);
  }

  return {
    track,
    flush,
    get on() {
      return isOn();
    },
    sid,
  };
}

/** A tracker that never sends: for server rendering and tests. */
export const offTracker: Tracker = { track() {}, flush() {}, on: false, sid: '' };
