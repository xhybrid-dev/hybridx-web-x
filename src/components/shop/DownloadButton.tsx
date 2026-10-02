'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';

/**
 * Asks for a fresh five-minute link and follows it. The link itself is never
 * rendered, so there is nothing on the page worth copying.
 */
export default function DownloadButton({ token, product, label }: { token: string; product: string; label: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function download() {
    setPending(true);
    setError('');
    try {
      const res = await fetch('/api/shop/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, product }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || 'The download could not be prepared. Please try again in a minute.');
        return;
      }
      trackEvent('shop_download', { product });
      window.location.assign(data.url);
    } catch {
      setError('The download could not be prepared. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        size="lg"
        onClick={download}
        disabled={pending}
        className="font-headline text-base focus-visible:ring-foreground"
      >
        {pending ? 'Preparing…' : label}
      </Button>
      <div aria-live="polite">
        {error ? <p className="mt-2 text-sm font-medium text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
