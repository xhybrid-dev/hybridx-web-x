import { MetadataRoute } from 'next';

// Robots.txt semantics: a crawler obeys ONLY the most specific user-agent
// group that matches it — a named group REPLACES the '*' group entirely for
// that bot. So every named group must carry the same disallow list, or the
// named bots are formally allowed into /admin and /api.
// /d/ is the shop's per-order download page: its URL is the buyer's key.
const DISALLOW = ['/api/', '/admin/', '/d/'];

// Bots we explicitly welcome (traditional search + AI answer engines).
// Being explicit is a positive signal to AI crawlers that they're wanted.
const WELCOMED_BOTS = [
  // Traditional search engines
  'Googlebot',
  'Bingbot',
  'Slurp', // Yahoo
  'DuckDuckBot',
  // OpenAI / ChatGPT: GPTBot trains models, OAI-SearchBot powers ChatGPT
  // search, ChatGPT-User is live browsing sessions
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  // Google AI (Gemini / AI Overviews)
  'Google-Extended',
  // Anthropic / Claude
  'ClaudeBot',
  'Claude-Web',
  // Perplexity
  'PerplexityBot',
  // Meta AI
  'FacebookBot',
  // Microsoft Copilot / Bing AI
  'bingbot',
  'MicrosoftBot',
  // You.com
  'YouBot',
  // Cohere
  'cohere-ai',
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://hybridx.club';

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      ...WELCOMED_BOTS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: DISALLOW,
      })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
