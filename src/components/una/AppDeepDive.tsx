'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { APPS, APP_BY_SLUG, RECORDERS, STREAK, WATCH_RENDERS, type AppSlug } from '@/lib/una-family';
import styles from './AppDeepDive.module.css';

function parseHashSlug(hash: string): AppSlug | null {
  const clean = hash.replace(/^#/, '').trim().toLowerCase();
  return clean in APP_BY_SLUG ? (clean as AppSlug) : null;
}

export default function AppDeepDive() {
  const [selectedSlug, setSelectedSlug] = useState<AppSlug>('training');
  const [screenIdxByApp, setScreenIdxByApp] = useState<Partial<Record<AppSlug, number>>>({});
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const detailRef = useRef<HTMLDivElement | null>(null);

  const selectApp = useCallback((slug: AppSlug, opts?: { updateHash?: boolean; scroll?: boolean }) => {
    setSelectedSlug(slug);
    if (opts?.updateHash && typeof window !== 'undefined') {
      const nextHash = `#${slug}`;
      if (window.location.hash !== nextHash) {
        window.history.replaceState(null, '', nextHash);
      }
    }
    if (opts?.scroll) {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    const syncFromHash = () => {
      const slug = parseHashSlug(window.location.hash);
      if (slug) {
        setSelectedSlug(slug);
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    const initialSlug = parseHashSlug(window.location.hash);
    if (initialSlug) {
      setSelectedSlug(initialSlug);
    }

    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const activeApp = APP_BY_SLUG[selectedSlug];
  // Balanced 6-screen (2x3) gallery per app; X Training's full 8-screen set is also showcased in XTrainingShowcase & /training.
  const galleryScreens = activeApp.screens.slice(0, 6);
  const activeScreenIdx = Math.min(screenIdxByApp[selectedSlug] ?? 0, galleryScreens.length - 1);
  const activeScreen = galleryScreens[activeScreenIdx] ?? galleryScreens[0];

  const handleTabKeyDown = (e: React.KeyboardEvent, idx: number) => {
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % APPS.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + APPS.length) % APPS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = APPS.length - 1;
    else return;
    e.preventDefault();
    const nextSlug = APPS[next].slug;
    selectApp(nextSlug, { updateHash: true });
    tabRefs.current[next]?.focus();
  };

  return (
    <div className={styles.root}>
      {/* Part 5A: Balanced 3x2 Activity Apps Grid + Full-Width X Streak Hub Banner (zero orphan 7th card) */}
      <div className={styles.overviewWrap}>
        <div className={styles.matrixGrid}>
          {RECORDERS.map((app) => {
            const isSelected = app.slug === selectedSlug;
            return (
              <article
                key={app.slug}
                className={styles.overviewCard}
                data-selected={isSelected}
                style={{ borderTopColor: app.palette.accent }}
              >
                <div className={styles.cardTop}>
                  <Image src={app.icon} alt="" width={44} height={44} unoptimized loading="eager" className={styles.cardIcon} />
                  <div className={styles.cardTitles}>
                    <div className={styles.cardNameRow}>
                      <h3 className={styles.cardName}>{app.name} </h3>
                      {app.isNew && <span className={styles.newTag}>NEW </span>}
                    </div>
                    <span
                      className={styles.cardRolePill}
                      style={{
                        backgroundColor: app.palette.lightTint,
                        color: app.palette.inkOnLight,
                      }}
                    >
                      {app.ecosystem.sportTag}
                    </span>
                  </div>
                </div>

                <p className={styles.cardSummary}>{app.summary}</p>

                <p className={styles.cardBenefit}>
                  <strong>Benefit:</strong> {app.athleteBenefit}
                </p>

                <div className={styles.cardFoot}>
                  <span className={styles.cardEcoNote}>{app.together[0]} </span>
                  <button
                    type="button"
                    className={styles.inspectBtn}
                    onClick={() => selectApp(app.slug, { updateHash: true, scroll: true })}
                  >
                    Inspect 6 screens <span aria-hidden="true">↓</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* Full-Width X Streak Central Hub Banner */}
        <article
          className={styles.streakBanner}
          data-selected={selectedSlug === 'streak'}
          style={{ borderLeftColor: STREAK.palette.accent }}
        >
          <div className={styles.streakBannerLeft}>
            <Image src={STREAK.icon} alt="" width={54} height={54} unoptimized loading="eager" className={styles.streakBannerIcon} />
            <div className={styles.streakBannerCopy}>
              <div className={styles.cardNameRow}>
                <h3 className={styles.cardName}>{STREAK.name} </h3>
                <span
                  className={styles.cardRolePill}
                  style={{
                    backgroundColor: STREAK.palette.lightTint,
                    color: STREAK.palette.inkOnLight,
                  }}
                >
                  {STREAK.ecosystem.sportTag}
                </span>
              </div>
              <p className={styles.cardSummary}>{STREAK.summary}</p>
              <p className={styles.cardBenefit}>
                <strong>Benefit:</strong> {STREAK.athleteBenefit}
              </p>
            </div>
          </div>
          <div className={styles.streakBannerRight}>
            <span className={styles.cardEcoNote}>Counts all six X apps automatically</span>
            <button
              type="button"
              className={styles.inspectBtn}
              onClick={() => selectApp('streak', { updateHash: true, scroll: true })}
            >
              Inspect X Streak <span aria-hidden="true">↓</span>
            </button>
          </div>
        </article>
      </div>

      {/* Part 5B: Interactive 7-App Deep-Dive Explorer */}
      <div ref={detailRef} id="app-detail" className={styles.deepDiveWrap}>
        {/* Hidden anchor targets so direct /una#<slug> URLs always have an in-document target */}
        <div className={styles.hashAnchors} aria-hidden="true">
          {APPS.map((a) => (
            <span key={a.slug} id={a.slug} />
          ))}
        </div>

        <div className={styles.tabsHeader}>
          <span className={styles.tabsKicker}>DEEP-DIVE APP EXPLORER · ALL {APPS.length} APPS</span>
          <div className={styles.tabList} role="tablist" aria-label="Select a HybridX app to inspect in detail">
            {APPS.map((app, idx) => {
              const selected = app.slug === selectedSlug;
              return (
                <button
                  key={app.slug}
                  ref={(el) => {
                    tabRefs.current[idx] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`app-tab-${app.slug}`}
                  aria-selected={selected}
                  aria-controls={`app-panel-${app.slug}`}
                  tabIndex={selected ? 0 : -1}
                  className={styles.appTab}
                  data-selected={selected}
                  onClick={() => selectApp(app.slug, { updateHash: true })}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                >
                  <Image src={app.icon} alt="" width={22} height={22} unoptimized loading="eager" className={styles.tabIcon} />
                  <span>{app.name} </span>
                  {app.isNew && <span className={styles.tabNew}>NEW</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div
          role="tabpanel"
          id={`app-panel-${activeApp.slug}`}
          aria-labelledby={`app-tab-${activeApp.slug}`}
          className={styles.detailCard}
        >
          {/* Left: Full Features, Athlete Benefit & Ecosystem Pairing */}
          <div className={styles.detailCopy}>
            <div className={styles.detailTop}>
              <Image src={activeApp.icon} alt="" width={54} height={54} unoptimized loading="eager" className={styles.detailIcon} />
              <div>
                <div className={styles.detailTitleRow}>
                  <h3 className={styles.detailTitle}>{activeApp.name} </h3>
                  <span
                    className={styles.detailBadge}
                    style={{
                      backgroundColor: activeApp.palette.lightTint,
                      color: activeApp.palette.inkOnLight,
                    }}
                  >
                    {activeApp.role}
                  </span>
                </div>
                <p className={styles.detailTagline}>{activeApp.tagline}</p>
              </div>
            </div>

            <p className={styles.detailSummary}>{activeApp.summary}</p>

            <div
              className={styles.benefitBox}
              style={{
                backgroundColor: activeApp.palette.lightTint,
                borderLeftColor: activeApp.palette.inkOnLight,
              }}
            >
              <span className={styles.benefitLabel} style={{ color: activeApp.palette.inkOnLight }}>
                WHY IT MATTERS FOR YOUR TRAINING
              </span>
              <p>{activeApp.athleteBenefit}</p>
            </div>

            <div className={styles.featureGrid}>
              {activeApp.features.map((f) => (
                <div key={f.title} className={styles.featureItem}>
                  <div className={styles.featureHead}>
                    <h4>{f.title} </h4>
                    {f.isNew && <span className={styles.updatedPill}>UPDATED</span>}
                  </div>
                  <p>{f.detail}</p>
                </div>
              ))}
            </div>

            <div className={styles.alongsideBox}>
              <div className={styles.alongsideTop}>
                <span className={styles.alongsideKicker}>ALONGSIDE THE OTHER APPS</span>
              </div>

              <div className={styles.alongsideLists}>
                <div>
                  <strong>{activeApp.slug === 'streak' ? 'Reads automatically' : 'Sends to X Streak'}</strong>
                  <ul>
                    {activeApp.ecosystem.sendsToStreak.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>{activeApp.slug === 'streak' ? 'Writes back out' : 'Receives back'}</strong>
                  <ul>
                    {activeApp.ecosystem.receivesBack.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {activeApp.ecosystem.peerLinks && activeApp.ecosystem.peerLinks.length > 0 && (
                <div className={styles.peerRow}>
                  {activeApp.ecosystem.peerLinks.map((peer) => {
                    const target = APP_BY_SLUG[peer.target];
                    return (
                      <button
                        key={`${activeApp.slug}-jump-${peer.target}`}
                        type="button"
                        className={styles.peerJumpBtn}
                        onClick={() => selectApp(peer.target, { updateHash: true })}
                      >
                        <Image src={target.icon} alt="" width={18} height={18} unoptimized loading="eager" className={styles.peerJumpIcon} />
                        <span>Switch to {target.name}</span>
                        <span aria-hidden="true">→</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeApp.detailHref && (
                <div className={styles.dedicatedRow}>
                  <Link href={activeApp.detailHref} className={styles.dedicatedLink}>
                    Open dedicated {activeApp.name} page <span aria-hidden="true">→</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right: Realistic UNA Watch with balanced 6-screen gallery */}
          <div
            className={styles.galleryCol}
            style={{ backgroundColor: activeApp.palette.lightTint }}
          >
            <div className={styles.watchFrame}>
              <Image
                src={activeScreen.file}
                alt={`${activeApp.name} watch screen: ${activeScreen.label}`}
                width={480}
                height={480}
                unoptimized
                loading="eager"
                className={styles.watchScreen}
              />
              <Image
                src={WATCH_RENDERS[activeApp.palette.watch]}
                alt={`UNA Watch (${activeApp.palette.watch}) showing ${activeApp.name}`}
                fill
                sizes="(max-width: 768px) 220px, 270px"
                className={styles.watchRender}
              />
            </div>

            <div className={styles.captionCard} aria-live="polite">
              <span
                className={styles.captionIndex}
                style={{ color: activeApp.palette.inkOnLight }}
              >
                {String(activeScreenIdx + 1).padStart(2, '0')} / {String(galleryScreens.length).padStart(2, '0')} · {activeScreen.label}
              </span>
              <p className={styles.captionText}>{activeScreen.caption}</p>
            </div>

            <div className={styles.thumbGrid} role="group" aria-label={`${activeApp.name} watch screens`}>
              {galleryScreens.map((sc, i) => {
                const selected = i === activeScreenIdx;
                return (
                  <button
                    key={sc.file}
                    type="button"
                    className={styles.thumbBtn}
                    data-selected={selected}
                    aria-pressed={selected}
                    onClick={() =>
                      setScreenIdxByApp((prev) => ({
                        ...prev,
                        [activeApp.slug]: i,
                      }))
                    }
                  >
                    <Image src={sc.file} alt="" width={48} height={48} unoptimized loading="eager" className={styles.thumbCircle} />
                    <span>{sc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
