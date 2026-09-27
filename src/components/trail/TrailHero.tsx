'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { contours, bounds, RIDGE_LOOP, type Contours } from '@/lib/trail-terrain';
import { pointAt, slice, formatDistance } from '@/lib/trail-route';
import { COLOUR, drawContours, fitCanvas, glowLine } from './draw';
import TrailWatch, { type TrailWatchHandle } from './TrailWatch';
import styles from './TrailHero.module.css';

/*
 * The hero: a topographic map at night, full width, with the Ridge loop in
 * orchid and a runner following it, fast-forwarded. The camera drifts with the
 * runner. On the right, the watch shows the same run as the map screen would:
 * heading-up, 200 m scale, the line behind in purple and ahead in orchid.
 *
 * The contours are vectors, drawn into a cache canvas a little bigger than the
 * view and redrawn only when the camera drifts past its margin, so each frame
 * is one image blit plus the route.
 */

const SPEED = 55; // metres of route per second of animation: a 4-minute loop
const VIEW_M = 4600; // metres across the canvas at desktop width
const MARGIN_PX = 360;

export default function TrailHero({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const watchRef = useRef<TrailWatchHandle>(null);
  const distRef = useRef<HTMLSpanElement>(null);
  const toGoRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const route = RIDGE_LOOP;
    const b = bounds(route, 3200);
    const topo: Contours = contours(b.x0, b.y0, b.x1, b.y1, 60, 25);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let cache: { canvas: HTMLCanvasElement; x0: number; y0: number; k: number; w: number; h: number } | null = null;
    let cam: [number, number] | null = null;
    let raf = 0;
    let visible = true;
    let t0 = performance.now();
    let paused = 0;
    let lastWatch = 0;

    const drawFrame = (now: number) => {
      const { w, h } = fitCanvas(canvas);
      if (!w || !h) return;
      const t = reduce ? 3150 / SPEED : (now - t0) / 1000;
      const s = (t * SPEED) % route.length;
      const here = pointAt(route, s);

      // Metres to pixels: the view spans VIEW_M at 1440 px wide, less on phones.
      const k = (w / Math.max(VIEW_M * (canvas.clientWidth / 1440), 2600)) ;
      // The runner sits a little right of centre, between the words and the watch.
      const anchorX = canvas.clientWidth > 900 ? 0.6 : 0.5;
      const target: [number, number] = [here.x, here.y];
      cam = cam && !reduce ? [cam[0] + (target[0] - cam[0]) * 0.04, cam[1] + (target[1] - cam[1]) * 0.04] : target;
      const ox = cam[0] - (w * anchorX) / k;
      const oy = cam[1] + (h * 0.55) / k;
      const toPx = (x: number, y: number): [number, number] => [(x - ox) * k, (oy - y) * k];

      // Contour cache: redraw when the view leaves it or the scale changes.
      const needs =
        !cache ||
        Math.abs(cache.k - k) > 1e-6 ||
        (ox - cache.x0) * k < 0 ||
        (cache.y0 - oy) * k < 0 ||
        (ox - cache.x0) * k + w > cache.w ||
        (cache.y0 - oy) * k + h > cache.h;
      if (needs) {
        const cw = w + MARGIN_PX * 2;
        const ch = h + MARGIN_PX * 2;
        const c = cache?.canvas ?? document.createElement('canvas');
        c.width = cw;
        c.height = ch;
        const cx = c.getContext('2d');
        if (cx) {
          const x0 = ox - MARGIN_PX / k;
          const y0 = oy + MARGIN_PX / k;
          cx.clearRect(0, 0, cw, ch);
          drawContours(cx, topo, (x, y) => [(x - x0) * k, (y0 - y) * k], 'rgba(155,161,168,0.12)', 'rgba(170,150,190,0.24)');
          cache = { canvas: c, x0, y0, k, w: cw, h: ch };
        }
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#050507';
      ctx.fillRect(0, 0, w, h);
      if (cache) ctx.drawImage(cache.canvas, -(ox - cache.x0) * k, -(cache.y0 - oy) * k);

      // The whole loop faintly, the part run in purple, the part ahead glowing.
      const dpr = w / canvas.clientWidth;
      ctx.globalAlpha = 0.28;
      glowLine(ctx, route.pts, toPx, COLOUR.line, 2 * dpr, 0);
      ctx.globalAlpha = 1;
      glowLine(ctx, slice(route, 0, s), toPx, COLOUR.done, 3 * dpr, 6 * dpr);
      glowLine(ctx, slice(route, s, Math.min(route.length, s + 2600)), toPx, COLOUR.line, 3.2 * dpr, 16 * dpr);

      // Start / finish.
      const [sx, sy] = toPx(route.pts[0][0], route.pts[0][1]);
      ctx.beginPath();
      ctx.arc(sx, sy, 7 * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = COLOUR.start;
      ctx.lineWidth = 2.5 * dpr;
      ctx.stroke();

      // The runner, with a slow pulse.
      const [rx, ry] = toPx(here.x, here.y);
      const pulse = reduce ? 0.5 : (now / 1400) % 1;
      ctx.beginPath();
      ctx.arc(rx, ry, (8 + pulse * 22) * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - pulse)})`;
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rx, ry, 5 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 14 * dpr;
      ctx.fill();
      ctx.shadowBlur = 0;

      if (distRef.current) distRef.current.textContent = `${(s / 1000).toFixed(2)} KM`;
      if (toGoRef.current) toGoRef.current.textContent = `${formatDistance(route.length - s).toUpperCase()} TO GO`;

      // The watch at 30 fps is plenty.
      if (now - lastWatch > 33) {
        lastWatch = now;
        watchRef.current?.draw(route, {
          along: s,
          headingUp: true,
          radiusM: 400,
          scaleLabel: '200 m',
          scaleM: 200,
          toGoM: route.length - s,
        });
      }
    };

    const loop = (now: number) => {
      drawFrame(now);
      if (visible && !reduce) raf = requestAnimationFrame(loop);
    };

    const observer = new IntersectionObserver(([entry]) => {
      const was = visible;
      visible = entry.isIntersecting && !document.hidden;
      if (visible && !was) {
        t0 += performance.now() - paused;
        raf = requestAnimationFrame(loop);
      } else if (!visible && was) {
        paused = performance.now();
        cancelAnimationFrame(raf);
      }
    });
    observer.observe(canvas);
    raf = requestAnimationFrame(loop);

    const onResize = () => {
      cache = null;
      if (reduce) drawFrame(performance.now());
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <section className={styles.hero}>
      <canvas ref={canvasRef} className={styles.map} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      <div className={styles.hud} aria-hidden="true">
        <span className={styles.hudTL}>HYBRIDX TRAIL · BREADCRUMB NAVIGATION</span>
        <span className={styles.hudTR}>RIDGE LOOP · 14.2 KM · A DEMO ROUTE</span>
        <span className={styles.hudBL}>
          <span ref={toGoRef}>14.2 KM TO GO</span>
        </span>
        <span className={styles.hudBR}>
          <span ref={distRef}>0.00 KM</span>
        </span>
      </div>

      <div className={styles.inner}>
        <div className={styles.copy}>{children}</div>
        <div className={styles.watch}>
          <TrailWatch
            ref={watchRef}
            label="HybridX Trail on a UNA Watch, following the Ridge loop: the route as a line, you as an arrow, the distance to go and the scale."
          />
        </div>
      </div>
    </section>
  );
}
