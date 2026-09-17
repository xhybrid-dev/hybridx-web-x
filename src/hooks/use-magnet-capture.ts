'use client';

import React, { useActionState, useEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { submitMagnetLead, type MagnetLeadState } from '@/lib/magnet-actions';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

/**
 * Everything a magnet capture form does that is not markup.
 *
 * A hook rather than a component on purpose. The three capture forms on this
 * site look nothing alike — the race card is a two-column card with a preview
 * image, the ATHX funnel is a bordered panel in its own type system, the VO2max
 * page is something else again — and a shared component would have meant either
 * flattening three designs into one or inventing a styling API with a slot for
 * every element. What they genuinely share is behaviour: capture the query
 * string once, validate before spending a round trip, keep a honeypot, report
 * the right analytics events, and hold a pending state.
 *
 * So this owns the behaviour and each page keeps its own markup. Spread
 * `hiddenFields` into the form, wire `onSubmit` and `onFocus`, and render
 * whatever the design calls for.
 */
export interface MagnetCapture {
  /** Pass to `<form action={...}>`. */
  formAction: (formData: FormData) => void;
  isPending: boolean;
  /** Client-side or server-side, whichever spoke last. Empty when there is none. */
  error: string;
  succeeded: boolean;
  /** The address that was captured, for a "check your inbox" confirmation. */
  email?: string;
  /** Public asset URL, for an immediate-delivery magnet's in-page download. */
  assetUrl?: string;
  /** Attach to the form element. Validates before the round trip. */
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  /** Attach to the first field. Fires the form-start event once. */
  onFocus: () => void;
  /**
   * The tracking fields, ready to spread into hidden inputs. Rendered by the
   * page rather than injected here so a form remains ordinary markup.
   */
  hiddenFields: Record<string, string>;
}

export function useMagnetCapture(slug: string, placement: string): MagnetCapture {
  const initialState: MagnetLeadState = { status: '', message: '' };

  // Bound server-side rather than carried in a hidden field. Next signs the
  // bound argument, so which magnet this form delivers cannot be swapped by
  // whoever is submitting — which would otherwise mint a token for a file they
  // were never offered.
  const [state, formAction, isPending] = useActionState(
    submitMagnetLead.bind(null, slug),
    initialState,
  );

  const [clientError, setClientError] = useState('');
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const startedRef = useRef(false);
  const sentRef = useRef(false);

  // Read src + utm_* once on mount, so paid, social and gym traffic stay
  // separable on the lead record rather than all reading as "direct".
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next: Record<string, string> = {};
    const src = params.get('src');
    if (src) next.src = src;
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) next[key] = value;
    }
    setTracking(next);
  }, []);

  useEffect(() => {
    if (state.status === 'success' && !sentRef.current) {
      sentRef.current = true;
      // Not generate_lead for a confirmed magnet: that fires on the confirm
      // page, so the conversion metric counts confirmed subscribers rather than
      // submitted addresses, and the gap between the two is the confirmation
      // rate. An immediate magnet has no second step, so this is the conversion.
      trackEvent(state.assetUrl ? 'generate_lead' : 'lead_pending_confirmation', {
        placement,
        magnet: slug,
      });
    }
    if (state.status === 'error') {
      trackEvent('lead_submit_error', { placement, magnet: slug, message: state.message });
    }
  }, [state, placement, slug]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value?.trim() || '';

    if (!EMAIL_RE.test(email)) {
      event.preventDefault();
      setClientError('That email looks incomplete. Please check and try again.');
      return;
    }

    setClientError('');
    trackEvent('lead_submit_attempt', { placement, magnet: slug });
  }

  function onFocus() {
    if (startedRef.current) return;
    startedRef.current = true;
    trackEvent('lead_form_start', { placement, magnet: slug });
  }

  return {
    formAction,
    isPending,
    error: clientError || (state.status === 'error' ? state.message : ''),
    succeeded: state.status === 'success',
    email: state.email,
    assetUrl: state.assetUrl,
    onSubmit,
    onFocus,
    hiddenFields: {
      placement,
      src: tracking.src || '',
      ...Object.fromEntries(UTM_KEYS.map((key) => [key, tracking[key] || ''])),
    },
  };
}
