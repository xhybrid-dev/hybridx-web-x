import {
  bmiTenths,
  bmrKcal,
  formatChange,
  formatDayMonth,
  formatKg,
  formatShortDate,
  lastText,
  rangeFor,
  recentDays,
  weekText,
  WINDOW_DAYS,
  xFor,
  yFor,
  type Summary,
  type WindowDays,
} from '@/lib/weighin-core';
import styles from './WatchScreen.module.css';

/*
 * X Weigh-in's screens, drawn as SVG at the watch's own 240 x 240, from the
 * app's layout code (x-weighin gui/src/screens: Screen.cpp, PageScreens.cpp,
 * EntryScreens.cpp). Every label sits at the app's own position, in Poppins
 * at the app's sizes, in the watch's colours; every number comes from
 * lib/weighin-core.ts, the port of the app's core. Text is placed by its LVGL
 * box (x, y, width), with the baseline a font size below the box's top, as
 * Poppins sits in LVGL's line box.
 *
 * A server component: it has no state, so the hero, the simulator and the
 * Body still can all use it.
 */

// The watch's colours (SDK::GUI::Color, as the 64-colour display shows them).
const C = {
  white: '#ffffff',
  gray: '#aaaaaa',
  grayDark: '#555555',
  lime: '#aaff00',
  green: '#00ff00',
  markGreen: '#55ff00',
  yellow: '#ffff00',
} as const;

export type WatchView =
  | { screen: 'home'; summary: Summary; today: number }
  | { screen: 'graph'; window: WindowDays }
  | { screen: 'recent'; window: WindowDays }
  | { screen: 'body'; summary: Summary; heightCm: number; ageYears: number; sex: number }
  | { screen: 'weighIn'; value: number; hint: string; saving?: boolean }
  | { screen: 'saved'; saved: number; summary: Summary };

const PAGE: Partial<Record<WatchView['screen'], number>> = { home: 0, graph: 1, recent: 2, body: 3 };

type Align = 'left' | 'center' | 'right';

/** An LVGL label: a box at (x, y) of width w; @p size is the font's pixel size. */
function Label({
  x,
  y,
  w,
  size,
  weight = 400,
  colour = C.white,
  align = 'center',
  children,
}: {
  x: number;
  y: number;
  w: number;
  size: number;
  weight?: 300 | 400 | 600;
  colour?: string;
  align?: Align;
  children: string;
}) {
  const tx = align === 'left' ? x : align === 'right' ? x + w : x + w / 2;
  const anchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle';
  return (
    <text
      x={tx}
      y={y + size * 1.02}
      fontSize={size}
      fontWeight={weight}
      fill={colour}
      textAnchor={anchor}
      xmlSpace="preserve"
    >
      {children}
    </text>
  );
}

/** The four button marks round the edge (SDK::LVGL::Buttons): UP, DOWN, BACK white, SELECT green. */
function ButtonMarks() {
  const r = 113;
  const arc = (from: number, to: number) => {
    const a0 = (from * Math.PI) / 180;
    const a1 = (to * Math.PI) / 180;
    const p = (a: number) => `${(120 + r * Math.cos(a)).toFixed(2)} ${(120 + r * Math.sin(a)).toFixed(2)}`;
    return `M${p(a0)} A${r} ${r} 0 0 1 ${p(a1)}`;
  };
  return (
    <g fill="none" strokeWidth={5.6} strokeLinecap="round">
      <path d={arc(-158.6, -142.3)} stroke={C.white} />
      <path d={arc(142.3, 158.6)} stroke={C.white} />
      <path d={arc(-37.7, -21.4)} stroke={C.markGreen} />
      <path d={arc(22.3, 37.9)} stroke={C.white} />
    </g>
  );
}

/** The row of four page dots near the foot of the display. */
function PageDots({ page }: { page: number }) {
  return (
    <g>
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={99 + i * 14} cy={210} r={2} fill={i === page ? C.white : C.grayDark} />
      ))}
    </g>
  );
}

function Title({ children, y = 22 }: { children: string; y?: number }) {
  return (
    <Label x={40} y={y} w={160} size={20} weight={600} colour={C.lime}>
      {children}
    </Label>
  );
}

function Home({ summary, today }: { summary: Summary; today: number }) {
  if (summary.days === 0) {
    return (
      <>
        <Label x={40} y={40} w={160} size={18} colour={C.gray}>Trend (kg)</Label>
        <Label x={20} y={62} w={200} size={60} weight={300}>--</Label>
        <Label x={20} y={132} w={200} size={18}>No weigh-ins yet</Label>
        <Label x={20} y={160} w={200} size={18} colour={C.gray}>SELECT to weigh in</Label>
      </>
    );
  }
  return (
    <>
      <Label x={40} y={40} w={160} size={18} colour={C.gray}>Trend (kg)</Label>
      <Label x={20} y={62} w={200} size={60} weight={300}>{formatKg(summary.trend, 1)}</Label>
      <Label x={20} y={132} w={200} size={18}>{weekText(summary)}</Label>
      <Label x={20} y={160} w={200} size={18} colour={C.gray}>{lastText(summary, today)}</Label>
    </>
  );
}

// The graph's plot, as GraphScreen lays it out.
const G = { left: 70, top: 60, width: 140, height: 100 } as const;

function Graph({ window: w }: { window: WindowDays }) {
  const count = Math.min(w.weight.length, WINDOW_DAYS);
  const r = count > 0 ? rangeFor(w.weight.slice(0, count), w.trend.slice(0, count)) : null;
  if (!r) {
    return (
      <>
        <Title>Last 30 days</Title>
        <rect x={G.left} y={G.top} width={G.width} height={1} fill={C.grayDark} />
        <rect x={G.left} y={G.top + G.height - 1} width={G.width} height={1} fill={C.grayDark} />
        <Label x={20} y={100} w={200} size={18}>No weigh-ins yet</Label>
      </>
    );
  }
  // The newest day sits at the right edge; a young log fills from the right.
  const offset = WINDOW_DAYS - count;
  const xs = Array.from({ length: count }, (_, i) => xFor(offset + i, WINDOW_DAYS, G.left, G.width));
  const line = xs.map((x, i) => `${x},${yFor(w.trend[i], r, G.top, G.height)}`).join(' ');
  return (
    <>
      <Title>Last 30 days</Title>
      <rect x={G.left} y={G.top} width={G.width} height={1} fill={C.grayDark} />
      <rect x={G.left} y={G.top + G.height - 1} width={G.width} height={1} fill={C.grayDark} />
      <Label x={G.left - 40} y={G.top - 9} w={36} size={14} colour={C.gray} align="right">{formatKg(r.hi, 1)}</Label>
      <Label x={G.left - 40} y={G.top + G.height - 10} w={36} size={14} colour={C.gray} align="right">{formatKg(r.lo, 1)}</Label>
      {xs.map((x, i) =>
        w.weight[i] ? <circle key={i} cx={x} cy={yFor(w.weight[i], r, G.top, G.height)} r={1.7} fill={C.gray} /> : null,
      )}
      <polyline points={line} fill="none" stroke={C.lime} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Label x={30} y={G.top + G.height + 8} w={180} size={14} colour={C.gray}>
        {`${formatDayMonth(w.firstDay)} - ${formatDayMonth(w.firstDay + count - 1)}`}
      </Label>
    </>
  );
}

function Recent({ window: w }: { window: WindowDays }) {
  const rows = recentDays(w, 5);
  return (
    <>
      <Title>Recent</Title>
      {rows.length === 0 ? <Label x={20} y={100} w={200} size={18}>No weigh-ins yet</Label> : null}
      {rows.map((row, i) => (
        <g key={row.day}>
          <Label x={38} y={56 + i * 28} w={104} size={18} align="left">{formatShortDate(row.day)}</Label>
          <Label x={140} y={56 + i * 28} w={60} size={18} align="right">{formatKg(row.hundredths, 1)}</Label>
        </g>
      ))}
    </>
  );
}

function Body({ summary, heightCm, ageYears, sex }: { summary: Summary; heightCm: number; ageYears: number; sex: number }) {
  const bmi = bmiTenths(summary.trend, heightCm);
  const bmr = bmrKcal(summary.trend, heightCm, ageYears, sex);
  const sexText = sex === 1 ? 'female' : sex === 2 ? 'male' : '';
  const age = ageYears && sexText ? `Age ${ageYears}, ${sexText}` : ageYears ? `Age ${ageYears}` : 'Age not set';
  const note =
    summary.days === 0
      ? 'Weigh in to see these'
      : !heightCm
        ? 'Height: the UNA profile'
        : !ageYears || !sexText
          ? 'Age, sex: app_config.json'
          : 'From your trend weight';
  return (
    <>
      <Title>Body</Title>
      <Label x={20} y={54} w={200} size={25} weight={600}>{bmi ? `BMI ${Math.trunc(bmi / 10)}.${bmi % 10}` : 'BMI --'}</Label>
      <Label x={20} y={92} w={200} size={18}>{bmr ? `Resting ${bmr} kcal` : 'Resting -- kcal'}</Label>
      <Label x={20} y={120} w={200} size={18}>{heightCm ? `Height ${heightCm} cm` : 'Height not set'}</Label>
      <Label x={20} y={148} w={200} size={18}>{age}</Label>
      <Label x={30} y={180} w={180} size={14} colour={C.gray}>{note}</Label>
    </>
  );
}

function WeighIn({ value, hint, saving }: { value: number; hint: string; saving?: boolean }) {
  return (
    <>
      <Title y={26}>{saving ? 'Saving...' : 'Weigh in'}</Title>
      <Label x={20} y={64} w={200} size={60} weight={300}>{formatKg(value, 1)}</Label>
      <Label x={40} y={130} w={160} size={18} colour={C.gray}>kg</Label>
      <Label x={20} y={160} w={200} size={18} colour={C.gray}>{hint}</Label>
    </>
  );
}

function Saved({ saved, summary }: { saved: number; summary: Summary }) {
  return (
    <>
      <Label x={20} y={44} w={200} size={25} weight={600} colour={C.green}>Saved</Label>
      <Label x={20} y={80} w={200} size={40} weight={600}>{`${formatKg(saved, 1)} kg`}</Label>
      {summary.days > 0 ? (
        <>
          <Label x={20} y={136} w={200} size={18}>{`Trend ${formatKg(summary.trend, 1)} kg`}</Label>
          {summary.hasWeekChange ? (
            <Label x={20} y={164} w={200} size={18} colour={C.gray}>{`${formatChange(summary.weekChange, 1)} kg this week`}</Label>
          ) : null}
        </>
      ) : null}
    </>
  );
}

export default function WatchScreen({ view, label }: { view: WatchView; label?: string }) {
  const page = PAGE[view.screen];
  return (
    <svg viewBox="0 0 240 240" className={styles.screen} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <rect width="240" height="240" fill="#000" />
      {view.screen === 'home' && <Home summary={view.summary} today={view.today} />}
      {view.screen === 'graph' && <Graph window={view.window} />}
      {view.screen === 'recent' && <Recent window={view.window} />}
      {view.screen === 'body' && <Body summary={view.summary} heightCm={view.heightCm} ageYears={view.ageYears} sex={view.sex} />}
      {view.screen === 'weighIn' && <WeighIn value={view.value} hint={view.hint} saving={view.saving} />}
      {view.screen === 'saved' && <Saved saved={view.saved} summary={view.summary} />}
      {page !== undefined && <PageDots page={page} />}
      {view.screen !== 'saved' && <ButtonMarks />}
    </svg>
  );
}
