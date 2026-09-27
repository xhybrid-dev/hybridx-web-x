import { height, RIDGE_LOOP } from '@/lib/trail-terrain';
import { formatDistance } from '@/lib/trail-route';
import styles from './Steps.module.css';

/*
 * The visuals for "how it works" and "it's a run, too". Static, drawn in HTML
 * and CSS (the GPX stream scrolls with a CSS animation).
 *
 * The watch screens here are concept designs from the promo film
 * (promo/lib/ui-trail.mjs: routeList, dataFace). The app's real screens are
 * phase T3 of the brief; the page labels these as concepts.
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

const LIST = [
  { name: 'Coast path', tip: '21.1 km · 310 m' },
  { name: 'Ridge loop', tip: `${formatDistance(RIDGE_LOOP.length)} · ${RIDGE_LOOP.ascentM} m` },
  { name: 'Sunday long', tip: '18.0 km · 240 m' },
];

/** The route list, as the concept design draws it: the SDK's wheel menu. */
export function RouteListScreen() {
  return (
    <div className={styles.watchFace} role="img" aria-label="Concept design: the watch's route list, with Ridge loop selected, 14.2 km.">
      <p className={styles.faceTitle}>Routes</p>
      <span className={styles.faceRule} />
      <p className={styles.menuItem}>{LIST[0].name}</p>
      <div className={styles.menuSel}>
        <strong>{LIST[1].name}</strong>
        <span>{LIST[1].tip}</span>
      </div>
      <p className={styles.menuItem}>{LIST[2].name}</p>
      <span className={styles.hintR1} />
      <span className={styles.hintR2} />
    </div>
  );
}

/** A run data face, as RunLVGL's: the numbers are illustrative. */
export function DataScreen() {
  return (
    <div className={styles.watchFace} role="img" aria-label="Concept design: the run screen, with distance, pace, time, heart rate and lap.">
      <p className={styles.faceTitle}>Run</p>
      <span className={styles.faceRule} />
      <p className={styles.bigNum}>12.84</p>
      <p className={styles.unit}>km</p>
      <div className={styles.pair}>
        <p>
          <strong>5:36</strong>
          <span>/km</span>
        </p>
        <p>
          <strong>1:12:08</strong>
          <span>time</span>
        </p>
      </div>
      <p className={styles.hr}>150 bpm</p>
      <p className={styles.lap}>Lap 13</p>
      <span className={styles.hintR1} />
      <span className={styles.hintR2} />
    </div>
  );
}
