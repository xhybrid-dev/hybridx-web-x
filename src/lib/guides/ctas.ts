// src/lib/guides/ctas.ts
//
// The calls to action an article may end with. A registry rather than copy the
// model writes each time, so the wording is reviewed once, states only product
// facts, and can be compared variant against variant. docs/content-engine-plan.md,
// section 7.2.
//
// Each sends people to a page on this site, never to an app store: the store
// apps sell nothing (src/lib/facts/product.ts, APP.availability). The ATHX one
// lands on the ATHX page's app section, where an edition button carries the
// reader into the app's sign-up with the ATHX plan picked (src/lib/app-seed.ts)
// and the article's src still attached.

import { APP, appPriceLabel } from '@/lib/facts';

export const CTA_IDS = ['free-plan', 'app', 'athx'] as const;
export type CtaId = (typeof CTA_IDS)[number];

export interface Cta {
  headline: string;
  body: string;
  /** A page on this site: /api/guides/out adds src=guide-<slug> to it. */
  href: string;
  /** Where on that page to land, if not the top. */
  hash?: string;
  label: string;
  /** When to choose it, told to the drafting engine (checks.ts enforces it). */
  use?: string;
}

export const CTAS: Record<CtaId, Cta> = {
  'free-plan': {
    headline: 'Turn this into a 12-week plan',
    body: 'A free HYROX plan built around your race date and level, sent as a PDF.',
    href: '/free-hyrox-plan',
    label: 'Get my free plan',
  },
  app: {
    headline: 'Train it with HybridX',
    body: `Daily workouts, a programme library and Edge Coach for your questions. Very affordable at ${appPriceLabel('words')}, with a ${APP.trialDays}-day free trial.`,
    href: APP.page,
    label: 'See the app',
  },
  athx: {
    headline: 'Train for ATHX with HybridX',
    body: `The ATHX 2027 twelve-week plan in the app, with Lite, ATHX or Pro loads, lined up to your event date. Very affordable at ${appPriceLabel('words')}, with a ${APP.trialDays}-day free trial.`,
    href: '/athx-2027',
    hash: 'app',
    label: 'See the ATHX plan',
    use: 'every ATHX article, and only ATHX articles',
  },
};
