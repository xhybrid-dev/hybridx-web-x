'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

/**
 * Sends `guide_engaged` once, when the reader has scrolled past half of the
 * article body. GA4 only, so only for visitors who accepted analytics:
 * trackEvent does nothing until then (src/lib/analytics.ts).
 */
export default function GuideEngagement({ slug, targetId }: { slug: string; targetId: string }) {
  useEffect(() => {
    let sent = false;
    const onScroll = () => {
      const body = document.getElementById(targetId);
      if (sent || !body) return;
      const rect = body.getBoundingClientRect();
      const seen = window.innerHeight - rect.top;
      if (seen >= rect.height / 2) {
        sent = true;
        trackEvent('guide_engaged', { guide: slug });
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [slug, targetId]);
  return null;
}
