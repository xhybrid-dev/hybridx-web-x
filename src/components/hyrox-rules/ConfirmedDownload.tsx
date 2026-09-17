'use client';

import { useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

/**
 * The confirmed half of the double opt-in. `generate_lead` fires here rather
 * than on form submit, so the funnel metric counts confirmed subscribers
 * instead of anyone who typed an address into the box.
 */
export default function ConfirmedDownload({ downloadUrl }: { downloadUrl: string }) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    trackEvent('generate_lead', {
      placement: 'rules_2026_confirm',
      magnet: 'hyrox-race-day-card',
      currency: 'GBP',
      value: 0,
    });
  }, []);

  return (
    <a
      href={downloadUrl}
      onClick={() =>
        trackEvent('pdf_download_click', {
          placement: 'rules_2026_confirm',
          magnet: 'hyrox-race-day-card',
        })
      }
      className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-accent px-8 font-headline text-base font-extrabold text-black transition-opacity hover:opacity-90"
    >
      <Download className="h-5 w-5" aria-hidden="true" /> Download the card
    </a>
  );
}
