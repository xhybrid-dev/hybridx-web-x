'use client';

import Script from 'next/script';
import Link from 'next/link';
import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

// The Ecwid store ID.
const ECWID_STORE_ID = '112581013';

// Extracted from the embed code Ecwid generated.
const ecwidConfigArgs = [
  'categoriesPerRow=3',
  'views=grid(20,3) list(60) table(60)',
  'categoryView=grid',
  'searchView=list',
  `id=my-store-${ECWID_STORE_ID}`,
];

// The store is Ecwid's, and loading it sends the visitor's address to Ecwid and
// sets its cookies. The consent banner covers our own analytics and nothing
// here, so the store waits for a click: it never loads on arrival, and it
// never loads for someone who chose Reject and went on to the page for
// something else. The page around it carries the products' names in plain text
// so it still reads without the script.
export default function EcwidStore() {
  const [requested, setRequested] = useState(false);

  const initializeEcwid = () => {
    if (typeof window.xProductBrowser === 'function') {
      window.xProductBrowser(...ecwidConfigArgs);
    }
  };

  if (!requested) {
    return (
      <div className="min-h-[320px] rounded-xl border border-dashed border-border bg-secondary/30 p-8 text-center">
        <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-accent-ink" aria-hidden="true" />
        <h2 className="font-headline text-xl font-bold text-primary">Open the store</h2>
        <p className="mx-auto mt-2 max-w-xl font-body text-sm text-muted-foreground">
          Our shelves are run by Ecwid, an online store service from Lightspeed. Opening them loads Ecwid&apos;s
          scripts, which share your IP address with Ecwid and set its cookies so your basket and checkout work. Nothing
          loads until you choose to. See our{' '}
          <Link href="/privacy-policy#store" className="underline underline-offset-4 hover:text-primary">
            privacy policy
          </Link>
          .
        </p>
        <Button
          type="button"
          onClick={() => setRequested(true)}
          className="mt-6 bg-accent font-headline text-accent-foreground hover:bg-accent/90"
        >
          Load the store
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[720px]">
      <div id={`my-store-${ECWID_STORE_ID}`}>
        <p className="font-body text-sm text-muted-foreground" role="status">
          Loading the store…
        </p>
      </div>
      <Script
        data-cfasync="false"
        type="text/javascript"
        src={`https://app.ecwid.com/script.js?${ECWID_STORE_ID}&data_platform=code&data_date=2025-07-01`}
        charSet="utf-8"
        strategy="afterInteractive"
        onLoad={initializeEcwid}
        onReady={initializeEcwid}
      />
      <noscript>The store needs JavaScript. Email training@hybridx.club and we will help you order.</noscript>
    </div>
  );
}

// Add types for Ecwid global objects to satisfy TypeScript
declare global {
  interface Window {
    xProductBrowser: (...args: string[]) => void;
    Ecwid: {
      OnAPILoaded: {
        add: (callback: () => void) => void;
      };
    };
  }
}
