import Image from 'next/image';
import type { ReactNode } from 'react';
import WatchScreen, { type WatchView } from './WatchScreen';
import styles from './WeighWatch.module.css';

/*
 * UNA's black watch (the SDK Figma pack's render, as X Weigh-in's own store
 * images use it) with a drawn screen in its opening. The render's display is
 * transparent; the screen sits underneath on the same circle (as Trail's:
 * radius 367 at (571.5, 800.5) in the 1144 x 1576 crop, drawn at 372 so no
 * gap shows).
 *
 * @p children go over the watch, for the simulator's buttons on its case.
 */

export default function WeighWatch({
  view,
  label,
  priority = false,
  sizes = '(max-width: 700px) 70vw, 400px',
  className,
  children,
}: {
  view: WatchView;
  label: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`${styles.frame} ${className ?? ''}`}>
      <div className={styles.screen}>
        <WatchScreen view={view} label={label} />
      </div>
      <Image src="/weigh-in/una-watch-black.png" alt="" fill priority={priority} sizes={sizes} className={styles.render} />
      {children}
    </div>
  );
}
