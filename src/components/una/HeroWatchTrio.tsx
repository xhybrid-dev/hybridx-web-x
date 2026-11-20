'use client';

import { useState } from 'react';
import Image from 'next/image';
import { APP_BY_SLUG, WATCH_RENDERS, type AppSlug } from '@/lib/una-family';
import styles from './HeroWatchTrio.module.css';

type HeroSlot = {
  slug: AppSlug;
  position: 'left' | 'center' | 'right';
  screenIndex: number;
  finishLabel: string;
  caption: string;
};

const HERO_SLOTS: readonly HeroSlot[] = [
  {
    slug: 'training',
    position: 'left',
    screenIndex: 0,
    finishLabel: 'Charcoal · X Training',
    caption: "Today's 10K, Half Marathon or VO2max session coached live on your wrist.",
  },
  {
    slug: 'streak',
    position: 'center',
    screenIndex: 0,
    finishLabel: 'Teal · X Streak Hub',
    caption: 'Every saved session from all six X apps lands here automatically.',
  },
  {
    slug: 'trail',
    position: 'right',
    screenIndex: 0,
    finishLabel: 'White · X Trail',
    caption: 'Follow magenta GPX breadcrumb routes with 10 zoom levels and turn cues.',
  },
];

export default function HeroWatchTrio() {
  const [activeSlug, setActiveSlug] = useState<AppSlug>('streak');

  const activeSlot = HERO_SLOTS.find((s) => s.slug === activeSlug) ?? HERO_SLOTS[1];
  const activeApp = APP_BY_SLUG[activeSlot.slug];

  return (
    <div className={styles.stage} aria-label="Interactive UNA Watch showcase">
      <svg
        className={styles.dialRings}
        viewBox="0 0 560 440"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="280" cy="215" r="145" stroke="#358D98" strokeOpacity="0.22" strokeWidth="1" />
        <circle
          cx="280"
          cy="215"
          r="192"
          stroke="#358D98"
          strokeOpacity="0.16"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
        <circle cx="280" cy="215" r="236" stroke="#0E1316" strokeOpacity="0.06" strokeWidth="1" />
        {/* Four subtle button tick markers echoing UNA Watch's L1/L2/R1/R2 hardware */}
        <path d="M126 150 A168 168 0 0 0 116 178" stroke="#358D98" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M116 252 A168 168 0 0 0 126 280" stroke="#358D98" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M434 150 A168 168 0 0 1 444 178" stroke="#ED8835" strokeOpacity="0.55" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M444 252 A168 168 0 0 1 434 280" stroke="#358D98" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" />
      </svg>

      <div className={styles.trio}>
        {HERO_SLOTS.map((slot) => {
          const app = APP_BY_SLUG[slot.slug];
          const screen = app.screens[slot.screenIndex] ?? app.screens[0];
          const isSelected = slot.slug === activeSlug;

          return (
            <button
              key={slot.slug}
              type="button"
              className={`${styles.watchBtn} ${styles[slot.position]}`}
              data-active={isSelected}
              aria-pressed={isSelected}
              aria-label={`Inspect ${app.name} on UNA Watch`}
              onClick={() => setActiveSlug(slot.slug)}
            >
              <span className={styles.watchFrame}>
                <Image
                  src={screen.file}
                  alt={`${app.name}: ${screen.label}`}
                  width={480}
                  height={480}
                  unoptimized
                  loading="eager"
                  className={styles.watchScreen}
                />
                <Image
                  src={WATCH_RENDERS[app.palette.watch]}
                  alt={`UNA Watch (${app.palette.watch}) showing ${app.name}`}
                  fill
                  sizes="(max-width: 640px) 160px, 240px"
                  className={styles.watchRender}
                  priority={slot.position === 'center'}
                />
              </span>
              <span className={styles.watchTag}>
                <Image src={app.icon} alt="" width={20} height={20} unoptimized loading="eager" className={styles.tagIcon} />
                <span>{app.name}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.captionBar} aria-live="polite">
        <div className={styles.captionMeta}>
          <span
            className={styles.captionDot}
            style={{ backgroundColor: activeApp.palette.accent }}
            aria-hidden="true"
          />
          <span className={styles.captionFinish}>{activeSlot.finishLabel}</span>
        </div>
        <p className={styles.captionText}>{activeSlot.caption}</p>
        <a
          href={`#${activeApp.slug}`}
          className={styles.captionJump}
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.hash = activeApp.slug;
            }
          }}
        >
          Inspect {activeApp.name} <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}
