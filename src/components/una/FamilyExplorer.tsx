'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { FAMILY, RECORDERS, WATCH_RENDER, icon, type AppSlug } from '@/lib/una-family';
import styles from './FamilyExplorer.module.css';

/*
 * The whole of /una's argument in two connected parts:
 *
 *   1. The picture: five apps, each with a line flowing into X Streak. It is
 *      the first thing on the page and it is also the menu: press an app.
 *   2. The tabs: the same six apps, and one panel that shows the chosen one
 *      straight away. Nothing to scroll through.
 *
 * Both drive one piece of state, mirrored in the address (#run) so a link can
 * open on a particular app.
 */

// Where each app sits in the picture, in a 1000 x 520 box.
const BOX = { w: 1000, h: 520 };
const TOP_Y = 100;
const HUB = { x: 500, y: 440 };
const XS = [100, 300, 500, 700, 900];

// Race's yellow is too pale to draw a line with on white.
const lineColour = (slug: AppSlug, accent: string) => (slug === 'race' ? '#c79a00' : accent);

const pathFor = (x: number) =>
  x === HUB.x
    ? `M ${x} ${TOP_Y} L ${HUB.x} ${HUB.y}`
    : `M ${x} ${TOP_Y} C ${x} ${TOP_Y + 210}, ${HUB.x} ${HUB.y - 230}, ${HUB.x} ${HUB.y}`;

const isSlug = (v: string): v is AppSlug => FAMILY.some((a) => a.slug === v);

export default function FamilyExplorer() {
  const [slug, setSlug] = useState<AppSlug>('race');
  const [screen, setScreen] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);
  const app = FAMILY.find((a) => a.slug === slug)!;

  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    if (isSlug(fromHash)) setSlug(fromHash);
  }, []);

  function choose(next: AppSlug, reveal = false) {
    setSlug(next);
    setScreen(0);
    window.history.replaceState(null, '', `#${next}`);
    if (reveal && tabsRef.current) {
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      tabsRef.current.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    }
  }

  function onTabKey(e: React.KeyboardEvent) {
    const i = FAMILY.findIndex((a) => a.slug === slug);
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = FAMILY[(i + step + FAMILY.length) % FAMILY.length];
    choose(next.slug);
    document.getElementById(`tab-${next.slug}`)?.focus();
  }

  return (
    <>
      {/* ── The picture ─────────────────────────────────────────────────── */}
      <div className={styles.map}>
        <svg viewBox={`0 0 ${BOX.w} ${BOX.h}`} className={styles.lines} aria-hidden="true">
          {/* Trail's runs also feed Run's VO2max. */}
          <line x1={XS[1]} y1={TOP_Y} x2={XS[2]} y2={TOP_Y} className={styles.side} />
          {RECORDERS.map((a, i) => {
            const d = pathFor(XS[i]);
            const on = slug === a.slug || slug === 'streak';
            const colour = lineColour(a.slug, a.accent);
            return (
              <g key={a.slug}>
                <path d={d} className={styles.line} data-on={on} style={{ stroke: on ? colour : undefined }} />
                <circle r="7" fill={colour} className={styles.dot}>
                  <animateMotion dur="2.6s" begin={`-${i * 0.5}s`} repeatCount="indefinite" path={d} />
                </circle>
              </g>
            );
          })}
        </svg>

        <span className={styles.sideLabel} style={{ left: `${((XS[1] + XS[2]) / 2 / BOX.w) * 100}%`, top: `${(TOP_Y / BOX.h) * 100}%` }}>
          VO2max
        </span>

        {RECORDERS.map((a, i) => (
          <button
            key={a.slug}
            type="button"
            className={styles.node}
            data-on={slug === a.slug}
            aria-pressed={slug === a.slug}
            style={{ left: `${(XS[i] / BOX.w) * 100}%`, top: `${(TOP_Y / BOX.h) * 100}%` }}
            onClick={() => choose(a.slug, true)}
          >
            <Image src={icon(a.slug)} alt="" width={168} height={168} priority />
            <span>{a.tab}</span>
          </button>
        ))}

        <button
          type="button"
          className={`${styles.node} ${styles.hub}`}
          data-on={slug === 'streak'}
          aria-pressed={slug === 'streak'}
          style={{ left: `${(HUB.x / BOX.w) * 100}%`, top: `${(HUB.y / BOX.h) * 100}%` }}
          onClick={() => choose('streak', true)}
        >
          <Image src={icon('streak')} alt="" width={208} height={208} priority />
          <span>X Streak</span>
        </button>
      </div>

      <ul className={styles.outcomes}>
        <li>Your weekly streak</li>
        <li>One training load</li>
        <li>Fitness, fatigue and form</li>
      </ul>

      {/* ── The tabs ────────────────────────────────────────────────────── */}
      <div ref={tabsRef} className={styles.explorer}>
        <div className={styles.tabs} role="tablist" aria-label="The six apps" onKeyDown={onTabKey}>
          {FAMILY.map((a) => (
            <button
              key={a.slug}
              id={`tab-${a.slug}`}
              type="button"
              role="tab"
              aria-selected={slug === a.slug}
              aria-controls="app-panel"
              tabIndex={slug === a.slug ? 0 : -1}
              className={styles.tab}
              onClick={() => choose(a.slug)}
            >
              <Image src={icon(a.slug)} alt="" width={48} height={48} />
              {a.tab}
            </button>
          ))}
        </div>

        <div
          key={app.slug}
          id="app-panel"
          role="tabpanel"
          aria-labelledby={`tab-${app.slug}`}
          className={styles.panel}
          style={{
            ['--ground' as string]: app.ground,
            ['--ink' as string]: app.ink,
            ['--accent' as string]: app.accent,
          }}
        >
          <div className={styles.copy}>
            <p className={styles.appName}>
              <Image src={icon(app.slug)} alt="" width={56} height={56} />
              {app.name}
            </p>
            <h2 className={styles.tagline}>{app.tagline}</h2>
            <p className={styles.summary}>{app.summary}</p>

            <ul className={styles.features}>
              {app.features.map((f) => (
                <li key={f.title}>
                  <b>{f.title}</b>
                  <span>{f.body}</span>
                </li>
              ))}
            </ul>

            <ul className={styles.together} aria-label="How it works with the others">
              {app.together.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>

            {app.page ? (
              <Link href={app.page} className={styles.more}>
                More about {app.name} <span aria-hidden="true">→</span>
              </Link>
            ) : null}
          </div>

          <div className={styles.show}>
            <div className={styles.watch}>
              <Image
                key={app.screens[screen].src}
                src={app.screens[screen].src}
                alt={`${app.name} on UNA Watch: ${app.screens[screen].label}`}
                width={480}
                height={480}
                className={styles.screen}
                priority
              />
              <Image src={WATCH_RENDER[app.watch]} alt="" fill sizes="320px" className={styles.render} priority />
            </div>
            <div className={styles.thumbs} role="group" aria-label="Screens">
              {app.screens.map((sc, i) => (
                <button key={sc.src} type="button" aria-pressed={i === screen} onClick={() => setScreen(i)}>
                  <Image src={sc.src} alt="" width={96} height={96} />
                  <span>{sc.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

