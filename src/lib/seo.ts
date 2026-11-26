
import { Metadata } from 'next';

// Detect if running in Firebase Studio (Cloud Workstations) or development
const isStudio = typeof process !== 'undefined' &&
  (!!process.env.GOOGLE_CLOUD_WORKSTATIONS || !!process.env.WEB_HOST);
const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

// Use localhost or Studio URL in dev/studio, production URL otherwise
const getBaseUrl = () => {
  if (isStudio && typeof process !== 'undefined' && process.env.WEB_HOST) {
    return `https://${process.env.WEB_HOST}`;
  }
  if (isDev) {
    return 'http://localhost:3000';
  }
  return 'https://hybridx.club';
};

export const SITE_CONFIG = {
  name: 'HybridX Hub',
  description: 'Expert Hyrox training plans and hybrid workout programs. Master Hyrox competitions with scientifically-backed training plans, books, and coaching app. Free fitness calculators.',
  url: getBaseUrl(),
  ogImage: '/og-default.png',
  // There is no X (Twitter) account to link: the handle used here was a placeholder
  // and sat in sameAs and in twitter:creator. Add one here once it exists.
  links: {
    instagram: 'https://instagram.com/hybridx.club',
  },
  /**
   * What the site is, in structured data. It names no sport: the organisation and
   * site entities are on every page, including the ATHX page, which is built never to
   * say HYROX.
   */
  entityDescription:
    'Training plans, calculators, books and a coaching app for hybrid athletes: people who train for running, strength and fitness races.',
  contactEmail: 'training@hybridx.club',
  logo: '/icon-logo.png',
};

/**
 * Spread into a page's own `openGraph` and `twitter` metadata. A page that declares
 * either replaces the root layout's whole object (the merge is shallow), which is
 * how 13 pages lost their social image and locale. Pages that call createMetadata()
 * do not need this.
 */
export const OG_DEFAULTS: { locale: string; images: { url: string; width: number; height: number; alt: string }[] } = {
  locale: 'en_GB',
  images: [{ url: SITE_CONFIG.ogImage, width: 1200, height: 630, alt: 'HybridX Hub: hybrid training plans, calculators and a coaching app' }],
};
export const TWITTER_DEFAULTS: { images: string[] } = { images: [SITE_CONFIG.ogImage] };

/** The organisation every page's structured data points back to. */
export const ORGANIZATION_ID = `${SITE_CONFIG.url}/#organization`;
export const WEBSITE_ID = `${SITE_CONFIG.url}/#website`;
/** Jon Lee, as one entity: the About page defines him, and every guide's `reviewedBy` points here. */
export const PERSON_ID = `${SITE_CONFIG.url}/about#jon-lee`;

export function createMetadata({
  title,
  description,
  image = SITE_CONFIG.ogImage,
  type = 'website',
  noIndex = false,
  path = '',
  keywords = [],
}: {
  /**
   * A string is the page's own title and gets " | HybridX Hub" added by the root
   * layout, so keep it to 46 characters or fewer. { absolute } is used as written,
   * for a title that already carries the brand or is too long for the template.
   */
  title: string | { absolute: string };
  description: string;
  /**
   * A path or URL for the social card. null leaves the card out of this
   * metadata so the page's own opengraph-image file (or the root default) is used:
   * naming /og-default.png here once hid every article's own card.
   */
  image?: string | null;
  type?: 'website' | 'article';
  noIndex?: boolean;
  path?: string;
  keywords?: string[];
}): Metadata {
  const url = `${SITE_CONFIG.url}${path}`;
  const imageUrl = image === null ? null : image.startsWith('http') ? image : `${SITE_CONFIG.url}${image}`;
  // The social title is the full title a reader would see, brand included.
  const socialTitle = typeof title === 'string' ? `${title} | ${SITE_CONFIG.name}` : title.absolute;

  return {
    title,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
    alternates: {
      canonical: url,
    },
    openGraph: {
      type,
      url,
      title: socialTitle,
      description,
      siteName: SITE_CONFIG.name,
      locale: 'en_GB',
      ...(imageUrl ? { images: [{ url: imageUrl, width: 1200, height: 630, alt: socialTitle }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

// Helper function to create FAQ schema
export function createFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// The organisation, as one entity other schemas can point at with its @id. The
// site covers HYROX, ATHX, running and hybrid training, and ships watch apps, so
// it is described by what it teaches, not by a single sport.
export function createOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_CONFIG.url}${SITE_CONFIG.logo}`,
      width: 593,
      height: 593,
    },
    description: SITE_CONFIG.entityDescription,
    sameAs: [SITE_CONFIG.links.instagram],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: SITE_CONFIG.contactEmail,
      url: `${SITE_CONFIG.url}/contact`,
      areaServed: 'GB',
      availableLanguage: 'en-GB',
    },
    knowsAbout: [
      'Hybrid athlete training',
      'Concurrent strength and endurance training',
      'Running training plans',
      'Strength training',
      'Functional fitness racing',
      'Compromised running',
      'Race pacing',
    ],
  };
}

/**
 * A person who stands behind the site's content. Only what is known is stated: a name, a role,
 * and a description or profiles when the owner has supplied them (src/lib/about.ts). Nothing here
 * is inferred, because an invented credential in structured data is worse than none.
 */
export function createPersonSchema({
  name,
  jobTitle,
  description,
  sameAs = [],
}: {
  name: string;
  jobTitle: string;
  description?: string | null;
  sameAs?: readonly string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
    name,
    jobTitle,
    url: `${SITE_CONFIG.url}/about`,
    worksFor: { '@id': ORGANIZATION_ID },
    ...(description ? { description } : {}),
    ...(sameAs.length > 0 ? { sameAs: [...sameAs] } : {}),
  };
}

// Helper function to create HowTo schema
export function createHowToSchema({
  name,
  description,
  steps,
  image,
}: {
  name: string;
  description: string;
  steps: { name: string; text: string }[];
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    image: image ? `${SITE_CONFIG.url}${image}` : undefined,
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

// Helper function to create Product schema
export function createProductSchema({
  name,
  description,
  image,
  price,
  currency = 'GBP',
  availability = 'InStock',
}: {
  name: string;
  description: string;
  image: string;
  price: string;
  currency?: string;
  availability?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: `${SITE_CONFIG.url}${image}`,
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
      url: SITE_CONFIG.url,
    },
  };
}

// Book schema — no price/rating fields since those live on Amazon and
// change independently of this site; fabricating them would be inaccurate
// structured data. Google reads title/author/url just fine without an Offer.
export function createBookSchema({
  name,
  description,
  image,
  url,
}: {
  name: string;
  description: string;
  image?: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name,
    description,
    ...(image ? { image } : {}),
    url,
    author: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    inLanguage: 'en-GB',
    about: 'Hyrox training',
  };
}

// Helper function to create BreadcrumbList schema
export function createBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_CONFIG.url}${item.url}`,
    })),
  };
}

// The WebSite entity, so "HybridX" and "HybridX Hub" resolve to this site. It has
// no SearchAction: Google retired the sitelinks search box in November 2024, and
// the target it named (/calculators?q=) did nothing.
export function createWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    description: SITE_CONFIG.entityDescription,
    inLanguage: 'en-GB',
    publisher: { '@id': ORGANIZATION_ID },
  };
}

// Course schema — used for the 12-week training plans
// Directly improves visibility when users ask AI "best Hyrox training plan"
export function createCourseSchema({
  name,
  description,
  url,
  level,
}: {
  name: string;
  description: string;
  url: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All levels';
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name,
    description,
    url: `${SITE_CONFIG.url}${url}`,
    provider: { '@id': ORGANIZATION_ID },
    educationalLevel: level,
    // About four hours a week for twelve weeks. Workload is an ISO 8601 duration:
    // the "PT4H/P1W" that stood here was a rate, which is not one.
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: 'PT48H',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'GBP',
      availability: 'https://schema.org/InStock',
      url: `${SITE_CONFIG.url}${url}`,
    },
    teaches: [
      'Hyrox race preparation',
      'Compromised running training',
      'Functional fitness station technique',
      'Hybrid training periodisation',
    ],
    about: [{ '@type': 'Thing', name: 'HYROX' }],
  };
}

// Article schema — for content-heavy pages; boosts E-E-A-T signals for AI engines
export function createArticleSchema({
  title,
  description,
  url,
  datePublished,
  dateModified,
  image,
  // Defaults to the site's original topic set. A caller on a page about a
  // *different* competition — ATHX, say — must override this: the default
  // would inject "Hyrox" into that page's structured data, which is exactly
  // the kind of unintended mention a page built to never say that name is
  // trying to avoid. JSON-LD is invisible on the rendered page, so a mismatch
  // here would not show up in a visual review — only in a validator or in
  // whatever an AI system extracts from the page's own markup.
  about = [
    { '@type': 'Thing', name: 'Hyrox' },
    { '@type': 'Thing', name: 'Hybrid Training' },
    { '@type': 'Thing', name: 'Fitness Training Plans' },
  ],
}: {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  /** The page's own social card, as a path or URL; the site default when omitted. */
  image?: string;
  about?: { '@type': string; name: string }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: `${SITE_CONFIG.url}${url}`,
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_CONFIG.url}${SITE_CONFIG.logo}`,
      },
    },
    image: image ? (image.startsWith('http') ? image : `${SITE_CONFIG.url}${image}`) : `${SITE_CONFIG.url}/og-default.png`,
    inLanguage: 'en-GB',
    about,
  };
}

// WebApplication schema — for interactive tools and calculators
// Signals to Google and AI engines that this is a free, usable web app
export function createWebApplicationSchema({
  name,
  description,
  url,
  keywords = [],
}: {
  name: string;
  description: string;
  url: string;
  keywords?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    description,
    url: `${SITE_CONFIG.url}${url}`,
    applicationCategory: 'SportsApplication',
    operatingSystem: 'All',
    browserRequirements: 'Requires JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'GBP',
    },
    provider: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    keywords: keywords.join(', '),
    inLanguage: 'en-GB',
    isAccessibleForFree: true,
  };
}

// SpeakableSpecification — marks content sections suitable for voice and AI read-aloud
// Used by Google Assistant, Gemini voice, and other AI answer engines
export function createSpeakableSchema(cssSelectors: string[], path = '/') {
  const url = `${SITE_CONFIG.url}${path === '/' ? '' : path}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    isPartOf: { '@id': WEBSITE_ID },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: cssSelectors,
    },
  };
}
