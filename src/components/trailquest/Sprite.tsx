import { sprite } from './data';
import styles from './Sprite.module.css';

/*
 * One of the game's sprites at whole-pixel scale, with its two-frame idle as
 * the watch plays it: the second frame blinks over the first by CSS alone, so
 * a field of them costs no script. Bosses are drawn on a 32-pixel grid, the
 * rest on 24, so @p px is the size of one game pixel, not of the picture.
 */

export default function Sprite({
  id,
  px = 4,
  grid = 24,
  flip = false,
  still = false,
  alt = '',
  className,
}: {
  id: string;
  px?: number;
  grid?: number;
  flip?: boolean;
  still?: boolean;
  alt?: string;
  className?: string;
}) {
  const size = px * grid;
  return (
    <span
      className={`${styles.sprite} ${flip ? styles.flip : ''} ${className ?? ''}`}
      style={{ width: size, height: size }}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 24-pixel art, scaled by CSS */}
      <img src={sprite(id, 0)} alt="" width={size} height={size} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {still ? null : <img src={sprite(id, 1)} alt="" width={size} height={size} className={styles.f1} />}
    </span>
  );
}
