import type { Metadata } from 'next';
import HomePage, { homeMetadata } from '@/components/HomePage';
import { planFinderMode } from '@/lib/plan-finder/launch';

export const metadata: Metadata = homeMetadata;

// PLAN_FINDER_MODE is read when the site is built (apphosting.yaml): 'off'
// shows the homepage alone, 'on' puts the plan finder in front of it for
// everyone, and 'experiment' does so for half of visitors (arm A), while
// middleware.ts sends the other half to the control arm.
export default function Home() {
  const mode = planFinderMode();
  return <HomePage planFinder={mode === 'off' ? 'none' : 'entry'} variant={mode === 'experiment' ? 'A' : null} />;
}
