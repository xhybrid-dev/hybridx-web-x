'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

// Shown when something on a page throws while it renders or runs. The page
// around it (header, footer) is still there, so the visitor can leave.
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // The digest matches the server's log line; the message itself is not shown.
    console.error('[page error]', error.digest ?? error.name);
  }, [error]);

  return (
    <main id="main-content" className="container mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="font-headline text-3xl font-bold text-primary md:text-4xl">Something went wrong</h1>
      <p className="mt-4 font-body text-lg text-muted-foreground">
        That page hit a problem. Try again, or carry on from the homepage. If it keeps happening, tell us at{' '}
        <a href="mailto:training@hybridx.club" className="font-semibold text-foreground underline underline-offset-4">
          training@hybridx.club
        </a>
        {error.digest ? ` and quote ${error.digest}` : ''}.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset} className="bg-accent font-headline text-accent-foreground hover:bg-accent/90">
          Try again
        </Button>
        <Button variant="outline" asChild className="font-headline">
          <Link href="/">Homepage</Link>
        </Button>
      </div>
    </main>
  );
}
