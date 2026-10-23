import Image from 'next/image';
import styles from './HeroWatch.module.css';

/*
 * The black UNA watch with real Trail Quest screens turning over in its
 * display: the title, the map, a duel and a boss, each held for three
 * seconds. CSS only; reduced motion keeps the title.
 */

const SHOTS = [
  { name: 'q3-01-title', alt: 'The title screen: TRAIL QUEST, the runner with the Red Fox and the Brown Bear.' },
  { name: 'q3-11-map', alt: 'The stage map: paths, a spirit, a hut and the boss, with Woods path chosen.' },
  { name: 'q3-14-duel-choose', alt: 'A duel with the Sand Crab: Surge, Skill, Settle and Fuel.' },
  { name: 'q3-33-boss-intro', alt: 'The Old Tortoise: guards the valley’s end. Has never once hurried.' },
];

export default function HeroWatch() {
  return (
    <div className={styles.frame}>
      <div className={styles.screen}>
        {SHOTS.map((s, i) => (
          <Image
            key={s.name}
            src={`/trail-quest/screens/${s.name}.png`}
            alt={i === 0 ? s.alt : ''}
            fill
            priority={i === 0}
            sizes="(max-width: 860px) 60vw, 300px"
            className={styles.shot}
            style={{ animationDelay: `${i * 3}s` }}
            unoptimized
          />
        ))}
      </div>
      <Image src="/weigh-in/una-watch-black.png" alt="" fill priority sizes="(max-width: 860px) 70vw, 440px" className={styles.render} />
    </div>
  );
}
