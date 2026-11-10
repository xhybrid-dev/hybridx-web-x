// src/lib/guides/schema.ts
//
// An article's JSON-LD: the Article (by HybridX), its breadcrumb, and the page,
// which names Jon Lee as reviewer. `reviewedBy` belongs to WebPage in
// schema.org, not to Article, which is why there are three objects.
//
// FAQ JSON-LD is deliberately absent. Google has shown FAQ rich results only
// for government and health sites since August 2023, and the questions are on
// the page for readers either way.

import { ARTICLE_REVIEWER } from '@/lib/facts';
import { createArticleSchema, createBreadcrumbSchema, SITE_CONFIG } from '@/lib/seo';
import { pillar as pillarOf, type PillarId } from './topics';
import type { Guide } from './types';

/**
 * What an article is about, per pillar. Set explicitly: createArticleSchema's
 * default says "Hyrox", which would be wrong on an ATHX article.
 */
const ABOUT: Record<PillarId, string[]> = {
  hyrox: ['Hyrox', 'Hybrid Training'],
  'running-lifting': ['Hybrid Training', 'Concurrent Training'],
  'starting-out': ['Hyrox', 'Hybrid Training'],
  athx: ['ATHX', 'Hybrid Training'],
  tools: ['Fitness Calculators', 'Hybrid Training'],
};

export function guidePath(slug: string): string {
  return `/guides/${slug}`;
}

export function guideJsonLd(guide: Guide): object[] {
  const url = guidePath(guide.slug);
  const published = guide.publishedAt ?? guide.updatedAt;
  const pillar = pillarOf(guide.pillar);
  return [
    createArticleSchema({
      title: guide.title,
      description: guide.description,
      url,
      datePublished: published,
      dateModified: guide.updatedAt,
      about: ABOUT[guide.pillar].map((name) => ({ '@type': 'Thing', name })),
    }),
    createBreadcrumbSchema([
      { name: 'Home', url: '' },
      { name: 'Guides', url: '/guides' },
      { name: pillar.name, url: pillar.page },
      { name: guide.title, url },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      url: `${SITE_CONFIG.url}${url}`,
      name: guide.title,
      lastReviewed: guide.updatedAt.slice(0, 10),
      reviewedBy: {
        '@type': ARTICLE_REVIEWER.type,
        name: ARTICLE_REVIEWER.name,
        jobTitle: 'Trainer',
        worksFor: { '@type': 'Organization', name: SITE_CONFIG.name, url: SITE_CONFIG.url },
      },
    },
  ];
}

/**
 * JSON for a <script type="application/ld+json">, with "<" escaped so text in
 * an article can never close the script element.
 */
export function jsonLdString(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
