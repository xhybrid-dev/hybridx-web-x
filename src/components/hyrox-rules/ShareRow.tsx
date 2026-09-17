'use client';

import { useEffect, useState } from 'react';
import { Check, Link2, MessageCircle, Share2 } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

const SHARE_TEXT =
  'The 2026/27 HYROX rules make an incomplete station a disqualification, and set a published penalty scale for missed run laps. Interactive breakdown of every change:';

/**
 * Share row. Uses the native share sheet where the browser has one (most
 * phones, which is where this page gets read) and falls back to per-network
 * links on desktop.
 */
export default function ShareRow({ compact = false }: { compact?: boolean }) {
  const [url, setUrl] = useState('https://hybridx.club/hyrox-rule-changes-2026');
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setUrl(window.location.href.split('#')[0]);
    setCanNativeShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  const nativeShare = async () => {
    trackEvent('rules_share', { method: 'native' });
    try {
      await navigator.share({ title: 'The 2026/27 HYROX rule changes', text: SHARE_TEXT, url });
    } catch {
      /* dismissed */
    }
  };

  const copy = async () => {
    trackEvent('rules_share', { method: 'copy_link' });
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const encoded = encodeURIComponent(`${SHARE_TEXT} ${url}`);

  return (
    <div className={compact ? 'flex flex-wrap items-center gap-2' : 'flex flex-wrap items-center justify-center gap-2'}>
      {canNativeShare && (
        <button
          type="button"
          onClick={nativeShare}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 font-headline text-xs font-bold text-background transition-opacity hover:opacity-90"
        >
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" /> Share
        </button>
      )}
      <a
        href={`https://x.com/intent/tweet?text=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('rules_share', { method: 'x' })}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 font-headline text-xs font-bold text-foreground transition-colors hover:bg-muted"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
          <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.59l5.24 6.93zm-1.29 19.5h2.04L6.49 3.24H4.3z" />
        </svg>
        Post
      </a>
      <a
        href={`https://api.whatsapp.com/send?text=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('rules_share', { method: 'whatsapp' })}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 font-headline text-xs font-bold text-foreground transition-colors hover:bg-muted"
      >
        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> WhatsApp
      </a>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 font-headline text-xs font-bold text-foreground transition-colors hover:bg-muted"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Link copied
          </>
        ) : (
          <>
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Copy link
          </>
        )}
      </button>
    </div>
  );
}
