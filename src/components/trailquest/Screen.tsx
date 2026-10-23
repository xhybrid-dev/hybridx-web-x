import Image from 'next/image';
import styles from './Screen.module.css';

/*
 * A real Trail Quest screen, captured in the UNA simulator (trailquest
 * docs/screens/), in a round bezel and shown at whole pixels, as on the watch.
 */

export default function Screen({ name, alt, size = 220 }: { name: string; alt: string; size?: number }) {
  return (
    <div className={styles.bezel} style={{ width: `min(${size}px, 100%)` }}>
      <Image src={`/trail-quest/screens/${name}.png`} alt={alt} fill sizes={`${size}px`} className={styles.shot} unoptimized />
    </div>
  );
}
