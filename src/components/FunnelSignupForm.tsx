'use client';

// src/components/FunnelSignupForm.tsx
//
// The capture form for any new funnel.
//
// Drop it on a page with a `source` slug and the funnel exists: leads flow into
// the mailing system, the slug registers itself as a route on the first
// submission, and the welcome sequence is configured in the marketing console
// rather than here. No server action, no type entry, no deploy of the app.
//
// It deliberately does not deliver anything. Funnels that hand over a file the
// visitor is waiting on keep their own bespoke actions; everything this form
// captures is followed up by email from the app, so there is one send path
// rather than two.

import React, { useActionState, useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { submitFunnelLead, type FunnelLeadState } from '@/lib/funnel-actions';
import { trackEvent } from '@/lib/analytics';

interface FunnelSignupFormProps {
  /**
   * Funnel slug — lowercase, `[a-z0-9_-]`, e.g. `spring-hyrox-challenge`. This
   * becomes the route in the mailing system, so keep it stable once live:
   * changing it starts a new route and orphans the journey attached to the old
   * one.
   */
  source: string;
  /** Stable id, used to label the email field. */
  formId: string;
  /** Where this form sits, for analytics (e.g. "hero", "mid", "final"). */
  placement: string;
  /** Ask for a first name as well as an address. */
  collectName?: boolean;
  buttonLabel?: string;
  /**
   * What the visitor is agreeing to. Shown under the form, and it matters
   * legally as well as visually: the mailing system records the funnel's
   * consent posture from the first lead, and this text is the evidence of what
   * was actually promised.
   */
  consentText?: string;
  successHeading?: string;
  successBody?: string;
  className?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function FunnelSignupForm({
  source,
  formId,
  placement,
  collectName = false,
  buttonLabel = 'Sign me up',
  consentText = 'Free HYROX training email. Unsubscribe any time — every email has a one-click link.',
  successHeading = 'You are on the list',
  successBody = 'Check your inbox shortly. If nothing arrives, look in promotions or spam.',
  className = '',
}: FunnelSignupFormProps) {
  const initialState: FunnelLeadState = { status: '', message: '' };
  const [state, formAction, isPending] = useActionState(submitFunnelLead, initialState);
  const [clientError, setClientError] = useState('');
  const [utm, setUtm] = useState<Record<string, string>>({});
  const startedRef = useRef(false);
  const leadFiredRef = useRef(false);

  // Capture src + utm_* once on mount, so the mailing system records
  // first-touch attribution for the campaign that produced the lead.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next: Record<string, string> = {};
    const src = params.get('src');
    if (src) next.src = src;
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) => {
      const v = params.get(k);
      if (v) next[k] = v;
    });
    setUtm(next);
  }, []);

  useEffect(() => {
    if (state.status === 'success' && !leadFiredRef.current) {
      leadFiredRef.current = true;
      trackEvent('generate_lead', { funnel: source, placement });
    }
  }, [state.status, source, placement]);

  if (state.status === 'success') {
    return (
      <div className={`rounded-lg border border-green-500/30 bg-green-500/10 p-5 ${className}`}>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />
          <div>
            <p className="font-semibold">{successHeading}</p>
            <p className="mt-1 text-sm opacity-80">{successBody}</p>
          </div>
        </div>
      </div>
    );
  }

  const error = clientError || (state.status === 'error' ? state.message : '');

  return (
    <form
      action={formAction}
      className={`space-y-3 ${className}`}
      onSubmit={(e) => {
        const form = e.currentTarget;
        const email = (form.elements.namedItem('email') as HTMLInputElement)?.value ?? '';
        if (!EMAIL_RE.test(email.trim())) {
          e.preventDefault();
          setClientError('That email looks incomplete. Please check and try again.');
          return;
        }
        setClientError('');
      }}
      onChange={() => {
        if (!startedRef.current) {
          startedRef.current = true;
          trackEvent('begin_lead_form', { funnel: source, placement });
        }
      }}
    >
      <input type="hidden" name="source" value={source} />
      {Object.entries(utm).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      {/* Honeypot. Hidden from people, irresistible to bots. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute h-0 w-0 overflow-hidden opacity-0"
      />

      {collectName && (
        <div>
          <label htmlFor={`${formId}-name`} className="sr-only">
            First name
          </label>
          <input
            id={`${formId}-name`}
            name="firstName"
            type="text"
            autoComplete="given-name"
            placeholder="First name"
            className="w-full rounded-md border border-white/20 bg-black/20 px-4 py-3 text-base placeholder:opacity-60 focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
      )}

      <div>
        <label htmlFor={`${formId}-email`} className="sr-only">
          Email address
        </label>
        <input
          id={`${formId}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${formId}-error` : `${formId}-consent`}
          className="w-full rounded-md border border-white/20 bg-black/20 px-4 py-3 text-base placeholder:opacity-60 focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-5 py-3 font-semibold text-accent-foreground transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Signing you up…
          </>
        ) : (
          <>
            {buttonLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>

      {error ? (
        <p id={`${formId}-error`} role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : (
        <p id={`${formId}-consent`} className="text-xs opacity-70">
          {consentText}
        </p>
      )}
    </form>
  );
}
