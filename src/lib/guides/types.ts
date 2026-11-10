// src/lib/guides/types.ts
//
// What an article is: typed blocks, never HTML or MDX. docs/content-engine-plan.md,
// section 6.4.
//
// The schema enforces every rule that is about shape, so a malformed article
// cannot be saved: a workout must give a beginner and a race-pace option, each
// with RPE and rest; an FAQ has at most three entries; a table's rows match its
// header; text links only to pages in the topic map. Rules about content (the
// answer comes first, the numbers match the facts registry) are the drafting
// pipeline's checks, in step 4.

import { z } from 'zod';
import { CTA_IDS } from './ctas';
import { disallowedLinks } from './inline';
import { PILLAR_IDS, RESERVED_GUIDE_SLUGS, TOOL_IDS } from './topics';

const plain = (max: number) => z.string().trim().min(1).max(max);

/** Text that may carry **bold**, *italic* and allowed [links](/path). */
const inline = (max: number) =>
  plain(max).superRefine((text, ctx) => {
    for (const href of disallowedLinks(text)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Link not allowed: ${href}` });
    }
  });

const WorkoutOption = z.object({
  steps: z.array(plain(200)).min(1).max(12),
  /** Effort, e.g. "RPE 6–7". Required: every workout states how hard. */
  rpe: plain(40),
  /** Rest, e.g. "90 s between rounds". Required: every workout states it. */
  rest: plain(80),
});

const BlockUnion = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heading'), level: z.union([z.literal(2), z.literal(3)]), text: plain(100) }),
  z.object({ type: z.literal('paragraph'), text: inline(1500) }),
  z.object({ type: z.literal('list'), ordered: z.boolean(), items: z.array(inline(400)).min(1).max(12) }),
  z.object({ type: z.literal('callout'), kind: z.enum(['tip', 'warning', 'coach-note']), text: inline(800) }),
  z.object({
    type: z.literal('workout'),
    title: plain(100),
    goal: plain(200).optional(),
    beginner: WorkoutOption,
    racePace: WorkoutOption,
    notes: inline(600).optional(),
  }),
  z.object({
    type: z.literal('table'),
    caption: plain(160).optional(),
    header: z.array(plain(60)).min(2).max(6),
    rows: z.array(z.array(plain(120))).min(1).max(20),
  }),
  z.object({
    type: z.literal('calculator'),
    tool: z.enum(TOOL_IDS),
    /** Inputs to open the tool with, once tools can be embedded (plan step 5). */
    presets: z.record(z.union([z.string().max(40), z.number()])).optional(),
  }),
  z.object({ type: z.literal('cta'), variant: z.enum(CTA_IDS) }),
  z.object({
    type: z.literal('faq'),
    items: z.array(z.object({ question: plain(160), answer: inline(800) })).min(1).max(3),
  }),
  z.object({
    type: z.literal('sources'),
    items: z
      .array(
        z.object({
          title: plain(200),
          publisher: plain(120).optional(),
          url: z.string().url().startsWith('https://').optional(),
        }),
      )
      .min(1)
      .max(10),
  }),
]);

// Rules that span fields. Kept off the table object itself because zod's
// discriminated union only accepts plain objects.
export const BlockSchema = BlockUnion.superRefine((block, ctx) => {
  if (block.type === 'table' && !block.rows.every((r) => r.length === block.header.length)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Every table row needs one cell per header column', path: ['rows'] });
  }
});

export type Block = z.infer<typeof BlockSchema>;
export type BlockType = Block['type'];

export const GUIDE_STATUSES = [
  'drafting',
  'awaiting_review',
  'revising',
  'approved',
  'scheduled',
  'published',
  'retired',
] as const;
export type GuideStatus = (typeof GUIDE_STATUSES)[number];

const isoDate = z.string().datetime({ offset: true });
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const GuideSchema = z
  .object({
    slug: z
      .string()
      .max(80)
      .regex(SLUG, 'Lowercase words joined by hyphens')
      .refine((s) => !(RESERVED_GUIDE_SLUGS as readonly string[]).includes(s), 'That slug is a page of its own'),
    status: z.enum(GUIDE_STATUSES),
    /** The one point the article makes, in one sentence. */
    point: plain(240),
    title: plain(70),
    /** The meta description: what a searcher sees under the title. */
    description: plain(170),
    pillar: z.enum(PILLAR_IDS),
    blocks: z.array(BlockSchema).min(1).max(60),
    revision: z.number().int().min(1),
    updatedAt: isoDate,
    publishedAt: isoDate.optional(),
    /** When an approved article goes live (plan step 3). */
    publishAt: isoDate.optional(),
    /** Where a retired article sends its visitors. A path on this site. */
    redirectTo: z.string().regex(/^\/[a-z0-9\-/]*$/).optional(),
  })
  .refine((g) => g.status !== 'published' || g.publishedAt !== undefined, {
    message: 'A published article needs publishedAt',
    path: ['publishedAt'],
  });

export type Guide = z.infer<typeof GuideSchema>;
