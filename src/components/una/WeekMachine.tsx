'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { DEMO_SESSIONS, FAMILY, icon, type DemoSession } from '@/lib/una-family';
import { edwardsLoad, form, formWord, stepLoad, type LoadState } from '@/lib/una-maths';
import styles from './WeekMachine.module.css';

/*
 * The link, playable. Press an app and it "saves" a session: the app leaves
 * its one line in the shared folder, X Streak counts it, and the app's Saved
 * screen shows the week it has just been told about.
 *
 * The sessions are examples. The sums are not: each load is edwardsLoad() of
 * the session's zone minutes, and fitness, fatigue and form move by
 * stepLoad(), the same daily step the watch takes. One press is one day.
 *
 * Two simplifications, both stated on the page: X Streak really counts when
 * it is next opened (here it is instant), and the athlete starts the week
 * already settled at a daily load of 60 rather than from the two weeks of
 * history the watch waits for.
 */

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TARGET = 4;
const START: LoadState = { fitness: 60, fatigue: 60 };
// Monday 9 November 2026, 07:00 UTC.
const WEEK_START_UTC = Date.UTC(2026, 10, 9, 7, 0, 0) / 1000;

type Entry = { day: number; session: DemoSession | null; load: number };

type Machine = {
  entries: Entry[];
  load: LoadState;
  streak: number;
  shields: number;
  goodWeeks: number;
};

const INITIAL: Machine = { entries: [], load: START, streak: 7, shields: 1, goodWeeks: 3 };

const app = (slug: string) => FAMILY.find((a) => a.slug === slug)!;

function line(e: Entry): number[] {
  const x = e.session!;
  return [WEEK_START_UTC + e.day * 86400, 1440, x.minutes * 60, x.metres, x.avgHr, x.maxHr, x.sport, e.load];
}

export default function WeekMachine() {
  const [m, setM] = useState<Machine>(INITIAL);

  const day = m.entries.length;
  const weekOver = day >= 7;
  const done = m.entries.filter((e) => e.session).length;
  const met = done >= TARGET;
  // Past the target the week is simply met; the faces stop counting there.
  const shown = Math.min(done, TARGET);
  const last = [...m.entries].reverse().find((e) => e.session) ?? null;
  const lastApp = last ? app(last.session!.slug) : null;
  const weekLoad = m.entries.reduce((sum, e) => sum + e.load, 0);
  const word = formWord(m.load);
  const formNow = Math.round(form(m.load));
  const slips = useMemo(() => m.entries.filter((e) => e.session).reverse(), [m.entries]);

  function press(session: DemoSession | null) {
    if (weekOver) return;
    const load = session ? edwardsLoad(session.zones) : 0;
    setM((prev) => ({
      ...prev,
      entries: [...prev.entries, { day: prev.entries.length, session, load }],
      load: stepLoad(prev.load, load),
    }));
  }

  function nextWeek() {
    setM((prev) => {
      if (met) {
        const goodWeeks = prev.goodWeeks + 1;
        const earns = goodWeeks % 4 === 0;
        return {
          ...prev,
          entries: [],
          streak: prev.streak + 1,
          goodWeeks,
          shields: earns ? Math.min(2, prev.shields + 1) : prev.shields,
        };
      }
      if (prev.shields > 0) return { ...prev, entries: [], shields: prev.shields - 1 };
      return { ...prev, entries: [], streak: 0, goodWeeks: 0 };
    });
  }

  const verdict = met
    ? `Week banked. That makes a ${m.streak + 1}-week streak.`
    : m.shields > 0
      ? `${done} of ${TARGET}. A shield saves the ${m.streak}-week streak.`
      : `${done} of ${TARGET}, and no shield left. The streak starts again.`;

  return (
    <div className={styles.machine}>
      {/* The week so far */}
      <ol className={styles.week} aria-label="This week">
        {DAYS.map((d, i) => {
          const e = m.entries[i];
          const a = e?.session ? app(e.session.slug) : null;
          return (
            <li
              key={i}
              className={styles.day}
              data-state={i === day ? 'today' : e ? (a ? 'done' : 'rest') : 'ahead'}
              style={a ? { background: a.slug === 'race' ? a.accent : a.ground, borderColor: a.accent } : undefined}
            >
              <span className={styles.dayLetter}>{d}</span>
              {a ? (
                <Image src={icon(a.slug)} alt={a.name} width={28} height={28} className={styles.dayIcon} />
              ) : (
                <span className={styles.dayMark}>{e ? 'rest' : i === day ? 'today' : ''}</span>
              )}
            </li>
          );
        })}
      </ol>

      <div className={styles.bench}>
        {/* 1. The keys */}
        <div className={styles.col}>
          <p className={styles.colHead}>
            <span>1</span> Save a session
          </p>
          {weekOver ? (
            <div className={styles.verdict} role="status">
              <p>{verdict}</p>
              <button type="button" className={styles.next} onClick={nextWeek}>
                Start the next week
              </button>
            </div>
          ) : (
            <>
              <p className={styles.colNote}>
                It is {DAY_NAMES[day]}. Pick what you did; each press is one day.
              </p>
              <div className={styles.keys}>
                {DEMO_SESSIONS.map((x) => {
                  const a = app(x.slug);
                  return (
                    <button
                      key={x.slug}
                      type="button"
                      className={styles.key}
                      onClick={() => press(x)}
                      style={{ ['--key' as string]: a.accent }}
                    >
                      <Image src={icon(a.slug)} alt="" width={40} height={40} />
                      <span className={styles.keyName}>{a.name}</span>
                      <span className={styles.keyWhat}>
                        {x.title} · {x.minutes} min
                      </span>
                    </button>
                  );
                })}
                <button type="button" className={`${styles.key} ${styles.keyRest}`} onClick={() => press(null)}>
                  <span className={styles.restDisc} aria-hidden="true" />
                  <span className={styles.keyName}>Rest day</span>
                  <span className={styles.keyWhat}>Nothing saved</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* 2. The shared folder */}
        <div className={styles.col}>
          <p className={styles.colHead}>
            <span>2</span> The app leaves one line
          </p>
          <div className={styles.folder} aria-live="polite">
            <p className={styles.folderPath}>Apps / SharedData / HybridX /</p>
            {slips.length === 0 ? (
              <p className={styles.empty}>Empty. Nothing saved yet this week.</p>
            ) : (
              <ul className={styles.slips}>
                {slips.map((e) => {
                  const a = app(e.session!.slug);
                  const nums = line(e);
                  return (
                    <li key={e.day} className={styles.slip} style={{ borderColor: a.accent }}>
                      <span className={styles.slipFile}>
                        act_{a.slug}.json <i>{DAY_NAMES[e.day]}</i>
                      </span>
                      <code className={styles.slipLine}>
                        [{nums.slice(0, 6).join(', ')}, <b>{nums[6]}</b>, <b>{nums[7]}</b>]
                      </code>
                      {a.slug === 'trail' && e.session!.steady ? (
                        <span className={styles.slipAlso}>
                          + {e.session!.steady} steady minutes left for X Run’s VO2max
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* 3. Streak, and the answer back */}
        <div className={styles.col}>
          <p className={styles.colHead}>
            <span>3</span> X Streak counts it, and answers
          </p>
          <div className={styles.faces}>
            <div className={styles.face} data-face="streak">
              <span className={styles.faceTitle}>X Streak</span>
              <span className={styles.faceBig}>{m.streak}</span>
              <span className={styles.faceUnit}>week streak</span>
              <span className={styles.dots} aria-hidden="true">
                {Array.from({ length: TARGET }, (_, i) => (
                  <i key={i} data-on={i < done} />
                ))}
              </span>
              <span className={styles.faceLine}>
                {shown} of {TARGET} this week
              </span>
              <span className={styles.faceSmall}>
                {m.shields} {m.shields === 1 ? 'shield' : 'shields'}
              </span>
            </div>
            <div
              className={styles.face}
              data-face="saved"
              style={{ ['--ring' as string]: lastApp ? lastApp.accent : '#3a3a3a' }}
            >
              {last && lastApp ? (
                <>
                  <span className={styles.faceTitle}>{lastApp.name}</span>
                  <span className={styles.saved}>Saved</span>
                  <span className={styles.faceAmber}>
                    {shown} of {TARGET} this week
                  </span>
                  <span className={styles.faceAmber}>{m.streak}-week streak</span>
                  <span className={styles.faceSmall}>Load {last.load}</span>
                </>
              ) : (
                <span className={styles.faceIdle}>The Saved screen shows here</span>
              )}
            </div>
          </div>

          <dl className={styles.meters}>
            <div>
              <dt>Fitness</dt>
              <dd>{Math.round(m.load.fitness)}</dd>
              <span>6 weeks</span>
            </div>
            <div>
              <dt>Fatigue</dt>
              <dd>{Math.round(m.load.fatigue)}</dd>
              <span>7 days</span>
            </div>
            <div data-word={word}>
              <dt>Form</dt>
              <dd>
                {formNow > 0 ? '+' : ''}
                {formNow}
              </dd>
              <span>{word}</span>
            </div>
            <div>
              <dt>This week</dt>
              <dd>{weekLoad}</dd>
              <span>load</span>
            </div>
          </dl>
        </div>
      </div>

      <p className={styles.small}>
        Example sessions; the sums are the watch’s own. On the watch, X Streak counts a session the
        next time you open it, and waits for two weeks of history before it puts a word on your
        form. Here it is instant, and the athlete starts the week settled at a daily load of 60.
      </p>
    </div>
  );
}
