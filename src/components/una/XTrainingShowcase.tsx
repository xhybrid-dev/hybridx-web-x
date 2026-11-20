'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  APP_BY_SLUG,
  TRAINING_MEDICAL_NOTICE,
  TRAINING_PLANS,
  WATCH_RENDERS,
  type TrainingPlanSpec,
} from '@/lib/una-family';
import styles from './XTrainingShowcase.module.css';

export default function XTrainingShowcase() {
  const [planId, setPlanId] = useState<TrainingPlanSpec['id']>('10k');
  const [screenIndex, setScreenIndex] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const trainingApp = APP_BY_SLUG.training;
  const activePlan = TRAINING_PLANS.find((p) => p.id === planId) ?? TRAINING_PLANS[0];
  const activeScreen = trainingApp.screens[screenIndex] ?? trainingApp.screens[0];

  const handlePlanKeyDown = (e: React.KeyboardEvent, idx: number) => {
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % TRAINING_PLANS.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + TRAINING_PLANS.length) % TRAINING_PLANS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TRAINING_PLANS.length - 1;
    else return;
    e.preventDefault();
    setPlanId(TRAINING_PLANS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className={styles.root}>
      <div className={styles.splitCard}>
        {/* Left: Interactive 3-Plan Explorer */}
        <div className={styles.planSide}>
          <div className={styles.appBadgeRow}>
            <Image src={trainingApp.icon} alt="" width={38} height={38} className={styles.appIcon} />
            <div>
              <span className={styles.newPill}>NEW APP · 3 BUILT-IN PLANS</span>
              <p className={styles.subLine}>Beginner to Experienced · Pick any 3–6 run days · Outdoors or treadmill</p>
            </div>
          </div>

          <div className={styles.planTabs} role="tablist" aria-label="X Training built-in plans">
            {TRAINING_PLANS.map((plan, idx) => {
              const selected = plan.id === planId;
              return (
                <button
                  key={plan.id}
                  ref={(el) => {
                    tabRefs.current[idx] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`training-plan-tab-${plan.id}`}
                  aria-selected={selected}
                  aria-controls={`training-plan-panel-${plan.id}`}
                  tabIndex={selected ? 0 : -1}
                  className={styles.planTab}
                  data-selected={selected}
                  onClick={() => setPlanId(plan.id)}
                  onKeyDown={(e) => handlePlanKeyDown(e, idx)}
                >
                  <span className={styles.planTabName}>{plan.name}</span>
                  <span className={styles.planTabWeeks}>{plan.weeks}</span>
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`training-plan-panel-${activePlan.id}`}
            aria-labelledby={`training-plan-tab-${activePlan.id}`}
            className={styles.planPanel}
          >
            <h3 className={styles.planHeadline}>{activePlan.headline}</h3>
            <p className={styles.planSummary}>{activePlan.summary}</p>

            <div className={styles.longRunBar}>
              <span className={styles.metaLabel}>LONG RUN PROGRESSION</span>
              <span className={styles.longRunValue}>{activePlan.longRunRange}</span>
            </div>

            <div className={styles.phasesBlock}>
              <span className={styles.metaLabel}>BLOCK STRUCTURE</span>
              <ol className={styles.phaseGrid}>
                {activePlan.phases.map((phase) => (
                  <li key={phase.name} className={styles.phaseItem}>
                    <div className={styles.phaseTop}>
                      <strong>{phase.name}</strong>
                      <span>{phase.weeks}</span>
                    </div>
                    <p>{phase.focus}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className={styles.workoutsBlock}>
              <span className={styles.metaLabel}>REPRESENTATIVE SESSIONS</span>
              <ul className={styles.workoutList}>
                {activePlan.keyWorkouts.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>

            <div className={styles.ecosystemCallout}>
              <span className={styles.ecoChip}>STREAK + X RUN LOOP</span>
              <p>{activePlan.streakAndRunNote}</p>
            </div>

            <div className={styles.planActions}>
              <Link href="/training" className={styles.primaryLink}>
                Explore the full X Training page <span aria-hidden="true">→</span>
              </Link>
              <a href="#training" className={styles.secondaryLink}>
                Jump to app specs below
              </a>
            </div>
          </div>
        </div>

        {/* Right: Interactive Black UNA Watch Gallery (all 8 real screens) */}
        <div className={styles.watchSide}>
          <div className={styles.watchStage}>
            <div className={styles.watchWrap}>
              <Image
                src={activeScreen.file}
                alt={`X Training watch screen: ${activeScreen.label}`}
                width={480}
                height={480}
                unoptimized
                loading="eager"
                className={styles.watchScreen}
              />
              <Image
                src={WATCH_RENDERS.black}
                alt="UNA Watch Charcoal displaying X Training"
                fill
                sizes="(max-width: 768px) 220px, 270px"
                className={styles.watchRender}
              />
            </div>

            <div className={styles.screenMeta} aria-live="polite">
              <span className={styles.screenCount}>
                SCREEN {String(screenIndex + 1).padStart(2, '0')} / {String(trainingApp.screens.length).padStart(2, '0')} · {activeScreen.label}
              </span>
              <p className={styles.screenCaption}>{activeScreen.caption}</p>
            </div>

            <div className={styles.screenPicker} role="group" aria-label="X Training watch screens">
              {trainingApp.screens.map((sc, i) => {
                const selected = i === screenIndex;
                return (
                  <button
                    key={sc.file}
                    type="button"
                    className={styles.screenBtn}
                    data-selected={selected}
                    aria-pressed={selected}
                    onClick={() => setScreenIndex(i)}
                  >
                    <Image src={sc.file} alt="" width={40} height={40} unoptimized loading="eager" className={styles.thumbImg} />
                    <span>{sc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <p className={styles.medicalNote}>{TRAINING_MEDICAL_NOTICE}</p>
    </div>
  );
}
