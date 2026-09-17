'use client';

import { useSyncExternalStore } from 'react';

// src/components/athx/calc-usage.ts
//
// Did the visitor touch the calculator before they signed up?
//
// Worth recording. The calculator is the most expensive thing on the ATHX page
// and the argument for keeping it is that it converts — but "people who used it
// signed up" is only knowable if the two are joined at capture time. The gap in
// signup rate between calculator users and non-users is what decides whether it
// stays.
//
// A module singleton rather than context or a prop: the calculator and the two
// forms sit in different parts of the tree with the page (a server component)
// between them, so sharing state any other way would mean making the whole page
// a client component to carry one boolean.
//
// Exposed through useSyncExternalStore rather than read directly in a handler.
// The first version called the getter inside onSubmit and pushed the result
// into React state — which never reached the DOM in time, because the action
// snapshots the form as it submits and a state update from the same tick has
// not rendered yet. Every lead recorded calcUsed: false, including the ones
// where somebody had spent a minute dragging the sliders, and nothing about it
// looked wrong. Subscribing means the field is already correct when the form is
// read, rather than being corrected a moment too late.

let used = false;
const listeners = new Set<() => void>();

/** Called on the first slider interaction. Idempotent. */
export function markCalculatorUsed(): void {
  if (used) return;
  used = true;
  for (const listener of listeners) listener();
}

/** Read outside React — logging, analytics, anywhere a snapshot is enough. */
export function wasCalculatorUsed(): boolean {
  return used;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Subscribe a component to the flag.
 *
 * The server snapshot is `false`: on the server nobody has touched anything,
 * and returning anything else would mismatch the first client render.
 */
export function useCalculatorUsed(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => used,
    () => false,
  );
}

/** Reset between tests. Never called by the app. */
export function resetCalculatorUsage(): void {
  used = false;
  listeners.clear();
}
