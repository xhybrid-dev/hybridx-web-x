'use client';

import { useEffect, useState } from 'react';
import { STAGES } from './data';
import Sprite from './Sprite';
import styles from './RidgeScene.module.css';

/*
 * The hero's strip of world: the runner jogging on the spot while the Ridge
 * scrolls past, one stage at a time, in that stage's colours, with its spirits
 * coming the other way. Every seven seconds the next stage. The hills are
 * stepped like the game's own pixels; the scrolling is CSS, the stage change
 * the only script. Reduced motion: stage 1, standing still.
 */

// A stepped ridge line across [0, w] at a pixel step, deterministic per seed,
// with its ends level so two copies tile seamlessly.
function ridge(seed: number, w: number, h: number, base: number, amp: number, step: number) {
  let s = seed;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const pts: string[] = [`0,${h}`];
  let y = base;
  for (let x = 0; x <= w; x += step) {
    const edge = Math.min(x, w - x) / (w / 2);
    y = Math.round(base - amp * edge * (0.35 + 0.65 * rnd()) - (rnd() - 0.5) * 4);
    pts.push(`${x},${y}`, `${x + step},${y}`);
  }
  pts.push(`${w},${base}`, `${w},${h}`);
  return pts.join(' ');
}

const FAR = ridge(7, 320, 90, 62, 34, 8);
const NEAR = ridge(23, 320, 90, 74, 20, 6);

export default function RidgeScene() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % STAGES.length), 7000);
    return () => window.clearInterval(t);
  }, []);

  const st = STAGES[i];
  return (
    <div
      className={styles.scene}
      style={
        {
          '--sky': st.sky,
          '--hill': st.hill,
          '--ground': st.ground,
          '--path': st.path,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <div className={`${styles.layer} ${styles.far}`}>
        {[0, 1].map((k) => (
          <svg key={k} viewBox="0 0 320 90" preserveAspectRatio="none" shapeRendering="crispEdges">
            <polygon points={FAR} />
          </svg>
        ))}
      </div>
      <div className={`${styles.layer} ${styles.near}`}>
        {[0, 1].map((k) => (
          <svg key={k} viewBox="0 0 320 90" preserveAspectRatio="none" shapeRendering="crispEdges">
            <polygon points={NEAR} />
          </svg>
        ))}
      </div>
      <div className={styles.ground}>
        <div className={styles.path} />
      </div>

      <div className={styles.runner}>
        <Sprite id="runner" px={4} />
      </div>

      <div key={st.n} className={styles.parade}>
        {st.spirits.map((sp, k) => (
          <span key={sp.id} className={styles.walker} style={{ animationDelay: `${k * 1.3}s` }}>
            <Sprite id={sp.id} px={sp.boss ? 4 : 3.5} grid={sp.boss ? 32 : 24} />
          </span>
        ))}
      </div>

      <p key={`l${st.n}`} className={styles.label}>
        <span>Stage {st.n}</span> {st.name}
      </p>
    </div>
  );
}
