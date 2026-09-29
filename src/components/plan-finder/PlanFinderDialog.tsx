'use client';

// The plan finder dialog: five questions, the result, the "Talk to us" form
// and the sent screen. A React port of the reference in
// handover/entry-funnel/src/app.js, loaded only when a visitor first opens it.
//
// Step numbers are used in tracked events, so they are fixed:
// 1-5 questions, 6 result, 7 talk form, 8 message sent.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Check, X } from 'lucide-react';
import type { FormatId, GoalId, LevelId, ObstacleId, PlaceId, Product, ProductId } from '@/lib/plan-finder/content';
import { findOption, funnel } from '@/lib/plan-finder/content';
import { explain, raceBucket, raceWeeks, route } from '@/lib/plan-finder/routing';
import type { Mode, Tracker } from '@/lib/plan-finder/tracker';
import type { OpenRequest, FinderStatus } from './types';
import { subscribeConsent } from '@/lib/consent';

const { goals: GOALS, levels: LEVELS, places: PLACES, obstacles: OBSTACLES, formats: FORMATS } = funnel;
const COPY = funnel.copy;
const MAX_MS = 3_600_000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type TalkField = 'name' | 'email' | 'goal' | 'week' | 'msg';

interface State {
  step: Step;
  maxStep: number;
  resultReady: boolean;
  goal: GoalId | null;
  level: LevelId | null;
  place: PlaceId | null;
  obst: ObstacleId[];
  format: FormatId | null;
  note: string;
  race: string;
  talk: Record<TalkField, string> & { attach: boolean };
  talkFrom: 6 | null;
  talkPrefilled: boolean;
  fb: { fit: 'yes' | 'partly' | 'no' | null; reasons: string[]; sent: boolean };
}

const EMPTY_TALK: State['talk'] = { name: '', email: '', goal: '', week: '', msg: '', attach: true };

const INITIAL: State = {
  step: 1,
  maxStep: 1,
  resultReady: false,
  goal: null,
  level: null,
  place: null,
  obst: [],
  format: null,
  note: '',
  race: '',
  talk: EMPTY_TALK,
  talkFrom: null,
  talkPrefilled: false,
  fb: { fit: null, reasons: [], sent: false },
};

export interface PlanFinderDialogProps {
  request: OpenRequest;
  mode: Mode;
  tracker: Tracker;
  talkEndpoint: string;
  captureNote: boolean;
  privacyHref: string;
  /** Shared with the page script, for the page_hide event. */
  status: FinderStatus;
  /** Entry mode: hide the entry and remember the skip. The dialog closes itself. */
  onSkip?: (step: number) => void;
  /** Entry mode: "Continue to the homepage" after a result. Not a skip. */
  onContinue?: () => void;
}

/** First pass at removing personal details before the note leaves the browser; the collector scrubs again. */
export function scrubNote(s: string): string {
  return String(s)
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[email]')
    .replace(/(https?:\/\/|www\.)\S+/gi, '[link]')
    .replace(/\+?\d[\d\s().-]{5,}\d/g, '[number]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Links to this site open in place and work on any host; everything else opens a new tab. */
function productLink(p: Product) {
  const own = /^https:\/\/hybridx\.club(\/|$)/.exec(p.href);
  if (own) return { href: p.href.replace(/^https:\/\/hybridx\.club/, '') || '/', newTab: false };
  if (/^https:\/\/app\.hybridx\.club(\/|$)/.test(p.href)) return { href: p.href, newTab: false };
  return { href: p.href, newTab: true, rel: 'noopener' + (p.affiliate ? ' sponsored' : '') };
}

export default function PlanFinderDialog(props: PlanFinderDialogProps) {
  const { request, mode, tracker, talkEndpoint, captureNote, privacyHref, status, onSkip, onContinue } = props;
  const entry = mode === 'entry';

  const [s, setS] = useState<State>(INITIAL);
  const sRef = useRef(s);
  const update = useCallback((next: State) => {
    sRef.current = next;
    setS(next);
  }, []);

  const [talkErrors, setTalkErrors] = useState<Partial<Record<'name' | 'email' | 'goal', string>>>({});
  const [talkStatus, setTalkStatus] = useState('');
  const [sending, setSending] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const [trackingOn, setTrackingOn] = useState(tracker.on);

  const dlg = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const openedAt = useRef(0);
  const stepAt = useRef(0);
  const resultSig = useRef('');
  const closeReason = useRef<'button' | 'esc' | 'back'>('button');
  const lastFocus = useRef<HTMLElement | null>(null);
  const focusAfterClose = useRef<HTMLElement | null>(null);
  const pendingTalkFrom = useRef<string | null>(null);
  const ignorePop = useRef(false);
  const reduceMotion = useRef(false);

  const track = tracker.track;

  /* ---------------- derived ---------------- */
  const answers = () => {
    const c = sRef.current;
    return { goal: c.goal, level: c.level, place: c.place, obst: c.obst, format: c.format };
  };
  const answersEvent = () => {
    const c = sRef.current;
    const a: Record<string, unknown> = { obst: c.obst.slice(), race: raceBucket(raceWeeks(c.race)) };
    for (const k of ['goal', 'level', 'place', 'format'] as const) if (c[k]) a[k] = c[k];
    return a;
  };
  const result = () => {
    const c = sRef.current;
    const r = route(answers());
    const weeks = raceWeeks(c.race);
    const ex = explain(answers(), funnel, { weeks });
    return {
      primaryId: r.primary,
      primary: funnel.catalog[r.primary],
      secondaryIds: r.secondary,
      secondary: r.secondary.map((id) => funnel.catalog[id]),
      why: ex.why,
      chips: ex.chips,
      trace: r.trace,
      weeks,
    };
  };
  const canNext = (c: State = sRef.current) => {
    if (c.step === 1) return !!c.goal;
    if (c.step === 2) return !!(c.level && c.place);
    if (c.step === 4) return !!c.format;
    return true;
  };

  /* ---------------- hash: a shareable result ---------------- */
  const writeHash = (c: State) => {
    if (c.step !== 6) return;
    try {
      const h = '#plan=' + [c.goal || '-', c.level || '-', c.place || '-', c.obst.join('+') || '-', c.format || '-', c.race || '-'].join('.');
      history.replaceState(history.state, '', h);
    } catch {
      // history unavailable
    }
  };
  const clearHash = () => {
    try {
      if (/^#plan=/.test(location.hash)) history.replaceState(history.state, '', location.pathname + location.search);
    } catch {
      // history unavailable
    }
  };

  /* ---------------- navigation ---------------- */
  // Send the answers for the step the visitor is leaving. One event per answer.
  const commitStep = (c: State, step: number) => {
    const ms = Math.min(Date.now() - stepAt.current, MAX_MS);
    let first = true;
    const ev = (key: string, value: unknown) => {
      const p: Record<string, unknown> = { step, key, value };
      if (first) {
        p.ms = ms;
        first = false;
      }
      track('q_answer', p);
    };
    if (step === 1 && c.goal) ev('goal', c.goal);
    if (step === 2) {
      if (c.level) ev('level', c.level);
      if (c.place) ev('place', c.place);
    }
    if (step === 3 && c.obst.length) ev('obst', c.obst.slice());
    if (step === 4 && c.format) ev('format', c.format);
    if (step === 5) {
      if (captureNote && c.note.trim()) ev('note', scrubNote(c.note));
      const b = raceBucket(raceWeeks(c.race));
      if (b !== 'none') ev('race', b);
    }
  };

  const go = (n: Step, focus = true) => {
    let c = sRef.current;
    const from = c.step;
    if (from <= 5 && n > from && n <= 6 && dlg.current?.open) commitStep(c, from);
    if (n === 7) {
      if (c.step !== 7) {
        const talkFrom = c.step === 6 || (c.step === 8 && c.resultReady) ? 6 : null;
        c = { ...c, talkFrom };
        track('talk_open', { from: pendingTalkFrom.current || (talkFrom === 6 ? 'result' : 'dialog') });
        pendingTalkFrom.current = null;
      }
      if (!c.talkPrefilled) {
        const talk = { ...c.talk };
        if (!talk.goal && c.goal) talk.goal = findOption(GOALS, c.goal)!.label;
        if (!talk.msg && c.note) talk.msg = c.note;
        c = { ...c, talk, talkPrefilled: true };
      }
      setTalkErrors({});
      setTalkStatus('');
    }
    c = { ...c, step: n };
    if (n <= 5) c.maxStep = Math.max(c.maxStep, n);
    if (n === 6) c = { ...c, resultReady: true, maxStep: 5 };
    update(c);
    status.step = n;
    status.resultReady = c.resultReady;
    if (n <= 5) {
      stepAt.current = Date.now();
      track('q_view', { step: n });
    }
    if (n === 6) {
      // One result_view per distinct set of answers, not one per screen visit.
      const r = result();
      const ae = answersEvent();
      const sig = JSON.stringify([ae, r.primaryId, r.secondaryIds]);
      if (sig !== resultSig.current) {
        resultSig.current = sig;
        update({ ...sRef.current, fb: { fit: null, reasons: [], sent: false } });
        track('result_view', { answers: ae, primary: r.primaryId, secondary: r.secondaryIds, trace: r.trace, weeks: r.weeks });
      }
    }
    writeHash(sRef.current);
    if (body.current) body.current.scrollTop = 0;
    if (focus) setFocusTick((t) => t + 1);
  };

  const pick = (key: 'goal' | 'level' | 'place' | 'format' | 'obst', value: string) => {
    let c = sRef.current;
    if (key === 'obst') {
      const v = value as ObstacleId;
      let obst: ObstacleId[];
      if (c.obst.includes(v)) obst = c.obst.filter((x) => x !== v);
      else if (v === 'none') obst = ['none'];
      else obst = [...c.obst.filter((x) => x !== 'none'), v];
      c = { ...c, obst };
    } else {
      c = { ...c, [key]: value };
    }
    update(c);
    if ((key === 'goal' && c.step === 1) || (key === 'format' && c.step === 4)) {
      const from = c.step;
      window.setTimeout(
        () => {
          if (sRef.current.step === from && dlg.current?.open) go((from + 1) as Step);
        },
        reduceMotion.current ? 0 : 200,
      );
    }
  };

  /* ---------------- open and close ---------------- */
  const close = useCallback((reason: 'button' | 'esc' | 'back' = 'button') => {
    closeReason.current = reason;
    if (dlg.current?.open) dlg.current.close();
  }, []);

  const afterClose = () => {
    const c = sRef.current;
    track('dialog_close', {
      step: Math.min(c.step, 8),
      reason: closeReason.current,
      result: c.resultReady,
      ms: Math.min(Date.now() - openedAt.current, MAX_MS),
    });
    status.open = false;
    document.documentElement.classList.remove('hx-lock');
    // Leave the history entry pushed on open, unless Back already did.
    if (closeReason.current !== 'back' && history.state?.hxFinder) {
      ignorePop.current = true;
      history.back();
    } else {
      clearHash();
    }
    closeReason.current = 'button';
    const target = focusAfterClose.current || lastFocus.current;
    if (focusAfterClose.current) window.scrollTo(0, 0);
    focusAfterClose.current = null;
    try {
      target?.focus({ preventScroll: true });
    } catch {
      // the trigger may have gone
    }
  };

  // Open (or reopen) whenever a new request arrives.
  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    reduceMotion.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let c = sRef.current;
    if (request.hash) {
      c = { ...c, ...request.hash, maxStep: 5, resultReady: true, step: 6 };
    }
    if (request.goal) c = { ...c, goal: request.goal };
    if (request.place) c = { ...c, place: request.place };
    if (request.obst) {
      for (const x of request.obst) if (!c.obst.includes(x)) c = { ...c, obst: [...c.obst.filter((y) => y !== 'none'), x] };
    }
    let step = (request.step || c.step) as Step;
    if (!request.step && step >= 7) step = c.resultReady ? 6 : 1;
    update(c);
    lastFocus.current = document.activeElement as HTMLElement | null;
    openedAt.current = Date.now();
    closeReason.current = 'button';
    track('finder_open', { source: request.source, step: Math.min(step, 8) });
    // A tile or story prompt answers a question before the dialog opens: record it too.
    if (request.goal) track('q_answer', { step: 1, key: 'goal', value: request.goal });
    if (request.place) track('q_answer', { step: 2, key: 'place', value: request.place });
    if (request.obst?.length) track('q_answer', { step: 3, key: 'obst', value: request.obst.slice() });

    if (!d.open) {
      d.showModal();
      document.documentElement.classList.add('hx-lock');
      status.open = true;
      // Back on a phone closes the dialog instead of leaving the page.
      try {
        if (!history.state?.hxFinder) history.pushState({ ...(history.state || {}), hxFinder: 1 }, '', location.href);
      } catch {
        // history unavailable
      }
    }
    if (step === 7) {
      pendingTalkFrom.current = request.source === 'nav' ? 'nav' : 'band';
      go(7);
    } else {
      // Show the requested step without committing answers for skipped steps.
      const next = { ...sRef.current, step };
      if (step <= 5) next.maxStep = Math.max(next.maxStep, step);
      update(next);
      status.step = step;
      status.resultReady = next.resultReady;
      if (step <= 5) {
        stepAt.current = Date.now();
        track('q_view', { step });
      }
      if (step === 6) go(6);
      setFocusTick((t) => t + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.nonce]);

  useEffect(() => {
    const onPop = () => {
      if (ignorePop.current) {
        ignorePop.current = false;
        clearHash();
        return;
      }
      if (dlg.current?.open) close('back');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [close]);

  // Consent can change while the dialog is open; the privacy lines follow it.
  useEffect(() => subscribeConsent(() => setTrackingOn(tracker.on)), [tracker]);

  useEffect(() => {
    if (!focusTick) return;
    document.getElementById('f-title')?.focus({ preventScroll: true });
  }, [focusTick]);

  /* ---------------- actions ---------------- */
  const skip = () => {
    focusAfterClose.current = document.getElementById('hx-home');
    onSkip?.(Math.min(sRef.current.step, 8));
    close('button');
  };
  const continueHome = () => {
    focusAfterClose.current = document.getElementById('hx-home');
    onContinue?.();
    close('button');
  };

  const setTalk = (field: TalkField, value: string) => {
    update({ ...sRef.current, talk: { ...sRef.current.talk, [field]: value } });
    if (field in talkErrors) setTalkErrors((e) => ({ ...e, [field]: undefined }));
  };

  const answersText = () => {
    const r = result();
    return r.chips.join(' | ') + ' | Recommended: ' + r.primary.title;
  };

  const submitTalk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const c = sRef.current;
    const t = c.talk;
    const errors: typeof talkErrors = {};
    if (!t.name.trim()) errors.name = 'Please tell us your name.';
    if (!EMAIL.test(t.email.trim())) errors.email = 'Please enter an email address we can reply to.';
    if (!t.goal.trim()) errors.goal = 'Please tell us what you are training for.';
    const bad = Object.keys(errors) as ('name' | 'email' | 'goal')[];
    setTalkErrors(errors);
    if (bad.length) {
      track('talk_invalid', { fields: bad });
      setTalkStatus('Please check the highlighted fields.');
      document.getElementById('t-' + bad[0])?.focus();
      return;
    }
    setTalkStatus('');
    const attached = !!(c.goal && t.attach);
    // Personal details go to the talk endpoint only. The tracker never sees
    // them, and the payload carries no visit id, so a lead cannot be joined to
    // a tracked visit.
    const payload = {
      name: t.name.trim(),
      email: t.email.trim(),
      goal: t.goal.trim(),
      week: t.week.trim(),
      message: t.msg.trim(),
      answers: attached ? answersText() : null,
      plan: attached ? { answers: answersEvent(), recommended: result().primaryId } : null,
      source: mode,
    };
    const done = () => {
      update({ ...sRef.current, talk: EMPTY_TALK, talkPrefilled: false });
      go(8);
    };
    if (!talkEndpoint) {
      done();
      return;
    }
    setSending(true);
    try {
      const res = await fetch(talkEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('bad status');
      track('talk_submit', { ok: true, attached });
      done();
    } catch {
      track('talk_submit', { ok: false, attached });
      setTalkStatus('Sorry, your message did not send. Please try again in a moment.');
    } finally {
      setSending(false);
    }
  };

  const productClick = (id: ProductId, slot: 'primary' | 'secondary') => {
    const p = funnel.catalog[id];
    track('result_click', { product: id, slot, dest: p.destinationType, affiliate: !!p.affiliate });
    if (!productLink(p).newTab) tracker.flush(true);
  };

  /* ---------------- rendering ---------------- */
  const step = s.step;
  const next = canNext(s);

  const optButton = (key: 'goal' | 'level' | 'place' | 'format' | 'obst', value: string, className: string, children: React.ReactNode) => {
    const on = key === 'obst' ? s.obst.includes(value as ObstacleId) : s[key] === value;
    return (
      <button key={value} type="button" data-k={key} data-v={value} className={`hx-opt group ${className}`} aria-pressed={on} onClick={() => pick(key, value)}>
        {children}
      </button>
    );
  };

  const leftColumn = (n: 1 | 2 | 3 | 4 | 5) => (
    <div>
      <span className="hx-chip max-md:hidden">Station 0{n}</span>
      <h2 id="f-title" tabIndex={-1} className="hx-h2 mt-5 outline-none max-md:mt-0">
        {funnel.steps[n].title}
      </h2>
      <p className="mt-5 max-w-[440px] text-lg leading-relaxed text-hx-mute max-md:mt-4 max-md:text-base">{funnel.steps[n].help}</p>
    </div>
  );

  const privacyLine = () => {
    const P = COPY.privacy;
    if (!trackingOn) return P.trackingOff;
    return (
      <>
        {captureNote ? P.trackingOn : P.trackingOnNoNote}{' '}
        {privacyHref && (
          <a className="font-semibold text-white underline decoration-hx-yellow decoration-2 underline-offset-[5px] hx-focus" href={privacyHref} target="_blank" rel="noopener">
            {P.linkLabel}
          </a>
        )}
      </>
    );
  };

  const question = (n: 1 | 2 | 3 | 4 | 5) => {
    let right: React.ReactNode;
    if (n === 1) {
      right = (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {GOALS.map((g) =>
            optButton(
              'goal',
              g.id,
              'md:min-h-[112px] md:px-[22px] md:py-5',
              <>
                <span className="font-headline text-xl font-bold leading-tight">{g.label}</span>
                <span className="text-sm leading-snug text-hx-mute group-aria-pressed:text-black">{g.sub}</span>
              </>,
            ),
          )}
        </div>
      );
    } else if (n === 2) {
      right = (
        <>
          <div role="group" aria-labelledby="g-lvl">
            <div id="g-lvl" className="hx-label mb-3 text-hx-mute">
              Your experience
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {LEVELS.map((l) => optButton('level', l.id, 'min-h-[76px] justify-center', l.label))}
            </div>
          </div>
          <div role="group" aria-labelledby="g-plc" className="mt-8">
            <div id="g-plc" className="hx-label mb-3 text-hx-mute">
              Where you train
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {PLACES.map((p) => optButton('place', p.id, 'min-h-16 justify-center max-md:px-3 max-md:py-3.5', p.label))}
            </div>
          </div>
        </>
      );
    } else if (n === 3) {
      right = (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2" role="group" aria-label="What has got in the way before? Choose as many as apply">
          {OBSTACLES.map((o) =>
            optButton(
              'obst',
              o.id,
              'min-h-16 flex-row items-center justify-start gap-4 md:min-h-20',
              <>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-hx-mute group-aria-pressed:border-black group-aria-pressed:bg-black">
                  <Check aria-hidden className="h-4 w-4 stroke-[3.2] text-hx-yellow opacity-0 group-aria-pressed:opacity-100" />
                </span>
                <span>{o.label}</span>
              </>,
            ),
          )}
        </div>
      );
    } else if (n === 4) {
      right = (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {FORMATS.map((f) =>
            optButton(
              'format',
              f.id,
              'p-[22px] md:min-h-[150px]',
              <>
                <span className="font-headline text-[22px] font-bold leading-tight">{f.label}</span>
                <span className="text-sm leading-snug text-hx-mute group-aria-pressed:text-black">{f.sub}</span>
              </>,
            ),
          )}
        </div>
      );
    } else {
      right = (
        <div className="max-w-[640px]">
          <div className="flex flex-col gap-2">
            <label htmlFor="note" className="text-sm font-semibold text-white">
              Anything else we should know?
            </label>
            <textarea
              id="note"
              className="hx-input min-h-[120px] resize-y py-3.5"
              rows={5}
              maxLength={500}
              placeholder="For example, your race, your weekly schedule or the equipment you have"
              value={s.note}
              onChange={(e) => update({ ...sRef.current, note: e.target.value })}
              aria-describedby="f-privacy"
            />
          </div>
          <div className="mt-[18px] flex flex-col gap-2">
            <label htmlFor="race" className="text-sm font-semibold text-white">
              Race date <span className="font-normal text-hx-mute">(optional)</span>
            </label>
            <input id="race" type="date" className="hx-input max-w-[260px]" min={todayISO()} value={s.race} onChange={(e) => update({ ...sRef.current, race: e.target.value })} />
          </div>
          <p id="f-privacy" className="mt-[18px] text-sm leading-normal text-hx-mute">
            {privacyLine()}
          </p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-[clamp(32px,5.55vw,80px)]">
        {leftColumn(n)}
        <div>{right}</div>
      </div>
    );
  };

  const resultView = () => {
    const r = result();
    const p = r.primary;
    const primaryLink = productLink(p);
    // Below lg the two columns dissolve into one ordered column, so the
    // recommendation comes straight after the heading on a phone.
    return (
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-[clamp(32px,5.55vw,80px)]">
        <div className="flex flex-col max-lg:contents">
          <span className="hx-chip self-start max-lg:order-1">{COPY.result.chip}</span>
          <h2 id="f-title" tabIndex={-1} className="hx-h2 mt-5 outline-none max-lg:order-2">
            {COPY.result.headPrefix} <span className="text-hx-yellow">{p.head}.</span>
          </h2>
          <div className="mt-6 flex flex-wrap gap-2 max-lg:order-6 max-lg:mt-8">
            {r.chips.map((c) => (
              <span key={c} className="hx-pill bg-hx-card">
                {c}
              </span>
            ))}
          </div>
          <p className="mt-6 max-w-[460px] text-[17px] leading-relaxed text-hx-mute max-lg:order-7">{r.why}</p>
          <button type="button" className="hx-ulink mt-3.5 self-start max-lg:order-8" onClick={() => {
            track('result_restart');
            go(1);
          }}>
            {COPY.result.changeAnswers}
          </button>
        </div>
        <div className="flex flex-col max-lg:contents">
          <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-4 rounded-xl border border-t-[6px] border-hx-line border-t-hx-yellow bg-hx-card p-[clamp(20px,2vw,28px)] max-lg:order-3 max-lg:mt-6 md:grid-cols-[128px_minmax(0,1fr)] md:gap-[26px]">
            <div aria-hidden className="flex h-[132px] w-24 flex-col justify-between rounded-md bg-hx-yellow p-2.5 text-black md:h-44 md:w-32 md:p-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/plan-finder/hybridx-logo-full.png" alt="" className="h-[26px] w-auto self-start md:h-[38px]" />
              <span className="font-headline text-xs font-bold leading-tight [overflow-wrap:anywhere] md:text-base">{p.title.toUpperCase()}</span>
              <span className="hx-label">{p.badge}</span>
            </div>
            <div>
              <div className="hx-label text-hx-yellow">Best fit, {p.kind.toLowerCase()}</div>
              <div data-result-title className="mt-2 font-headline text-[clamp(24px,2.1vw,30px)] font-bold leading-[1.12] tracking-[-0.01em]">{p.title}</div>
              <div className="mt-2 text-sm leading-normal text-hx-mute">{p.meta}</div>
              <div className="mt-4 flex flex-col items-start gap-3 md:flex-row md:flex-wrap md:items-center md:gap-x-[18px]">
                <a
                  className="hx-btn max-md:w-full"
                  data-product={r.primaryId}
                  data-slot="primary"
                  href={primaryLink.href}
                  target={primaryLink.newTab ? '_blank' : undefined}
                  rel={primaryLink.rel}
                  onClick={() => productClick(r.primaryId, 'primary')}
                >
                  {p.cta} <ArrowRight aria-hidden className="h-[18px] w-[18px] stroke-[2.4]" />
                </a>
                <span className="text-[15px] font-semibold">{p.price}</span>
              </div>
            </div>
          </div>
          {r.secondary.length > 0 && <div className="hx-label mt-7 text-hx-mute max-lg:order-4">{COPY.result.alsoUseful}</div>}
          {r.secondary.map((x, i) => {
            const link = productLink(x);
            return (
              <a
                key={x.id}
                data-product={r.secondaryIds[i]}
                data-slot="secondary"
                className="hx-focus mt-3 flex min-h-[84px] items-center justify-between gap-4 rounded-xl border border-hx-line bg-hx-card px-4 py-3.5 transition-colors hover:border-hx-yellow max-lg:order-5 md:px-[22px] md:py-4"
                href={link.href}
                target={link.newTab ? '_blank' : undefined}
                rel={link.rel}
                onClick={() => productClick(r.secondaryIds[i], 'secondary')}
              >
                <span className="flex flex-col gap-1">
                  <span className="hx-label text-hx-yellow">{x.kind}</span>
                  <span data-extra-title className="font-headline text-xl font-bold leading-tight">{x.title}</span>
                  <span className="text-sm text-hx-mute">{x.meta}</span>
                </span>
                <ArrowRight aria-hidden className="h-[18px] w-[18px] shrink-0 stroke-[2.4] text-hx-yellow" />
              </a>
            );
          })}
          {trackingOn && feedback()}
        </div>
      </div>
    );
  };

  const feedback = () => {
    const F = COPY.feedback;
    const fb = s.fb;
    return (
      <div className="mt-7 border-t border-hx-line pt-6 max-lg:order-9">
        <div className="hx-label">{F.title}</div>
        {fb.sent ? (
          <p role="status" className="mt-3 text-[15px] text-hx-mute">
            {F.thanks}
          </p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {F.fit.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="hx-pill-btn"
                  aria-pressed={fb.fit === o.id}
                  onClick={() => {
                    if (o.id === 'yes') {
                      track('result_feedback', { fit: 'yes' });
                      update({ ...sRef.current, fb: { fit: 'yes', reasons: [], sent: true } });
                    } else {
                      update({ ...sRef.current, fb: { ...sRef.current.fb, fit: o.id } });
                    }
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {(fb.fit === 'partly' || fb.fit === 'no') && (
              <>
                <div id="fb-why" className="hx-label mt-5">
                  {F.whyTitle}
                </div>
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-labelledby="fb-why">
                  {F.reasons.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className="hx-pill-btn"
                      aria-pressed={fb.reasons.includes(o.id)}
                      onClick={() => {
                        const cur = sRef.current.fb;
                        const reasons = cur.reasons.includes(o.id) ? cur.reasons.filter((x) => x !== o.id) : [...cur.reasons, o.id];
                        update({ ...sRef.current, fb: { ...cur, reasons } });
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="hx-btn hx-btn-line mt-4"
                  onClick={() => {
                    const cur = sRef.current.fb;
                    track('result_feedback', { fit: cur.fit, reasons: cur.reasons.slice() });
                    update({ ...sRef.current, fb: { ...cur, sent: true } });
                  }}
                >
                  {F.send}
                </button>
              </>
            )}
          </>
        )}
      </div>
    );
  };

  const field = (id: TalkField, label: string, opts: { type?: string; autoComplete?: string; optional?: boolean; area?: boolean }) => {
    const err = id === 'name' || id === 'email' || id === 'goal' ? talkErrors[id] : undefined;
    const common = {
      id: 't-' + id,
      className: 'hx-input' + (opts.area ? ' min-h-[120px] resize-y py-3.5' : ''),
      value: s.talk[id],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setTalk(id, e.target.value),
      'aria-invalid': err ? true : undefined,
      'aria-describedby': err ? `t-${id}-e` : undefined,
      required: !opts.optional,
    };
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={'t-' + id} className="text-sm font-semibold text-white">
          {label} {opts.optional && <span className="font-normal text-hx-mute">(optional)</span>}
        </label>
        {opts.area ? <textarea rows={4} {...common} /> : <input type={opts.type || 'text'} autoComplete={opts.autoComplete} {...common} />}
        {err && (
          <div id={`t-${id}-e`} className="flex items-start gap-2 text-sm font-semibold leading-snug text-white">
            <b aria-hidden className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-hx-yellow text-[13px] font-bold leading-none text-black">
              !
            </b>
            <span>{err}</span>
          </div>
        )}
      </div>
    );
  };

  const talkView = () => {
    const T = COPY.talk;
    return (
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-[clamp(32px,5.55vw,80px)]">
        <div>
          <span className="hx-chip">{T.chip}</span>
          <h2 id="f-title" tabIndex={-1} className="hx-h2 mt-5 outline-none">
            Tell us what you are <span className="text-hx-yellow">after.</span>
          </h2>
          <p className="mt-5 max-w-[440px] text-lg leading-relaxed text-hx-mute max-md:text-base">{T.help}</p>
          {s.talkFrom === 6 && (
            <button type="button" className="hx-ulink mt-3" onClick={() => go(6)}>
              Back to my result
            </button>
          )}
        </div>
        <form noValidate onSubmit={submitTalk} className="rounded-xl border border-t-[6px] border-hx-line border-t-hx-yellow bg-hx-card p-[clamp(20px,2.2vw,32px)]">
          <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 md:gap-4">
            {field('name', 'Your name', { autoComplete: 'name' })}
            {field('email', 'Your email', { type: 'email', autoComplete: 'email' })}
          </div>
          <div className="mt-[18px]">{field('goal', 'What are you training for?', {})}</div>
          <div className="mt-[18px]">{field('week', 'What does your training week look like?', { optional: true })}</div>
          <div className="mt-[18px]">{field('msg', 'What is getting in the way?', { optional: true, area: true })}</div>
          {s.goal && (
            <label className="mt-[18px] flex items-start gap-3 text-[15px] leading-snug">
              <input
                type="checkbox"
                className="hx-focus h-6 w-6 shrink-0 accent-hx-yellow"
                checked={s.talk.attach}
                onChange={(e) => update({ ...sRef.current, talk: { ...sRef.current.talk, attach: e.target.checked } })}
              />
              <span>{T.attachLabel}</span>
            </label>
          )}
          <p className="mt-[18px] text-sm leading-normal text-hx-mute">{T.note}</p>
          <div className="mt-[22px] flex flex-col items-start gap-3.5">
            {talkStatus && (
              <div role="status" aria-live="polite" className="text-sm font-semibold text-white">
                {talkStatus}
              </div>
            )}
            <button type="submit" className="hx-btn hx-btn-lg" aria-disabled={sending || undefined}>
              {sending ? 'Sending…' : 'Send message'} <ArrowRight aria-hidden className="h-[18px] w-[18px] stroke-[2.4]" />
            </button>
          </div>
        </form>
      </div>
    );
  };

  const sentView = () => {
    const live = !!talkEndpoint;
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-[18px] py-6 text-center">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-hx-yellow text-black">
          <Check aria-hidden className="h-[34px] w-[34px] stroke-[2.6]" />
        </div>
        {live ? (
          <>
            <h2 id="f-title" tabIndex={-1} className="hx-h2 outline-none">
              Thank you. Your message is <span className="text-hx-yellow">with us.</span>
            </h2>
            <p className="max-w-[520px] text-lg leading-relaxed text-hx-mute">We will read what you have written and come back to you by email.</p>
          </>
        ) : (
          <>
            <h2 id="f-title" tabIndex={-1} className="hx-h2 outline-none">
              This is a preview. <span className="text-hx-yellow">Nothing was sent.</span>
            </h2>
            <p className="max-w-[520px] text-lg leading-relaxed text-hx-mute">
              On the live site this step sends your message to the HybridX team, who reply by email. This copy of the site is not connected to an inbox yet.
            </p>
          </>
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-4">
          {s.resultReady && (
            <button type="button" className="hx-btn hx-btn-line" onClick={() => go(6)}>
              Back to my result
            </button>
          )}
          {entry ? (
            <button type="button" className="hx-btn" onClick={continueHome}>
              {COPY.entry.continueLabel}
            </button>
          ) : (
            <a className="hx-btn" href="/">
              Go to the homepage
            </a>
          )}
        </div>
      </div>
    );
  };

  const strip = () => {
    if (step > 6) return null;
    return (
      <div className="px-[var(--fpad)] pt-4 md:pt-6">
        <div className="grid grid-cols-5 gap-2 md:gap-3">
          {funnel.stations.map((name, i) => {
            const n = i + 1;
            const cur = step === n;
            const done = step > n;
            const reachable = n <= s.maxStep && !cur;
            return (
              <button
                key={name}
                type="button"
                disabled={!reachable}
                aria-current={cur ? 'step' : undefined}
                aria-label={`Station ${n} of 5, ${name}`}
                className={`hx-focus hx-label flex flex-col items-stretch gap-2.5 text-left disabled:cursor-default ${
                  cur ? 'text-white' : done ? 'text-hx-mute enabled:hover:text-white' : 'text-hx-ctl enabled:hover:text-white'
                }`}
                onClick={() => {
                  track('q_jump', { from: Math.min(step, 8), to: n });
                  go(n as Step);
                }}
              >
                <i className={`block h-1.5 rounded-sm ${cur || done ? 'bg-hx-yellow' : 'bg-hx-line'}`} />
                <span className="max-md:hidden">
                  0{n} · {name}
                </span>
              </button>
            );
          })}
        </div>
        {step <= 5 && (
          <div aria-hidden className="hx-label mt-3 text-white md:hidden">
            Station 0{step} of 05 · {funnel.stations[step - 1]}
          </div>
        )}
      </div>
    );
  };

  const foot = () => {
    if (step >= 7) return null;
    const hint = step <= 5 && !next ? funnel.steps[String(step) as '1'].hint : null;
    if (step <= 5) {
      return (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-hx-line px-[var(--fpad)] py-3 md:min-h-24 md:flex-nowrap md:gap-4 md:py-4">
          <div>
            {step > 1 && (
              <button
                type="button"
                className="hx-btn hx-btn-line"
                onClick={() => {
                  track('q_back', { step: Math.min(step, 8) });
                  go(Math.max(1, step - 1) as Step);
                }}
              >
                Back
              </button>
            )}
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-x-4 gap-y-2 md:flex-none md:gap-5">
            <span className="text-sm text-hx-mute max-md:order-first max-md:basis-full max-md:text-right" aria-live="polite">
              {hint || ''}
            </span>
            <button
              id="f-next"
              type="button"
              className="hx-btn"
              aria-disabled={!next}
              onClick={() => {
                if (canNext()) go(Math.min(6, step + 1) as Step);
              }}
            >
              {step === 5 ? 'See my plan' : 'Continue'} <ArrowRight aria-hidden className="h-[18px] w-[18px] stroke-[2.4]" />
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-hx-line px-[var(--fpad)] py-3 md:min-h-24 md:flex-nowrap md:gap-4 md:py-4">
        <span className="text-[17px] text-hx-mute max-md:basis-full">{COPY.result.noFit}</span>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-x-4 gap-y-2 md:flex-none md:gap-5">
          <button type="button" className="hx-btn hx-btn-ghost" onClick={() => go(7)}>
            {COPY.result.talkCta}
          </button>
          {entry && (
            <button type="button" className="hx-btn" onClick={continueHome}>
              {COPY.entry.continueLabel} <ArrowRight aria-hidden className="h-[18px] w-[18px] stroke-[2.4]" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const dialog = (
    <dialog
      ref={dlg}
      className="hx-finder fixed inset-0 m-0 h-[100dvh] max-h-none w-full max-w-none overflow-hidden border-0 bg-black p-0 font-body text-white [--fpad:max(clamp(20px,6.67vw,96px),calc((100%_-_1248px)/2))]"
      aria-labelledby="f-title"
      onCancel={() => {
        closeReason.current = 'esc';
      }}
      onClose={afterClose}
    >
      <div className="flex h-16 items-center justify-between gap-4 bg-white px-[var(--fpad)] text-black md:h-20">
        <div className="flex items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/plan-finder/hybridx-logo-full.png" alt="HybridX.club" className="h-11 w-auto md:h-14" />
          <span aria-hidden className="h-7 w-px bg-hx-lineL max-md:hidden" />
          <span className="hx-label max-md:hidden">Plan finder</span>
        </div>
        <div className="flex items-center gap-3 md:gap-6">
          {entry && step <= 5 && (
            <button
              type="button"
              data-skip="dialog"
              className="hx-focus inline-flex min-h-11 items-center px-1 text-[15px] font-semibold text-black underline decoration-hx-yellow decoration-[3px] underline-offset-[5px] hover:decoration-black md:text-base"
              onClick={skip}
            >
              {COPY.entry.skipLabel}
            </button>
          )}
          <button
            type="button"
            className="hx-focus inline-flex min-h-11 items-center gap-2.5 px-1 text-[15px] font-semibold text-black decoration-hx-yellow decoration-[3px] underline-offset-[5px] hover:underline md:text-base"
            onClick={() => close('button')}
          >
            <span>Close</span>
            <X aria-hidden className="h-[18px] w-[18px] stroke-[2.4]" />
          </button>
        </div>
      </div>
      {strip() ?? <div />}
      <div ref={body} className="overflow-auto px-[var(--fpad)] py-7 md:pb-10 md:pt-11">
        {step <= 5 ? question(step as 1 | 2 | 3 | 4 | 5) : step === 6 ? resultView() : step === 7 ? talkView() : sentView()}
      </div>
      {foot() ?? <div />}
    </dialog>
  );

  return createPortal(dialog, document.body);
}
