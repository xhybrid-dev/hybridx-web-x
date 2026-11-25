import type { Metadata } from 'next';

import { OG_DEFAULTS, TWITTER_DEFAULTS } from '@/lib/seo';
// The page itself is a client component, so its metadata lives here.
export const metadata: Metadata = {
  alternates: { canonical: '/12-week-running-hyrox' },
  title: 'Free 12-Week Running Plan for HYROX',
  description:
    'A free interactive 12-week running plan for HYROX: threshold sessions, intervals, long runs and compromised running, week by week, with a pace calculator.',
  keywords: [
    'hyrox running plan',
    'running plan for hyrox',
    '12 week running plan',
    'compromised running plan',
    'hybrid running plan',
    'faster running for hyrox',
  ],
  openGraph: {
    ...OG_DEFAULTS,
    title: 'Free 12-Week Running Plan for Hyrox',
    description:
      'Interactive week-by-week running plan for Hyrox athletes — threshold, intervals, long runs, and compromised running. Free, no sign-up.',
    type: 'website',
    url: '/12-week-running-hyrox',
  },
  twitter: {
    ...TWITTER_DEFAULTS,
    card: 'summary_large_image',
    title: 'Free 12-Week Running Plan for Hyrox',
    description:
      'Interactive week-by-week running plan for Hyrox athletes — free, no sign-up.',
  },
};

export default function TwelveWeekRunningHyroxLayout({ children }: { children: React.ReactNode }) {
  return children;
}
