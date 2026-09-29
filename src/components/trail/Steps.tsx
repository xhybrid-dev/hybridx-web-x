import Image from 'next/image';
import { height, RIDGE_LOOP } from '@/lib/trail-terrain';
import styles from './Steps.module.css';

/*
 * The visuals for "how it works" and "it's a run, too". Static, drawn in HTML
 * and CSS (the GPX stream scrolls with a CSS animation), and the app's real
 * screens, from hybridx-trail's simulator captures (docs/screens/).
 */

const LAT0 = 54.45;
const LON0 = -3.05;
const R = 6371000;

/** The first points of the demo GPX, as the file on the page has them. */
function gpxLines(n = 26) {
  const [ox, oy] = RIDGE_LOOP.pts[0];
  return RIDGE_LOOP.pts.slice(0, n).map(([x, y]) => {
    const lat = LAT0 + ((y - oy) / R) * (180 / Math.PI);
    const lon = LON0 + ((x - ox) / (R * Math.cos((LAT0 * Math.PI) / 180))) * (180 / Math.PI);
    return `<trkpt lat="${lat.toFixed(7)}" lon="${lon.toFixed(7)}"><ele>${height(x, y).toFixed(1)}</ele></trkpt>`;
  });
}

export function GpxStream() {
  const lines = gpxLines();
  return (
    <div className={styles.code} aria-label="A GPX file: a list of track points, each with a latitude, longitude and elevation.">
      <div className={styles.codeHead}>
        <span>ridge-loop.gpx</span>
        <span>{RIDGE_LOOP.pts.length.toLocaleString('en-GB')} points</span>
      </div>
      <div className={styles.codeBody} aria-hidden="true">
        <div className={styles.codeScroll}>
          {[...lines, ...lines].map((l, i) => (
            <p key={i} className={i % lines.length === 9 ? styles.codeHot : undefined}>
              {l}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function UsbTree() {
  return (
    <div className={styles.tree} aria-label="The watch as a USB drive: Apps, HybridXTrail, Routes, and ridge-loop.gpx copied in.">
      <p className={styles.treeHead}>UNA WATCH (USB)</p>
      <ul>
        <li>Apps/</li>
        <li className={styles.l1}>HybridXTrail/</li>
        <li className={styles.l2}>Routes/</li>
        <li className={`${styles.l3} ${styles.copying}`}>
          ridge-loop.gpx <span className={styles.bar} />
        </li>
        <li className={`${styles.l3} ${styles.dimmed}`}>coast-path.gpx</li>
        <li className={`${styles.l3} ${styles.dimmed}`}>sunday-long.gpx</li>
      </ul>
      <p className={styles.treeFoot}>Eject, unplug, and it’s ready</p>
    </div>
  );
}


/**
 * A real screen from the app, captured in the UNA simulator at the watch's
 * 240 x 240 resolution doubled, in a round bezel.
 */
export function RealScreen({ name, alt, size = 250 }: { name: string; alt: string; size?: number }) {
  return (
    <div className={styles.watchFace} style={{ width: `min(${size}px, 100%)` }}>
      <Image src={`/trail/screens/${name}.png`} alt={alt} fill sizes={`${size}px`} className={styles.shot} />
    </div>
  );
}
