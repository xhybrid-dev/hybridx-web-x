import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import ConsentBanner from '@/components/consent/ConsentBanner';
import SkipLink from '@/components/SkipLink';
import GoogleAnalytics from '@/components/consent/GoogleAnalytics';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { inter, spaceGrotesk } from '@/lib/fonts';
import { SITE_CONFIG, createOrganizationSchema, createWebSiteSchema } from '@/lib/seo';

import JsonLd from '@/components/JsonLd';
export const viewport: Viewport = {
  // The browser's address bar colour follows the theme the visitor is using.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: 'HybridX: Hyrox Training Plans, Workouts & Coaching App',
    template: '%s | HybridX Hub',
  },
  description: 'Expert Hyrox training plans and hybrid workout programs. Master Hyrox competitions with scientifically-backed training, books, and coaching. Free fitness calculators.',
  keywords: [
    'hyrox',
    'hyrox training',
    'hyrox workout',
    'what is hyrox',
    'hyrox competition',
    'hyrox training plan',
    'hybrid training',
    'hyrox race',
    'hyrox preparation',
    'running calculators',
    'strength calculators',
    'fitness calculators',
    'training plans',
    'hybrid athlete',
    'functional fitness',
  ],
  authors: [{ name: 'HybridX Hub', url: 'https://hybridx.club' }],
  creator: 'HybridX Hub',
  publisher: 'HybridX Hub',
  // No `robots` here. Next.js adds its own noindex to a 404 page, and a default
  // "index, follow" from this layout sat beside it, so a 404 carried two
  // conflicting robots tags. Crawling and indexing are the default; pages that
  // want the max-snippet directives get them from createMetadata().
  // Icons come from the files in this folder (favicon.ico, icon.png, apple-icon.png):
  // Next.js links them itself, and a second declaration here would compete with them.
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    siteName: SITE_CONFIG.name,
    title: 'HybridX: Hyrox Training Plans, Workouts & Coaching App',
    description: 'Expert Hyrox training plans and hybrid workout programs. Master Hyrox competitions with scientifically-backed training, books, and coaching.',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'HybridX Hub - Hybrid Training',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HybridX: Hyrox Training Plans, Workouts & Coaching App',
    description: 'Expert Hyrox training plans and hybrid workout programs. Master Hyrox competitions with scientifically-backed training, books, and coaching.',
    images: ['/og-default.png'],
  },
  // NOTE: deliberately no `alternates.canonical` here — Next.js merges layout
  // metadata into every page, so a canonical set at this level tells crawlers
  // that every page without its own canonical is a duplicate of the homepage.
  // Each page declares its own self-referencing canonical instead.
  verification: {
    google: 'pqqqhsjCj9Bk1lngrIUZozN4Gg187vaRgwfVHXcNUPg', // Add your Google Search Console verification code
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = createOrganizationSchema();
  const webSiteSchema = createWebSiteSchema();

  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        {/* Feed discovery. Declared here rather than in metadata.alternates, which a page's own
            alternates (its canonical) would replace. */}
        <link rel="alternate" type="application/rss+xml" title="HybridX Guides" href="/guides/feed.xml" />
        {/* The organisation and the site, as entities other schemas point at by @id */}
        <JsonLd data={[organizationSchema, webSiteSchema]} />
      </head>
      <body className="font-body antialiased">
        <SkipLink />
        {/* Next in the page so keyboard and screen reader users meet it early;
            fixed to the bottom of the screen, so it never moves the layout. */}
        <ConsentBanner />
        <GoogleAnalytics />
        <ThemeProvider
          defaultTheme="light"
          storageKey="hybridx-ui-theme"
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
