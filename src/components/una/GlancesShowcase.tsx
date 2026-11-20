'use client';

import { useState } from 'react';
import Image from 'next/image';
import { APP_BY_SLUG, GLANCES, type AppSlug } from '@/lib/una-family';
import styles from './GlancesShowcase.module.css';

const PARENT_APP_BY_GLANCE: Record<string, AppSlug> = {
  'streak-glance': 'streak',
  'run-glance': 'run',
  'training-glance': 'training',
};

export default function GlancesShowcase() {
  const [stateBySlug, setStateBySlug] = useState<Record<string, number>>({});

  return (
    <div className={styles.grid}>
      {GLANCES.map((glance) => {
        const idx = stateBySlug[glance.slug] ?? 0;
        const preview = glance.previews[idx] ?? glance.previews[0];
        const parentSlug = PARENT_APP_BY_GLANCE[glance.slug] ?? 'streak';
        const parentApp = APP_BY_SLUG[parentSlug];
        return (
          <article key={glance.slug} className={styles.card}>
            <div className={styles.cardHead}>
              <Image
                src={parentApp.icon}
                alt=""
                width={40}
                height={40}
                unoptimized
                loading="lazy"
                className={styles.icon}
              />
              <div>
                <h3 className={styles.name}>{glance.name}</h3>
                <p className={styles.headline}>{glance.headline}</p>
              </div>
            </div>

            {/* Authentic dark watch-face glance viewport */}
            <div className={styles.bezelStage}>
              <div className={styles.bezelFrame}>
                <Image
                  src={preview.file}
                  alt={`${glance.name} preview: ${preview.label}`}
                  width={360}
                  height={220}
                  unoptimized
                  loading="lazy"
                  className={styles.previewImg}
                />
              </div>
              <span className={styles.stateLabel}>State: {preview.label}</span>
            </div>

            <div className={styles.toggleRow} role="group" aria-label={`${glance.name} states`}>
              {glance.previews.map((p, i) => {
                const selected = i === idx;
                return (
                  <button
                    key={p.file}
                    type="button"
                    className={styles.toggleBtn}
                    data-selected={selected}
                    aria-pressed={selected}
                    onClick={() =>
                      setStateBySlug((prev) => ({
                        ...prev,
                        [glance.slug]: i,
                      }))
                    }
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <p className={styles.detail}>{glance.detail}</p>
          </article>
        );
      })}
    </div>
  );
}
