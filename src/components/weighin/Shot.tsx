import Image from 'next/image';
import type { ReactNode } from 'react';
import styles from './Shot.module.css';

/*
 * A watch screen in a round bezel: a real capture from public/weigh-in/ (the
 * app's store previews, from its simulator, and the glance's previews, drawn
 * from its layout code), or, as children, a screen drawn by the page.
 */

export default function Shot({ src, alt, size = 240, children }: { src?: string; alt?: string; size?: number; children?: ReactNode }) {
  return (
    <div className={styles.bezel} style={{ width: `min(${size}px, 100%)` }}>
      {src ? <Image src={src} alt={alt ?? ''} fill sizes={`${size}px`} className={styles.shot} /> : children}
    </div>
  );
}
