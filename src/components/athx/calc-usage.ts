// src/components/athx/calc-usage.ts
//
// Did the visitor touch the calculator before they signed up?
//
// Worth recording. The calculator is the most expensive thing on this page and
// the argument for keeping it is that it converts — but "people who used it
// signed up" is only knowable if the two are joined at capture time. The gap
// between calculator users and non-users in the signup rate is what decides
// whether it stays.
//
// A module singleton rather than context or a prop: the calculator and the two
// forms sit in different parts of the tree with the page (a server component)
// between them, so sharing state any other way would mean making the whole page
// a client component to carry one boolean.

let used = false;

/** Called on the first slider interaction. Idempotent. */
export function markCalculatorUsed(): void {
  used = true;
}

/** Read at submit time by the capture forms. */
export function wasCalculatorUsed(): boolean {
  return used;
}
