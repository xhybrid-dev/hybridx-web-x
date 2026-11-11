// src/lib/guides/candidates.ts
//
// The starting topic list: the proposal's 30 seed keywords rewritten as single
// questions (docs/content-engine-plan.md, section 9). It seeds the topic queue
// the first time the engine runs; after that the queue in Firestore is the
// source of truth, and Jon reorders it, skips topics or adds his own in
// /admin/guides/topics.
//
// `needs` marks a topic whose proof element is a tool not built yet. The engine
// passes over it until that tool exists, so a draft never promises a calculator
// the site does not have.

import type { PillarId, ToolId } from './topics';

export type Proof = 'workout' | 'table' | 'tool' | 'coach-note';
export type FutureTool = 'week-planner' | 'strength-test' | 'hyrox-pacer';

export interface Candidate {
  question: string;
  pillar: PillarId;
  proof: Proof;
  /** An existing tool the article should embed. */
  tool?: ToolId;
  /** A tool that must exist before this topic can be drafted. */
  needs?: FutureTool;
  /** A line for the brief: the angle, or what to be careful about. */
  note?: string;
}

/** Tools that are planned but not built. Remove one here when it ships. */
export const UNBUILT_TOOLS: readonly FutureTool[] = ['strength-test'];

export const CANDIDATES: readonly Candidate[] = [
  { question: 'How do I train the sled push without a sled?', pillar: 'hyrox', proof: 'workout', note: 'Kit substitutions a commercial gym has.' },
  { question: 'How do I stop my grip failing on the sled pull?', pillar: 'hyrox', proof: 'workout', note: 'Chalk is allowed at the sled pull under the 2026/27 rules.' },
  { question: 'How should I pace the burpee broad jumps?', pillar: 'hyrox', proof: 'table' },
  { question: 'How do I train wall balls for when I am already tired?', pillar: 'hyrox', proof: 'workout' },
  { question: 'How should I break up 100 wall balls?', pillar: 'hyrox', proof: 'table', note: '100 reps in every division; no-reps do not count.' },
  { question: 'How do I train the farmers carry when my grip goes first?', pillar: 'hyrox', proof: 'workout' },
  { question: 'How do I stop sandbag lunges wrecking my last run?', pillar: 'hyrox', proof: 'workout', note: 'Resting the bag on a barrier, your feet or the floor is a 15 second penalty each time.' },
  { question: 'What does a HYROX simulation look like in a normal gym?', pillar: 'hyrox', proof: 'workout' },
  { question: 'What is a compromised-running session, and how often should I do one?', pillar: 'hyrox', proof: 'workout' },
  { question: 'HYROX weights by division for 2026/27', pillar: 'hyrox', proof: 'table', note: 'A table of the confirmed loads, singles and doubles. Relay is not confirmed: say so.' },
  { question: 'Should I lift or run first on the same day?', pillar: 'running-lifting', proof: 'table' },
  { question: 'Does running kill strength gains?', pillar: 'running-lifting', proof: 'table', note: 'Only cite sources you are certain exist. A good one for Jon to add a coach\'s note to in review.' },
  { question: 'How do I keep my strength while training for a marathon?', pillar: 'running-lifting', proof: 'workout' },
  { question: 'Zone 2 or intervals: which helps a lifter more?', pillar: 'running-lifting', proof: 'table' },
  { question: 'How much should a lifter run to get a faster 5k?', pillar: 'running-lifting', proof: 'tool', tool: 'vdot' },
  { question: 'Which gym exercises make you a faster runner?', pillar: 'running-lifting', proof: 'workout' },
  { question: 'Should beginner runners lift weights, and what first?', pillar: 'starting-out', proof: 'workout' },
  { question: 'Open or Pro: which HYROX division should I enter?', pillar: 'starting-out', proof: 'table' },
  { question: 'Singles or doubles for a first HYROX?', pillar: 'starting-out', proof: 'table' },
  { question: 'How should I taper in HYROX race week?', pillar: 'starting-out', proof: 'table' },
  { question: 'How do I peak for three ATHX zones on one day?', pillar: 'athx', proof: 'workout', note: 'ATHX facts only from the facts given; never mention HYROX in this article.' },
  { question: 'One session for kettlebells and running', pillar: 'starting-out', proof: 'workout' },
  { question: 'Functional fitness or hybrid training: what is the difference?', pillar: 'starting-out', proof: 'table' },
  { question: 'How long should I wait between heavy squats and a hard run?', pillar: 'running-lifting', proof: 'tool', needs: 'week-planner' },
  { question: 'Can I do legs the day before a long run?', pillar: 'running-lifting', proof: 'tool', needs: 'week-planner' },
  { question: 'How should I set up a 3-day running and lifting week?', pillar: 'running-lifting', proof: 'tool', needs: 'week-planner' },
  { question: 'What does a 4-day hybrid training week look like?', pillar: 'running-lifting', proof: 'tool', needs: 'week-planner' },
  { question: 'How do I test my hybrid fitness baseline?', pillar: 'starting-out', proof: 'tool', needs: 'strength-test' },
  { question: 'Am I strong enough for HYROX Open?', pillar: 'starting-out', proof: 'tool', needs: 'strength-test' },
  { question: 'How fast should my first 1km be in HYROX?', pillar: 'hyrox', proof: 'tool', needs: 'hyrox-pacer' },
  { question: 'How long should the Roxzone take me?', pillar: 'hyrox', proof: 'tool', needs: 'hyrox-pacer' },
  { question: 'How hard should I go on the SkiErg in HYROX?', pillar: 'hyrox', proof: 'tool', needs: 'hyrox-pacer' },
];
