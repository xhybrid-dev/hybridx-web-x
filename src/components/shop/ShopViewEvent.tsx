'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

/** Records shop_view once per page load. Renders nothing. */
export default function ShopViewEvent({ event }: { event: string }) {
  useEffect(() => {
    trackEvent('shop_view', { shop_event: event });
  }, [event]);
  return null;
}
