
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
  links: {
    twitter: 'https://twitter.com/hybridxhub', // Update with your Twitter
    instagram: 'https://instagram.com/hybridx.club', // Update with your Instagram
  },
};

export function createMetadata({
  title,
  description,
  image = SITE_CONFIG.ogImage,
  type = 'website',
  noIndex = false,
  path = '',
  keywords = [],
}: {
  title: string;
  description: string;
  image?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
  path?: string;
  keywords?: string[];
}): Metadata {
  const url = `${SITE_CONFIG.url}${path}`;
  const imageUrl = image.startsWith('http') ? image : `${SITE_CONFIG.url}${image}`;

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
      title,
      description,
      siteName: SITE_CONFIG.name,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
      creator: '@hybridxhub', // Update with your Twitter handle
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

// Helper function to create Organization schema
export function createOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    logo: `${SITE_CONFIG.url}/Icon Logo.png`,
    description: SITE_CONFIG.description,
    sameAs: [
      SITE_CONFIG.links.twitter,
      SITE_CONFIG.links.instagram,
    ],
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
  image: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name,
    description,
    image,
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

// WebSite schema with SearchAction — signals site identity and enables sitelinks search
// Improves AI engine entity recognition for "HybridX" and "HybridX Hub" queries
export function createWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    description: SITE_CONFIG.description,
    inLanguage: 'en-GB',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_CONFIG.url}/calculators?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

// SportsOrganization schema — more specific than plain Organization for fitness/Hyrox niche
// AI systems use this to understand domain authority and topic relevance
export function createSportsOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsOrganization',
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    logo: `${SITE_CONFIG.url}/Icon Logo.png`,
    description:
      'HybridX Hub provides expert Hyrox training plans, hybrid athlete coaching, fitness books, and a coaching app for athletes preparing for Hyrox competitions and hybrid fitness goals.',
    sport: 'Hyrox',
    sameAs: [
      SITE_CONFIG.links.twitter,
      SITE_CONFIG.links.instagram,
      'https://app.hybridx.club',
    ],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'GB',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: SITE_CONFIG.url,
    },
    knowsAbout: [
      'Hyrox training',
      'Hyrox race preparation',
      'Hybrid athlete training',
      'Concurrent strength and endurance training',
      'Compromised running',
      'Functional fitness',
      'Running training plans',
      'Strength training',
      'Sports nutrition for endurance athletes',
    ],
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
    provider: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    educationalLevel: level,
    courseWorkload: 'PT4H/P1W', // ~4 hours/week over the programme
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: 'PT4H/P1W',
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
    sport: 'Hyrox',
  };
}

// Article schema — for content-heavy pages; boosts E-E-A-T signals for AI engines
export function createArticleSchema({
  title,
  description,
  url,
  datePublished,
  dateModified,
}: {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
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
        url: `${SITE_CONFIG.url}/Icon Logo.png`,
      },
    },
    image: `${SITE_CONFIG.url}/og-default.png`,
    inLanguage: 'en-GB',
    about: [
      { '@type': 'Thing', name: 'Hyrox' },
      { '@type': 'Thing', name: 'Hybrid Training' },
      { '@type': 'Thing', name: 'Fitness Training Plans' },
    ],
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
export function createSpeakableSchema(cssSelectors: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: cssSelectors,
    },
    url: SITE_CONFIG.url,
  };
}
