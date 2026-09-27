'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BACK_ON_COURSE_M,
  fromMetres,
  locate,
  offCourseStep,
  OFF_COURSE_M,
  pointAt,
  type LocalRoute,
} from '@/lib/trail-route';
import TrailWatch, { type TrailWatchHandle } from './TrailWatch';
import styles from './OffCourseStory.module.css';

/*
 * "Wander off? You'll feel it." A scroll-driven scene: scrolling moves a runner
 * along a trail, down the wrong fork, out past the 50 m line, and back.
 *
 * The runner's distance from the line is measured, not scripted (locate), and
 * the alert follows the same rule as the simulator (offCourseStep: on past
 * 50 m, off again only back inside 35 m), replayed from the start of the trail
 * to wherever the scroll has got to, so scrolling back up unwinds it exactly.
 */

type P = [number, number];

function catmull(p0: P, p1: P, p2: P, p3: P, t: number): P {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
}

function buildTrail(): LocalRoute {
  const W: P[] = [[-60, -80], [0, 0], [50, 200], [-20, 420], [60, 640], [230, 790], [430, 870], [620, 990], [700, 1060]];
  const pts: P[] = [];
  for (let i = 1; i < W.length - 2; i++) {
    for (let k = 0; k < 40; k++) pts.push(catmull(W[i - 1], W[i], W[i + 1], W[i + 2], k / 40));
  }
  pts.push(W[W.length - 2]);
  return fromMetres(pts, 'Trail');
}

/** Sideways from the line: out along the wrong fork and back again. */
function lateralAt(s: number) {
  const u = (s - 300) / 560;
  if (u <= 0 || u >= 1) return 0;
  return 112 * Math.sin(Math.PI * u) ** 1.25;
}

function runnerAt(trail: LocalRoute, s: number): P {
  const here = pointAt(trail, s);
  const lat = lateralAt(s);
  return [here.x - Math.cos(here.heading) * lat, here.y + Math.sin(here.heading) * lat];
}

const STEPS = [
  { title: 'A fork in the path.', body: 'In the mist, both look right. You take the wrong one.' },
  { title: 'Fifty metres out, it buzzes.', body: 'A buzz on your wrist and a banner on the map: how far you are from the line.' },
  { title: 'Head back. It tells you when you’re on it.', body: 'Once you’re properly back, a second buzz, and “Back on course”. No chatter on switchbacks.' },
];

export default function OffCourseStory() {
  const trail = useMemo(buildTrail, []);
  const sectionRef = useRef<HTMLElement>(null);
  const watchRef = useRef<TrailWatchHandle>(null);
  const [p, setP] = useState(0);
  const lastOff = useRef(false);

  // The wrong fork, drawn as its own path from where it leaves to where it rejoins.
  const fork = useMemo(() => {
    const out: P[] = [];
    for (let s = 240; s <= 920; s += 10) out.push(runnerAt(trail, s));
    return out;
  }, [trail]);

  // The view: the trail's box with room for the fork.
  const view = useMemo(() => {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [x, y] of [...trail.pts, ...fork]) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    const m = 120;
    return { x0: x0 - m, y0: y0 - m, w: x1 - x0 + 2 * m, h: y1 - y0 + 2 * m, top: y1 + m };
  }, [trail, fork]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      setP(total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Replay the alert from the start to here, so the state is the same up or down.
  const s = p * trail.length;
  const state = useMemo(() => {
    let off = false;
    let lastChange = -Infinity;
    let everOff = false;
    let along = 0;
    for (let t = 0; t <= s; t += 5) {
      const [x, y] = runnerAt(trail, t);
      const loc = locate(trail, x, y, along);
      along = loc.along;
      const step = offCourseStep(off, loc.off);
      if (step.changed) {
        off = step.off;
        lastChange = t;
        if (off) everOff = true;
      }
    }
    const [x, y] = runnerAt(trail, s);
    const loc = locate(trail, x, y, along);
    const banner: 'off' | 'back' | null = off ? 'off' : everOff && s - lastChange < 160 ? 'back' : null;
    const step = off ? 1 : everOff ? 2 : 0;
    return { x, y, off, offM: loc.off, along: loc.along, banner, step };
  }, [s, trail]);

  useEffect(() => {
    if (state.off !== lastOff.current) {
      lastOff.current = state.off;
      watchRef.current?.buzz();
    }
    const here = pointAt(trail, s);
    watchRef.current?.draw(trail, {
      along: state.along,
      you: [state.x, state.y],
      heading: here.heading,
      headingUp: true,
      radiusM: 260,
      scaleLabel: '100 m',
      scaleM: 100,
      banner: state.banner,
      bannerP: 1,
      offByM: state.offM,
    });
  }, [state, s, trail]);

  const toSvg = (x: number, y: number) => `${(x - view.x0).toFixed(1)},${(view.top - y).toFixed(1)}`;
  const trailPath = `M${trail.pts.map(([x, y]) => toSvg(x, y)).join(' L')}`;
  const forkPath = `M${fork.map(([x, y]) => toSvg(x, y)).join(' L')}`;
  const [rx, ry] = toSvg(state.x, state.y).split(',').map(Number);
  const near = pointAt(trail, state.along);
  const [nx, ny] = toSvg(near.x, near.y).split(',').map(Number);

  return (
    <section ref={sectionRef} className={styles.story} aria-label="What happens when you go off course">
      <div className={`${styles.stage} ${state.off ? styles.alert : ''}`}>
        <div className={styles.copy}>
          <p className={styles.kicker}>Off-course alerts</p>
          <h2 className={styles.title}>
            Wander off? <span>You’ll feel it.</span>
          </h2>
          <ol className={styles.steps}>
            {STEPS.map((st, i) => (
              <li key={st.title} className={i === state.step ? styles.stepOn : ''}>
                <strong>{st.title}</strong>
                <span>{st.body}</span>
              </li>
            ))}
          </ol>
          <p className={styles.readout} aria-live="polite">
            <span className={styles.readoutNum}>{Math.round(state.offM)} m</span>
            <span className={styles.readoutLabel}>from the line · alert at {OFF_COURSE_M} m, clears at {BACK_ON_COURSE_M} m</span>
          </p>
        </div>

        <div className={styles.visual}>
          <svg viewBox={`0 0 ${view.w.toFixed(0)} ${view.h.toFixed(0)}`} className={styles.scene} role="img" aria-label="A trail with a 50 metre corridor, a wrong fork leaving it, and the runner's position.">
            <path d={trailPath} className={styles.corridor} style={{ strokeWidth: OFF_COURSE_M * 2 }} />
            <path d={forkPath} className={styles.fork} />
            <path d={trailPath} className={styles.trail} />
            {state.offM > 4 && <line x1={rx} y1={ry} x2={nx} y2={ny} className={styles.gap} />}
            <circle cx={rx} cy={ry} r={14} className={styles.runner} />
            <text x={(rx + nx) / 2 + 18} y={(ry + ny) / 2} className={styles.gapLabel}>
              {state.offM > 4 ? `${Math.round(state.offM)} m` : ''}
            </text>
          </svg>
          <div className={styles.watch}>
            <TrailWatch ref={watchRef} label="The watch's map screen, with the off-course banner when the runner is more than 50 metres from the line." />
          </div>
        </div>
      </div>
    </section>
  );
}
