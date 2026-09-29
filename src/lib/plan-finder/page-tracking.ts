// src/lib/plan-finder/page-tracking.ts
//
// What attracts people and what puts them off, on the page around the plan
// finder: sections reached, scroll depth, link clicks, FAQ opens, and how the
// visit ended. A port of initPageTracking() in the reference, adapted to the
// existing homepage's markup so that nothing on the homepage has to change:
//
//   - The homepage hero has no id. It is named `hero` by position (the first
//     section in <main>) rather than by adding an id to the page.
//   - The FAQ is a Radix accordion, not <details>, so an open is read from the
//     trigger's aria-expanded after the click.
//
// Only runs while the tracker is on. Link clicks record a slug, a kind and a
// hostname: never the link text, never a query string.

import type { Tracker } from './tracker';
import { slug } from './tracker';

export interface PageTrackingStatus {
  open: boolean;
  step: number;
  resultReady: boolean;
}

const SECTION_SELECTOR = 'main > section, main section[id], [data-track-section]';

function sectionName(el: Element): string {
  const named = el.getAttribute('data-track-section') || el.id;
  if (named) return slug(named, 40);
  const main = el.closest('main');
  if (main && main.querySelector(':scope > section') === el) return 'hero';
  return '';
}

function linkKind(a: Element): string {
  if (a.closest('header')) return 'nav';
  if (a.closest('footer')) return 'footer';
  if (a.closest('[data-start-today]')) return 'startToday';
  if (a.closest('#free-tools')) return 'tool';
  const section = a.closest('main section');
  if (section && sectionName(section) === 'hero') return 'hero';
  return 'section';
}

/** Starts page-level tracking. Returns a function that records the exit and stops it. */
export function startPageTracking(tracker: Tracker, status: PageTrackingStatus): () => void {
  const cleanups: (() => void)[] = [];
  let maxPct = 0;
  let nextMark = 0;
  let ticking = false;
  let hideSent = false;
  const marks = [25, 50, 75, 100];

  // Sections reached: 40% of the section, or 40% of the screen, is showing it.
  if ('IntersectionObserver' in window) {
    const seen = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          const vh = en.rootBounds?.height || window.innerHeight;
          if (en.intersectionRatio < 0.4 && en.intersectionRect.height < vh * 0.4) continue;
          const id = sectionName(en.target);
          if (id && !seen.has(id)) {
            seen.add(id);
            tracker.track('section_view', { id });
          }
        }
      },
      { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.75, 1] },
    );
    const targets = new Set(document.querySelectorAll(SECTION_SELECTOR));
    targets.forEach((el) => {
      if (el.id !== 'hx-entry' && el.id !== 'hx-start') io.observe(el);
    });
    cleanups.push(() => io.disconnect());
  }

  // Scroll depth marks, once each, in order.
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const de = document.documentElement;
      const total = de.scrollHeight || 1;
      const pct = Math.min(100, ((window.scrollY || de.scrollTop) + (window.innerHeight || de.clientHeight)) / total * 100);
      if (pct > maxPct) maxPct = pct;
      while (nextMark < marks.length && pct >= (marks[nextMark] === 100 ? 98 : marks[nextMark])) {
        tracker.track('scroll_depth', { pct: marks[nextMark] });
        nextMark++;
      }
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  cleanups.push(() => window.removeEventListener('scroll', onScroll));

  // Link clicks outside the dialog, the skip links and the consent banner.
  const onClick = (e: MouseEvent) => {
    const target = e.target as Element | null;
    const a = target?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || a.closest('dialog, [data-consent-banner]') || a.hasAttribute('data-skip')) return;
    const href = a.getAttribute('href') || '';
    if (!/^(https?:)?\/\//i.test(href) && !href.startsWith('/')) return;
    const path = (a.pathname || '').split('/').filter(Boolean).pop() || a.hostname;
    tracker.track('cta_click', {
      id: slug(a.getAttribute('data-track') || path, 40) || 'link',
      kind: linkKind(a),
      host: (a.hostname || '').toLowerCase(),
    });
    if (a.target !== '_blank') tracker.flush(true);
  };
  document.addEventListener('click', onClick);
  cleanups.push(() => document.removeEventListener('click', onClick));

  // FAQ opens: the Radix trigger flips aria-expanded after the click.
  const onFaq = (e: MouseEvent) => {
    const trigger = (e.target as Element | null)?.closest?.('#faq button[aria-expanded]');
    if (!trigger) return;
    window.setTimeout(() => {
      if (trigger.getAttribute('aria-expanded') !== 'true') return;
      const all = Array.from(document.querySelectorAll('#faq button[aria-expanded]'));
      tracker.track('faq_open', { i: all.indexOf(trigger) });
    }, 0);
  };
  document.addEventListener('click', onFaq);
  cleanups.push(() => document.removeEventListener('click', onFaq));

  // Leaving: once per page load, then flush whenever the tab is hidden.
  const onHide = () => {
    if (!hideSent) {
      hideSent = true;
      tracker.track('page_hide', {
        ms: Math.min(Math.round(performance.now()), 86_400_000),
        scroll: Math.round(maxPct),
        step: status.open ? Math.min(status.step, 8) : 0,
        result: status.resultReady,
      });
    }
    tracker.flush(true);
  };
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') onHide();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onHide);
  cleanups.push(() => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onHide);
  });

  return () => {
    // Leaving through a client-side navigation fires neither event.
    onHide();
    cleanups.forEach((fn) => fn());
  };
}
