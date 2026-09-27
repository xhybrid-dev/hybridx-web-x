'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import Image from 'next/image';
import type { LocalRoute } from '@/lib/trail-route';
import { drawWatchMap, type MapState } from './draw';
import { poppins } from './fonts';
import styles from './TrailWatch.module.css';

/*
 * UNA's white watch (the SDK Figma pack's render, as the Trail film uses it)
 * with a live canvas for a screen. The render's display is transparent; the
 * canvas sits underneath it on the same circle (geometry as the Race hero:
 * radius 367 at (571.5, 800.5) in the 1144 x 1576 crop).
 *
 * Parents animate it imperatively — ref.current.draw(route, state) from their
 * own animation frame — so a 60 fps map never re-renders React.
 */

export interface TrailWatchHandle {
  draw: (route: LocalRoute, state: Omit<MapState, 'font'>) => void;
  /** A short haptic shake, as the watch buzzes on an alert. */
  buzz: () => void;
}

const TrailWatch = forwardRef<TrailWatchHandle, { label: string; className?: string }>(function TrailWatch(
  { label, className },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    draw(route, state) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = Math.round(canvas.clientWidth * dpr);
      if (!size) return;
      if (canvas.width !== size) {
        canvas.width = size;
        canvas.height = size;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(size / 240, 0, 0, size / 240, 0, 0);
      drawWatchMap(ctx, route, { ...state, font: poppins.style.fontFamily });
    },
    buzz() {
      const el = frameRef.current;
      if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      el.classList.remove(styles.buzz);
      // Restart the animation.
      void el.offsetWidth;
      el.classList.add(styles.buzz);
    },
  }));

  return (
    <div ref={frameRef} className={`${styles.frame} ${className ?? ''}`}>
      <canvas ref={canvasRef} className={styles.screen} role="img" aria-label={label} />
      <Image src="/trail/una-watch-white.png" alt="" fill sizes="(max-width: 700px) 70vw, 380px" className={styles.render} />
    </div>
  );
});

export default TrailWatch;
