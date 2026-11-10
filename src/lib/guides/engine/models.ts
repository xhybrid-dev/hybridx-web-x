// src/lib/guides/engine/models.ts
//
// The model calls the engine makes, behind one interface so the state
// machine can be tested with stand-ins:
//
//   write   Gemini, through the site's existing Genkit setup (src/ai/genkit.ts,
//           where its model is chosen), with the coaching bible as the system
//           instruction and structured output. Drafts, fixes and revisions.
//   link    the same, for where links to a new article go in older ones.
//   review  Claude, through the Anthropic SDK and the same model and pattern as
//           the monthly analytics review. Lists problems, never rewrites.
//
// Writer and reviewer are different model families on purpose: a second model
// catches what the first one is blind to. The review is optional: without
// ANTHROPIC_API_KEY it is skipped and the review email says so.

import Anthropic from '@anthropic-ai/sdk';
import { z as gz } from 'genkit';
import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { MODEL as CLAUDE_MODEL } from '@/lib/plan-finder/monthly-review';
import { BIBLE } from '../bible';
import { REVIEWER_SYSTEM } from './prompts';
import type { LinkSuggestion } from '../backlinks';
import type { LooseDraft } from './shape';

export interface ReviewNote {
  /** 1-based block number; 0 for the whole article. */
  block: number;
  quote: string;
  problem: string;
  severity: 'serious' | 'minor';
}

export interface ModelReview {
  verdict: 'publishable' | 'needs-fixes';
  summary: string;
  notes: ReviewNote[];
  model: string;
}

export type ReviewOutcome = ModelReview | { skipped: string };

export interface EngineModels {
  write(prompt: string): Promise<LooseDraft>;
  /** Where links to a new article would read naturally in older ones. */
  link(prompt: string): Promise<LinkSuggestion[]>;
  review(prompt: string): Promise<ReviewOutcome>;
  /** False when a review cannot happen, so a draft does not wait a tick for one. */
  canReview?(): boolean;
}

/* ── Gemini: the writer ─────────────────────────────────────────────────── */

const LooseOptionZ = gz.object({
  steps: gz.array(gz.string()).optional(),
  rpe: gz.string().optional(),
  rest: gz.string().optional(),
});

const LooseDraftZ = gz.object({
  title: gz.string(),
  description: gz.string(),
  point: gz.string(),
  blocks: gz.array(
    gz.object({
      type: gz.enum(['heading', 'paragraph', 'list', 'callout', 'workout', 'table', 'calculator', 'cta', 'faq', 'sources']),
      level: gz.number().optional(),
      text: gz.string().optional(),
      ordered: gz.boolean().optional(),
      items: gz.array(gz.string()).optional(),
      kind: gz.enum(['tip', 'warning']).optional(),
      title: gz.string().optional(),
      goal: gz.string().optional(),
      beginner: LooseOptionZ.optional(),
      racePace: LooseOptionZ.optional(),
      notes: gz.string().optional(),
      caption: gz.string().optional(),
      header: gz.array(gz.string()).optional(),
      rows: gz.array(gz.array(gz.string())).optional(),
      tool: gz.string().optional(),
      variant: gz.string().optional(),
      faq: gz.array(gz.object({ question: gz.string(), answer: gz.string() })).optional(),
      sources: gz.array(gz.object({ title: gz.string(), publisher: gz.string().optional(), url: gz.string().optional() })).optional(),
    }),
  ),
});

async function write(prompt: string): Promise<LooseDraft> {
  const { output } = await ai.generate({
    system: BIBLE,
    prompt,
    output: { schema: LooseDraftZ },
    config: { temperature: 0.3 },
  });
  if (!output) throw new Error('The drafting model returned nothing usable');
  return output as LooseDraft;
}

const LinksZ = gz.object({
  links: gz.array(gz.object({ article: gz.string(), paragraph: gz.number(), text: gz.string() })),
});

async function link(prompt: string): Promise<LinkSuggestion[]> {
  const { output } = await ai.generate({
    system: BIBLE,
    prompt,
    output: { schema: LinksZ },
    config: { temperature: 0.2 },
  });
  if (!output) throw new Error('The drafting model returned no link suggestions');
  return output.links;
}

/* ── Claude: the reviewer ───────────────────────────────────────────────── */

const str = { type: 'string' };
const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'summary', 'notes'],
  properties: {
    verdict: { type: 'string', enum: ['publishable', 'needs-fixes'] },
    summary: str,
    notes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['block', 'quote', 'problem', 'severity'],
        properties: {
          block: { type: 'integer' },
          quote: str,
          problem: str,
          severity: { type: 'string', enum: ['serious', 'minor'] },
        },
      },
    },
  },
};

const ReviewZ = z.object({
  verdict: z.enum(['publishable', 'needs-fixes']),
  summary: z.string(),
  notes: z
    .array(z.object({ block: z.number().int().min(0), quote: z.string(), problem: z.string(), severity: z.enum(['serious', 'minor']) }))
    .transform((n) => n.slice(0, 10)),
});

async function review(prompt: string): Promise<ReviewOutcome> {
  if (!process.env.ANTHROPIC_API_KEY) return { skipped: 'the reviewer key (ANTHROPIC_API_KEY) is not set yet' };
  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    // Adaptive thinking is always on for this model; effort sets its depth.
    // A review that misses a factual error costs more than the extra thought.
    output_config: { effort: 'high', format: { type: 'json_schema', schema: REVIEW_SCHEMA } },
    // If the model declines, the API retries on its recommended fallback instead of failing.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: REVIEWER_SYSTEM + BIBLE,
    messages: [{ role: 'user', content: prompt }],
  });
  if (response.stop_reason === 'refusal') throw new Error(`the reviewer declined (${response.stop_details?.category ?? 'no category'})`);
  if (response.stop_reason === 'max_tokens') throw new Error("the reviewer's reply was cut off");
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('no text in the review');
  return { ...ReviewZ.parse(JSON.parse(text.text)), model: response.model };
}

export const liveModels: EngineModels = { write, link, review, canReview: () => !!process.env.ANTHROPIC_API_KEY };
