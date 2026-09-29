import type { Metadata } from 'next';
import HomePage, { homeMetadata } from '@/components/HomePage';

// The experiment's control arm: the homepage with no plan finder in front of
// it, and the tracker recording visits as variant "control". Served at "/" by
// a rewrite in middleware.ts, so it carries the homepage's own metadata and
// canonical; a direct visit to this path is redirected to "/".
export const metadata: Metadata = homeMetadata;

export default function HomeControl() {
  return <HomePage planFinder="control" variant="control" />;
}
