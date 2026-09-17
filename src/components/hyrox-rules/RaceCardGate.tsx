'use client';

import React, { useActionState, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Loader2, MailCheck } from 'lucide-react';
import { submitRaceCardLead, type RaceCardLeadState } from '@/app/hyrox-rule-changes-2026/actions';
import { trackEvent } from '@/lib/analytics';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CARD_CONTENTS = [
  'The completion standard for all eight stations, so you know what “finished” means before a judge has to tell you',
  'The full penalty table, from a 15 second sandbag infringement to the disqualifications',
  'The missed lap scale, with a box to fill in your venue’s layout when you arrive',
  'Singles weights for Women, W Pro, Men and M Pro',
  'What is newly allowed, what is still banned, and the doubles and relay standards',
];

/**
 * Email gate for the printable race day rules card.
 *
 * Confirmed opt-in: submitting sends a confirmation link rather than the
 * file. The card lives behind a signed token at /api/race-card/download, so
 * clicking that link is the only route to it — which is what makes the
 * address real rather than merely well formed.
 *
 * Shares the VO2max funnel's server-action shape otherwise: honeypot, rate
 * limiting and UTM forwarding on the action side.
 */
export default function RaceCardGate({ placement = 'rules_2026' }: { placement?: string }) {
  const initialState: RaceCardLeadState = { status: '', message: '' };
  const [state, formAction, isPending] = useActionState(submitRaceCardLead, initialState);
  const sectionRef = useRef<HTMLDivElement>(null);

  const [clientError, setClientError] = useState('');
  const [utm, setUtm] = useState<Record<string, string>>({});
  const startedRef = useRef(false);
  const viewedRef = useRef(false);
  const leadFiredRef = useRef(false);

  // Capture src + utm_* params once on mount, so gym, social and community
  // traffic stay separable in the lead record.
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

  // Fire view_lead_form when the gate first scrolls into view.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !viewedRef.current) {
            viewedRef.current = true;
            trackEvent('view_lead_form', { placement, magnet: 'hyrox-race-day-card' });
            obs.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [placement]);

  useEffect(() => {
    if (state.status === 'success' && !leadFiredRef.current) {
      leadFiredRef.current = true;
      // Not generate_lead — that fires on the confirm page, so the conversion
      // metric counts confirmed subscribers rather than submitted addresses.
      // The gap between these two events is the confirmation rate.
      trackEvent('lead_pending_confirmation', { placement, magnet: 'hyrox-race-day-card' });
    }
    if (state.status === 'error') {
      trackEvent('lead_submit_error', { placement, message: state.message });
    }
  }, [state, placement]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value?.trim() || '';
    if (!EMAIL_RE.test(email)) {
      e.preventDefault();
      setClientError('That email looks incomplete. Please check and try again.');
      return;
    }
    setClientError('');
    trackEvent('lead_submit_attempt', { placement, magnet: 'hyrox-race-day-card' });
  }

  function handleFocus() {
    if (!startedRef.current) {
      startedRef.current = true;
      trackEvent('lead_form_start', { placement, magnet: 'hyrox-race-day-card' });
    }
  }

  const errorMsg = clientError || (state.status === 'error' ? state.message : '');
  const succeeded = state.status === 'success';

  return (
    <div
      ref={sectionRef}
      className="overflow-hidden rounded-3xl border border-white/10 bg-neutral-950"
    >
      <div className="grid gap-0 lg:grid-cols-[1.05fr_1fr]">
        {/* ── Preview ─────────────────────────────────────────────────── */}
        <div className="relative flex items-center justify-center bg-gradient-to-br from-neutral-900 to-black p-6 sm:p-8">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: 'radial-gradient(circle, #fadb5c 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <Image
            src="/hyrox-rule-changes-2026/race-day-card-preview.png"
            alt="Preview of the HYROX 2026/27 race day rules card: station completion standards, the penalty table, the missed lap scale and singles weights, laid out on a single folded A4 sheet."
            width={1431}
            height={1012}
            className="relative z-10 w-full rounded-lg shadow-2xl ring-1 ring-white/10"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>

        {/* ── Gate ────────────────────────────────────────────────────── */}
        <div className="p-6 text-white sm:p-8 lg:p-10">
          {succeeded ? (
            <div role="status" aria-live="polite">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/20">
                <MailCheck className="h-8 w-8 text-accent" aria-hidden="true" />
              </div>
              <h3 className="mb-2 font-headline text-2xl font-extrabold">One click to go</h3>
              <p className="mb-4 font-body text-white/75">
                We have sent a confirmation link to{' '}
                <strong className="text-white">{state.email || 'your inbox'}</strong>. Click it and
                the card downloads straight away.
              </p>
              <p className="mb-6 font-body text-sm leading-relaxed text-white/50">
                We confirm addresses so the card only goes to people who asked for it. If nothing
                arrives in a minute or two, check your spam or promotions tab.
              </p>

              <ol className="space-y-2 border-t border-white/10 pt-6">
                {['Open the email from HybridX', 'Click “Confirm and download the card”', 'Print it A4 landscape, single sided, at 100% scale, then fold'].map(
                  (step, i) => (
                    <li key={step} className="flex items-start gap-3 font-body text-sm text-white/70">
                      <span
                        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/10 font-headline text-[11px] font-bold text-white"
                        aria-hidden="true"
                      >
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  )
                )}
              </ol>
            </div>
          ) : (
            <>
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/20 px-3 py-1 font-headline text-[11px] font-bold uppercase tracking-wider text-accent">
                Free download
              </span>
              <h3 className="mb-3 font-headline text-2xl font-extrabold leading-tight sm:text-3xl">
                Take the rules to the venue
              </h3>
              <p className="mb-5 font-body leading-relaxed text-white/75">
                A one-page card that folds into a kit bag pocket. Everything on this page that
                matters on race day, plus the weights and the full penalty table, in a format you can
                check while you are warming up.
              </p>

              <ul className="mb-6 space-y-2">
                {CARD_CONTENTS.map((item) => (
                  <li key={item} className="flex items-start gap-2 font-body text-sm text-white/70">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              <form action={formAction} onSubmit={handleSubmit} noValidate>
                {/* Honeypot: hidden from users + assistive tech, catches bots. */}
                <div
                  className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden"
                  aria-hidden="true"
                >
                  <label htmlFor="race-card-company">Company</label>
                  <input id="race-card-company" type="text" name="company" tabIndex={-1} autoComplete="off" />
                </div>

                {/* Hidden tracking fields. */}
                <input type="hidden" name="src" value={utm.src || ''} />
                <input type="hidden" name="utm_source" value={utm.utm_source || ''} />
                <input type="hidden" name="utm_medium" value={utm.utm_medium || ''} />
                <input type="hidden" name="utm_campaign" value={utm.utm_campaign || ''} />
                <input type="hidden" name="utm_content" value={utm.utm_content || ''} />
                <input type="hidden" name="utm_term" value={utm.utm_term || ''} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="race-card-firstName"
                      className="mb-1.5 block font-headline text-[11px] uppercase tracking-[0.12em] text-white/50"
                    >
                      First name <span className="normal-case tracking-normal">(optional)</span>
                    </label>
                    <input
                      id="race-card-firstName"
                      type="text"
                      name="firstName"
                      autoComplete="given-name"
                      placeholder="Alex"
                      onFocus={handleFocus}
                      className="h-14 w-full rounded-xl border-2 border-transparent bg-white/95 px-4 py-3 font-body text-base text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-accent"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="race-card-raceDate"
                      className="mb-1.5 block font-headline text-[11px] uppercase tracking-[0.12em] text-white/50"
                    >
                      Race date <span className="normal-case tracking-normal">(optional)</span>
                    </label>
                    <input
                      id="race-card-raceDate"
                      type="date"
                      name="raceDate"
                      onFocus={handleFocus}
                      className="h-14 w-full rounded-xl border-2 border-transparent bg-white/95 px-4 py-3 font-body text-base text-black outline-none transition-colors focus:border-accent"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label
                    htmlFor="race-card-email"
                    className="mb-1.5 block font-headline text-[11px] uppercase tracking-[0.12em] text-white/50"
                  >
                    Email address
                  </label>
                  <input
                    id="race-card-email"
                    type="email"
                    name="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    placeholder="you@email.com"
                    onFocus={handleFocus}
                    aria-invalid={errorMsg ? true : undefined}
                    aria-describedby={errorMsg ? 'race-card-error' : undefined}
                    className="h-14 w-full rounded-xl border-2 border-transparent bg-white/95 px-4 py-3 font-body text-base text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-accent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-accent px-7 font-headline text-base font-extrabold text-black transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Sending...
                    </>
                  ) : (
                    <>
                      Send me the card <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </button>

                <div id="race-card-error" aria-live="polite" className="min-h-[1.25rem]">
                  {errorMsg && (
                    <p className="mt-2 font-body text-sm font-semibold text-rose-300">{errorMsg}</p>
                  )}
                </div>

                <p className="mt-2 font-body text-xs leading-relaxed text-white/40">
                  We will email you a link to confirm, then the card. After that, a short series on
                  racing the 2026/27 rules well. Unsubscribe any time.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
