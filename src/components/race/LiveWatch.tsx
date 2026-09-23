'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Poppins } from 'next/font/google';
import { buildSegments } from '@/lib/race-content';
import styles from './LiveWatch.module.css';

/*
 * The hero's watch: the race screen of HybridX Race, redrawn in SVG from the
 * simulator captures in public/race/ and played as a fast-forwarded race,
 * inside UNA's own product render of the watch.
 *
 * The render (public/race/una-watch-teal.png) is cropped from the watch
 * mockups in the UNA SDK's Figma resource pack
 * (Docs/Templates/Figma-UI-Kit/). Its screen is transparent, so the SVG sits
 * underneath and shows through; the percentages in LiveWatch.module.css place
 * it on that circle. The render carries the UNA logo, which UNA's
 * TRADEMARK.md does not license — see the note in app/race/page.tsx.
 *
 * The layout, labels and colours follow the real screen (public/race/run.png,
 * station.png, split.png, summary.png); the typeface is Poppins, which is what
 * the watch renders in. The segment times and heart rates below are
 * illustrative — a plausible race to animate, not pacing advice or anyone's
 * result — and the page says so under the watch.
 *
 * Starts on a still frame, which is also what the server renders, what a
 * visitor with reduced motion sees, and what shows before hydration. Only
 * plays while on screen.
 */

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const SEGMENTS = buildSegments('full', false);

// Illustrative durations in seconds, one per segment, in race order.
const DURATIONS = [
  284, 262, 291, 186, 296, 254, 301, 238, 298, 271, 305, 108, 309, 247, 312, 334,
];
// Illustrative steady-state heart rate per segment.
const HEART_RATES = [
  164, 168, 166, 176, 167, 174, 168, 172, 167, 165, 169, 158, 170, 171, 172, 178,
];

/** Race seconds per real second. */
const SPEED = 60;
const SPLIT_MS = 1500;
const SUMMARY_MS = 5500;

const COLOURS = {
  run: '#5ce8f0',
  station: '#f5e663',
  roxIn: '#e08cf5',
  roxOut: '#e08cf5',
} as const;

type Phase =
  | { kind: 'race'; index: number; seconds: number }
  | { kind: 'split'; index: number; since: number }
  | { kind: 'summary'; since: number };

// The still frame: a station, mid-effort.
const STILL: Phase = { kind: 'race', index: 3, seconds: 97 };

function clock(total: number, hours: boolean) {
  const s = Math.floor(total);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  if (hours || h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  return `${m}:${ss}`;
}

function totalBefore(index: number) {
  return DURATIONS.slice(0, index).reduce((a, b) => a + b, 0);
}

function heartRate(index: number, seconds: number) {
  const target = HEART_RATES[index];
  // Climbs into the effort over the first minute, then wanders a little.
  const ramp = Math.min(1, seconds / 60);
  return Math.round(target - 12 * (1 - ramp) + 2 * Math.sin(seconds / 9));
}

// Zone boundaries for the arc, as the watch draws it: five zones, the marker
// slid across the one the heart rate is in.
const ZONES = [
  { colour: '#8a8a8a', upTo: 120 },
  { colour: '#4ccf2a', upTo: 140 },
  { colour: '#ffe600', upTo: 158 },
  { colour: '#ff9a1a', upTo: 172 },
  { colour: '#ff2d1a', upTo: 195 },
];

// The arc is part of a circle centred below the screen (fitted to the
// simulator capture), spanning -138° to -42°.
const ARC = { cx: 240, cy: 645, r: 262, from: -138, to: -42, gap: 2.2 };

function polar(r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return [ARC.cx + r * Math.cos(a), ARC.cy + r * Math.sin(a)] as const;
}

function arcPath(r: number, from: number, to: number) {
  const [x1, y1] = polar(r, from);
  const [x2, y2] = polar(r, to);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function markerAngle(hr: number) {
  const span = (ARC.to - ARC.from) / ZONES.length;
  let lower = 90;
  for (let z = 0; z < ZONES.length; z++) {
    const upper = ZONES[z].upTo;
    if (hr < upper || z === ZONES.length - 1) {
      const within = Math.max(0, Math.min(1, (hr - lower) / (upper - lower)));
      return ARC.from + span * (z + 0.15 + 0.7 * within);
    }
    lower = upper;
  }
  return ARC.to;
}

// Circle-relative arcs on the right edge: the hints for the two right-hand
// buttons, white for R1 and orange for R2 (split), as on the watch.
function edgeArc(from: number, to: number, r = 222) {
  const p = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(240 + r * Math.cos(a)).toFixed(1)} ${(240 + r * Math.sin(a)).toFixed(1)}`;
  };
  return `M ${p(from)} A ${r} ${r} 0 0 1 ${p(to)}`;
}

function Header({ title }: { title: string }) {
  return (
    <>
      <text x="240" y="56" className={styles.title}>
        {title}
      </text>
      <line x1="100" y1="78" x2="380" y2="78" stroke="#6b6b6b" strokeWidth="4" />
    </>
  );
}

function RaceFace({ index, seconds }: { index: number; seconds: number }) {
  const segment = SEGMENTS[index];
  const next = SEGMENTS[index + 1];
  const hr = heartRate(index, seconds);
  const angle = markerAngle(hr);
  const [mx, my] = polar(ARC.r - 26, angle);
  const zoneSpan = (ARC.to - ARC.from) / ZONES.length;

  return (
    <>
      <Header title="Race" />
      <path d={edgeArc(-40, -24)} className={styles.hint} stroke="#ffffff" />
      <path d={edgeArc(22, 38)} className={styles.hint} stroke="#ff9a1a" />
      <text x="240" y="116" className={styles.segment} fill={COLOURS[segment.kind]}>
        {segment.label}
      </text>
      <text x="240" y="162" className={styles.meta}>
        {segment.work} · {index + 1} of {SEGMENTS.length}
      </text>
      <text x="240" y="240" className={styles.big}>
        {clock(seconds, false)}
      </text>
      <text x="240" y="284" className={styles.total}>
        {clock(totalBefore(index) + seconds, true)}
      </text>
      <text x="240" y="324" className={styles.next}>
        {next ? `Next: ${next.label}` : 'Next: FINISH'}
      </text>
      <text x="240" y="356" className={styles.hr}>
        {hr} bpm
      </text>
      {ZONES.map((z, i) => (
        <path
          key={z.colour}
          d={arcPath(ARC.r, ARC.from + zoneSpan * i + ARC.gap / 2, ARC.from + zoneSpan * (i + 1) - ARC.gap / 2)}
          stroke={z.colour}
          strokeWidth="22"
          fill="none"
        />
      ))}
      <polygon
        points={`${mx.toFixed(1)},${(my - 12).toFixed(1)} ${(mx - 10).toFixed(1)},${(my + 6).toFixed(1)} ${(mx + 10).toFixed(1)},${(my + 6).toFixed(1)}`}
        fill="#ffe600"
        className={styles.marker}
      />
    </>
  );
}

function SplitFace({ index }: { index: number }) {
  return (
    <>
      <Header title="Split" />
      <text x="240" y="206" className={styles.splitLabel}>
        {SEGMENTS[index].label}
      </text>
      <text x="240" y="306" className={styles.big}>
        {clock(DURATIONS[index], false)}
      </text>
    </>
  );
}

function SummaryFace() {
  const runs = DURATIONS.filter((_, i) => SEGMENTS[i].kind === 'run').reduce((a, b) => a + b, 0);
  const stations = DURATIONS.filter((_, i) => SEGMENTS[i].kind === 'station').reduce((a, b) => a + b, 0);
  const weighted = HEART_RATES.reduce((sum, hr, i) => sum + hr * DURATIONS[i], 0);
  const avg = Math.round(weighted / totalBefore(SEGMENTS.length));
  const max = Math.max(...HEART_RATES) + 4;
  const rows: [string, string][] = [
    ['Total', clock(runs + stations, true)],
    ['Runs', clock(runs, true)],
    ['Stations', clock(stations, true)],
    ['Avg HR', `${avg} bpm`],
    ['Max HR', `${max} bpm`],
  ];
  return (
    <>
      <Header title="Summary" />
      <text x="240" y="118" className={styles.complete}>
        Race complete
      </text>
      {rows.map(([label, value], i) => (
        <g key={label}>
          <text x="70" y={162 + i * 48} className={styles.rowLabel}>
            {label}
          </text>
          <text x="410" y={162 + i * 48} className={styles.rowValue}>
            {value}
          </text>
        </g>
      ))}
    </>
  );
}

export default function LiveWatch() {
  const [phase, setPhase] = useState<Phase>(STILL);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let visible = false;
    let last = 0;
    // Mutable copy of the phase, so the animation loop never reads stale state.
    let current: Phase = { kind: 'race', index: 0, seconds: 0 };

    const step = (now: number) => {
      const dt = last ? Math.min(now - last, 100) : 0;
      last = now;

      if (current.kind === 'race') {
        const seconds = current.seconds + (dt / 1000) * SPEED;
        current =
          seconds >= DURATIONS[current.index]
            ? { kind: 'split', index: current.index, since: now }
            : { ...current, seconds };
      } else if (current.kind === 'split' && now - current.since > SPLIT_MS) {
        const index = current.index + 1;
        current =
          index < SEGMENTS.length ? { kind: 'race', index, seconds: 0 } : { kind: 'summary', since: now };
      } else if (current.kind === 'summary' && now - current.since > SUMMARY_MS) {
        current = { kind: 'race', index: 0, seconds: 0 };
      }

      setPhase(current);
      if (visible) frame = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible) {
        last = 0;
        frame = requestAnimationFrame(step);
      }
    });
    observer.observe(root);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  const pressing = phase.kind === 'split';

  return (
    <div ref={rootRef} className={`${styles.frame} ${poppins.className}`}>
      <svg
        viewBox="0 0 480 480"
        className={styles.screen}
        role="img"
        aria-label="HybridX Race on a UNA Watch: the race screen, showing the current run or station, its time, total race time and heart rate."
      >
        <defs>
          <clipPath id="watch-face">
            <circle cx="240" cy="240" r="240" />
          </clipPath>
        </defs>
        <g clipPath="url(#watch-face)">
          <rect width="480" height="480" fill="#000" />
          {phase.kind === 'race' && <RaceFace index={phase.index} seconds={phase.seconds} />}
          {phase.kind === 'split' && <SplitFace index={phase.index} />}
          {phase.kind === 'summary' && <SummaryFace />}
        </g>
      </svg>
      <Image
        src="/race/una-watch-teal.png"
        alt=""
        fill
        priority
        sizes="(max-width: 600px) 84vw, 430px"
        className={styles.render}
      />
      <span className={`${styles.press} ${pressing ? styles.pressing : ''}`} aria-hidden="true" />
    </div>
  );
}
