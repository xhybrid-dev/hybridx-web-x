// src/lib/guides/ctas.ts
//
// The calls to action an article may end with. A registry rather than copy the
// model writes each time, so the wording is reviewed once, states only product
// facts, and can be compared variant against variant. docs/content-engine-plan.md,
// section 7.2.
//
// Both send people to a page on this site, never to an app store: the store
// apps sell nothing (src/lib/facts/product.ts, APP.availability).

import { APP, appPriceLabel } from '@/lib/facts';

export const CTA_IDS = ['free-plan', 'app'] as const;
export type CtaId = (typeof CTA_IDS)[number];

export interface Cta {
  headline: string;
  body: string;
  href: string;
  label: string;
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
};
