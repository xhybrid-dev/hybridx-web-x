// src/lib/guides/engine/shape.ts
//
// What the drafting model returns, and how it becomes an article.
//
// The model is given a deliberately loose shape (one block type with optional
// fields), which structured-output modes handle reliably. Code then builds
// strict typed blocks from it, keeping only the fields each block type has,
// and the article schema decides whether the result may be saved. So the
// model never gets to emit anything the site would render unchecked.

import { CTA_IDS, type CtaId } from '../ctas';
import { TOOL_IDS, type ToolId } from '../topics';
import type { Block } from '../types';

export interface LooseOption {
  steps?: string[];
  rpe?: string;
  rest?: string;
}

export interface LooseBlock {
  type: string;
  level?: number;
  text?: string;
  ordered?: boolean;
  items?: string[];
  kind?: string;
  title?: string;
  goal?: string;
  beginner?: LooseOption;
  racePace?: LooseOption;
  notes?: string;
  caption?: string;
  header?: string[];
  rows?: string[][];
  tool?: string;
  variant?: string;
  faq?: { question?: string; answer?: string }[];
  sources?: { title?: string; publisher?: string; url?: string }[];
}

export interface LooseDraft {
  title?: string;
  description?: string;
  point?: string;
  blocks?: LooseBlock[];
}

export interface DraftContent {
  title: string;
  description: string;
  point: string;
  blocks: Block[];
}

const str = (s: unknown) => (typeof s === 'string' ? s.trim() : '');
const strs = (xs: unknown) => (Array.isArray(xs) ? xs.map(str).filter(Boolean) : []);
const opt = (s: unknown) => str(s) || undefined;
const option = (o: LooseOption | undefined) => ({ steps: strs(o?.steps), rpe: str(o?.rpe), rest: str(o?.rest) });

/**
 * One loose block to a typed block, or null for a block that cannot be one
 * (an unknown type, an unknown tool). Empty required fields are kept empty, so
 * the schema reports them instead of the block silently vanishing.
 */
export function toBlock(b: LooseBlock): Block | null {
  switch (b.type) {
    case 'heading':
      return { type: 'heading', level: b.level === 3 ? 3 : 2, text: str(b.text) };
    case 'paragraph':
      return { type: 'paragraph', text: str(b.text) };
    case 'list':
      return { type: 'list', ordered: b.ordered === true, items: strs(b.items) };
    case 'callout':
      return { type: 'callout', kind: b.kind === 'warning' ? 'warning' : b.kind === 'coach-note' ? 'coach-note' : 'tip', text: str(b.text) };
    case 'workout':
      return {
        type: 'workout',
        title: str(b.title),
        goal: opt(b.goal),
        beginner: option(b.beginner),
        racePace: option(b.racePace),
        notes: opt(b.notes),
      };
    case 'table':
      return { type: 'table', caption: opt(b.caption), header: strs(b.header), rows: (b.rows ?? []).map((r) => (Array.isArray(r) ? r.map(str) : [])) };
    case 'calculator':
      return (TOOL_IDS as readonly string[]).includes(str(b.tool)) ? { type: 'calculator', tool: str(b.tool) as ToolId } : null;
    case 'cta':
      return (CTA_IDS as readonly string[]).includes(str(b.variant)) ? { type: 'cta', variant: str(b.variant) as CtaId } : null;
    case 'faq':
      return { type: 'faq', items: (b.faq ?? []).map((f) => ({ question: str(f.question), answer: str(f.answer) })) };
    case 'sources':
      return { type: 'sources', items: (b.sources ?? []).map((s) => ({ title: str(s.title), publisher: opt(s.publisher), url: opt(s.url) })) };
    default:
      return null;
  }
}

export function toContent(draft: LooseDraft): DraftContent {
  return {
    title: str(draft.title),
    description: str(draft.description),
    point: str(draft.point),
    blocks: (draft.blocks ?? []).map(toBlock).filter((b): b is Block => b !== null),
  };
}

/** Typed blocks back to the loose shape, for asking the model to fix or revise them. */
export function toLoose(content: DraftContent): LooseDraft {
  return {
    title: content.title,
    description: content.description,
    point: content.point,
    blocks: content.blocks.map((b): LooseBlock => {
      switch (b.type) {
        case 'faq':
          return { type: 'faq', faq: b.items };
        case 'sources':
          return { type: 'sources', sources: b.items };
        default:
          return { ...b } as LooseBlock;
      }
    }),
  };
}
