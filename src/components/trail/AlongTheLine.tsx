'use client';

import { useEffect, useMemo, useRef } from 'react';
import { formatDistance, pointAt, slice } from '@/lib/trail-route';
import { figureEight } from '@/lib/trail-terrain';
import styles from './AlongTheLine.module.css';

/*
 * "Measured along the line": a runner goes round a figure of eight that
 * crosses itself. Distance done and to go are measured along the route (the
 * brief's F7), so they count smoothly down; the straight-line distance to the
 * finish, for comparison, shrinks and grows as the loop swings about.
 *
 * Animated with refs (setAttribute and textContent), not React state.
 */

const SPEED = 180; // metres per second: one lap in 40 seconds
const W = 1000;
const H = 560;
const K = 0.36; // px per metre in the 1000 x 560 view

function toSvg(x: number, y: number) {
  return [W / 2 + x * K, H / 2 - y * K] as const;
}

function pathOf(pts: [number, number][]) {
  return `M${pts.map(([x, y]) => toSvg(x, y).map((v) => v.toFixed(1)).join(',')).join(' L')}`;
}

export default function AlongTheLine() {
  const route = useMemo(figureEight, []);
  const svgRef = useRef<SVGSVGElement>(null);
  const doneRef = useRef<SVGPathElement>(null);
  const runnerRef = useRef<SVGCircleElement>(null);
  const haloRef = useRef<SVGCircleElement>(null);
  const alongDone = useRef<HTMLSpanElement>(null);
  const alongGo = useRef<HTMLSpanElement>(null);
  const crow = useRef<HTMLSpanElement>(null);

  const full = pathOf(route.pts);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let visible = false;
    let t0 = performance.now();
    const end = route.pts[route.pts.length - 1];

    const frame = (now: number) => {
      const s = reduce ? route.length * 0.62 : (((now - t0) / 1000) * SPEED) % route.length;
      const here = pointAt(route, s);
      const done = slice(route, 0, s);
      doneRef.current?.setAttribute('d', pathOf(done));
      const [cx, cy] = toSvg(here.x, here.y);
      runnerRef.current?.setAttribute('cx', cx.toFixed(1));
      runnerRef.current?.setAttribute('cy', cy.toFixed(1));
      haloRef.current?.setAttribute('cx', cx.toFixed(1));
      haloRef.current?.setAttribute('cy', cy.toFixed(1));
      if (alongDone.current) alongDone.current.textContent = formatDistance(s, 1);
      if (alongGo.current) alongGo.current.textContent = formatDistance(route.length - s, 1);
      if (crow.current) crow.current.textContent = formatDistance(Math.hypot(end[0] - here.x, end[1] - here.y), 1);
      if (visible && !reduce) raf = requestAnimationFrame(frame);
    };

    const observer = new IntersectionObserver(([entry]) => {
      const was = visible;
      visible = entry.isIntersecting;
      if (visible && !was) {
        t0 = performance.now();
        raf = requestAnimationFrame(frame);
      } else if (!visible) cancelAnimationFrame(raf);
    });
    if (svgRef.current) observer.observe(svgRef.current);
    frame(performance.now());
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [route]);

  return (
    <div className={styles.wrap}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label="A figure-of-eight route, with a runner going round it and the distance measured along the line.">
        <path d={full} className={styles.ahead} />
        <path ref={doneRef} d="" className={styles.done} />
        <circle cx={W / 2} cy={H / 2} r={26} className={styles.cross} />
        <circle ref={haloRef} r={16} className={styles.halo} />
        <circle ref={runnerRef} r={7} className={styles.runner} />
      </svg>
      <div className={styles.readouts}>
        <p>
          <span className={styles.label}>Along the line</span>
          <span className={styles.value}>
            <span ref={alongDone}>0.0 km</span> done · <span ref={alongGo}>7.2 km</span> to go
          </span>
        </p>
        <p className={styles.crowRow}>
          <span className={styles.label}>As the crow flies to the finish</span>
          <span className={styles.crowValue} ref={crow}>0.0 km</span>
        </p>
      </div>
    </div>
  );
}
