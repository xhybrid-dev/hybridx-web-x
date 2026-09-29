'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { setConsent, subscribeConsentOpen, useConsent } from '@/lib/consent';

/**
 * The analytics consent banner, on every page. It asks once, and nothing that
 * it covers runs until the visitor accepts: Google Analytics and the plan
 * finder's anonymous statistics. Accept and Reject are the same size and
 * style, so neither is the easy option.
 *
 * Rendered only in the browser (the stored choice is unknown on the server),
 * and fixed to the bottom of the screen, so it never moves the page.
 */
export default function ConsentBanner() {
  const consent = useConsent();
  const [reopened, setReopened] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const firstButton = useRef<HTMLButtonElement>(null);

  useEffect(
    () =>
      subscribeConsentOpen(() => {
        returnFocus.current = document.activeElement as HTMLElement | null;
        setReopened(true);
      }),
    [],
  );

  useEffect(() => {
    if (reopened) firstButton.current?.focus();
  }, [reopened]);

  if (consent === 'unknown') return null;
  if (consent !== 'unset' && !reopened) return null;

  const choose = (granted: boolean) => {
    setConsent(granted);
    setReopened(false);
    returnFocus.current?.focus?.();
    returnFocus.current = null;
  };

  const button =
    'inline-flex min-h-11 items-center justify-center rounded-lg border border-white bg-black px-5 font-headline text-base font-bold text-white transition-colors hover:border-[#FADB5C] hover:bg-[#FADB5C] hover:text-black focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#FADB5C]';

  return (
    <section
      aria-labelledby="consent-title"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-[#333333] bg-black text-white"
      data-consent-banner
    >
      <div className="container mx-auto flex max-w-screen-2xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:gap-8">
        <div className="flex-1 font-body">
          <h2 id="consent-title" className="font-headline text-base font-bold">
            Can we measure how the site is used?
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[#B3B3B3]">
            We would like to use Google Analytics and our own anonymous plan finder statistics to see how people use
            this site, so we can improve it. Neither runs unless you accept. You can change your choice at any time on
            our{' '}
            <Link href="/privacy-policy" className="text-white underline underline-offset-2">
              privacy policy
            </Link>{' '}
            page.
            {reopened && consent !== 'unset' && (
              <span className="mt-1 block text-white">
                Your current choice: {consent === 'granted' ? 'accepted' : 'rejected'}.
              </span>
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:flex md:shrink-0">
          <button ref={firstButton} type="button" className={button} onClick={() => choose(false)}>
            Reject
          </button>
          <button type="button" className={button} onClick={() => choose(true)}>
            Accept
          </button>
        </div>
      </div>
    </section>
  );
}
