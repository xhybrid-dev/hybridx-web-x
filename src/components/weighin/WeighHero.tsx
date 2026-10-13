'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { civilFromDays, formatKg, formatShortDate, monthShort, weekday } from '@/lib/weighin-core';
import { FIRST_DAY, SAMPLE_DAYS_LIST, SAMPLE_RANGE } from './sample';
import WeighWatch from './WeighWatch';
import styles from './WeighHero.module.css';

/*
 * The hero: the copy and the watch, over a strip chart that runs the length of
 * the page's top. The sample's 40 mornings are plotted one by one, a grey dot
 * for each weigh-in and the lime trend riding over them, fast-forwarded; the
 * watch shows Home as it stood that evening, so the number on the wrist is the
 * tip of the line. At the end it rests on 12 October, the day the app's own
 * store screens show, then starts again.
 *
 * The strip is a canvas, drawn each frame; the watch re-renders once a day.
 * Only while on screen; with reduced motion it shows the whole log, still.
 */

const DAY_MS = 300;
const START_MS = 700;
const HOLD_MS = 4200;
const N = SAMPLE_DAYS_LIST.length;
const SWEEP_MS = (N - 1) * DAY_MS;

const LIME = '#aaff00';
const DOT = '#8b9187';

function fit(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { w, h, dpr };
}

const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

export default function WeighHero({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const [dayIdx, setDayIdx] = useState(N - 1);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const font = getComputedStyle(canvas).fontFamily;

    let raf = 0;
    let visible = true;
    let t0 = performance.now();
    let pausedAt = 0;
    let shown = -1;

    const draw = (now: number) => {
      const { w, h, dpr } = fit(canvas);
      if (!w || !h) return;
      const elapsed = reduce ? START_MS + SWEEP_MS : (now - t0) % (START_MS + SWEEP_MS + HOLD_MS);
      const t = Math.min(N - 1, Math.max(0, (elapsed - START_MS) / DAY_MS));
      const fade = reduce ? 1 : elapsed < START_MS ? elapsed / START_MS : 1;

      // The plot: the strip's width less room for the scale on the left.
      const x0 = Math.max(56 * dpr, w * 0.045);
      const x1 = w - Math.max(20 * dpr, w * 0.03);
      const y0 = 30 * dpr;
      const y1 = h - 34 * dpr;
      const X = (i: number) => x0 + (i / (N - 1)) * (x1 - x0);
      const Y = (v: number) => y0 + ((SAMPLE_RANGE.hi - v) / (SAMPLE_RANGE.hi - SAMPLE_RANGE.lo)) * (y1 - y0);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Whole kilos, labelled on the left.
      ctx.font = `${10.5 * dpr}px ${font}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      for (let kg = Math.ceil(SAMPLE_RANGE.lo / 100); kg * 100 <= SAMPLE_RANGE.hi; kg++) {
        const y = Math.round(Y(kg * 100)) + 0.5;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(x0, y, x1 - x0, dpr);
        ctx.fillStyle = 'rgba(160,168,154,0.6)';
        ctx.fillText(`${kg}.0`, x0 - 12 * dpr, y);
      }

      // Mondays along the foot.
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      for (let i = 0; i < N; i++) {
        const day = FIRST_DAY + i;
        if (weekday(day) !== 0) continue;
        const d = civilFromDays(day);
        const x = Math.round(X(i)) + 0.5;
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x, y1 + 6 * dpr, dpr, 6 * dpr);
        ctx.fillStyle = 'rgba(160,168,154,0.6)';
        ctx.fillText(`${d.day} ${monthShort(d.month).toUpperCase()}`, x, h - 6 * dpr);
      }

      ctx.globalAlpha = fade;

      // The weigh-ins, each dropping in as the day arrives.
      for (let i = 0; i <= Math.ceil(t); i++) {
        const sd = SAMPLE_DAYS_LIST[i];
        if (!sd.weight) continue;
        const k = reduce ? 1 : ease((t - i + 0.35) / 0.5);
        if (k <= 0) continue;
        const today = Math.round(t) === i;
        ctx.beginPath();
        ctx.arc(X(i), Y(sd.weight), (today ? 4.2 : 3.2) * dpr * k, 0, Math.PI * 2);
        ctx.fillStyle = today ? '#ffffff' : DOT;
        ctx.fill();
      }

      // The trend, up to the moment.
      const whole = Math.floor(t);
      const frac = t - whole;
      const pts: [number, number][] = [];
      for (let i = 0; i <= whole; i++) pts.push([X(i), Y(SAMPLE_DAYS_LIST[i].trend)]);
      if (frac > 0 && whole + 1 < N) {
        const a = SAMPLE_DAYS_LIST[whole].trend;
        const b = SAMPLE_DAYS_LIST[whole + 1].trend;
        pts.push([X(whole + frac), Y(a + (b - a) * frac)]);
      }
      if (pts.length > 1) {
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = LIME;
        ctx.shadowColor = 'rgba(170,255,0,0.75)';
        ctx.shadowBlur = 14 * dpr;
        ctx.lineWidth = 3 * dpr;
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      const [tx, ty] = pts[pts.length - 1];

      // The cursor, and the tip of the trend.
      ctx.fillStyle = 'rgba(170,255,0,0.22)';
      for (let y = y0 - 14 * dpr; y < y1; y += 7 * dpr) ctx.fillRect(Math.round(tx), y, dpr, 3.5 * dpr);
      const pulse = reduce ? 0.4 : (now / 1300) % 1;
      ctx.beginPath();
      ctx.arc(tx, ty, (6 + pulse * 14) * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(170,255,0,${0.55 * (1 - pulse)})`;
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(tx, ty, 4.5 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = LIME;
      ctx.fill();
      ctx.globalAlpha = 1;

      // The readout rides with the cursor, kept inside the strip.
      const readout = readoutRef.current;
      if (readout) {
        const half = readout.offsetWidth / 2;
        const left = Math.min(Math.max(tx / dpr, half + 8), canvas.clientWidth - half - 8);
        readout.style.transform = `translate(${(left - half).toFixed(1)}px, 0)`;
        readout.style.opacity = String(fade);
      }

      const idx = Math.round(t);
      if (idx !== shown) {
        shown = idx;
        setDayIdx(idx);
      }
    };

    const loop = (now: number) => {
      draw(now);
      if (visible && !reduce) raf = requestAnimationFrame(loop);
    };

    const observer = new IntersectionObserver(([entry]) => {
      const was = visible;
      visible = entry.isIntersecting && !document.hidden;
      if (visible && !was) {
        t0 += performance.now() - pausedAt;
        raf = requestAnimationFrame(loop);
      } else if (!visible && was) {
        pausedAt = performance.now();
        cancelAnimationFrame(raf);
      }
    });
    observer.observe(canvas);
    raf = requestAnimationFrame(loop);

    const onResize = () => {
      if (reduce) draw(performance.now());
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const sd = SAMPLE_DAYS_LIST[dayIdx];

  return (
    <section className={styles.hero}>
      <div className={styles.paper} aria-hidden="true" />
      <div className={styles.inner}>
        <div className={styles.copy}>{children}</div>
        <div className={styles.watchCol}>
          <div className={styles.halo} aria-hidden="true" />
          <WeighWatch
            priority
            className={styles.watch}
            view={{ screen: 'home', summary: sd.summary, today: sd.day }}
            label={`X Weigh-in on a UNA Watch, its Home page: trend ${formatKg(sd.summary.trend, 1)} kg.`}
          />
        </div>
      </div>

      <div className={styles.strip} aria-hidden="true">
        <div ref={readoutRef} className={styles.readout}>
          <span>{formatShortDate(sd.day).toUpperCase()}</span>
          <span>
            SCALE <b className={styles.scaleNum}>{sd.weight ? formatKg(sd.weight, 1) : '—'}</b>
          </span>
          <span>
            TREND <b className={styles.trendNum}>{formatKg(sd.trend, 2)}</b>
          </span>
        </div>
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>
      <p className={styles.note}>A made-up log, fast-forwarded: forty mornings, one dot each, and the trend through them.</p>
    </section>
  );
}
