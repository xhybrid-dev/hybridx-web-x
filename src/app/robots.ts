import { MetadataRoute } from 'next';

// Built once, with the site, and served as a static file from the CDN: nothing
// in it changes between deploys, so no request ever wakes the server for it.
export const dynamic = 'force-static';

// Robots.txt semantics: a crawler obeys ONLY the most specific user-agent
// group that matches it, and a named group REPLACES the '*' group for that
// bot. So '*' and every named bot share ONE group here (stacked User-agent
// lines), and therefore one disallow list: a named bot can never be formally
// allowed into /admin or /api by a group that forgot them.
//
// /d/ (the shop's per-order download page, whose URL is the buyer's key) is
// deliberately NOT disallowed. Disallow stops a crawler reading the page, so a
// leaked /d/<token> link could still be listed in results as a bare URL, token
// and all. Left crawlable, a bot that finds one reads its noindex (the page's
// metadata, and X-Robots-Tag from middleware.ts) and drops it.
const DISALLOW = ['/api/', '/admin/'];

// Bots we explicitly welcome: traditional search and AI answer engines.
// Matching is case-insensitive (RFC 9309), so each appears once.
const WELCOMED_BOTS = [
  // Traditional search engines
  'Googlebot',
  'Bingbot',
  'Slurp', // Yahoo
  'DuckDuckBot',
  'Applebot',
  // OpenAI: GPTBot trains models, OAI-SearchBot powers ChatGPT search,
  // ChatGPT-User is live browsing
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  // Google AI (Gemini, AI Overviews) and Apple Intelligence: control tokens
  'Google-Extended',
  'Applebot-Extended',
  // Anthropic
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  // Perplexity: the index, and live user-triggered citations
  'PerplexityBot',
  'Perplexity-User',
  // Meta AI
  'FacebookBot',
  'meta-externalagent',
  // Microsoft
  'MicrosoftBot',
  // You.com and Cohere
  'YouBot',
  'cohere-ai',
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://hybridx.club';
  return {
    rules: [{ userAgent: ['*', ...WELCOMED_BOTS], allow: '/', disallow: DISALLOW }],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
