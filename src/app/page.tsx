import type { Metadata } from 'next';
import HomePage, { homeMetadata } from '@/components/HomePage';
import { planFinderMode } from '@/lib/plan-finder/launch';

export const metadata: Metadata = homeMetadata;

// PLAN_FINDER_MODE is read when the site is built (apphosting.yaml): 'off'
// shows the homepage alone, 'on' puts the plan finder in front of it for
// everyone.
export default function Home() {
  return <HomePage planFinder={planFinderMode() === 'off' ? 'none' : 'entry'} variant={null} />;
}
