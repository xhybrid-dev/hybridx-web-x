'use client';

import { useState } from 'react';
import { STAGES } from './data';
import Sprite from './Sprite';
import styles from './FieldGuide.module.css';

/*
 * The Trail Spirits, stage by stage: a tab per stage, its page from the game,
 * and every spirit on it with the line the game gives it. The boss gets the
 * wide card at the end. Names and lines are the game's (Species.hpp).
 */

export default function FieldGuide() {
  const [i, setI] = useState(0);
  const st = STAGES[i];
  return (
    <div
      className={styles.guide}
      style={{ '--sky': st.sky, '--hill': st.hill, '--ground': st.ground } as React.CSSProperties}
    >
      <div className={styles.tabs} role="tablist" aria-label="Stages of the Ridge">
        {STAGES.map((s, k) => (
          <button
            key={s.n}
            type="button"
            role="tab"
            id={`tq-tab-${s.n}`}
            aria-selected={k === i}
            aria-controls="tq-stage"
            className={styles.tab}
            onClick={() => setI(k)}
          >
            <span className={styles.tabN}>{s.n}</span>
            <span className={styles.tabName}>{s.name}</span>
          </button>
        ))}
      </div>

      <div id="tq-stage" role="tabpanel" aria-labelledby={`tq-tab-${st.n}`} className={styles.panel} key={st.n}>
        <div className={styles.banner}>
          <p className={styles.stageNo}>Stage {st.n} of 5</p>
          <h3 className={styles.stageName}>{st.name}</h3>
          <p className={styles.page}>{st.page}</p>
        </div>

        <ul className={styles.cards}>
          {st.spirits.map((sp) => (
            <li key={sp.id} className={sp.boss ? styles.boss : styles.card}>
              <div className={styles.portrait}>
                <Sprite id={sp.id} px={sp.boss ? 4 : 4} grid={sp.boss ? 32 : 24} />
              </div>
              <div>
                {sp.boss ? <p className={styles.bossTag}>Boss</p> : null}
                <h4 className={styles.name}>{sp.name}</h4>
                <p className={styles.line}>{sp.line}</p>
                {sp.boss ? <p className={styles.ahead}>“{st.ahead}”</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
