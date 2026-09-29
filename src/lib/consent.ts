// src/lib/consent.ts
//
// The visitor's analytics choice, from the consent banner. Two things wait
// for "Accept": Google Analytics, and the plan finder's own anonymous tracker
// (src/lib/plan-finder/tracker.ts). Nothing else on the site reads this.
//
// The choice itself is kept in localStorage. Remembering a consent decision is
// what the storage exists for, so it needs no consent of its own; it holds no
// identifier. If storage is unavailable (private windows, blocked site data)
// the choice lasts for the page and the banner asks again on the next one,
// which fails towards asking rather than towards tracking.
//
// Client-only. On the server every read reports 'unknown', so nothing that
// depends on consent renders until the browser has checked.

import { useSyncExternalStore } from 'react';

export type ConsentState = 'granted' | 'denied' | 'unset';

const STORAGE_KEY = 'hybridx-consent';
const CHANGE_EVENT = 'hybridx:consent-change';
const OPEN_EVENT = 'hybridx:consent-open';
/** Bump when the banner starts covering something new, so everyone is asked again. */
const CONSENT_VERSION = 1;

let memory: ConsentState = 'unset';

function read(): ConsentState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return memory;
    const stored = JSON.parse(raw) as { v?: number; analytics?: unknown };
    if (stored.v !== CONSENT_VERSION || typeof stored.analytics !== 'boolean') return 'unset';
    return stored.analytics ? 'granted' : 'denied';
  } catch {
    return memory;
  }
}

export function getConsent(): ConsentState {
  if (typeof window === 'undefined') return 'unset';
  return read();
}

export function setConsent(granted: boolean): void {
  memory = granted ? 'granted' : 'denied';
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: CONSENT_VERSION, analytics: granted, at: new Date().toISOString().slice(0, 10) }),
    );
  } catch {
    // Held in memory for this page only.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Calls `listener` whenever the choice changes, in this tab or another. */
export function subscribeConsent(listener: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** 'unknown' during server rendering and hydration, then the stored choice. */
export function useConsent(): ConsentState | 'unknown' {
  return useSyncExternalStore<ConsentState | 'unknown'>(subscribeConsent, getConsent, () => 'unknown');
}

/** Reopens the banner, from "Cookie settings" in the footer or the privacy policy. */
export function openConsentSettings(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function subscribeConsentOpen(listener: () => void): () => void {
  window.addEventListener(OPEN_EVENT, listener);
  return () => window.removeEventListener(OPEN_EVENT, listener);
}
