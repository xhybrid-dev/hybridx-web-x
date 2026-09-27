'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './Manifesto.module.css';

/*
 * What Trail isn't, then what it is. The three "no" lines are struck through
 * one after another as the block comes into view, then "Just the line." gets
 * an orchid line drawn under it. The words are the brief's own (§1, "Never, on
 * this hardware") and the film's opening.
 */

export default function Manifesto() {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOn(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${styles.block} ${on ? styles.on : ''}`}>
      <p className={styles.no}>
        <span>No map tiles.</span>
      </p>
      <p className={styles.no}>
        <span>No turn-by-turn.</span>
      </p>
      <p className={styles.no}>
        <span>No rerouting.</span>
      </p>
      <p className={styles.yes}>
        Just the line.
        <svg viewBox="0 0 600 40" preserveAspectRatio="none" className={styles.underline} aria-hidden="true">
          <path d="M4 26 C 90 8, 150 34, 240 20 S 400 6, 470 22 S 560 30, 596 14" />
        </svg>
      </p>
      <p className={styles.sub}>
        Breadcrumb navigation, the way the classic running watches did it. The route as a line, you
        as an arrow on it, and a buzz if you leave it. Everything a runner needs to stay on course,
        and nothing that needs a phone signal.
      </p>
    </div>
  );
}
