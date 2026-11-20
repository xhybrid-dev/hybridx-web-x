'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type TouchEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  APP_BY_SLUG,
  RECORDERS,
  STANDALONE_APPS,
  STREAK,
  TRAINING_MEDICAL_NOTICE,
  TRAINING_PLANS,
  WATCH_RENDERS,
  type AppSlug,
  type TrainingPlanSpec,
  type UnaApp,
} from '@/lib/una-family';
import { FAMILY_SECTION_IDS, isFamilyHash, slugFromHash } from './family-hash';
import styles from './FamilyExplorer.module.css';

/*
 * One explorer for all seven apps. It replaces three stacked sections (hub
 * diagram, X Training showcase, per-app deep dive) that each re-described the
 * same apps. The diagram is the selector; the panel below it holds the detail.
 *
 * Every app's panel stays in the DOM and is only `hidden` while inactive, so
 * the copy remains readable to crawlers and to anyone without scripts. Images
 * in inactive panels are lazy and do not load until the panel is shown.
 *
 * On a phone, anything that used to be a long list is a swipe row
 * (scroll-snap, no JS) or sits behind an inner tab.
 */

const VO2_GROUP: AppSlug[] = ['training', 'run', 'trail'];
const OTHER_GROUP: AppSlug[] = ['race', 'ride', 'workout'];

const STREAK_PILLARS = [
  {
    title: 'Weekly habit & summits',
    screen: '/una/screens/streak/home.png',
    alt: 'X Streak home screen showing mountain summit climb and weekly target',
    body: "Set 1 to 7 sessions a week and climb five peaks from Arthur's Seat (4 weeks) to Everest (104 weeks). Climbs count every achieved week cumulatively, so a missed week never pushes you down the mountain.",
  },
  {
    title: 'One load across all six apps',
    screen: '/una/screens/streak/training-load.png',
    alt: 'X Streak Training Load screen showing 42-day Fitness, 7-day Fatigue and Form',
    body: 'Every X app scores your session with identical Edwards 5-zone heart-rate load. X Streak blends runs, rides, races and gym work into 42-day Fitness, 7-day Fatigue and Form, after an honest 14-day baseline.',
  },
  {
    title: 'Auto-counted & shielded',
    screen: '/una/screens/streak/shield.png',
    alt: 'X Streak Shield prompt asking whether to spend a shield after a missed week',
    body: 'Save in any X app and it appears in X Streak automatically under its watch name. Earn up to two Shields (one per four achieved weeks) for illness, travel or busy weeks, always your choice.',
  },
] as const;

type PaneId = 'plans' | 'dashboard' | 'features' | 'together';

function panesFor(app: UnaApp): { id: PaneId; label: string }[] {
  const base: { id: PaneId; label: string }[] = [
    { id: 'features', label: 'Features' },
    { id: 'together', label: 'With the family' },
  ];
  if (app.slug === 'training') return [{ id: 'plans', label: 'Plans' }, ...base];
  if (app.slug === 'streak') return [{ id: 'dashboard', label: 'Dashboard' }, ...base];
  return base;
}

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** ←/→/Home/End across a row of buttons that share a roving tabindex. */
function rovingKeys(e: KeyboardEvent, idx: number, count: number, go: (next: number) => void) {
  let next = idx;
  if (e.key === 'ArrowRight') next = (idx + 1) % count;
  else if (e.key === 'ArrowLeft') next = (idx - 1 + count) % count;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = count - 1;
  else return;
  e.preventDefault();
  go(next);
}

export default function FamilyExplorer() {
  const [selected, setSelected] = useState<AppSlug>('training');
  const rootRef = useRef<HTMLDivElement | null>(null);

  const select = useCallback((slug: AppSlug) => {
    setSelected(slug);
    try {
      window.history.replaceState(null, '', `#${slug}`);
    } catch {
      /* hash is a nicety; selection still works without it */
    }
  }, []);

  useEffect(() => {
    const sync = (scroll: boolean) => {
      const hash = window.location.hash;
      const slug = slugFromHash(hash);
      if (slug) setSelected(slug);
      if (scroll && isFamilyHash(hash)) {
        rootRef.current?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
      }
    };
    sync(false);
    const onHash = () => sync(true);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const renderNode = (app: UnaApp) => {
    const active = selected === app.slug;
    return (
      <button
        key={app.slug}
        type="button"
        className={styles.node}
        data-active={active}
        aria-pressed={active}
        aria-controls={`family-panel-${app.slug}`}
        onClick={() => select(app.slug)}
      >
        {app.isNew && <span className={styles.newBadge}>NEW</span>}
        <span
          className={styles.iconRing}
          style={{ backgroundColor: app.palette.lightTint, borderColor: active ? app.palette.inkOnLight : undefined }}
        >
          <Image src={app.icon} alt="" width={44} height={44} unoptimized loading="eager" className={styles.nodeIcon} />
        </span>
        <span className={styles.nodeName}>{app.name}</span>
        <span className={styles.nodeSport}>{app.ecosystem.sportTag}</span>
      </button>
    );
  };

  return (
    <div ref={rootRef} className={styles.root}>
      {/* Anchor targets so /una#<slug> and the old section links land here even before scripts run */}
      <div className={styles.anchors} aria-hidden="true">
        {[...RECORDERS.map((a) => a.slug), STREAK.slug, ...FAMILY_SECTION_IDS].map((id) => (
          <span key={id} id={id} />
        ))}
      </div>

      <div className={styles.hub}>
        <div className={styles.groups}>
          <div className={styles.group} data-kind="run" role="group" aria-label="Running apps sharing one VO2max estimate">
            <p className={styles.groupLabel}>Shared VO2max estimate</p>
            <div className={styles.nodes}>{VO2_GROUP.map((s) => renderNode(APP_BY_SLUG[s]))}</div>
          </div>
          <div className={styles.group} data-kind="other" role="group" aria-label="Race, ride and gym apps">
            <p className={styles.groupLabel}>Race, Ride &amp; Gym</p>
            <div className={styles.nodes}>{OTHER_GROUP.map((s) => renderNode(APP_BY_SLUG[s]))}</div>
          </div>
        </div>

        <p className={styles.flow} aria-hidden="true">
          Every saved session flows into X Streak <span>↓</span>
        </p>

        <button
          type="button"
          className={styles.hubBtn}
          data-active={selected === 'streak'}
          aria-pressed={selected === 'streak'}
          aria-controls="family-panel-streak"
          onClick={() => select('streak')}
        >
          <Image src={STREAK.icon} alt="" width={44} height={44} unoptimized loading="eager" className={styles.hubIcon} />
          <span className={styles.hubText}>
            <strong>X Streak</strong>
            <span>Central dashboard: weekly habit, summits, Fitness / Fatigue / Form</span>
          </span>
          <span className={styles.hubChip}>All 6 apps</span>
        </button>
      </div>

      <div className={styles.panels}>
        {[...RECORDERS, STREAK].map((app) => (
          <AppPanel key={app.slug} app={app} active={app.slug === selected} onSelect={select} />
        ))}
      </div>

      <div className={styles.standalone}>
        <p className={styles.standaloneLabel}>Also for UNA Watch, deliberately outside X Streak</p>
        <div className={styles.standaloneRow}>
          {STANDALONE_APPS.map((app) => (
            <Link key={app.slug} href={app.href} className={styles.standaloneCard}>
              {app.icon && (
                <Image src={app.icon} alt="" width={40} height={40} className={styles.standaloneIcon} />
              )}
              <span className={styles.standaloneText}>
                <strong>{app.name}</strong>
                <span>{app.role}</span>
              </span>
              <span aria-hidden="true" className={styles.standaloneArrow}>
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── One app's panel ─────────────────────────────────────────────────────── */

function AppPanel({
  app,
  active,
  onSelect,
}: {
  app: UnaApp;
  active: boolean;
  onSelect: (slug: AppSlug) => void;
}) {
  const panes = panesFor(app);
  const [pane, setPane] = useState<PaneId>(panes[0].id);
  const paneRefs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <section
      id={`family-panel-${app.slug}`}
      className={styles.panel}
      hidden={!active}
      aria-labelledby={`family-title-${app.slug}`}
      style={{ ['--tint' as string]: app.palette.lightTint, ['--ink-app' as string]: app.palette.inkOnLight }}
    >
      <header className={styles.panelHead}>
        <Image src={app.icon} alt="" width={52} height={52} unoptimized className={styles.panelIcon} />
        <div className={styles.panelTitles}>
          <h3 id={`family-title-${app.slug}`} className={styles.panelTitle}>
            {app.name}
            {app.isNew && <span className={styles.newTag}>NEW</span>}
          </h3>
          <p className={styles.panelRole}>{app.role}</p>
        </div>
        {app.detailHref && (
          <Link href={app.detailHref} className={styles.pageLink}>
            Full page <span aria-hidden="true">→</span>
          </Link>
        )}
      </header>

      <div className={styles.panelGrid}>
        <Gallery app={app} active={active} />

        <div className={styles.copy}>
          <p className={styles.summary}>{app.summary}</p>
          <p className={styles.benefit}>
            <strong>Why it matters:</strong> {app.athleteBenefit}
          </p>

          <div className={styles.paneTabs} role="tablist" aria-label={`${app.name} details`}>
            {panes.map((p, i) => {
              const sel = p.id === pane;
              return (
                <button
                  key={p.id}
                  ref={(el) => {
                    paneRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${app.slug}-tab-${p.id}`}
                  aria-selected={sel}
                  aria-controls={`${app.slug}-pane-${p.id}`}
                  tabIndex={sel ? 0 : -1}
                  className={styles.paneTab}
                  data-selected={sel}
                  onClick={() => setPane(p.id)}
                  onKeyDown={(e) =>
                    rovingKeys(e, i, panes.length, (n) => {
                      setPane(panes[n].id);
                      paneRefs.current[n]?.focus();
                    })
                  }
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {panes.map((p) => (
            <div
              key={p.id}
              role="tabpanel"
              id={`${app.slug}-pane-${p.id}`}
              aria-labelledby={`${app.slug}-tab-${p.id}`}
              hidden={p.id !== pane}
              className={styles.pane}
            >
              {p.id === 'plans' && <PlansPane />}
              {p.id === 'dashboard' && <DashboardPane />}
              {p.id === 'features' && <FeaturesPane app={app} />}
              {p.id === 'together' && <TogetherPane app={app} onSelect={onSelect} />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Watch screens: swipe, step buttons and a horizontal thumbnail strip ── */

function Gallery({ app, active }: { app: UnaApp; active: boolean }) {
  const [idx, setIdx] = useState(0);
  const touchX = useRef<number | null>(null);
  const count = app.screens.length;
  const screen = app.screens[Math.min(idx, count - 1)];

  const step = (d: number) => setIdx((i) => (i + d + count) % count);

  const onTouchStart = (e: TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchX.current;
    touchX.current = null;
    if (start === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
  };

  return (
    <div className={styles.gallery}>
      <div className={styles.watchRow}>
        <div className={styles.watchFrame} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <Image
            src={screen.file}
            alt={`${app.name} watch screen: ${screen.label}`}
            width={480}
            height={480}
            unoptimized
            loading={active ? 'eager' : 'lazy'}
            className={styles.watchScreen}
          />
          <Image
            src={WATCH_RENDERS[app.palette.watch]}
            alt=""
            fill
            sizes="(max-width: 720px) 150px, 230px"
            loading={active ? 'eager' : 'lazy'}
            className={styles.watchRender}
          />
        </div>

        <div className={styles.caption}>
          <span className={styles.captionIndex}>
            {String(idx + 1).padStart(2, '0')} / {String(count).padStart(2, '0')} · {screen.label}
          </span>
          <p aria-live="polite">{screen.caption}</p>
          <div className={styles.stepper}>
            <button type="button" onClick={() => step(-1)} aria-label={`Previous ${app.name} screen`}>
              ‹
            </button>
            <button type="button" onClick={() => step(1)} aria-label={`Next ${app.name} screen`}>
              ›
            </button>
          </div>
        </div>
      </div>

      <div className={styles.thumbs} role="group" aria-label={`${app.name} watch screens`}>
        {app.screens.map((sc, i) => (
          <button
            key={sc.file}
            type="button"
            className={styles.thumb}
            data-selected={i === idx}
            aria-pressed={i === idx}
            onClick={() => setIdx(i)}
          >
            <Image src={sc.file} alt="" width={44} height={44} unoptimized loading="lazy" className={styles.thumbImg} />
            <span>{sc.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Inner panes ─────────────────────────────────────────────────────────── */

function FeaturesPane({ app }: { app: UnaApp }) {
  return (
    <ul className={styles.cards} aria-label={`${app.name} features`}>
      {app.features.map((f) => (
        <li key={f.title} className={styles.card}>
          <h4>
            {f.title}
            {f.isNew && <span className={styles.updated}>UPDATED</span>}
          </h4>
          <p>{f.detail}</p>
        </li>
      ))}
    </ul>
  );
}

function TogetherPane({ app, onSelect }: { app: UnaApp; onSelect: (slug: AppSlug) => void }) {
  const isHub = app.slug === 'streak';
  const peers = app.ecosystem.peerLinks ?? [];
  return (
    <div className={styles.together}>
      <div>
        <h4>{isHub ? 'Reads automatically' : 'Sends to X Streak'}</h4>
        <ul>
          {app.ecosystem.sendsToStreak.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
      <div>
        <h4>{isHub ? 'Writes back out' : 'Comes back to you'}</h4>
        <ul>
          {app.ecosystem.receivesBack.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
      {peers.length > 0 && (
        <div className={styles.peers}>
          {peers.map((peer) => {
            const target = APP_BY_SLUG[peer.target];
            return (
              <button key={peer.target} type="button" className={styles.peerBtn} onClick={() => onSelect(peer.target)}>
                <Image src={target.icon} alt="" width={20} height={20} unoptimized loading="lazy" />
                <span>{peer.label}</span>
                <span aria-hidden="true">→</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlansPane() {
  const [planId, setPlanId] = useState<TrainingPlanSpec['id']>('10k');
  const plan = TRAINING_PLANS.find((p) => p.id === planId) ?? TRAINING_PLANS[0];
  return (
    <div className={styles.plans}>
      <div className={styles.planPicker} role="group" aria-label="X Training built-in plans">
        {TRAINING_PLANS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={styles.planPill}
            data-selected={p.id === planId}
            aria-pressed={p.id === planId}
            onClick={() => setPlanId(p.id)}
          >
            <strong>{p.name}</strong>
            <span>{p.weeks}</span>
          </button>
        ))}
      </div>

      <h4 className={styles.planHeadline}>{plan.headline}</h4>
      <p className={styles.planSummary}>{plan.summary}</p>
      <p className={styles.longRun}>
        <span>Long run</span> {plan.longRunRange}
      </p>

      <ol className={styles.cards} aria-label={`${plan.name} block structure`}>
        {plan.phases.map((ph) => (
          <li key={ph.name} className={styles.card}>
            <h4>
              {ph.name} <span className={styles.weeks}>{ph.weeks}</span>
            </h4>
            <p>{ph.focus}</p>
          </li>
        ))}
      </ol>

      <details className={styles.details}>
        <summary>Sample sessions ({plan.keyWorkouts.length})</summary>
        <ul>
          {plan.keyWorkouts.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </details>

      <p className={styles.note}>{plan.streakAndRunNote}</p>
      <p className={styles.fine}>{TRAINING_MEDICAL_NOTICE}</p>
    </div>
  );
}

function DashboardPane() {
  return (
    <ul className={`${styles.cards} ${styles.pillars}`} aria-label="Inside the X Streak dashboard">
      {STREAK_PILLARS.map((p) => (
        <li key={p.title} className={styles.card}>
          <Image src={p.screen} alt={p.alt} width={96} height={96} unoptimized loading="lazy" className={styles.pillarDial} />
          <h4>{p.title}</h4>
          <p>{p.body}</p>
        </li>
      ))}
    </ul>
  );
}
