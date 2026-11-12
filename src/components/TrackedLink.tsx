'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { forwardRef, useEffect, useState } from 'react';
import type { ComponentPropsWithRef } from 'react';
import { trackEvent } from '@/lib/analytics';
import { isAppHref, srcForPage, withSrc } from '@/lib/app-links';

interface TrackedLinkProps extends ComponentPropsWithRef<typeof Link> {
  /** Omit to render a plain, untracked link (useful in shared/looped markup). */
  event?: string;
  eventParams?: Record<string, unknown>;
}

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

/**
 * Appends the visitor's current UTM params onto an absolute (cross-domain)
 * URL — e.g. a CTA into app.hybridx.club — so trial signups on the app can
 * be attributed back to the marketing page/campaign that drove them.
 */
function withForwardedUtms(href: string): string {
  const current = new URLSearchParams(window.location.search);
  if (!UTM_PARAMS.some((key) => current.has(key))) return href;
  const url = new URL(href);
  for (const key of UTM_PARAMS) {
    const value = current.get(key);
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return url.toString();
}

/**
 * A link into the app also carries a `src`: the article that brought the
 * visitor to this page, or this page itself (src/lib/app-links.ts). That is
 * how an app sign-up is credited to an article on /admin/guides/performance.
 */
function resolveHref(href: string): string {
  const forwarded = withForwardedUtms(href);
  return isAppHref(href)
    ? withSrc(forwarded, srcForPage(window.location.search, window.location.pathname))
    : forwarded;
}

/**
 * Drop-in replacement for next/link that fires a GA4 event on click, and —
 * for absolute (cross-domain) hrefs — forwards UTM params so attribution
 * survives the jump to the app, plus a src on links into the app.
 *
 * The forwarded href is only computed client-side after mount (not during
 * the initial render) so it matches server output and avoids a hydration
 * mismatch on the `href` attribute. It is worked out again when the path
 * changes, because a link in the header outlives the page it was rendered on,
 * and again on click, for a query string that changed without one.
 */
const TrackedLink = forwardRef<HTMLAnchorElement, TrackedLinkProps>(
  ({ event, eventParams, onClick, href, ...props }, ref) => {
    const isAbsolute = typeof href === 'string' && /^https?:\/\//.test(href);
    const [resolvedHref, setResolvedHref] = useState(href);
    const pathname = usePathname();

    useEffect(() => {
      if (isAbsolute) setResolvedHref(resolveHref(href as string));
    }, [href, isAbsolute, pathname]);

    return (
      <Link
        {...props}
        href={resolvedHref}
        ref={ref}
        onClick={(e) => {
          if (isAbsolute) e.currentTarget.href = resolveHref(href as string);
          if (event) trackEvent(event, eventParams);
          onClick?.(e);
        }}
      />
    );
  }
);
TrackedLink.displayName = 'TrackedLink';

export default TrackedLink;
