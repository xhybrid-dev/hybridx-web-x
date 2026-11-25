// src/lib/guides/freshness.ts
//
// Which published guides are due a second look, and why. The "How our guides are written" page
// promises two things this file is what keeps true: that when the rulebook changes the guides that
// relied on the old figures are reviewed again, and that each guide shows when it was last checked.
//
// A guide is due when either
//   - it was written or last checked against an earlier season than the current one
//     (facts/hyrox-standards.ts SEASON: change it and every guide becomes due at once), or
//   - nobody has looked at it for REVIEW_INTERVAL_DAYS (an edit, or "still correct" in admin).
//
// Pure: the admin page and the hourly job read the list, nothing here touches Firestore.

import { SEASON } from '@/lib/facts';
import type { Guide } from './types';

/** How long a guide may go unlooked-at before it is listed. Six months. */
export const REVIEW_INTERVAL_DAYS = 180;

/**
 * The season of a guide that has none recorded. Every such guide was written after the engine
 * launched on 10 November 2026, in the 2026/27 season.
 */
export const LEGACY_SEASON = '2026/27';

export type DueReason = 'season' | 'age';

export interface DueReview {
  slug: string;
  title: string;
  reasons: DueReason[];
  /** The season it stands against. */
  season: string;
  /** The last time it was changed or checked. */
  lastLookedAt: string;
  ageDays: number;
}

const DAY_MS = 86_400_000;

/** The later of the last edit and the last "still correct". */
export function lastLookedAt(g: Pick<Guide, 'updatedAt' | 'checkedAt'>): string {
  return g.checkedAt && g.checkedAt > g.updatedAt ? g.checkedAt : g.updatedAt;
}

export function guideSeason(g: Pick<Guide, 'season'>): string {
  return g.season ?? LEGACY_SEASON;
}

/** Published guides due a look, those out of date with the rules first, then the longest unlooked-at. */
export function reviewsDue(guides: readonly Guide[], now: Date, season: string = SEASON, intervalDays: number = REVIEW_INTERVAL_DAYS): DueReview[] {
  const due: DueReview[] = [];
  for (const g of guides) {
    if (g.status !== 'published') continue;
    const looked = lastLookedAt(g);
    const ageDays = Math.floor((now.getTime() - Date.parse(looked)) / DAY_MS);
    const reasons: DueReason[] = [];
    if (guideSeason(g) !== season) reasons.push('season');
    if (ageDays >= intervalDays) reasons.push('age');
    if (reasons.length === 0) continue;
    due.push({ slug: g.slug, title: g.title, reasons, season: guideSeason(g), lastLookedAt: looked, ageDays });
  }
  return due.sort((a, b) => Number(b.reasons.includes('season')) - Number(a.reasons.includes('season')) || b.ageDays - a.ageDays);
}

/** What the admin says about a due guide, plainly. */
export function describeDue(d: DueReview, season: string = SEASON): string {
  const parts: string[] = [];
  if (d.reasons.includes('season')) parts.push(`written for the ${d.season} rules; the current season is ${season}`);
  if (d.reasons.includes('age')) parts.push(`not looked at for ${d.ageDays} days`);
  return parts.join('; ');
}
