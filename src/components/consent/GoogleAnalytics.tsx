'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { useConsent } from '@/lib/consent';

const GA_ID = 'G-XKH1WYE7CQ';

/**
 * Google Analytics, loaded only after the visitor accepts analytics in the
 * consent banner. Until then gtag is absent and `trackEvent` quietly does
 * nothing, which every caller already handles.
 *
 * Withdrawing consent cannot unload a script that has already run, so it sets
 * Google's documented per-property opt-out flag, which stops further hits from
 * this page, and removes the `_ga` cookies. The next page does not load GA.
 */
export default function GoogleAnalytics() {
  const consent = useConsent();

  useEffect(() => {
    if (consent === 'unknown') return;
    const w = window as unknown as Record<string, unknown>;
    w[`ga-disable-${GA_ID}`] = consent !== 'granted';
    if (consent === 'denied') clearGaCookies();
  }, [consent]);

  if (consent !== 'granted') return null;

  return (
    <>
      <Script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            linker: { domains: ['hybridx.club', 'app.hybridx.club'] }
          });
        `}
      </Script>
    </>
  );
}

/** GA sets `_ga` and `_ga_<id>` on the registrable domain; clear both scopes. */
function clearGaCookies() {
  const names = document.cookie
    .split(';')
    .map((c) => c.split('=')[0].trim())
    .filter((n) => n === '_ga' || n.startsWith('_ga_') || n === '_gid');
  if (!names.length) return;
  const host = window.location.hostname;
  const parts = host.split('.');
  const domains = ['', host, parts.length > 2 ? '.' + parts.slice(-2).join('.') : '.' + host];
  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`;
    }
  }
}
