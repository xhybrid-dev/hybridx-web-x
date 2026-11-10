// src/lib/guides/fixtures.ts
//
// Two sample articles in the short, one-point format (docs/content-engine-plan.md,
// section 6.1). They are never published. They exist for three jobs:
//
//   1. test data for the store, the renderer and the sitemap;
//   2. a local preview of the article pages without Firestore credentials:
//      `GUIDES_FIXTURES=1 npm run dev` (store.ts ignores the variable in
//      production);
//   3. the worked example of the format that the drafting pipeline (plan
//      step 4) is shown, so drafts imitate a reviewed shape rather than invent
//      one.
//
// Numbers in them come from the facts registry or from the site's own stated
// method (sessions at least 6–8 hours apart).

import type { Guide } from './types';

export const SAMPLE_GUIDES: Guide[] = [
  {
    slug: 'sled-push-without-a-sled',
    status: 'published',
    point: 'Without a sled, train the push as two separate skills: the low body position, and leg drive while your legs are already tired.',
    title: 'How do I train the sled push without a sled?',
    description:
      'No sled in your gym? Train the low push position and fatigued leg drive separately, with two sessions you can run in any commercial gym.',
    pillar: 'hyrox',
    revision: 1,
    updatedAt: '2026-11-10T07:00:00Z',
    publishedAt: '2026-11-10T07:00:00Z',
    blocks: [
      {
        type: 'paragraph',
        text: 'Train it as two things: a **low, braced position** held under load, and **leg drive on tired legs**. The Men Open and Women Pro sled is 152 kg including the sled, pushed 50 metres, so the session that matters is the one that teaches you to keep driving when your quads are already burning.',
      },
      { type: 'heading', level: 2, text: 'Why a sled is not the only way' },
      {
        type: 'paragraph',
        text: 'The push fails in two places: your hips rise and you lose the angle, or your legs go and your steps shorten. Neither needs a sled to train. The position is a strength and bracing skill, and the leg drive is muscular endurance, which a leg press and a step-up build well.',
      },
      {
        type: 'workout',
        title: 'Sled push substitute',
        goal: 'Hold the push position, then drive on fatigued legs.',
        beginner: {
          steps: [
            '3 × 20 s wall drive: hands on a wall at shoulder height, body at 45°, drive the knees alternately',
            '3 × 10 per leg box step-up, light dumbbells',
            '400 m easy run after the last set',
          ],
          rpe: 'RPE 6–7',
          rest: '90 s between sets',
        },
        racePace: {
          steps: [
            '4 × 30 s wall drive with a weight vest',
            '4 × 15 leg press at a weight you could do 25 times',
            '1 km run at race pace straight after the last set',
          ],
          rpe: 'RPE 8',
          rest: '60 s between sets, none before the run',
        },
        notes: 'Keep the run straight after the last set: that is the part a sled push takes from you in the race.',
      },
      {
        type: 'callout',
        kind: 'warning',
        text: 'Hips rising is the first sign the set is too heavy. Lower the load before you lose the angle.',
      },
      { type: 'calculator', tool: 'one-rep-max' },
      {
        type: 'faq',
        items: [
          {
            question: 'Can I push a switched-off treadmill instead?',
            answer: 'Some gyms allow it and some do not. Ask first, and never on a treadmill that could start under you.',
          },
        ],
      },
      { type: 'cta', variant: 'free-plan' },
    ],
  },
  {
    slug: 'lift-or-run-first',
    status: 'published',
    point: 'When strength and running share a session, lift first unless the run is the session that matters that week.',
    title: 'Should I lift or run first on the same day?',
    description:
      'Lift first when strength is the priority, and keep the sessions at least 6–8 hours apart when you can. Here is how to choose.',
    pillar: 'running-lifting',
    revision: 1,
    updatedAt: '2026-11-08T07:00:00Z',
    publishedAt: '2026-11-08T07:00:00Z',
    blocks: [
      {
        type: 'paragraph',
        text: 'Lift first, then run, when both are in one session and strength is the priority. Better still, keep them **at least 6–8 hours apart**, which is how [HybridX programmes](/hybrid-training-program) are built.',
      },
      {
        type: 'table',
        caption: 'Which comes first',
        header: ['If the priority is', 'Do this first', 'Then'],
        rows: [
          ['Strength', 'Heavy lifts', 'Easy run, under 30 minutes'],
          ['A key run', 'The run', 'Light upper-body work only'],
          ['HYROX race practice', 'Stations', 'A 1 km run at race pace'],
        ],
      },
      { type: 'cta', variant: 'app' },
    ],
  },
];
