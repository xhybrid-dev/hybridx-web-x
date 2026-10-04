
import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { SHOP_EVENTS } from '@/lib/shop/config';
import { salesState } from '@/lib/shop/env';

/*
 * The sitemap Google Search Console reads at https://hybridx.club/sitemap.xml
 * (robots.ts points at it).
 *
 * What belongs here: every page meant to appear in search, once, on the host it
 * canonicalises to. What does not: noindex pages (/start, the confirm pages, the
 * shop's thanks, sample and resend pages, /d/<token>, /admin), per-order pages,
 * and /home-control, which redirects to "/".
 *
 * /race, /streak and /trail are also absent, on purpose. Each declares its own
 * subdomain as its canonical (race., streak. and trail.hybridx.club), so listing
 * the hybridx.club copy would tell Google two things at once. The subdomains are
 * separate sites to Google, so they get their own sitemap below: the same
 * /sitemap.xml route, answered with that subdomain's address when it is the one
 * asked. src/lib/__tests__/sitemap.test.ts fails if a new page is neither listed
 * nor deliberately left out.
 */

/** Subdomain label to the address its page declares as canonical. */
const APP_SUBDOMAINS: Record<string, string> = {
  race: 'https://race.hybridx.club',
  streak: 'https://streak.hybridx.club',
  trail: 'https://trail.hybridx.club',
};

async function requestedHost(): Promise<string> {
  try {
    const h = await headers();
    // App Hosting sits behind a proxy, so the host the visitor used is forwarded.
    const raw = h.get('x-forwarded-host') ?? h.get('host') ?? '';
    return raw.split(',')[0].trim().toLowerCase();
  } catch {
    return '';
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = await requestedHost();
  const label = host.split('.')[0];
  if (host.includes('.') && Object.hasOwn(APP_SUBDOMAINS, label)) {
    return [
      { url: APP_SUBDOMAINS[label], lastModified: new Date(), changeFrequency: 'monthly', priority: 1.0 },
    ];
  }

  const baseUrl = 'https://hybridx.club';

  // Define all static routes
  const routes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/calculators`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/calculators/running`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/calculators/strength`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/calculators/general-health`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/calculators/body-fat-calculator`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/calculators/calorie-macronutrient-calculator`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/calculators/heart-rate-zone-calculator`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/calculators/one-rep-max-calculator`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/calculators/percentage-based-weight-calculator`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/calculators/powerlifting-score-calculator`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/calculators/pace-calculator`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/calculators/race-time-predictor`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/calculators/split-time-calculator`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/calculators/garmin-tcx-generator`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/free-hyrox-plan`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/build-a-bigger-engine`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/app`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/12-week-hyrox`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/store`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/books`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/vdot`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/12-week-running-hyrox`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    // ── AI-answerable guide pages ─────────────────────────────────────────
    {
      url: `${baseUrl}/how-to-train-for-hyrox`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.95,
    },
    {
      url: `${baseUrl}/hyrox-training-plan`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.95,
    },
    {
      url: `${baseUrl}/hybrid-training-program`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/hyrox-rule-changes-2026`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.95,
    },
    {
      // The ATHX 2027 pre-launch funnel. Its /confirm page is deliberately
      // absent: it is a per-address utility page and carries noindex.
      url: `${baseUrl}/athx-2027`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/shop-terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
  ];

  // Shop pages, while their sales are open. Thanks and download pages are
  // per-order and never listed.
  for (const event of SHOP_EVENTS) {
    if (salesState(event) !== 'open') continue;
    routes.push({
      url: `${baseUrl}${event.path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    });
  }

  return routes;
}
