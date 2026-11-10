// src/lib/guides/related.ts
//
// Which articles to link from an article: its own pillar first, newest first,
// then the newest from elsewhere. Chosen when the page renders, so a new
// article starts appearing on older ones without either being rewritten.

import type { Guide } from './types';
import type { PillarId } from './topics';

export function relatedGuides(current: Pick<Guide, 'slug' | 'pillar'>, published: Guide[], limit = 3): Guide[] {
  const others = published
    .filter((g) => g.slug !== current.slug && g.status === 'published')
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
  const same = others.filter((g) => g.pillar === current.pillar);
  const rest = others.filter((g) => g.pillar !== current.pillar);
  return [...same, ...rest].slice(0, limit);
}

/** Published articles grouped by pillar, newest first within each. */
export function guidesByPillar(published: Guide[]): Map<PillarId, Guide[]> {
  const out = new Map<PillarId, Guide[]>();
  const sorted = [...published].sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
  for (const g of sorted) {
    if (g.status !== 'published') continue;
    out.set(g.pillar, [...(out.get(g.pillar) ?? []), g]);
  }
  return out;
}
