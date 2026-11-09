import type { ZoneMinutes } from '@/lib/una-maths';

/*
 * The X family: the HybridX apps for UNA Watch that are linked on the wrist.
 * One source for /una and /una/nerdy-bits.
 *
 * Every fact below is taken from the watch repository's checked store text
 * (xhybrid-dev/una-hyrox, hybridx-link/docs/STORE_RELEASE.md, "Facts checked
 * against the code") and nothing is claimed that it lists under "Not
 * claimed": no rep counting, no bike sensors, no routes sent from the phone,
 * no VO2max accuracy against a lab or another watch, and no counting of
 * UNA's own built-in apps.
 *
 * The colourways are the family's brand system (hybridx-link/Tools/Brand):
 * each app has its own, which is what lets the page keep them apart.
 */

/** Change this one line when the store status changes. */
export const STORE_STATUS =
  'HybridX Race is on the UNA app store. The rest of the family is arriving there as version 1.0.';

export type AppSlug = 'race' | 'run' | 'trail' | 'ride' | 'workout' | 'streak';

export type FamilyApp = {
  slug: AppSlug;
  name: string;
  /** The brand's name for the colourway. */
  colourway: string;
  /** One word for what it is for, shown on the hero band. */
  does: string;
  line: string;
  blurb: string;
  /** Dark ground, light ink, and the accent: for display type, discs and lines, never small text. */
  ground: string;
  ink: string;
  accent: string;
  /** The ink that is legible on the accent, for filled buttons and tags. */
  onAccent: string;
  facts: string[];
  screens: { src: string; label: string }[];
  /** What goes down the line to X Streak when a session is saved. */
  hands: string;
  /** Anything else it shares, beyond the session itself. */
  also?: string;
  /** Its own page, where it has one. */
  page?: { href: string; label: string };
  /** Said plainly, so nobody finds out on the wrist. */
  notYet?: string;
};

const s = (app: AppSlug, file: string) => `/una/screens/${app}/${file}.png`;

export const RECORDERS: FamilyApp[] = [
  {
    slug: 'race',
    name: 'HybridX Race',
    colourway: 'Classic',
    does: 'Hyrox',
    line: 'One button per split.',
    blurb:
      'The HYROX-format race timer. Press once at every transition and each run and each station is timed as its own lap, with its own heart rate.',
    ground: '#0a0a0a',
    ink: '#ffffff',
    accent: '#FADB5C',
    onAccent: '#0a0a0a',
    facts: [
      'A full race or either half, with an optional Roxzone split around every station.',
      'Runs from 100 m to 1 km, so a sim in the gym is still timed as a race.',
      'A split lock for sweaty double presses, and an undo that puts the times back exactly.',
      'A pace plan against your last race or a target finish, ahead or behind at a glance.',
    ],
    screens: [
      { src: s('race', 'race-run'), label: 'Run 1 of 8' },
      { src: s('race', 'race-station'), label: 'SkiErg' },
      { src: s('race', 'summary'), label: 'Where the time went' },
    ],
    hands: 'A Hybrid session, with its training load.',
    page: { href: '/race', label: 'The full Race page' },
  },
  {
    slug: 'run',
    name: 'X Run',
    colourway: 'Engine',
    does: 'Run',
    line: 'Your engine, measured on the wrist.',
    blurb:
      'A running app with a VO2max estimate of its own, worked out on the watch from your steady running: pace and gradient against your heart-rate reserve.',
    ground: '#5C0F1A',
    ink: '#FBF5EF',
    accent: '#E63946',
    onAccent: '#1a0306',
    facts: [
      'Distance, pace, heart rate, laps and climb with GPS.',
      'VO2max after every run that earns one, its trend, and the runs behind it.',
      'Cadence and step length, time in each zone, best 1 km, mile and 5 km, and how evenly you paced it.',
      'Treadmill mode: speed and distance from your cadence, corrected to the console afterwards.',
    ],
    screens: [
      { src: s('run', 'running'), label: 'Mid-run' },
      { src: s('run', 'vo2max'), label: 'VO2max' },
      { src: s('run', 'best-splits'), label: 'Best splits' },
    ],
    hands: 'A Run, with its training load.',
    also: 'Takes in steady minutes from X Trail, so its VO2max is built from every run on the watch.',
  },
  {
    slug: 'trail',
    name: 'X Trail',
    colourway: 'Moss',
    does: 'Trail',
    line: 'Follow the line, not your phone.',
    blurb:
      'Load a GPX route and run it from your wrist: you on the line, a buzz when you leave it, and an arrow back.',
    ground: '#1F3A2B',
    ink: '#EFE9DC',
    accent: '#E040A0',
    onAccent: '#1a0612',
    facts: [
      'A map of the route, heading-up or north-up, zoomed from 300 m to 3 km with one button.',
      'Off by 25 m or more? A buzz and the way back. “Back on course” when you are.',
      'Turn cues before each turn, distance to go, and an elevation profile.',
      'It records the run as well: distance, pace, heart rate and laps.',
    ],
    screens: [
      { src: s('trail', 'map'), label: 'You, on the line' },
      { src: s('trail', 'off-course'), label: 'Off course' },
      { src: s('trail', 'elevation'), label: 'What is left to climb' },
    ],
    hands: 'A Run, with its training load.',
    also: 'Hands its steady minutes to X Run, where they count towards your VO2max.',
    page: { href: '/trail', label: 'The full Trail page' },
    notYet: 'Routes go on by USB for now.',
  },
  {
    slug: 'ride',
    name: 'X Ride',
    colourway: 'Velodrome',
    does: 'Ride',
    line: 'Stops when you stop.',
    blurb:
      'Outdoors with GPS and the barometer, or indoors on the turbo with intervals counted down for you.',
    ground: '#0E1A4F',
    ink: '#F2F4FB',
    accent: '#FF6A1A',
    onAccent: '#1a0a00',
    facts: [
      'Speed, distance and climb outdoors, with heart rate from the wrist or a strap.',
      'Auto-pause stops the clock at the lights and starts it as you ride off.',
      'Auto laps by time, or by distance from 1 to 25 km.',
      'Indoors: free, Intervals with your own work, rest and rounds, or Tabata.',
    ],
    screens: [
      { src: s('ride', 'riding'), label: 'Riding' },
      { src: s('ride', 'auto-paused'), label: 'Auto-paused' },
      { src: s('ride', 'intervals'), label: 'Turbo intervals' },
    ],
    hands: 'A Ride, with its training load.',
    notYet: 'The watch does not connect power, cadence or speed sensors yet. Ride will use them when it does.',
  },
  {
    slug: 'workout',
    name: 'X Workout',
    colourway: 'Iron',
    does: 'Gym',
    line: 'Everything that is not a run or a ride.',
    blurb:
      'Seven kinds of session in one app, each step timed for you: a countdown, three ticks before it ends, and a different buzz for work, rest and done.',
    ground: '#161618',
    ink: '#EDEDED',
    accent: '#FF2E88',
    onAccent: '#1a0010',
    facts: [
      'Free, Strength, EMOM, AMRAP, Tabata, Intervals and Hyrox-style Circuits.',
      'Strength sets with a rest timer, saved as sets.',
      'Circuits of runs and stations, each step saved as its own lap.',
      'Heart-rate zones and calories throughout.',
    ],
    screens: [
      { src: s('workout', 'strength-set'), label: 'Set 1 of 3' },
      { src: s('workout', 'tabata'), label: 'Tabata' },
      { src: s('workout', 'circuit-station'), label: 'Circuit station' },
    ],
    hands: 'Strength, Hybrid or Workout, by what you did, with its training load.',
  },
];

export const STREAK: FamilyApp = {
  slug: 'streak',
  name: 'X Streak',
  colourway: 'Glacier',
  does: 'Everything',
  line: 'Where every session lands.',
  blurb:
    'Set a weekly target and keep the streak going. Sessions saved by the other five count by themselves: open Streak and they are there.',
  ground: '#0B1F33',
  ink: '#F4FAFB',
  accent: '#2EC4C4',
  onAccent: '#04161a',
  facts: [
    'Every week you hit your target is a step up the mountain: Arthur’s Seat at 4 weeks, Snowdon at 12, Ben Nevis at 26, Mont Blanc at a year, Everest at two.',
    'Shields, earned every four good weeks, save the streak when life happens.',
    'Anything else you did can be logged by hand, today or yesterday.',
    'You choose the target, the day your week starts, what counts and the shortest session.',
  ],
  screens: [
    { src: s('streak', 'home'), label: 'The climb' },
    { src: s('streak', 'session-found'), label: 'A run, found' },
    { src: s('streak', 'training-load'), label: 'Training load' },
  ],
  hands: 'Hands back your week and your streak, for every Saved screen.',
  page: { href: '/streak', label: 'The full Streak page' },
};

export const FAMILY: FamilyApp[] = [...RECORDERS, STREAK];

export const icon = (slug: string) => `/una/icons/${slug}.png`;

/*
 * The week machine's sessions. The durations and zone minutes are examples;
 * the load each one scores is worked out from them by the real formula
 * (edwardsLoad), not typed in.
 */
export type DemoSession = {
  slug: Exclude<AppSlug, 'streak'>;
  /** What X Streak calls it. */
  kind: string;
  /** Sport code in the shared line. */
  sport: number;
  title: string;
  minutes: number;
  metres: number;
  avgHr: number;
  maxHr: number;
  zones: ZoneMinutes;
  /** Steady minutes that could count towards X Run's VO2max. */
  steady?: number;
};

export const DEMO_SESSIONS: DemoSession[] = [
  { slug: 'run', kind: 'Run', sport: 1, title: 'Steady run', minutes: 45, metres: 8600, avgHr: 148, maxHr: 166, zones: [5, 25, 12, 3, 0], steady: 34 },
  { slug: 'trail', kind: 'Run', sport: 1, title: 'Hill loop', minutes: 70, metres: 11200, avgHr: 151, maxHr: 174, zones: [10, 30, 20, 10, 0], steady: 21 },
  { slug: 'ride', kind: 'Ride', sport: 2, title: 'Road ride', minutes: 60, metres: 27400, avgHr: 128, maxHr: 152, zones: [20, 30, 10, 0, 0] },
  { slug: 'workout', kind: 'Strength', sport: 4, title: 'Strength', minutes: 40, metres: 0, avgHr: 112, maxHr: 141, zones: [25, 10, 5, 0, 0] },
  { slug: 'race', kind: 'Hybrid', sport: 6, title: 'Race sim', minutes: 75, metres: 8750, avgHr: 168, maxHr: 184, zones: [0, 0, 20, 40, 15] },
];

/** The eight numbers of one line in the shared folder, in order. */
export const LINE_FIELDS = [
  { key: 'start', label: 'When it started', note: 'seconds, UTC' },
  { key: 'zone', label: 'Your time zone', note: 'minutes, plus 1440' },
  { key: 'time', label: 'How long', note: 'seconds on the timer' },
  { key: 'metres', label: 'How far', note: 'metres, 0 if none' },
  { key: 'avg', label: 'Average heart rate', note: 'bpm' },
  { key: 'max', label: 'Maximum heart rate', note: 'bpm' },
  { key: 'kind', label: 'What it was', note: '1 run · 2 ride · 4 strength · 5 workout · 6 hybrid' },
  { key: 'load', label: 'Training load', note: 'zone minutes, weighted 1 to 5' },
] as const;
