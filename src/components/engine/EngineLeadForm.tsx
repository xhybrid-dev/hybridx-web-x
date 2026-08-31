'use client';

import React, { useActionState, useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Download, Loader2 } from 'lucide-react';
import { useMagnetCapture } from '@/hooks/use-magnet-capture';
import { ENGINE_MAGNET } from '@/lib/engine-magnet';
import Heartbeat from './Heartbeat';
import { trackEvent } from '@/lib/analytics';

type Variant = 'dark' | 'light' | 'band';

interface EngineLeadFormProps {
  variant?: Variant;
  /** Stable id used to label the email field and scroll targets. */
  formId: string;
  /** Where this form sits, for analytics (e.g. "hero", "mid", "final"). */
  placement: string;
  className?: string;
}

export default function EngineLeadForm({
  variant = 'dark',
  formId,
  placement,
  className = '',
}: EngineLeadFormProps) {
  const capture = useMagnetCapture(ENGINE_MAGNET.slug, placement);
  const formRef = useRef<HTMLFormElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const viewedRef = useRef(false);

  // Fire view_lead_form when the form first scrolls into view.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !viewedRef.current) {
            viewedRef.current = true;
            trackEvent('view_lead_form', { placement, magnet: ENGINE_MAGNET.slug });
            obs.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [placement]);

  // ---- Success state ----------------------------------------------------
  if (capture.succeeded) {
    const dark = variant !== 'light';
    return (
      <div
        ref={sectionRef}
        data-engine-form
        className={`rounded-2xl p-8 text-center ${
          dark
            ? 'bg-white/5 border border-[#7A2530] text-engine-paper'
            : 'bg-engine-blush border-t-4 border-engine-crimson text-engine-ink'
        } ${className}`}
        role="status"
        aria-live="polite"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-engine-crimson/15">
          <CheckCircle2 className="h-8 w-8 text-engine-heart" />
        </div>
        <h3 className="font-anton text-2xl uppercase tracking-wide mb-2">Check your inbox</h3>
        <p className={`font-body text-base mb-1 ${dark ? 'text-engine-paper/80' : 'text-engine-inkSoft'}`}>
          Your guide is on its way. It should land in under a minute.
        </p>
        <p className={`font-body text-sm mb-6 ${dark ? 'text-engine-paper/60' : 'text-engine-mutedrose'}`}>
          No email? Check your spam or promotions tab, then grab it directly below.
        </p>

        {capture.assetUrl && (
          <a
            href={capture.assetUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('pdf_download_click', { placement })}
            className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-engine-crimson px-7 py-3.5 font-archivo font-extrabold uppercase tracking-wide text-engine-paper shadow-lg transition-colors duration-150 hover:bg-engine-crimsonD focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-engine-heart"
          >
            <Download className="h-5 w-5" /> Download the guide
          </a>
        )}

        <div className="mt-6">
          <a
            href="/app"
            onClick={() => trackEvent('cta_app_click', { placement })}
            className={`inline-flex items-center gap-1.5 font-archivo font-bold text-sm uppercase tracking-wider transition-colors ${
              dark ? 'text-engine-heart hover:text-engine-paper' : 'text-engine-crimson hover:text-engine-crimsonD'
            }`}
          >
            See what HybridX can do for your training <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  // ---- Idle / error state ----------------------------------------------
  const dark = variant === 'dark';
  const band = variant === 'band';

  const errorMsg = capture.error;
  const errorId = `${formId}-error`;

  // Field styling per surface.
  const inputClasses =
    dark || band
      ? 'bg-white/95 text-engine-ink placeholder-engine-mutedrose border-2 border-transparent focus:border-engine-crimson'
      : 'bg-white text-engine-ink placeholder-engine-mutedrose border-2 border-engine-line focus:border-engine-crimson';

  return (
    <div ref={sectionRef} data-engine-form className={className}>
      <form
        ref={formRef}
        action={capture.formAction}
        onSubmit={capture.onSubmit}
        className="w-full"
        noValidate
        aria-describedby={errorMsg ? errorId : undefined}
      >
        {/* Honeypot: hidden from users + assistive tech, catches bots. */}
        <div className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <label htmlFor={`${formId}-company`}>Company</label>
          <input
            id={`${formId}-company`}
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* Hidden tracking fields. */}
        {Object.entries(capture.hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label htmlFor={`${formId}-email`} className="sr-only">
              Email address
            </label>
            <input
              id={`${formId}-email`}
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="you@email.com"
              onFocus={capture.onFocus}
              aria-invalid={errorMsg ? true : undefined}
              aria-describedby={errorMsg ? errorId : undefined}
              className={`h-14 w-full rounded-[14px] px-5 font-body text-base outline-none transition-colors duration-150 focus:ring-4 focus:ring-engine-crimson/20 ${inputClasses}`}
            />
          </div>
          <button
            type="submit"
            disabled={capture.isPending}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[14px] bg-engine-crimson px-7 font-archivo font-extrabold uppercase tracking-wide text-engine-paper shadow-lg transition-all duration-150 hover:bg-engine-crimsonD hover:-translate-y-px active:translate-y-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-engine-heart disabled:cursor-not-allowed disabled:opacity-70"
          >
            {capture.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Sending...
              </>
            ) : (
              'Send me the free guide'
            )}
          </button>
        </div>

        {/* Accessible status / error region. */}
        <div id={errorId} aria-live="polite" className="min-h-[1.25rem]">
          {errorMsg && (
            <p className={`mt-2 text-sm font-semibold ${dark || band ? 'text-engine-paper' : 'text-engine-crimsonD'}`}>
              {errorMsg}
            </p>
          )}
        </div>

        <p className={`mt-1 text-sm ${dark || band ? 'text-engine-paper/70' : 'text-engine-mutedrose'}`}>
          Free. No spam. Unsubscribe anytime.
        </p>
      </form>
    </div>
  );
}

// Re-export the heartbeat so sections can import a single module if preferred.
export { Heartbeat };
