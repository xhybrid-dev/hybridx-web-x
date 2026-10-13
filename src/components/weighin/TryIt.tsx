'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import {
  fillWindow,
  formatEntry,
  formatKg,
  formatShortDate,
  HoldRepeat,
  lastText,
  makeLog,
  rangeFor,
  SAMPLE_DAYS,
  SAMPLE_LAST_DAY,
  SAMPLE_SEED,
  startValue,
  stepEntry,
  trendOf,
  TREND_PERCENT,
  type Entry,
} from '@/lib/weighin-core';
import { FIRST_DAY, SAMPLE, SAMPLE_PROFILE } from './sample';
import type { WatchView } from './WatchScreen';
import WeighWatch from './WeighWatch';
import styles from './TryIt.module.css';

/*
 * X Weigh-in, working, on the page. The watch runs the app's own screens and
 * buttons (PageScreens.cpp, EntryScreens.cpp): UP and DOWN turn the pages,
 * SELECT weighs in, UP and DOWN set the weight in 0.1 kg steps (hold to
 * repeat, with the watch's own timings), SELECT saves, and Saved goes back to
 * Home after three seconds or any button. Everything it shows comes from
 * lib/weighin-core.ts, the port of the app's core.
 *
 * The person is the sample's: 40 days of make_log, to Monday 12 October, and
 * after that the same model's mornings, one per "Next morning", on a scale
 * beside the watch. The visitor dials in what the scale says, or anything
 * else; weighing in twice the same morning replaces the first, as on the
 * watch. Nothing leaves the page.
 */

type Screen = 'home' | 'graph' | 'recent' | 'body' | 'weighIn' | 'saved';
const PAGES: Screen[] = ['home', 'graph', 'recent', 'body'];
const SAVED_MS = 3000;
const TICK_MS = 50;
const MORE_DAYS = 60;

interface Reading {
  hundredths: number;
  minute: number;
  salty: boolean;
}

// The sample's mornings after 12 October: make_log's model, carried on.
const NEXT_READINGS: Reading[] = (() => {
  const { scale } = makeLog(SAMPLE_DAYS, SAMPLE_SEED, SAMPLE_LAST_DAY);
  return Array.from({ length: MORE_DAYS }, (_, j) => scale.day(SAMPLE_DAYS + j, false)!);
})();
const LAST_LOGGED = SAMPLE[SAMPLE.length - 1];

function readingFor(day: number): Reading {
  if (day <= SAMPLE_LAST_DAY) return { hundredths: LAST_LOGGED.hundredths, minute: LAST_LOGGED.minute, salty: false };
  return NEXT_READINGS[Math.min(MORE_DAYS - 1, day - SAMPLE_LAST_DAY - 1)];
}

interface State {
  log: Entry[];
  today: number;
  screen: Screen;
  value: number;
  saved: number;
  /** Entries the visitor added, for the log's highlight. */
  added: number;
  note: string | null;
}

type Action =
  | { type: 'up' | 'down' | 'select' | 'back' | 'home' | 'next' | 'reset' }
  | { type: 'step'; steps: number }
  | { type: 'clearNote' };

const INITIAL: State = { log: SAMPLE, today: SAMPLE_LAST_DAY, screen: 'home', value: 0, saved: 0, added: 0, note: null };

function reducer(s: State, a: Action): State {
  const page = PAGES.indexOf(s.screen);
  switch (a.type) {
    case 'up':
    case 'down': {
      if (s.screen === 'saved') return { ...s, screen: 'home' };
      if (page < 0) return s;
      const next = (page + (a.type === 'up' ? PAGES.length - 1 : 1)) % PAGES.length;
      return { ...s, screen: PAGES[next], note: null };
    }
    case 'step':
      return s.screen === 'weighIn' ? { ...s, value: stepEntry(s.value, a.steps) } : s;
    case 'select': {
      if (s.screen === 'saved') return { ...s, screen: 'home' };
      if (s.screen === 'weighIn') {
        const reading = readingFor(s.today);
        const sameDay = s.log.filter((e) => e.day === s.today);
        const minute = Math.min(1439, Math.max(reading.minute, ...sameDay.map((e) => e.minute + 1)));
        return {
          ...s,
          log: [...s.log, { day: s.today, minute, hundredths: s.value }],
          screen: 'saved',
          saved: s.value,
          added: s.added + 1,
          note: null,
        };
      }
      const latest = trendOf(s.log).summary().latest;
      return { ...s, screen: 'weighIn', value: startValue(latest, 0), note: null };
    }
    case 'back':
      if (s.screen === 'weighIn' || s.screen === 'saved') return { ...s, screen: 'home' };
      return { ...s, note: 'On the watch, BACK leaves the app. Here, it stays.' };
    case 'home':
      return s.screen === 'saved' ? { ...s, screen: 'home' } : s;
    case 'next':
      if (s.today - SAMPLE_LAST_DAY >= MORE_DAYS) return s;
      return { ...s, today: s.today + 1, screen: s.screen === 'weighIn' || s.screen === 'saved' ? 'home' : s.screen, note: null };
    case 'reset':
      return INITIAL;
    case 'clearNote':
      return { ...s, note: null };
  }
}

type Button = 'up' | 'down' | 'select' | 'back';

const BUTTON_LABEL: Record<Button, string> = { up: 'UP', down: 'DOWN', select: 'SELECT', back: 'BACK' };

// The large chart beside the watch.
const CW = 640;
const CH = 300;
const CP = { left: 60, right: 18, top: 22, bottom: 34 };

export default function TryIt() {
  const [s, dispatch] = useReducer(reducer, INITIAL);
  const hold = useRef(new HoldRepeat());
  const heldDir = useRef(0);
  const ticker = useRef<number | null>(null);

  const trend = useMemo(() => trendOf(s.log), [s.log]);
  const summary = trend.summary();
  const win = useMemo(() => fillWindow(trend), [trend]);
  const reading = readingFor(s.today);
  const loggedToday = s.log.filter((e) => e.day === s.today);

  // Saved goes back to Home after three seconds, as on the watch.
  useEffect(() => {
    if (s.screen !== 'saved') return;
    const id = window.setTimeout(() => dispatch({ type: 'home' }), SAVED_MS);
    return () => window.clearTimeout(id);
  }, [s.screen, s.saved, s.added]);

  useEffect(() => {
    if (!s.note) return;
    const id = window.setTimeout(() => dispatch({ type: 'clearNote' }), 3200);
    return () => window.clearTimeout(id);
  }, [s.note]);

  const stopTicker = useCallback(() => {
    if (ticker.current !== null) window.clearInterval(ticker.current);
    ticker.current = null;
  }, []);
  useEffect(() => stopTicker, [stopTicker]);

  // A press and a release, as the kernel sends them; the click follows the release.
  const press = useCallback(
    (b: Button) => {
      if ((b === 'up' || b === 'down') && s.screen === 'weighIn') {
        heldDir.current = b === 'up' ? 1 : -1;
        hold.current.press(performance.now());
        stopTicker();
        ticker.current = window.setInterval(() => {
          const steps = hold.current.tick(performance.now());
          if (steps > 0) dispatch({ type: 'step', steps: heldDir.current * steps });
        }, TICK_MS);
      }
    },
    [s.screen, stopTicker],
  );

  const releaseAndClick = useCallback(
    (b: Button) => {
      const now = performance.now();
      if (b === 'up' || b === 'down') {
        stopTicker();
        hold.current.release(now);
        if (s.screen === 'weighIn') {
          if (hold.current.takeClick(now)) dispatch({ type: 'step', steps: b === 'up' ? 1 : -1 });
          heldDir.current = 0;
          return;
        }
      }
      dispatch({ type: b });
    },
    [s.screen, stopTicker],
  );

  const pressed = useRef<Button | null>(null);
  const handlers = (b: Button) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      pressed.current = b;
      press(b);
    },
    onPointerUp: () => {
      if (pressed.current !== b) return;
      pressed.current = null;
      releaseAndClick(b);
    },
    onPointerCancel: () => {
      if (pressed.current !== b) return;
      pressed.current = null;
      stopTicker();
      hold.current.release(performance.now());
    },
    onClick: (e: MouseEvent<HTMLButtonElement>) => {
      // A keyboard activation (Enter or Space on the button) has no pointer.
      if (e.detail === 0) {
        press(b);
        releaseAndClick(b);
      }
    },
    // A long press is a hold, not a phone's context menu.
    onContextMenu: (e: MouseEvent<HTMLButtonElement>) => e.preventDefault(),
  });

  const keyFor = (key: string): Button | null =>
    key === 'ArrowUp' ? 'up' : key === 'ArrowDown' ? 'down' : key === 'Enter' ? 'select' : key === 'Escape' || key === 'Backspace' ? 'back' : null;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
    const b = keyFor(e.key);
    if (!b) return;
    e.preventDefault();
    if (e.repeat) return;
    pressed.current = b;
    press(b);
  };
  const onKeyUp = (e: KeyboardEvent<HTMLDivElement>) => {
    const b = keyFor(e.key);
    if (!b || pressed.current !== b) return;
    e.preventDefault();
    pressed.current = null;
    releaseAndClick(b);
  };

  const view: WatchView = (() => {
    switch (s.screen) {
      case 'home':
        return { screen: 'home', summary, today: s.today };
      case 'graph':
        return { screen: 'graph', window: win };
      case 'recent':
        return { screen: 'recent', window: win };
      case 'body':
        return { screen: 'body', summary, ...SAMPLE_PROFILE };
      case 'weighIn':
        return { screen: 'weighIn', value: s.value, hint: summary.days ? lastText(summary, s.today) : 'UP and DOWN to set' };
      case 'saved':
        return { screen: 'saved', saved: s.saved, summary };
    }
  })();

  // The chart: the same 30 days as the Graph page, drawn large.
  const range = rangeFor(win.weight, win.trend);
  const plotW = CW - CP.left - CP.right;
  const plotH = CH - CP.top - CP.bottom;
  const X = (i: number) => CP.left + ((30 - win.weight.length + i) / 29) * plotW;
  const Y = (v: number) => (range ? CP.top + ((range.hi - v) / (range.hi - range.lo)) * plotH : CP.top);
  const todayIdx = s.today - win.firstDay;
  const trendLine = win.trend.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const kgLines = range ? Array.from({ length: Math.floor(range.hi / 100) - Math.ceil(range.lo / 100) + 1 }, (_, i) => (Math.ceil(range.lo / 100) + i) * 100) : [];

  // How today's trend came about, when yesterday was weighed too.
  const yesterday = trend.at(s.today - 1);
  const todayPoint = trend.at(s.today);
  const sum =
    todayPoint && todayPoint.hundredths && yesterday && yesterday.hundredths
      ? `${formatKg(yesterday.trend, 2)} + (${formatKg(todayPoint.hundredths, 2)} − ${formatKg(yesterday.trend, 2)}) × ${TREND_PERCENT}% = ${formatKg(todayPoint.trend, 2)}`
      : null;

  const lines = [...s.log.slice(-5)].map((e, i, arr) => ({
    text: formatEntry(e),
    added: s.log.length - arr.length + i >= SAMPLE.length,
    key: `${s.log.length - arr.length + i}`,
  }));
  const daysIn = s.today - FIRST_DAY + 1;
  const atEnd = s.today - SAMPLE_LAST_DAY >= MORE_DAYS;

  return (
    <div className={styles.sim} onKeyDown={onKeyDown} onKeyUp={onKeyUp}>
      <div className={styles.watchSide}>
        <WeighWatch view={view} label={`The watch, showing ${s.screen === 'weighIn' ? 'Weigh in' : s.screen}`} sizes="(max-width: 700px) 80vw, 360px" className={styles.watch}>
          {(['up', 'down', 'select', 'back'] as Button[]).map((b) => (
            <button key={b} type="button" tabIndex={-1} aria-hidden="true" className={`${styles.caseButton} ${styles[`case_${b}`]}`} {...handlers(b)} />
          ))}
        </WeighWatch>

        <div className={styles.controls} role="group" aria-label="The watch's buttons">
          {(['up', 'down', 'select', 'back'] as Button[]).map((b) => (
            <button key={b} type="button" className={`${styles.ctl} ${b === 'select' ? styles.ctlSelect : ''}`} {...handlers(b)}>
              {BUTTON_LABEL[b]}
            </button>
          ))}
        </div>
        <p className={styles.hint} aria-live="polite">
          {s.note ??
            (s.screen === 'weighIn'
              ? 'UP and DOWN: 0.1 kg. Hold either to move quickly. SELECT saves.'
              : s.screen === 'saved'
                ? 'Back to Home in three seconds, or press any button.'
                : 'UP and DOWN turn the pages. SELECT to weigh in.')}
        </p>
        <p className={styles.keys}>Keys: ↑ ↓ Enter Esc</p>
      </div>

      <div className={styles.side}>
        <div className={styles.scale}>
          <div className={styles.scaleHead}>
            <span>The scale, {formatShortDate(s.today)}</span>
            <span>Day {daysIn}</span>
          </div>
          <div className={styles.scaleBody}>
            <p className={styles.lcd} aria-label={`The scale says ${formatKg(reading.hundredths, 1)} kilograms`}>
              {formatKg(reading.hundredths, 1)}
              <small>kg</small>
            </p>
            <div className={styles.scaleNote}>
              {loggedToday.length ? (
                <p className={styles.logged}>
                  Logged {formatKg(loggedToday[loggedToday.length - 1].hundredths, 1)}
                  {loggedToday.length > 1 ? `, weighed ${loggedToday.length} times: the latest counts` : ''}
                </p>
              ) : (
                <p>Not logged yet. SELECT on the watch, dial it in, SELECT.</p>
              )}
              {reading.salty ? <p className={styles.salty}>A salty dinner last night.</p> : null}
            </div>
          </div>
          <div className={styles.scaleActions}>
            <button type="button" className={styles.next} onClick={() => dispatch({ type: 'next' })} disabled={atEnd}>
              Next morning <span aria-hidden="true">→</span>
            </button>
            <button type="button" className={styles.reset} onClick={() => dispatch({ type: 'reset' })}>
              Start again
            </button>
          </div>
        </div>

        <figure className={styles.chartBox}>
          <figcaption className={styles.chartHead}>
            <span>Last 30 days</span>
            <span className={styles.legend}>
              <i className={styles.legendDot} /> weigh-in <i className={styles.legendLine} /> trend
            </span>
          </figcaption>
          <svg viewBox={`0 0 ${CW} ${CH}`} className={styles.chart} role="img" aria-label={`The last 30 days: trend ${formatKg(summary.trend, 1)} kg.`}>
            {kgLines.map((v) => (
              <g key={v}>
                <line x1={CP.left} x2={CW - CP.right} y1={Y(v)} y2={Y(v)} className={styles.grid} />
                <text x={CP.left - 10} y={Y(v) + 4} textAnchor="end" className={styles.axis}>
                  {formatKg(v, 1)}
                </text>
              </g>
            ))}
            {todayIdx >= 0 && todayIdx < 30 ? (
              <rect x={X(todayIdx) - 9} y={CP.top} width={18} height={plotH} rx={4} className={styles.todayBand} />
            ) : null}
            {win.weight.map((v, i) =>
              v ? <circle key={i} cx={X(i)} cy={Y(v)} r={i === todayIdx ? 5 : 3.6} className={i === todayIdx ? styles.dotToday : styles.dot} /> : null,
            )}
            <polyline points={trendLine} className={styles.trendGlow} />
            <polyline points={trendLine} className={styles.trend} />
            {win.weight.length ? (
              <text x={CW - CP.right} y={CH - 8} textAnchor="end" className={styles.axis}>
                {formatShortDate(win.firstDay + win.weight.length - 1).toUpperCase()}
              </text>
            ) : null}
            <text x={CP.left} y={CH - 8} className={styles.axis}>
              {formatShortDate(win.firstDay).toUpperCase()}
            </text>
          </svg>
          <p className={styles.sum}>
            {sum ? (
              <>
                Today’s trend: <b>{sum}</b>
              </>
            ) : todayPoint ? (
              'Missed days are filled along a straight line between weigh-ins, and the trend steps through each.'
            ) : (
              'Weigh in today and the trend moves a fifth of the way to it.'
            )}
          </p>
        </figure>

        <div className={styles.file}>
          <div className={styles.fileHead}>
            <span>Apps/XWeighIn/weighins.csv</span>
            <span>{s.log.length} lines</span>
          </div>
          <ol className={styles.fileBody} aria-label="The last lines of the log file">
            {lines.map((l) => (
              <li key={l.key} className={l.added ? styles.lineNew : undefined}>
                {l.text}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
