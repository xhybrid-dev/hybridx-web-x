'use client';

import { useEffect, useMemo, useRef } from 'react';
import { height, RIDGE_LOOP } from '@/lib/trail-terrain';
import { pointAt } from '@/lib/trail-route';
import styles from './RouteRail.module.css';

/*
 * The page as a route: down the right-hand edge, the Ridge loop's elevation
 * profile, filled in orchid as far as you've scrolled, with a dot for where
 * you are and the distance beside it. Scrolling the page is running the loop.
 *
 * Decorative, and only on wide screens (the CSS hides it below 1280 px).
 */

const SAMPLES = 180;
const RAIL_W = 44;
const RAIL_H = 600;

export default function RouteRail() {
  const clipRef = useRef<SVGRectElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const kmRef = useRef<HTMLSpanElement>(null);

  // Distance runs top to bottom; height runs right to left from the rail's edge.
  const profile = useMemo(() => {
    const hs: number[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const p = pointAt(RIDGE_LOOP, (i / SAMPLES) * RIDGE_LOOP.length);
      hs.push(height(p.x, p.y));
    }
    const lo = Math.min(...hs);
    const hi = Math.max(...hs);
    const pts = hs.map((h, i) => [RAIL_W - 4 - ((h - lo) / (hi - lo || 1)) * (RAIL_W - 10), (i / SAMPLES) * RAIL_H] as const);
    const line = `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L')}`;
    return { line, area: `${line} L${RAIL_W},${RAIL_H} L${RAIL_W},0 Z`, pts };
  }, []);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const y = p * RAIL_H;
      clipRef.current?.setAttribute('height', y.toFixed(1));
      const i = Math.min(SAMPLES, Math.round(p * SAMPLES));
      const [x] = profile.pts[i];
      dotRef.current?.setAttribute('cx', x.toFixed(1));
      dotRef.current?.setAttribute('cy', y.toFixed(1));
      if (kmRef.current) kmRef.current.textContent = `${((p * RIDGE_LOOP.length) / 1000).toFixed(2)} KM`;
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
  }, [profile]);

  return (
    <div className={styles.rail} aria-hidden="true">
      <span className={styles.top}>START</span>
      <svg viewBox={`0 0 ${RAIL_W} ${RAIL_H}`} className={styles.svg} preserveAspectRatio="none">
        <defs>
          <clipPath id="rail-done">
            <rect ref={clipRef} x="0" y="0" width={RAIL_W} height="0" />
          </clipPath>
        </defs>
        <path d={profile.area} className={styles.area} />
        <path d={profile.line} className={styles.line} />
        <g clipPath="url(#rail-done)">
          <path d={profile.area} className={styles.areaDone} />
          <path d={profile.line} className={styles.lineDone} />
        </g>
        <circle ref={dotRef} r="3.5" className={styles.dot} />
      </svg>
      <span className={styles.km} ref={kmRef}>
        0.00 KM
      </span>
    </div>
  );
}
