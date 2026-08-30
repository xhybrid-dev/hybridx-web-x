'use client';

import React, { useActionState, useEffect, useRef, useState } from 'react';
import styles from '@/app/athx-2027/athx.module.css';
import { trackEvent } from '@/lib/analytics';
import { submitAthxLead, type AthxLeadState } from '@/app/athx-2027/actions';
import { wasCalculatorUsed } from '@/components/athx/calc-usage';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AthxGuideFormProps {
  /** Which form on the page. Recorded on the lead, and segmented on later. */
  placement: 'hero' | 'footer';
  label: string;
  support: string;
}

/**
 * The email capture. Rendered twice on the page with different framing, and
 * both instances post to the same action under different placements, so "did
 * anybody convert below the fold" is answerable.
 *
 * Confirmed opt-in: submitting sends a link rather than the file. The success
 * state says so plainly, because the one way to lose somebody here is to let
 * them believe a download already happened.
 *
 * One field. Nothing else is asked for, because nothing else is needed to send
 * a guide, and every extra field costs conversions the launch email will miss.
 */
export default function AthxGuideForm({ placement, label, support }: AthxGuideFormProps) {
  const initialState: AthxLeadState = { status: '', message: '' };
  const [state, formAction, isPending] = useActionState(submitAthxLead, initialState);

  const [clientError, setClientError] = useState('');
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [calcUsed, setCalcUsed] = useState(false);
  const startedRef = useRef(false);
  const sentRef = useRef(false);

  const fieldId = `athx-email-${placement}`;
  const errorId = `athx-error-${placement}`;

  // Capture src + utm_* once on mount, so paid, social and gym traffic stay
  // separable on the lead record rather than all reading as "direct".
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next: Record<string, string> = {};
    const src = params.get('src');
    if (src) next.src = src;
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((key) => {
      const value = params.get(key);
      if (value) next[key] = value;
    });
    setTracking(next);
  }, []);

  useEffect(() => {
    if (state.status === 'success' && !sentRef.current) {
      sentRef.current = true;
      // Not generate_lead: that fires on the confirm page, so the conversion
      // metric counts confirmed subscribers rather than submitted addresses.
      // The gap between the two events is the confirmation rate.
      trackEvent('lead_pending_confirmation', {
        placement,
        magnet: 'what-is-athx',
        calc_used: calcUsed,
      });
    }
    if (state.status === 'error') {
      trackEvent('lead_submit_error', { placement, message: state.message });
    }
  }, [state, placement, calcUsed]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value?.trim() || '';

    if (!EMAIL_RE.test(email)) {
      event.preventDefault();
      setClientError('That email looks incomplete. Please check and try again.');
      return;
    }

    setClientError('');
    // Read at submit time rather than on mount: the whole question is whether
    // they used the calculator *before* signing up.
    setCalcUsed(wasCalculatorUsed());
    trackEvent('lead_submit_attempt', { placement, magnet: 'what-is-athx' });
  }

  function handleFocus() {
    if (startedRef.current) return;
    startedRef.current = true;
    trackEvent('lead_form_start', { placement, magnet: 'what-is-athx' });
  }

  const errorMessage = clientError || (state.status === 'error' ? state.message : '');

  if (state.status === 'success') {
    return (
      <div className={styles.sent} role="status" aria-live="polite">
        <p className={styles.formLabel}>Check your inbox</p>
        <p className={styles.formSupport}>
          We have sent the download link to{' '}
          <strong style={{ color: '#ffffff' }}>{state.email || 'your inbox'}</strong>. Click the
          button in that email and the guide opens straight away.
        </p>
        <ol className={styles.sentSteps}>
          <li>Open the email from HybridX</li>
          <li>Click &ldquo;Confirm and download the guide&rdquo;</li>
          <li>The guide opens in your browser, and the link keeps working</li>
        </ol>
        <p className={styles.micro}>
          Nothing in a minute or two? Check your spam or promotions tab. We confirm addresses so
          the guide only goes to people who asked for it.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.form}>
      <p className={styles.formLabel}>{label}</p>
      <p className={styles.formSupport}>{support}</p>

      <form action={formAction} onSubmit={handleSubmit} noValidate>
        {/* Honeypot. Off-screen rather than display:none, and hidden from
            assistive technology so it is never announced to a real person. */}
        <div className={styles.honeypot} aria-hidden="true">
          <label htmlFor={`athx-company-${placement}`}>Company</label>
          <input
            id={`athx-company-${placement}`}
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <input type="hidden" name="placement" value={placement} />
        <input type="hidden" name="calcUsed" value={String(calcUsed)} />
        <input type="hidden" name="src" value={tracking.src || ''} />
        <input type="hidden" name="utm_source" value={tracking.utm_source || ''} />
        <input type="hidden" name="utm_medium" value={tracking.utm_medium || ''} />
        <input type="hidden" name="utm_campaign" value={tracking.utm_campaign || ''} />
        <input type="hidden" name="utm_content" value={tracking.utm_content || ''} />
        <input type="hidden" name="utm_term" value={tracking.utm_term || ''} />

        <label className={styles.fieldLabel} htmlFor={fieldId}>
          Email address
        </label>
        <input
          id={fieldId}
          className={styles.input}
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@email.com"
          onFocus={handleFocus}
          aria-invalid={errorMessage ? true : undefined}
          aria-describedby={errorMessage ? errorId : undefined}
        />

        <button type="submit" className={styles.submit} disabled={isPending}>
          {isPending ? 'Sending…' : 'Send me the guide'}
        </button>

        <div id={errorId} className={styles.errorSlot} aria-live="polite">
          {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
        </div>

        <p className={styles.micro}>
          We will email you a link to the guide, then one more email when the training plans
          launch, and then nothing. Unsubscribe any time. See our{' '}
          <a href="/privacy-policy">privacy notice</a>.
        </p>
      </form>
    </div>
  );
}
