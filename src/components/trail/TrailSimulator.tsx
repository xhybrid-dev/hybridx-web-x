'use client';

import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import {
  buildRoute,
  formatDistance,
  locate,
  offCourseStep,
  OFF_COURSE_M,
  parseGpx,
  pointAt,
  ROUTE_CAPACITY,
  slice,
  START_SPACING_M,
  toLocal,
  ZOOMS,
  type BuiltRoute,
  type LocalRoute,
} from '@/lib/trail-route';
import { bounds, contours, RIDGE_LOOP, type Contours } from '@/lib/trail-terrain';
import { COLOUR, drawContours, fitCanvas, glowLine } from './draw';
import TrailWatch, { type TrailWatchHandle } from './TrailWatch';
import styles from './TrailSimulator.module.css';

/*
 * "Try it with your own route": the page's centrepiece.
 *
 * A runner follows a route, fast-forwarded. On the left, the whole route with
 * a 50 m corridor either side and the breadcrumb of where the runner has
 * really been; on the right, the watch's map screen for the same moment.
 * Visitors can change the zoom (the brief's fixed scales), flip heading-up and
 * north-up, and press "Wander off" to leave the line and set off the alert.
 *
 * Their own GPX works too: it's read in the browser with lib/trail-route.ts,
 * which mirrors the watch's GpxReader and RouteBuilder, and is never uploaded.
 * Progress is found from the runner's position, not assumed — the same
 * along-the-line search the watch will use — so a loop that crosses itself
 * keeps to the right leg.
 */

const SPEED = 32; // metres of route per second: a brisk fast-forward
const WANDER_S = 12; // seconds out and back
const WANDER_M = 95; // how far off the line the wander goes
const CRUMBS = 140;

type Source = { kind: 'demo' } | { kind: 'file'; fileName: string };

export default function TrailSimulator() {
  const [route, setRoute] = useState<LocalRoute>(RIDGE_LOOP);
  const [source, setSource] = useState<Source>({ kind: 'demo' });
  const [stats, setStats] = useState<BuiltRoute | undefined>(undefined);
  const [zoom, setZoom] = useState<(typeof ZOOMS)[number]['id']>('500m');
  const [headingUp, setHeadingUp] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [status, setStatus] = useState<'on' | 'off'>('on');

  const mapRef = useRef<HTMLCanvasElement>(null);
  const watchRef = useRef<TrailWatchHandle>(null);
  const doneRef = useRef<HTMLElement>(null);
  const toGoRef = useRef<HTMLElement>(null);
  const offRef = useRef<HTMLElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Animation state lives in refs: the frame loop reads the latest settings.
  const sim = useRef({ s: 0, wander: -1, off: false, lastAlong: 0, banner: null as null | 'off' | 'back', bannerAt: 0, crumbs: [] as [number, number][] });
  const settings = useRef({ zoom, headingUp, playing });
  settings.current = { zoom, headingUp, playing };

  const wanderOff = () => {
    if (sim.current.wander < 0) sim.current.wander = 0;
    if (!playing) setPlaying(true);
  };

  // A new route: start again from its beginning.
  useEffect(() => {
    // Tracking starts from the start, so a loop's shared start and finish can't read as finished.
    sim.current = { s: 0, wander: -1, off: false, lastAlong: 0, banner: null, bannerAt: 0, crumbs: [] };
    setStatus('on');
  }, [route]);

  useEffect(() => {
    const canvas = mapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Contours only for the demo loop: we don't know the land under a visitor's file.
    const b = bounds(route, 0);
    const topo: Contours | null = source.kind === 'demo' ? contours(b.x0 - 600, b.y0 - 600, b.x1 + 600, b.y1 + 600, 50, 25) : null;

    let raf = 0;
    let last = performance.now();
    let visible = true;
    let lastWatch = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const st = sim.current;
      const set = settings.current;
      if (set.playing && !reduce) {
        st.s += SPEED * dt;
        if (st.s >= route.length) {
          st.s = 0;
          st.lastAlong = 0;
          st.crumbs = [];
        }
        if (st.wander >= 0) {
          st.wander += dt / WANDER_S;
          if (st.wander >= 1) st.wander = -1;
        }
      } else if (reduce && st.s === 0) {
        st.s = route.length * 0.3;
      }

      // Where the runner really is: on the route, pushed sideways while wandering.
      const here = pointAt(route, st.s);
      const lateral = st.wander >= 0 ? WANDER_M * Math.sin(Math.PI * st.wander) ** 1.4 : 0;
      const jitter = 3 * Math.sin(now / 700) + 2 * Math.sin(now / 1900);
      const nx = Math.cos(here.heading);
      const ny = -Math.sin(here.heading);
      const x = here.x + nx * (lateral + jitter);
      const y = here.y + ny * (lateral + jitter);

      // Where that puts them on the line, and how far off it.
      const loc = locate(route, x, y, st.lastAlong);
      st.lastAlong = loc.along;
      const step = offCourseStep(st.off, loc.off);
      if (step.changed) {
        st.off = step.off;
        st.banner = step.off ? 'off' : 'back';
        st.bannerAt = now;
        watchRef.current?.buzz();
        setStatus(step.off ? 'off' : 'on');
      }
      if (st.banner === 'back' && now - st.bannerAt > 2600) st.banner = null;
      if (set.playing && (st.crumbs.length === 0 || Math.hypot(x - st.crumbs[st.crumbs.length - 1][0], y - st.crumbs[st.crumbs.length - 1][1]) > 25)) {
        st.crumbs.push([x, y]);
        if (st.crumbs.length > CRUMBS) st.crumbs.shift();
      }

      // ── The overview map ──
      const { w, h, dpr } = fitCanvas(canvas);
      if (w && h) {
        const pad = 36 * dpr;
        const k = Math.min((w - pad * 2) / Math.max(b.x1 - b.x0, 1), (h - pad * 2) / Math.max(b.y1 - b.y0, 1));
        const cx = (b.x0 + b.x1) / 2;
        const cy = (b.y0 + b.y1) / 2;
        const toPx = (px: number, py: number): [number, number] => [w / 2 + (px - cx) * k, h / 2 - (py - cy) * k];

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#07070a';
        ctx.fillRect(0, 0, w, h);
        if (topo) {
          drawContours(ctx, topo, toPx);
        } else {
          // A kilometre grid, as on a paper map.
          ctx.strokeStyle = 'rgba(155,161,168,0.08)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let gx = Math.floor((b.x0 - 2000) / 1000) * 1000; gx < b.x1 + 2000; gx += 1000) {
            const [X] = toPx(gx, 0);
            ctx.moveTo(X, 0);
            ctx.lineTo(X, h);
          }
          for (let gy = Math.floor((b.y0 - 2000) / 1000) * 1000; gy < b.y1 + 2000; gy += 1000) {
            const [, Y] = toPx(0, gy);
            ctx.moveTo(0, Y);
            ctx.lineTo(w, Y);
          }
          ctx.stroke();
        }

        // The 50 m corridor either side of the line.
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = st.off ? 'rgba(255,170,0,0.13)' : 'rgba(255,85,255,0.08)';
        ctx.lineWidth = Math.max(2 * OFF_COURSE_M * k, 3 * dpr);
        ctx.beginPath();
        route.pts.forEach(([px, py], i) => {
          const [X, Y] = toPx(px, py);
          if (i) ctx.lineTo(X, Y);
          else ctx.moveTo(X, Y);
        });
        ctx.stroke();
        ctx.restore();

        glowLine(ctx, slice(route, 0, loc.along), toPx, COLOUR.done, 2.5 * dpr, 4 * dpr);
        glowLine(ctx, slice(route, loc.along, route.length), toPx, COLOUR.line, 2.5 * dpr, 12 * dpr);

        const [sx, sy] = toPx(route.pts[0][0], route.pts[0][1]);
        ctx.beginPath();
        ctx.arc(sx, sy, 6 * dpr, 0, Math.PI * 2);
        ctx.strokeStyle = COLOUR.start;
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();

        // The breadcrumb of where the runner has really been.
        ctx.fillStyle = 'rgba(220,220,230,0.55)';
        for (const [px, py] of st.crumbs) {
          const [X, Y] = toPx(px, py);
          ctx.beginPath();
          ctx.arc(X, Y, 1.4 * dpr, 0, Math.PI * 2);
          ctx.fill();
        }

        // The runner.
        const [rx, ry] = toPx(x, y);
        ctx.beginPath();
        ctx.arc(rx, ry, 6 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = st.off ? COLOUR.amber : '#fff';
        ctx.shadowColor = st.off ? COLOUR.amber : '#fff';
        ctx.shadowBlur = 14 * dpr;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (doneRef.current) doneRef.current.textContent = formatDistance(loc.along, 2);
      if (toGoRef.current) toGoRef.current.textContent = formatDistance(Math.max(0, route.length - loc.along), 2);
      if (offRef.current) offRef.current.textContent = `${Math.round(loc.off)} m`;

      if (now - lastWatch > 33) {
        lastWatch = now;
        const z = ZOOMS.find((zz) => zz.id === set.zoom) ?? ZOOMS[1];
        const bannerP = st.banner ? Math.min(1, (now - st.bannerAt) / 180) : 0;
        watchRef.current?.draw(route, {
          along: loc.along,
          you: [x, y],
          heading: here.heading,
          headingUp: set.headingUp,
          radiusM: z.metres * 2,
          scaleLabel: z.label,
          scaleM: z.metres,
          toGoM: Math.max(0, route.length - loc.along),
          banner: st.banner,
          bannerP,
          offByM: loc.off,
        });
      }

      if (visible && !reduce) raf = requestAnimationFrame(frame);
    };

    const observer = new IntersectionObserver(([entry]) => {
      const was = visible;
      visible = entry.isIntersecting;
      if (visible && !was) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else if (!visible) {
        cancelAnimationFrame(raf);
      }
    });
    observer.observe(canvas);
    raf = requestAnimationFrame(frame);
    // With reduced motion, redraw when a setting changes.
    const redraw = reduce ? window.setInterval(() => frame(performance.now()), 400) : 0;

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      if (redraw) window.clearInterval(redraw);
    };
  }, [route, source]);

  const loadFile = useCallback(async (file: File) => {
    setError(null);
    if (file.size > 25 * 1024 * 1024) {
      setError('That file is over 25 MB. Try exporting the route alone, without the full recording.');
      return;
    }
    try {
      const text = await file.text();
      const gpx = parseGpx(text);
      if (gpx.points.length < 2) {
        setError('No track or route points found in that file. Is it a GPX?');
        return;
      }
      const built = buildRoute(gpx.points);
      const local = toLocal(built.points, gpx.name || file.name.replace(/\.gpx$/i, ''), built);
      if (local.length < 50) {
        setError('That route is under 50 m long, so there’s nothing to follow.');
        return;
      }
      setStats(built);
      setSource({ kind: 'file', fileName: file.name });
      setRoute(local);
      setPlaying(true);
    } catch {
      setError('That file couldn’t be read as a GPX.');
    }
  }, []);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void loadFile(file);
  };

  const useDemo = () => {
    setError(null);
    setStats(undefined);
    setSource({ kind: 'demo' });
    setRoute(RIDGE_LOOP);
  };

  return (
    <div className={styles.sim}>
      <div
        className={`${styles.mapPane} ${drag ? styles.dragging : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        <canvas
          ref={mapRef}
          className={styles.map}
          role="img"
          aria-label={`${route.name}: the whole route with a 50 metre corridor either side, and the runner following it.`}
        />
        <div className={styles.mapHud} aria-hidden="true">
          <span>{route.name.toUpperCase()}</span>
          <span>{formatDistance(route.length).toUpperCase()}</span>
        </div>
        <div className={`${styles.statusTag} ${status === 'off' ? styles.statusOff : ''}`} aria-live="polite">
          {status === 'off' ? 'Off course' : 'On course'}
        </div>
        {drag && <div className={styles.dropHint}>Drop your GPX to follow it</div>}
      </div>

      <div className={styles.side}>
        <div className={styles.watch}>
          <TrailWatch ref={watchRef} label="The watch's map screen for the same moment, with the off-course banner when you leave the line." />
        </div>

        <div className={styles.controls}>
          <div className={styles.group} role="radiogroup" aria-label="Zoom">
            <span className={styles.groupLabel}>Zoom</span>
            <div className={styles.chips}>
              {ZOOMS.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  role="radio"
                  aria-checked={zoom === z.id}
                  className={`${styles.chip} ${zoom === z.id ? styles.chipOn : ''}`}
                  onClick={() => setZoom(z.id)}
                >
                  {z.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.group} role="radiogroup" aria-label="Map orientation">
              <span className={styles.groupLabel}>Map</span>
              <div className={styles.chips}>
                <button type="button" role="radio" aria-checked={headingUp} className={`${styles.chip} ${headingUp ? styles.chipOn : ''}`} onClick={() => setHeadingUp(true)}>
                  Heading up
                </button>
                <button type="button" role="radio" aria-checked={!headingUp} className={`${styles.chip} ${!headingUp ? styles.chipOn : ''}`} onClick={() => setHeadingUp(false)}>
                  North up
                </button>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.wander} onClick={wanderOff}>
              Wander off
            </button>
            <button type="button" className={styles.play} onClick={() => setPlaying((p) => !p)} aria-pressed={!playing}>
              {playing ? 'Pause' : 'Play'}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.readouts}>
        <dl className={styles.stats}>
          <div>
            <dt>Done</dt>
            <dd ref={doneRef}>0 m</dd>
          </div>
          <div>
            <dt>To go</dt>
            <dd ref={toGoRef}>—</dd>
          </div>
          <div>
            <dt>Off the line</dt>
            <dd ref={offRef}>0 m</dd>
          </div>
          {stats ? (
            <>
              <div>
                <dt>Points in the file</dt>
                <dd>{stats.rawPoints.toLocaleString('en-GB')}</dd>
              </div>
              <div>
                <dt>Kept by the watch</dt>
                <dd>
                  {stats.points.length.toLocaleString('en-GB')} · {stats.spacingM} m apart
                </dd>
              </div>
              <div>
                <dt>{stats.hasElevation ? 'Length · climb' : 'Length'}</dt>
                <dd>
                  {formatDistance(stats.lengthM)}
                  {stats.hasElevation ? ` · ${stats.ascentM.toLocaleString('en-GB')} m` : ''}
                </dd>
              </div>
            </>
          ) : (
            <>
              <div>
                <dt>Route</dt>
                <dd>Ridge loop · demo</dd>
              </div>
              <div>
                <dt>Length · climb</dt>
                <dd>
                  {formatDistance(route.length)} · {route.ascentM?.toLocaleString('en-GB')} m
                </dd>
              </div>
              <div>
                <dt>On the watch</dt>
                <dd>
                  up to {ROUTE_CAPACITY.toLocaleString('en-GB')} points, {START_SPACING_M} m apart
                </dd>
              </div>
            </>
          )}
        </dl>

        <div className={styles.own}>
          <p className={styles.ownTitle}>Try your own route</p>
          <p className={styles.ownBody}>
            Drop a GPX on the map, or choose one. It’s read here in your browser, the way the watch
            would read it, and never leaves your device.
          </p>
          <div className={styles.ownActions}>
            <button type="button" className={styles.choose} onClick={() => fileInput.current?.click()}>
              Choose a GPX
            </button>
            {source.kind === 'file' ? (
              <button type="button" className={styles.link} onClick={useDemo}>
                Back to the demo route
              </button>
            ) : (
              <a className={styles.link} href="/trail/ridge-loop.gpx" download>
                Download the demo GPX
              </a>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".gpx,application/gpx+xml,application/xml,text/xml"
            className={styles.hidden}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void loadFile(f);
              e.target.value = '';
            }}
          />
          {source.kind === 'file' && <p className={styles.fileName}>Following {source.fileName}</p>}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
