// src/lib/plan-finder/links.ts
//
// Where a result's button goes. The catalog holds each product's address; the
// answers change it: the race date goes on to the free plan and the app's sign-up
// (it was collected and thrown away), the app link opens already filled in, and a
// tool opens on the goal the visitor named.
//
// Pure, so it can be tested; the dialog adds the src to app links in the browser.

import type { Product } from './content';
import type { Answers } from './routing';
import { appSignupHref, seedFromPlanFinder } from '@/lib/app-seed';
import { APP } from '@/lib/facts/product';

/** The week planner's goal for each plan finder goal. */
const PLANNER_GOAL: Record<string, string> = {
  first: 'first-hyrox',
  faster: 'faster-hyrox',
  athx: 'athx',
  xenom: '10k-strength',
  ultra: '10k-strength',
  hybrid: '10k-strength',
};

const OWN = 'https://hybridx.club';

/**
 * The address for a product given the answers. `raceDate` is YYYY-MM-DD or '';
 * `weeksToRace` is whole weeks (0 when there is no usable date).
 */
export function resultHref(product: Pick<Product, 'id' | 'href'>, answers: Answers, raceDate: string, weeksToRace: number): string {
  const hasRace = weeksToRace >= 1 && /^\d{4}-\d{2}-\d{2}$/.test(raceDate);

  if (product.id === 'app') {
    // A week or more away, or the app would refuse the date.
    return appSignupHref(seedFromPlanFinder({ goal: answers.goal, level: answers.level }, raceDate, weeksToRace >= 1));
  }
  if (product.id === 'free' && hasRace) return `${product.href}?race=${raceDate}`;
  if (product.id === 'weekplan' && answers.goal) return `${product.href}?goal=${PLANNER_GOAL[answers.goal] ?? 'first-hyrox'}`;
  if (product.id === 'athxpage' && answers.format === 'tools') return `${product.href}#calculator`;
  return product.href;
}

/** Whether a link stays in the browser tab and on this site's own address. */
export function isOwnAddress(href: string): boolean {
  return href === OWN || href.startsWith(`${OWN}/`) || href === APP.url || href.startsWith(`${APP.url}/`);
}
