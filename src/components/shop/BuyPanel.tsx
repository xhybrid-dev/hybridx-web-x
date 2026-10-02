'use client';

import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';

export interface BuyOption {
  key: string;
  label: string;
  price: string;
}

interface BuyPanelProps {
  options: BuyOption[];
  consentText: string;
  state: 'not-open' | 'open' | 'closed';
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'] as const;

/**
 * The consent box and the buy buttons.
 *
 * The buttons stay disabled until the box is ticked, and the server refuses a
 * checkout without `consent: true` regardless, so a script that skips the
 * page gets nowhere either. The box starts unticked on every visit.
 */
export default function BuyPanel({ options, consentText, state }: BuyPanelProps) {
  const consentId = useId();
  const hintId = useId();
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [utm, setUtm] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next: Record<string, string> = {};
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) next[key] = value;
    }
    setUtm(next);
  }, []);

  if (state !== 'open') {
    return (
      <div className="rounded-lg border border-border bg-card p-6" role="status">
        <p className="font-headline text-lg font-bold">
          {state === 'closed' ? 'Sales for this event have closed' : 'Sales have not opened yet'}
        </p>
        <p className="mt-2 text-muted-foreground">
          {state === 'closed'
            ? 'If you bought the files, your download page keeps working. Lost the link? Request a new one below.'
            : 'The PDFs will be on sale here soon.'}
        </p>
      </div>
    );
  }

  async function buy(option: BuyOption) {
    if (!consent || pending) return;
    setError('');
    setPending(option.key);
    trackEvent('shop_buy_click', { product: option.key });
    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: option.key, consent: true, website: honeypot, ...utm }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || 'Checkout could not be started. Please try again in a minute.');
        setPending(null);
        return;
      }
      trackEvent('shop_checkout_created', { product: option.key });
      window.location.assign(data.url);
    } catch {
      setError('Checkout could not be started. Check your connection and try again.');
      setPending(null);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
      {/* Honeypot: off-screen and hidden from assistive technology. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>
      </div>

      <div className="flex items-start gap-3">
        <input
          id={consentId}
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          aria-describedby={hintId}
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground dark:accent-[#FADB5C]"
        />
        <label htmlFor={consentId} className="cursor-pointer text-base leading-relaxed">
          {consentText}
        </label>
      </div>
      <p id={hintId} className="mt-2 pl-8 text-sm text-muted-foreground">
        {consent ? 'You can now choose a product.' : 'Tick the box to enable the buttons.'}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {options.map((option) => (
          <Button
            key={option.key}
            type="button"
            size="lg"
            disabled={!consent || pending !== null}
            onClick={() => buy(option)}
            className="h-auto min-h-12 whitespace-normal px-4 py-3 text-center font-headline text-base focus-visible:ring-foreground"
          >
            {pending === option.key ? 'Opening checkout…' : `Buy the ${option.label}, ${option.price}`}
          </Button>
        ))}
      </div>

      <div aria-live="polite" className="min-h-6">
        {error ? <p className="mt-3 text-sm font-medium text-destructive">{error}</p> : null}
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        Payment is by card, through Stripe. Your download page opens as soon as the payment goes through, and the
        link is emailed to you.
      </p>
    </div>
  );
}
