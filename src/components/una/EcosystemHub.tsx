'use client';

import { useState } from 'react';
import Image from 'next/image';
import { APP_BY_SLUG, RECORDERS, STREAK, type AppSlug } from '@/lib/una-family';
import styles from './EcosystemHub.module.css';

const STREAK_PILLARS = [
  {
    title: 'Weekly habit & cumulative summits',
    screen: '/una/screens/streak/home.png',
    alt: 'X Streak home screen showing mountain summit climb and weekly target',
    body: "Set 1 to 7 sessions a week and climb five peaks from Arthur's Seat (4 weeks) to Everest (104 weeks). Climbs count every achieved week cumulatively — a missed week never pushes you down the mountain.",
  },
  {
    title: 'One load across all six apps',
    screen: '/una/screens/streak/training-load.png',
    alt: 'X Streak Training Load screen showing 42-day Fitness, 7-day Fatigue and Form',
    body: 'Every X app scores your session with identical Edwards 5-zone heart-rate load. X Streak blends runs, rides, races and gym work into 42-day Fitness, 7-day Fatigue and Form — after an honest 14-day baseline.',
  },
  {
    title: 'Auto-counted & shielded for real life',
    screen: '/una/screens/streak/shield.png',
    alt: 'X Streak Shield prompt asking whether to spend a shield after a missed week',
    body: 'Save in any X app and it appears in X Streak automatically under its watch name. Earn up to two Shields (one per four achieved weeks) for illness, travel or busy weeks — always your choice.',
  },
];

const VO2_GROUP_SLUGS: AppSlug[] = ['training', 'run', 'trail'];
const OTHER_GROUP_SLUGS: AppSlug[] = ['race', 'ride', 'workout'];

export default function EcosystemHub() {
  const [selectedSlug, setSelectedSlug] = useState<AppSlug>('streak');

  const selectedApp = APP_BY_SLUG[selectedSlug];
  const vo2Apps = VO2_GROUP_SLUGS.map((slug) => APP_BY_SLUG[slug]);
  const otherApps = OTHER_GROUP_SLUGS.map((slug) => APP_BY_SLUG[slug]);
  const isVo2Selected = VO2_GROUP_SLUGS.includes(selectedSlug);

  const selectAndScrollDeepDive = (slug: AppSlug) => {
    setSelectedSlug(slug);
    if (typeof window !== 'undefined') {
      window.location.hash = slug;
    }
  };

  const renderAppButton = (app: (typeof RECORDERS)[number]) => {
    const active = selectedSlug === app.slug;
    const dimmed = selectedSlug !== 'streak' && !active;
    return (
      <button
        key={app.slug}
        type="button"
        className={styles.appNode}
        data-active={active}
        data-dimmed={dimmed}
        aria-pressed={active}
        aria-label={`Trace ${app.name} connection`}
        onClick={() => setSelectedSlug(app.slug)}
      >
        {app.isNew && <span className={styles.newBadge}>NEW </span>}
        <span
          className={styles.iconRing}
          style={{
            backgroundColor: app.palette.lightTint,
            borderColor: active ? app.palette.inkOnLight : 'rgba(14, 19, 22, 0.12)',
          }}
        >
          <Image src={app.icon} alt="" width={48} height={48} unoptimized loading="eager" className={styles.nodeIcon} />
        </span>
        <span className={styles.nodeName}>{app.name} </span>
        <span className={styles.nodeSport}>{app.ecosystem.sportTag}</span>
      </button>
    );
  };

  return (
    <div className={styles.root}>
      {/* Interactive 6 -> 1 -> 6 Hub Card */}
      <div className={styles.hubCard}>
        <div className={styles.hubTopBar}>
          <div className={styles.legend} aria-label="Ecosystem grouping legend">
            <span className={styles.legendItem}>
              <span className={styles.swatchOrange} aria-hidden="true" />
              Shared VO2max group (X Training, X Run &amp; X Trail)
            </span>
            <span className={styles.legendItem}>
              <span className={styles.swatchTeal} aria-hidden="true" />
              All six apps sync automatically with X Streak
            </span>
          </div>
          <span className={styles.busBadge}>100% local · works offline</span>
        </div>

        {/* Grouped 6-App Selector -> Centered Flow Connector -> X Streak Hub */}
        <div className={styles.diagramStage}>
          <div className={styles.groupsRow}>
            {/* VO2max Running Group with explicit grouping border */}
            <div
              className={styles.vo2GroupBox}
              data-active={isVo2Selected}
              role="group"
              aria-label="Running apps sharing one VO2max estimate"
            >
              <div className={styles.groupHeader}>
                <span className={styles.vo2GroupPill}>Shared VO2max Estimate</span>
                <span className={styles.groupSub}>Steady outdoor runs update one trend</span>
              </div>
              <div className={styles.groupThreeGrid}>{vo2Apps.map(renderAppButton)}</div>
            </div>

            {/* Race, Ride & Gym Group */}
            <div
              className={styles.otherGroupBox}
              role="group"
              aria-label="Hybrid race, cycling and gym apps"
            >
              <div className={styles.groupHeader}>
                <span className={styles.otherGroupPill}>Race, Ride &amp; Gym</span>
                <span className={styles.groupSub}>Same heart-rate load currency</span>
              </div>
              <div className={styles.groupThreeGrid}>{otherApps.map(renderAppButton)}</div>
            </div>
          </div>

          {/* Clean Centered Connector Into X Streak */}
          <div className={styles.connectorRow} aria-hidden="true">
            <span className={styles.connectorLine} />
            <span className={styles.connectorPill}>
              ↓ Every saved session flows straight into X Streak · live status comes right back ↑
            </span>
            <span className={styles.connectorLine} />
          </div>

          {/* Central Hub Node: X Streak */}
          <div className={styles.hubRow}>
            <button
              type="button"
              className={styles.streakHubBtn}
              data-active={selectedSlug === 'streak'}
              aria-pressed={selectedSlug === 'streak'}
              aria-label="Inspect X Streak central dashboard"
              onClick={() => setSelectedSlug('streak')}
            >
              <span className={styles.hubIconWrap}>
                <Image src={STREAK.icon} alt="" width={58} height={58} unoptimized loading="eager" className={styles.hubIcon} />
              </span>
              <span className={styles.hubText}>
                <span className={styles.hubEyebrow}>CENTRAL DASHBOARD HUB </span>
                <strong className={styles.hubTitle}>X Streak </strong>
                <span className={styles.hubSub}>
                  Collects all 6 apps · Weekly habit, 5 summits, Fitness/Fatigue/Form &amp; live Saved-screen Streak Line
                </span>
              </span>
              <span className={styles.hubFileChip}>All 6 Apps</span>
            </button>
          </div>
        </div>

        {/* Click-Any-App 3-Column Inspector */}
        <div className={styles.tracer} aria-live="polite">
          <div className={styles.tracerHeader}>
            <div className={styles.tracerTitleRow}>
              <Image src={selectedApp.icon} alt="" width={36} height={36} unoptimized loading="eager" className={styles.tracerIcon} />
              <div>
                <h3 className={styles.tracerName}>
                  {selectedApp.name}{' '}
                  <span
                    className={styles.tracerSportPill}
                    style={{
                      backgroundColor: selectedApp.palette.lightTint,
                      color: selectedApp.palette.inkOnLight,
                    }}
                  >
                    {selectedApp.ecosystem.sportTag}
                  </span>
                </h3>
                <p className={styles.tracerRole}>{selectedApp.role}</p>
              </div>
            </div>
            <div className={styles.tracerActions}>
              <a
                href={`#${selectedApp.slug}`}
                className={styles.tracerDeepLink}
                onClick={() => selectAndScrollDeepDive(selectedApp.slug)}
              >
                Full app details <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>

          <div className={styles.tracerCols}>
            <div className={styles.tracerCol}>
              <span className={styles.colIndex}>01 · ON THE WATCH</span>
              <p>{selectedApp.summary}</p>
            </div>
            <div className={styles.tracerCol}>
              <span className={styles.colIndex}>
                {selectedSlug === 'streak' ? '02 · COLLECTS FROM ALL SIX APPS' : '02 · SENT AUTOMATICALLY TO X STREAK'}
              </span>
              <ul>
                {selectedApp.ecosystem.sendsToStreak.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className={styles.tracerCol}>
              <span className={styles.colIndex}>03 · INSTANT FEEDBACK BACK TO YOU</span>
              <ul>
                {selectedApp.ecosystem.receivesBack.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {selectedApp.ecosystem.peerLinks && selectedApp.ecosystem.peerLinks.length > 0 && (
            <div className={styles.peerStrip}>
              <span className={styles.peerLabel}>Connected directly with:</span>
              <div className={styles.peerPills}>
                {selectedApp.ecosystem.peerLinks.map((peer) => {
                  const target = APP_BY_SLUG[peer.target];
                  return (
                    <button
                      key={`${selectedApp.slug}-${peer.target}`}
                      type="button"
                      className={styles.peerPill}
                      onClick={() => setSelectedSlug(peer.target)}
                    >
                      <Image src={target.icon} alt="" width={18} height={18} unoptimized loading="eager" className={styles.peerIcon} />
                      <span>{peer.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inside X Streak: 3 Visual Dashboard Pillars with Real Watch Screens */}
      <div className={styles.pillars}>
        <div className={styles.pillarsHead}>
          <span className={styles.pillarsKicker}>INSIDE THE X STREAK DASHBOARD</span>
          <h3 className={styles.pillarsTitle}>
            One honest place to see consistency, fitness and recovery.
          </h3>
        </div>
        <div className={styles.pillarGrid}>
          {STREAK_PILLARS.map((pillar) => (
            <article key={pillar.title} className={styles.pillarCard}>
              <div className={styles.pillarDialWrap}>
                <Image
                  src={pillar.screen}
                  alt={pillar.alt}
                  width={480}
                  height={480}
                  unoptimized
                  loading="eager"
                  className={styles.pillarDial}
                />
              </div>
              <h4 className={styles.pillarHeading}>{pillar.title}</h4>
              <p className={styles.pillarBody}>{pillar.body}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
