/*
 * The X family: the HybridX apps for UNA Watch that work together on the
 * wrist. One source for /una (the sales page) and /una/nerdy-bits (the method).
 *
 * The copy is written for an athlete choosing an app, not for a developer:
 * what you get, in a few words. How it works belongs on the nerdy page.
 *
 * Every claim is taken from the watch repository's checked store text
 * (xhybrid-dev/una-hyrox, hybridx-link/docs/STORE_RELEASE.md, "Facts checked
 * against the code"), and nothing it lists under "Not claimed" is claimed
 * here: no rep counting, no bike sensors, no routes sent from the phone, no
 * VO2max accuracy against a lab, no counting of UNA's built-in apps.
 *
 * The colours are the family's brand colourways (hybridx-link/Tools/Brand).
 */

export type AppSlug = 'race' | 'run' | 'trail' | 'ride' | 'workout' | 'streak';

export type FamilyApp = {
  slug: AppSlug;
  name: string;
  /** The tab label. */
  tab: string;
  tagline: string;
  summary: string;
  /** The panel's ground, the ink on it, and the app's signal colour. */
  ground: string;
  ink: string;
  accent: string;
  /** Which UNA Watch render the brand pairs it with. */
  watch: 'black' | 'white' | 'teal';
  features: { title: string; body: string }[];
  /** How it joins the rest, in a few words each. */
  together: string[];
  screens: { src: string; label: string }[];
  /** Its own page, where it has one. */
  page?: string;
};

const s = (app: AppSlug, file: string) => `/una/screens/${app}/${file}.png`;

export const RECORDERS: FamilyApp[] = [
  {
    slug: 'race',
    name: 'HybridX Race',
    tab: 'Race',
    tagline: 'Every split. One button.',
    summary: 'The HYROX-format race timer. Press once at each transition and every run and station is timed on its own.',
    ground: '#0a0a0a',
    ink: '#ffffff',
    accent: '#FADB5C',
    watch: 'black',
    features: [
      { title: 'Race or sim', body: 'The full race, either half, or shorter runs for training.' },
      { title: 'Pace plan', body: 'See if you are ahead of your last race or your target.' },
      { title: 'Mistake-proof', body: 'A split lock for double presses, and an undo.' },
      { title: 'Sixteen splits', body: 'Each with its own time and heart rate, on Strava.' },
    ],
    together: ['Counts in X Streak'],
    screens: [
      { src: s('race', 'race-run'), label: 'Run' },
      { src: s('race', 'race-station'), label: 'Station' },
      { src: s('race', 'summary'), label: 'Summary' },
    ],
    page: '/race',
  },
  {
    slug: 'run',
    name: 'X Run',
    tab: 'Run',
    tagline: 'Know your engine.',
    summary: 'A running app that estimates your VO2max on your wrist, and shows how it is trending.',
    ground: '#5C0F1A',
    ink: '#FBF5EF',
    accent: '#E63946',
    watch: 'black',
    features: [
      { title: 'VO2max', body: 'An estimate from your steady running, updated as you train.' },
      { title: 'Every detail', body: 'Pace, heart rate, cadence, laps and climb.' },
      { title: 'Best splits', body: 'Your fastest 1 km, mile and 5 km in every run.' },
      { title: 'Treadmill mode', body: 'Distance indoors, without GPS.' },
    ],
    together: ['Counts in X Streak', 'VO2max from X Trail runs too'],
    screens: [
      { src: s('run', 'vo2max'), label: 'VO2max' },
      { src: s('run', 'running'), label: 'Running' },
      { src: s('run', 'best-splits'), label: 'Best splits' },
    ],
  },
  {
    slug: 'trail',
    name: 'X Trail',
    tab: 'Trail',
    tagline: 'Follow the route, not your phone.',
    summary: 'Load a route and run it from your wrist, with a buzz the moment you leave it.',
    ground: '#1F3A2B',
    ink: '#EFE9DC',
    accent: '#E040A0',
    watch: 'white',
    features: [
      { title: 'A map on your wrist', body: 'Your route, and you on it. Zoom with one button.' },
      { title: 'Off-course alert', body: 'A buzz, and an arrow back to the line.' },
      { title: 'Turns and climbs', body: 'Cues before each turn, and what is left to climb.' },
      { title: 'A full run record', body: 'Distance, pace and heart rate, on Strava.' },
    ],
    together: ['Counts in X Streak', 'Feeds your VO2max in X Run'],
    screens: [
      { src: s('trail', 'map'), label: 'Map' },
      { src: s('trail', 'off-course'), label: 'Off course' },
      { src: s('trail', 'elevation'), label: 'Climbs' },
    ],
    page: '/trail',
  },
  {
    slug: 'ride',
    name: 'X Ride',
    tab: 'Ride',
    tagline: 'Stops when you stop.',
    summary: 'For the road and the turbo. It pauses at the lights and picks up as you ride off.',
    ground: '#0E1A4F',
    ink: '#F2F4FB',
    accent: '#FF6A1A',
    watch: 'black',
    features: [
      { title: 'Auto-pause', body: 'The clock stops when you do.' },
      { title: 'Outdoors', body: 'Speed, distance and climb with GPS.' },
      { title: 'On the turbo', body: 'Intervals and Tabata, counted down for you.' },
      { title: 'Auto laps', body: 'By time, or every 1 to 25 km.' },
    ],
    together: ['Counts in X Streak'],
    screens: [
      { src: s('ride', 'riding'), label: 'Riding' },
      { src: s('ride', 'auto-paused'), label: 'Paused' },
      { src: s('ride', 'intervals'), label: 'Intervals' },
    ],
  },
  {
    slug: 'workout',
    name: 'X Workout',
    tab: 'Workout',
    tagline: 'For everything else.',
    summary: 'Gym, HIIT and Hyrox-style sessions, with every interval timed for you.',
    ground: '#161618',
    ink: '#EDEDED',
    accent: '#FF2E88',
    watch: 'black',
    features: [
      { title: 'Seven ways to train', body: 'Strength, EMOM, AMRAP, Tabata, intervals, circuits, or free.' },
      { title: '3, 2, 1, go', body: 'Countdowns, and a different buzz for work and rest.' },
      { title: 'Sets and rest', body: 'A rest timer between every set.' },
      { title: 'Hyrox-style circuits', body: 'Runs and stations, each timed on its own.' },
    ],
    together: ['Counts in X Streak'],
    screens: [
      { src: s('workout', 'strength-set'), label: 'Sets' },
      { src: s('workout', 'tabata'), label: 'Tabata' },
      { src: s('workout', 'circuit-station'), label: 'Circuit' },
    ],
  },
];

export const STREAK: FamilyApp = {
  slug: 'streak',
  name: 'X Streak',
  tab: 'Streak',
  tagline: 'Where it all adds up.',
  summary: 'Set a weekly target and keep it going. Sessions from the other five apps count by themselves.',
  ground: '#0B1F33',
  ink: '#F4FAFB',
  accent: '#2EC4C4',
  watch: 'teal',
  features: [
    { title: 'Your weekly streak', body: 'Hit your target each week and climb, from Arthur’s Seat to Everest.' },
    { title: 'Nothing to log', body: 'Save a session in any X app and it is counted.' },
    { title: 'Fitness, fatigue, form', body: 'See what you have built, and when to ease off.' },
    { title: 'Shields', body: 'Earned by good weeks. They save your streak when life happens.' },
  ],
  together: ['Counts all five apps'],
  screens: [
    { src: s('streak', 'home'), label: 'Streak' },
    { src: s('streak', 'session-found'), label: 'Counted' },
    { src: s('streak', 'training-load'), label: 'Form' },
  ],
  page: '/streak',
};

export const FAMILY: FamilyApp[] = [...RECORDERS, STREAK];

export const icon = (slug: string) => `/una/icons/${slug}.png`;

export const WATCH_RENDER = {
  black: '/weigh-in/una-watch-black.png',
  white: '/trail/una-watch-white.png',
  teal: '/race/una-watch-teal.png',
} as const;

/** The eight numbers of one line in the shared folder, in order (nerdy page). */
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
