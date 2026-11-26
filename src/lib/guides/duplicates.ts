// src/lib/guides/duplicates.ts
//
// Two articles answering the same question compete with each other in search,
// and a reader who finds both has been told the same thing twice. Two of the
// first three live guides were exactly that: "can you do 100 unbroken air
// squats before 100 wall balls", published two hours apart, each linking to the
// other as "related". Nothing stopped it because the only checks were an
// identical title and a 3-gram overlap of the body (0.037 for that pair),
// neither of which sees two differently worded versions of one question.
//
// Here the question itself is compared: the content words of the titles (the
// same ones the related-articles score uses), as a fraction of how much they
// share. The pair above scores 0.78.

import { overlap, terms } from './related';
import type { PillarId } from './topics';

/** At or above this, a title asks the question another already answers: a draft is stopped, a topic is not queued. */
export const DUPLICATE_TITLE_OVERLAP = 0.6;
/** Approving is a person's decision, so only the near-certain is blocked. */
export const APPROVE_BLOCK_OVERLAP = 0.75;

/** What an existing article, draft or queued topic is compared as. */
export interface Compared {
  /** Where to find it: "/guides/<slug>" for an article, the question for a topic. */
  label: string;
  title: string;
  pillar?: PillarId;
}

export interface Duplicate {
  other: Compared;
  score: number;
}

/** Each of `existing` that asks the same question as `title`, strongest first. */
export function findDuplicates(title: string, existing: readonly Compared[], threshold = DUPLICATE_TITLE_OVERLAP): Duplicate[] {
  const mine = terms(title);
  return existing
    .map((other) => ({ other, score: overlap(mine, terms(other.title)) }))
    .filter((d) => d.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

/** The reader-facing sentence for a duplicate. */
export function describeDuplicate(d: Duplicate): string {
  return `${Math.round(d.score * 100)}% of its question's words match ${d.other.label} ("${d.other.title}").`;
}
