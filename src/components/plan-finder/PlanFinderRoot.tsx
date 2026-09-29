'use client';

// The plan finder's page script: one per page, on the homepage (entry mode)
// and on /start (page mode). It owns the tracker, the skip and continue
// behaviour, the "why did you skip" strip, and opening the dialog from the
// server-rendered tiles. The dialog itself is a separate chunk, loaded on the
// first click and prefetched when a trigger is hovered, focused or touched.
//
// Markup contract (handover/entry-funnel/docs/03): #hx-entry is the entry
// section, a[data-skip="bar"] the skip link, #hx-home the existing homepage,
// button[data-goal] the tiles, [data-open] any other trigger,
// [data-privacy-tick] the third reassurance line.

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FormatId, GoalId, LevelId, ObstacleId, PlaceId } from '@/lib/plan-finder/content';
import { findOption, funnel } from '@/lib/plan-finder/content';
import { subscribeConsent } from '@/lib/consent';
import type { Mode, Tracker, Variant } from '@/lib/plan-finder/tracker';
import { createTracker, offTracker } from '@/lib/plan-finder/tracker';
import { startPageTracking } from '@/lib/plan-finder/page-tracking';
import type { FinderStatus, OpenRequest, OpenSource } from './types';

const loadDialog = () => import('./PlanFinderDialog');
const PlanFinderDialog = dynamic(loadDialog, { ssr: false });

const STORE_KEY = 'hx_entry';
const TRIGGERS = '[data-open],[data-goal],[data-prompt]';
const MAX_MS = 3_600_000;

function remember(value: 'skipped' | 'done') {
  try {
    sessionStorage.setItem(STORE_KEY, value);
  } catch {
    // Storage blocked: the entry simply shows again on reload.
  }
}
function remembered(): string | null {
  try {
    return sessionStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
}

/** A shared result: `#plan=goal.level.place.obst1+obst2.format.race`. Invalid links are ignored. */
function readHash(): OpenRequest['hash'] | null {
  const m = /^#plan=([^.]+)\.([^.]+)\.([^.]+)\.([^.]+)\.([^.]+)\.([^.]+)$/.exec(window.location.hash || '');
  if (!m) return null;
  const goal = findOption(funnel.goals, m[1]);
  const level = findOption(funnel.levels, m[2]);
  const place = findOption(funnel.places, m[3]);
  const format = findOption(funnel.formats, m[5]);
  if (!goal || !level || !place || !format) return null;
  const obst = m[4] === '-' ? [] : m[4].split('+').filter((x) => findOption(funnel.obstacles, x));
  return {
    goal: goal.id as GoalId,
    level: level.id as LevelId,
    place: place.id as PlaceId,
    format: format.id as FormatId,
    obst: obst as ObstacleId[],
    race: /^\d{4}-\d{2}-\d{2}$/.test(m[6]) ? m[6] : '',
  };
}

export interface PlanFinderRootProps {
  mode: Mode;
  variant?: Variant | null;
  /** Empty means tracking is off (docs/04). */
  trackEndpoint?: string;
  /** Empty means the Talk-to-us form is a preview and says so. */
  talkEndpoint?: string;
  captureNote?: boolean;
  privacyHref?: string;
  siteVersion?: string;
}

export default function PlanFinderRoot({
  mode,
  variant = null,
  trackEndpoint = '',
  talkEndpoint = '',
  captureNote = true,
  privacyHref = '/privacy-policy',
  siteVersion = 'web-1',
}: PlanFinderRootProps) {
  const [tracker, setTracker] = useState<Tracker>(offTracker);
  const [request, setRequest] = useState<OpenRequest | null>(null);
  const [skipWhy, setSkipWhy] = useState<'hidden' | 'ask' | 'thanks'>('hidden');
  const status = useRef<FinderStatus>({ open: false, step: 0, resultReady: false }).current;
  const nonce = useRef(0);
  const loadedAt = useRef(0);
  const skipSlot = useRef<HTMLElement | null>(null);

  const open = useCallback((r: Omit<OpenRequest, 'nonce'>) => {
    nonce.current += 1;
    setRequest({ ...r, nonce: nonce.current });
  }, []);

  const toHomepage = useCallback(() => {
    const entry = document.getElementById('hx-entry');
    if (entry) entry.hidden = true;
    window.scrollTo(0, 0);
    // With the dialog open, it moves focus to #hx-home itself once it has closed.
    if (!status.open) document.getElementById('hx-home')?.focus({ preventScroll: true });
  }, [status]);

  const skip = useCallback(
    (from: 'bar' | 'dialog', step: number) => {
      tracker.track('entry_skip', { from, step, ms: Math.min(Date.now() - loadedAt.current, MAX_MS) });
      remember('skipped');
      toHomepage();
      // The one-row "why" strip only appears when there is somewhere to send the answer.
      if (tracker.on) setSkipWhy('ask');
    },
    [tracker, toHomepage],
  );

  const continueToHomepage = useCallback(() => {
    tracker.track('cta_click', { id: 'continue-to-homepage', kind: 'hero' });
    remember('done');
    toHomepage();
  }, [tracker, toHomepage]);

  // Start: the tracker, the entry state, shared links and presets.
  useEffect(() => {
    loadedAt.current = Date.now();
    const t = createTracker({ endpoint: trackEndpoint, mode, variant, siteVersion });
    setTracker(t);
    skipSlot.current = document.getElementById('hx-skipwhy-slot');

    const entry = document.getElementById('hx-entry');
    if (mode === 'entry' && entry) {
      // The inline script after the section has usually hidden it already, before first paint.
      const bypass = /[?&]entry=off(&|$)/.test(window.location.search) || !!remembered();
      if (bypass) entry.hidden = true;
    }

    const shared = readHash();
    if (shared) {
      open({ source: 'hash', step: 6, hash: shared });
      return;
    }
    if (mode === 'page') {
      // /start?goal=first&place=home: a link from a guide or a social post opens at question 2.
      const params = new URLSearchParams(window.location.search);
      const goal = findOption(funnel.goals, params.get('goal'));
      const place = findOption(funnel.places, params.get('place'));
      if (goal) open({ source: 'link', step: 2, goal: goal.id, place: place?.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The visit is recorded from the moment tracking is allowed: at load, or
  // later if the visitor accepts in the consent banner while here.
  useEffect(() => {
    if (tracker === offTracker) return;
    let stop: (() => void) | null = null;
    const tick = document.querySelector('[data-privacy-tick]');
    const sync = () => {
      if (tick) tick.textContent = tracker.on ? funnel.copy.privacy.tickOn : funnel.copy.privacy.tickOff;
      if (tracker.on && !stop) {
        tracker.track('page_view');
        const entry = document.getElementById('hx-entry');
        if (mode === 'entry' && entry && !entry.hidden) tracker.track('entry_shown');
        stop = startPageTracking(tracker, status);
      } else if (!tracker.on && stop) {
        stop();
        stop = null;
      }
    };
    sync();
    const unsubscribe = subscribeConsent(sync);
    return () => {
      unsubscribe();
      stop?.();
    };
  }, [tracker, mode, status]);

  // Triggers on the page: tiles, [data-open] buttons, story prompts, the skip link.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const skipLink = target?.closest?.('[data-skip="bar"]');
      if (skipLink) {
        e.preventDefault();
        skip('bar', 0);
        return;
      }
      const t = target?.closest?.(TRIGGERS);
      if (!t || t.closest('dialog')) return;
      const source: OpenSource = t.hasAttribute('data-goal') && t.closest('#hx-entry, #hx-start')
        ? 'tile'
        : t.hasAttribute('data-prompt')
          ? 'prompt'
          : t.closest('header')
            ? 'nav'
            : t.getAttribute('data-open') === 'talk'
              ? 'band'
              : 'section';
      const goal = findOption(funnel.goals, t.getAttribute('data-goal'));
      if (goal) {
        open({ source, step: 2, goal: goal.id });
        return;
      }
      const prompt = t.getAttribute('data-prompt');
      if (prompt === 'first' || prompt === 'faster') open({ source, step: 2, goal: prompt });
      else if (prompt === 'run') open({ source, obst: ['run'] });
      else if (prompt === 'home') open({ source, place: 'home' });
      else if (t.getAttribute('data-open') === 'talk') open({ source, step: 7 });
      else open({ source });
    };
    const prefetch = (e: Event) => {
      if ((e.target as Element | null)?.closest?.(TRIGGERS)) loadDialog();
    };
    document.addEventListener('click', onClick);
    document.addEventListener('pointerover', prefetch, { passive: true });
    document.addEventListener('focusin', prefetch);
    document.addEventListener('touchstart', prefetch, { passive: true });
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('pointerover', prefetch);
      document.removeEventListener('focusin', prefetch);
      document.removeEventListener('touchstart', prefetch);
    };
  }, [open, skip]);

  const S = funnel.copy.skipWhy;
  const strip =
    skipWhy !== 'hidden' && skipSlot.current
      ? createPortal(
          <div className="bg-hx-yellow py-3.5 text-black">
            <div className="container mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-3.5 gap-y-2.5 px-4 sm:px-6">
              {skipWhy === 'ask' ? (
                <>
                  <span className="mr-1.5 font-semibold">{S.title}</span>
                  {S.options.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className="hx-pill-btn hover:border-white"
                      onClick={() => {
                        tracker.track('skip_reason', { reason: o.id });
                        setSkipWhy('thanks');
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </>
              ) : (
                <span role="status">{S.thanks}</span>
              )}
              <button
                type="button"
                className="hx-focus inline-flex min-h-11 items-center font-semibold text-black underline decoration-black decoration-2 underline-offset-[5px]"
                onClick={() => setSkipWhy('hidden')}
              >
                {S.dismiss}
              </button>
            </div>
          </div>,
          skipSlot.current,
        )
      : null;

  return (
    <>
      {strip}
      {request && (
        <PlanFinderDialog
          request={request}
          mode={mode}
          tracker={tracker}
          talkEndpoint={talkEndpoint}
          captureNote={captureNote}
          privacyHref={privacyHref}
          status={status}
          onSkip={(step) => skip('dialog', step)}
          onContinue={continueToHomepage}
        />
      )}
    </>
  );
}
