/*
 * The X family: the seven HybridX apps for UNA Watch that work together on the
 * wrist. One source of truth for /una, /una/nerdy-bits, /training, and OG media.
 *
 * Every claim is checked against the watch repository's verified store text
 * and source code (xhybrid-dev/una-hyrox). Nothing listed under "Not claimed"
 * is claimed here: no automatic rep counting, no bike power or cadence sensors,
 * no GPX transfer from the phone, no VO2max lab accuracy claim, and no counting
 * of UNA Watch's built-in apps.
 *
 * All seven app colourways and the inviting light-theme design tokens are
 * mathematically verified for WCAG 2.1 AA (>= 4.5:1) contrast in
 * src/lib/__tests__/una-family.test.ts.
 */

export type AppSlug = 'training' | 'race' | 'run' | 'trail' | 'ride' | 'workout' | 'streak';
export type RecorderSlug = Exclude<AppSlug, 'streak'>;
export type WatchFinish = 'black' | 'white' | 'teal';

export interface WatchScreen {
  /** Canonical path under /una/screens/... (verified on disk by una-family.test.ts). */
  file: string;
  /** Backwards-compatible alias of `file` for legacy callers. */
  src: string;
  label: string;
  caption: string;
}

export interface AppPalette {
  ground: string;
  deep: string;
  lightTint: string;
  inkOnLight: string;
  inkOnDark: string;
  accent: string;
  accentSecondary?: string;
  onAccent: string;
  watch: WatchFinish;
}

export interface AppFeature {
  title: string;
  detail: string;
  /** Backwards-compatible alias of `detail` for legacy callers. */
  body: string;
  isNew?: boolean;
}

export interface AppEcosystemFlow {
  sportTag: string;
  writesFile: string;
  sendsToStreak: string[];
  receivesBack: string[];
  peerLinks?: { target: AppSlug; label: string; detail: string }[];
}

export interface UnaApp {
  slug: AppSlug;
  name: string;
  watchName: string;
  /** Short tab label (backwards-compatible with FamilyExplorer). */
  tab: string;
  role: string;
  isNew?: boolean;
  tagline: string;
  summary: string;
  athleteBenefit: string;
  palette: AppPalette;
  /** Legacy flat colour/watch mirrors for M1->M2 caller compatibility. */
  ground: string;
  ink: string;
  accent: string;
  watch: WatchFinish;
  icon: string;
  features: AppFeature[];
  /** Legacy compact ecosystem tags for M1->M2 caller compatibility. */
  together: string[];
  ecosystem: AppEcosystemFlow;
  screens: WatchScreen[];
  detailHref?: string;
  /** Legacy alias of `detailHref` for M1->M2 caller compatibility. */
  page?: string;
}

export type FamilyApp = UnaApp;

export interface TrainingPlanSpec {
  id: '10k' | 'half' | 'vo2max';
  name: string;
  weeks: string;
  headline: string;
  summary: string;
  longRunRange: string;
  keyWorkouts: string[];
  phases: { name: string; weeks: string; focus: string }[];
  streakAndRunNote: string;
}

export interface AthleteWeekPreset {
  id: string;
  title: string;
  subtitle: string;
  weeklyTarget: number;
  startingFitness: number;
  startingFatigue: number;
  days: {
    day: string;
    app: RecorderSlug | null;
    sessionTitle: string;
    detail: string;
    load: number;
    vo2Contributes?: boolean;
  }[];
}

export interface GlanceSpec {
  slug: string;
  name: string;
  icon: string;
  headline: string;
  detail: string;
  previews: { file: string; label: string }[];
}

export interface StandaloneApp {
  slug: string;
  name: string;
  role: string;
  summary: string;
  highlight: string;
  href: string;
  icon?: string;
}

/**
 * Verified WCAG 2.1 light-theme tokens blending HybridX athletics with UNA Watch
 * precision. Never place `hybridxYellow` (`#FADB5C`) or `unaOrange` (`#ED8835`)
 * directly as text on light surfaces; use `inkPrimary`, `unaTealText`, or
 * `unaOrangeText` instead.
 */
export const UNA_LIGHT_THEME = {
  canvas: '#FFFFFF',
  surface: '#F5F7F8',
  surfaceTealSoft: '#ECF5F6',
  surfaceTealTint: '#E7F4F5',
  inkPrimary: '#0E1316',
  inkSecondary: '#47555D',
  obsidian: '#0B0D0F',
  hybridxYellow: '#FADB5C',
  unaTeal: '#358D98',
  unaTealText: '#1B6B75',
  unaTealDeep: '#174146',
  unaOrange: '#ED8835',
  unaOrangeText: '#A34B08',
} as const;

export const TRAINING_MEDICAL_NOTICE =
  'Training advice is general, not medical: stop if something hurts.';

export const VO2_ESTIMATE_NOTICE =
  'VO2max is an estimate for tracking your own trend, not a lab test.';

/**
 * The apps cost nothing once you own the watch. Say it this way, not "100% free":
 * next to a hardware link, a bare "free" reads as the watch itself being free.
 */
export const FREE_ON_WATCH_LINE = 'Free on UNA Watch';

export const INDEPENDENCE_NOTICE =
  'The X family are independent apps for UNA Watch, made by HybridX. They are not made, endorsed or sponsored by UNA Watch Ltd or by HYROX. UNA and UNA Watch are trademarks of UNA Watch Ltd; HYROX is a trademark of its owner.';

export const icon = (slug: string) => `/una/icons/${slug}.png`;

export const WATCH_RENDER = {
  black: '/weigh-in/una-watch-black.png',
  white: '/trail/una-watch-white.png',
  teal: '/race/una-watch-teal.png',
} as const;

export const WATCH_RENDERS = WATCH_RENDER;

function screen(app: AppSlug, name: string, label: string, caption: string): WatchScreen {
  const file = `/una/screens/${app}/${name}.png`;
  return { file, src: file, label, caption };
}

function feat(title: string, detail: string, isNew?: boolean): AppFeature {
  return isNew ? { title, detail, body: detail, isNew } : { title, detail, body: detail };
}

type UnaAppInput = Omit<UnaApp, 'ground' | 'ink' | 'accent' | 'watch' | 'icon' | 'page'>;

function defineApp(input: UnaAppInput): UnaApp {
  return {
    ...input,
    ground: input.palette.ground,
    ink: input.palette.inkOnDark,
    accent: input.palette.accent,
    watch: input.palette.watch,
    icon: icon(input.slug),
    ...(input.detailHref ? { page: input.detailHref } : {}),
  };
}

export const RECORDERS: UnaApp[] = [
  defineApp({
    slug: 'training',
    name: 'X Training',
    watchName: 'X Training',
    tab: 'Training',
    role: 'Adaptive 10K, Half Marathon & VO2max running coach',
    isNew: true,
    tagline: 'Your plan, coached on your wrist.',
    summary:
      'Structured 10K, Half Marathon and 8-week VO2max plans built from your 5K time, run step by step outdoors or on a treadmill, that adapt when real life gets in the way.',
    athleteBenefit:
      "Open the watch and today's exact session, pace band and purpose are already waiting — no spreadsheet, no phone on the run, and a plan that adjusts sensibly if you miss a day or have a rough week.",
    palette: {
      ground: '#24123F',
      deep: '#150A26',
      lightTint: '#F4F0FB',
      inkOnLight: '#5B34B5',
      inkOnDark: '#F4F0FB',
      accent: '#7C3AED',
      accentSecondary: '#FFB020',
      onAccent: '#FFFFFF',
      watch: 'black',
    },
    features: [
      feat(
        'Three built-in plans',
        '10K (10 weeks), Half Marathon (12 weeks, with 16–20 km long-run distance floors) and an 8-week VO2max block, each at three levels on the 3 to 6 days you run.',
        true,
      ),
      feat(
        'Paces from your 5K',
        "Easy, threshold, interval and repetition bands calculated with Daniels–Gilbert equations and checked against all 66 rows of Daniels' tables — plus an optional half-marathon check that flags an endurance gap.",
      ),
      feat(
        'Guided steps & steadier alerts',
        'Live pace gauge, 5-second debounced zone alerts, easy runs that only warn if you go too fast, short-rep verdicts on the next step card, and a 1-second hold before time trials and races.',
        true,
      ),
      feat(
        'Plan memory & Changes',
        'Missed key sessions shift into a later quality slot, missed long runs are offered back the next day, mostly missed weeks repeat, and Changes lets you swap, skip or pause on your wrist.',
        true,
      ),
      feat(
        'Works outdoors or on a treadmill',
        'Run your planned sessions outside with GPS or switch on Treadmill mode indoors — works smoothly without GPS.',
        true,
      ),
      feat(
        'Session Review, Feel & Form',
        'Scores time in your target pace band, asks how the run felt (Fresh to Spent), charts your last 8 runs on the Form page, and only offers to hold the plan after 3 consecutive off-pace sessions.',
        true,
      ),
    ],
    together: ['Counts in X Streak', 'Feeds & reads VO2max with X Run', 'Pairs with X Training Glance'],
    ecosystem: {
      sportTag: 'Run',
      writesFile: 'act_training.json',
      sendsToStreak: ['Run session count toward weekly target', 'Edwards 5-zone HR training load'],
      receivesBack: [
        'Live week progress & streak on Saved screen',
        'X Run VO2max estimate & block baseline on Plan screen',
      ],
      peerLinks: [
        {
          target: 'streak',
          label: 'Counts in X Streak',
          detail:
            'Every planned or free run counts automatically with heart-rate load so your plan drives your weekly mountain climb and Form.',
        },
        {
          target: 'run',
          label: 'Two-way VO2max link with X Run',
          detail:
            'Outdoor steady minutes feed into X Run for your VO2max estimate, and X Run writes your latest estimate back so X Training tracks change across the block.',
        },
      ],
    },
    screens: [
      screen('training', 'today', 'Today', "Today's planned session with target pace, duration and purpose."),
      screen('training', 'pace-gauge', 'Pace gauge', 'Live pace gauge showing your target band and remaining step time.'),
      screen('training', 'this-week', 'This week', 'Seven-day Mon–Sun plan calendar with done, today and rest marks.'),
      screen('training', 'plan', 'Plan & VO2max', '10-week phase progress bar alongside your live X Run VO2max estimate.'),
      screen('training', 'paces', 'Paces', 'Six training paces calculated from your 5K using Daniels–Gilbert equations.'),
      screen('training', 'treadmill-rep', 'Treadmill', 'Structured rep switched to belt speed with no GPS required.'),
      screen('training', 'feel', 'How it felt', 'Post-run effort check-in rating the session from Fresh to Spent.'),
      screen('training', 'form', 'Plan Form', 'Last 8 runs plotted as on-pace compliance bars paired with feel ratings.'),
    ],
    detailHref: '/training',
  }),

  defineApp({
    slug: 'race',
    name: 'HybridX Race',
    watchName: 'HybridX Race',
    tab: 'Race',
    role: 'Purpose-built HYROX-format race & sim timer',
    tagline: 'Every split. One button.',
    summary:
      'The HYROX-format race and simulation timer. Press once at each transition so every run, station and optional Roxzone is timed and labelled on its own.',
    athleteBenefit:
      'Turn a 90-minute race from one flat blur into 16 or 31 clean Strava splits, pace indoors without GPS against your last race or target finish, and never lose a station to a sweaty double-tap.',
    palette: {
      ground: '#0B0D0F',
      deep: '#1A1A1A',
      lightTint: '#FDF8E1',
      inkOnLight: '#735500',
      inkOnDark: '#FFFFFF',
      accent: '#FADB5C',
      accentSecondary: '#0B0D0F',
      onAccent: '#0B0D0F',
      watch: 'black',
    },
    features: [
      feat(
        'Full race, halves or sims',
        'Run all 8 rounds, Rounds 1–4, Rounds 5–8 with real round numbers, or shorten runs from 100 m to 1 km for gym simulations.',
      ),
      feat(
        'Optional Roxzone splits',
        'Switch Roxzone In and Out on for 31 individual splits (never adding a stray transition after Wall Balls), or keep it to 16 clean run-and-station splits.',
      ),
      feat(
        'Zero-GPS Pace Plan',
        'Compare live against your last saved race (scaling sim run distances proportionally) or a target finish time with ahead/behind delta and projected finish.',
      ),
      feat(
        'Split lock & lossless undo',
        'A 1–10 second split lockout blocks accidental double presses, and Undo merges time and heart-rate samples back cleanly on a wrong split or early finish.',
      ),
      feat(
        'Distinct pitched audio cues',
        'Separate tones and haptics for runs, stations, Roxzone and finish so you know what just logged without staring at your wrist.',
      ),
      feat(
        'Labelled Strava & Garmin splits',
        'Writes named FIT splits for every run and all 8 stations with real distances and heart rate, ready when UNA syncs.',
      ),
    ],
    together: ['Counts in X Streak as Hybrid', 'Scores full race training load'],
    ecosystem: {
      sportTag: 'Hybrid',
      writesFile: 'act_race.json',
      sendsToStreak: ['Hybrid session count toward weekly target', 'Edwards 5-zone HR training load'],
      receivesBack: ['Live week progress, streak & Load on Saved screen'],
      peerLinks: [
        {
          target: 'streak',
          label: 'Counts in X Streak',
          detail:
            'Every full race or sim logs automatically as Hybrid with full Edwards heart-rate load so race week shows honestly in Fitness and Fatigue.',
        },
        {
          target: 'workout',
          label: 'Pair with X Workout circuits',
          detail:
            'Use X Workout for daily gym conditioning and shorter HYROX-style circuits, then step into HybridX Race for full simulations and race day.',
        },
      ],
    },
    screens: [
      screen('race', 'race-run', 'Run split', 'Active run lap with round number, split clock and pace-plan delta.'),
      screen('race', 'race-station', 'Station', 'Dedicated station timer showing exact official distance or reps.'),
      screen('race', 'split', 'Split toast', 'Instant transition confirmation with logged split time.'),
      screen('race', 'summary', 'Summary', 'Totals for runs, stations, Roxzone and heart rate plus split list.'),
      screen('race', 'on-your-marks', 'Start confirm', 'On-your-marks screen holding cleanly until the start gun.'),
      screen('race', 'menu', 'Race setup', 'Choose full race, half, sim distance, Roxzone and pace plan.'),
    ],
    detailHref: '/race',
  }),

  defineApp({
    slug: 'run',
    name: 'X Run',
    watchName: 'X Run',
    tab: 'Run',
    role: 'GPS & treadmill running with on-wrist VO2max estimate',
    tagline: 'Know your engine.',
    summary:
      'An everyday running app with an open, on-watch VO2max estimate from your steady running, personal bests, pacing detail and treadmill mode.',
    athleteBenefit:
      'Track one transparent VO2max estimate built from all your steady running — road runs, X Trail routes and X Training sessions alike — without uploading to a black-box cloud.',
    palette: {
      ground: '#5C0F1A',
      deep: '#2C0710',
      lightTint: '#FBF5EF',
      inkOnLight: '#A30E1A',
      inkOnDark: '#FBF5EF',
      accent: '#C1121F',
      accentSecondary: '#E63946',
      onAccent: '#FFFFFF',
      watch: 'black',
    },
    features: [
      feat(
        'On-wrist VO2max estimate',
        'Uses the published ACSM running equation and heart-rate reserve across steady 1-minute windows with a heart-rate lag guard and 42-day rolling average — an estimate for tracking your trend, not a lab test.',
      ),
      feat(
        'All your running feeds one trend',
        'Automatically ingests steady running minutes from both X Trail and X Training, and retroactively re-scores your history if you update your measured maximum heart rate.',
        true,
      ),
      feat(
        'Best splits & all-time PBs',
        'Finds your fastest 1 km, 1 mile and 5 km inside every outdoor run and flags new personal bests automatically.',
        true,
      ),
      feat(
        'Deep post-run detail',
        'Cadence, step length, heart-rate zone breakdown, split halves and aerobic drift so you can see whether your pace held steady.',
      ),
      feat(
        'Treadmill mode',
        'Estimates indoor speed and distance from your cadence with no GPS wait, then calibrates to the console distance after you save.',
      ),
      feat(
        'VO2max Glance',
        "Add the companion VO2max Glance to view your latest estimate, change from last run and 10-run bar chart from the watch's glances screen.",
      ),
    ],
    together: ['Counts in X Streak', 'VO2max from X Trail & X Training', 'Feeds VO2max Glance'],
    ecosystem: {
      sportTag: 'Run',
      writesFile: 'act_run.json',
      sendsToStreak: ['Run session count toward weekly target', 'Edwards 5-zone HR training load'],
      receivesBack: [
        'Live week progress & streak on Saved screen',
        'Steady running minutes from X Trail & X Training',
      ],
      peerLinks: [
        {
          target: 'streak',
          label: 'Counts in X Streak',
          detail:
            'Outdoor and treadmill runs both count automatically with Edwards load so every run builds your streak and Fitness curve.',
        },
        {
          target: 'training',
          label: 'Publishes VO2max to X Training',
          detail:
            'Ingests steady outdoor minutes from X Training and writes your updated VO2max estimate back for X Training to show on its Plan screen.',
        },
        {
          target: 'trail',
          label: 'Ingests X Trail runs',
          detail:
            'Reads steady trail minutes so hilly off-road runs contribute to the same VO2max estimate using ACSM gradient cost.',
        },
      ],
    },
    screens: [
      screen('run', 'vo2max', 'VO2max', 'Current VO2max estimate, trend arrow and recent contributing runs.'),
      screen('run', 'running', 'Running', 'Live outdoor pace, distance, elapsed time and heart rate.'),
      screen('run', 'best-splits', 'Best splits', 'Fastest 1 km, 1 mile and 5 km splits with personal best badges.'),
      screen('run', 'lap', 'Lap detail', 'Per-lap pace, distance and heart rate recorded cleanly to FIT.'),
      screen('run', 'recent-runs', 'Contributing runs', 'Breakdown of recent runs across X Run, X Trail and X Training.'),
      screen('run', 'summary', 'Summary', 'Post-run HR zones, form metrics and aerobic drift summary.'),
    ],
  }),

  defineApp({
    slug: 'trail',
    name: 'X Trail',
    watchName: 'X Trail',
    tab: 'Trail',
    role: 'Wrist GPX breadcrumb navigation & trail running',
    tagline: 'Follow the route, not your phone.',
    summary:
      'Load GPX routes onto the watch and follow a bright breadcrumb line on your wrist with 10 zoom levels, turn cues, climbs left and precision-gated off-course alerts.',
    athleteBenefit:
      'Keep your phone packed away on unfamiliar trails while every steady off-road mile still logs to Strava, counts in X Streak and feeds your VO2max estimate in X Run.',
    palette: {
      ground: '#1F3A2B',
      deep: '#13251B',
      lightTint: '#EFE9DC',
      inkOnLight: '#1F4D34',
      inkOnDark: '#EFE9DC',
      accent: '#E040A0',
      accentSecondary: '#6B8F3A',
      onAccent: '#0B0D0F',
      watch: 'white',
    },
    features: [
      feat(
        '10-level wrist map zoom',
        'See your magenta GPX line heading-up or north-up, stepping cleanly across 9 radii from 60 m to 3.5 km plus a whole-route overview with one button.',
      ),
      feat(
        'GPS + compass heading fusion',
        'Tracks GPS course while moving and blends smoothly with the watch compass when you slow down or pause at trail junctions.',
      ),
      feat(
        'Precision-gated off-course alerts',
        'Shows a directional return arrow from 25 m off line and buzzes after 50 m for 5 seconds — ignoring noisy GPS fixes under tree canopy so you get fewer false alarms.',
      ),
      feat(
        'Flicker-free turn cues',
        'Locks turns to the route geometry, warning visually from 400 m ahead and buzzing at 50 m (one click left, two clicks right) for left, right, sharp turns and U-turns.',
      ),
      feat(
        'Elevation profile & climb left',
        'Draws the remaining elevation profile for GPX files with height data so you always know how much climbing sits ahead.',
      ),
      feat(
        'Full run record & VO2max feed',
        "Records GPS pace, heart rate and laps to Strava, copies GPX routes straight over USB into Routes/, and passes steady minutes into X Run's VO2max estimate.",
      ),
    ],
    together: ['Counts in X Streak', 'Feeds your VO2max in X Run'],
    ecosystem: {
      sportTag: 'Run',
      writesFile: 'act_trail.json',
      sendsToStreak: ['Run session count toward weekly target', 'Edwards 5-zone HR training load'],
      receivesBack: ['Live week progress, streak & Load on Saved screen'],
      peerLinks: [
        {
          target: 'run',
          label: 'Feeds X Run VO2max',
          detail:
            'Writes steady 1-minute outdoor windows for X Run so trail miles keep your VO2max estimate moving.',
        },
        {
          target: 'streak',
          label: 'Counts in X Streak',
          detail:
            'Counts automatically with Edwards load so long hilly weekends show fairly in your streak and Training Load.',
        },
      ],
    },
    screens: [
      screen('trail', 'map', 'Breadcrumb map', 'Live route line with heading arrow, scale bar and one-button zoom.'),
      screen('trail', 'off-course', 'Off course', 'Return arrow and distance back to the route when you stray off line.'),
      screen('trail', 'elevation', 'Climbs', 'Remaining elevation profile showing upcoming climbs on the route.'),
      screen('trail', 'navigation', 'Navigation', 'Distance done, distance to go and upcoming turn cue face.'),
      screen('trail', 'route', 'Route preview', 'Pre-run route shape, total distance and elevation summary.'),
      screen('trail', 'routes', 'Route list', 'Fast cached GPX picker holding up to 16 routes loaded via USB.'),
    ],
    detailHref: '/trail',
  }),

  defineApp({
    slug: 'ride',
    name: 'X Ride',
    watchName: 'X Ride',
    tab: 'Ride',
    role: 'Outdoor GPS cycling & indoor turbo intervals',
    tagline: 'Stops when you stop.',
    summary:
      'Built for road rides and indoor turbo trainers: smart hysteresis auto-pause at traffic lights outdoors, structured intervals and Tabata indoors, and unified heart-rate load.',
    athleteBenefit:
      'Add low-impact cycling volume alongside running and gym work without juggling separate systems — every road spin or turbo block adds directly to your X Streak week and Fitness curve.',
    palette: {
      ground: '#0E1A4F',
      deep: '#08102F',
      lightTint: '#F2F4FB',
      inkOnLight: '#1D3AC7',
      inkOnDark: '#F2F4FB',
      accent: '#2346E8',
      accentSecondary: '#FF6A1A',
      onAccent: '#FFFFFF',
      watch: 'black',
    },
    features: [
      feat(
        'Hysteresis auto-pause',
        'Pauses cleanly below 1.8 km/h and resumes above 3.2 km/h with a 5-second stale-GPS hold so tunnels never trigger false stops, paired with distinct 1-buzz pause and 2-buzz resume cues.',
      ),
      feat(
        'Outdoors with GPS & barometer',
        'Tracks live speed, distance, barometric climb and wrist or chest-strap heart rate, saving as a Strava-ready outdoor ride.',
      ),
      feat(
        'Time or distance auto-laps',
        'Split long road rides automatically by time (1–30 min) or by distance (1–25 km) without lifting a hand off the bars.',
      ),
      feat(
        'Indoor turbo intervals & Tabata',
        'Switch indoors for free turbo rides, Custom Intervals (5–600 s work/rest, 1–30 rounds) or classic 8×20 s/10 s Tabata with 3-second countdown warnings.',
      ),
      feat(
        'Chest strap or wrist heart rate',
        'Uses wrist HR or a paired BLE heart-rate strap for clean zone tracking and honest Edwards training load (bike power and cadence sensors are not yet supported by the watch platform).',
      ),
      feat(
        'Cross-training that counts fairly',
        'An hour in Zone 2 on the bike or hard turbo intervals scores the exact same heart-rate load currency as a run or gym circuit in X Streak.',
      ),
    ],
    together: ['Counts in X Streak as Ride', 'Shared heart-rate training load'],
    ecosystem: {
      sportTag: 'Ride',
      writesFile: 'act_ride.json',
      sendsToStreak: ['Ride session count toward weekly target', 'Edwards 5-zone HR training load'],
      receivesBack: ['Live week progress, streak & Load on Saved screen'],
      peerLinks: [
        {
          target: 'streak',
          label: 'Counts in X Streak',
          detail:
            'Counts automatically as Ride with Edwards HR load so aerobic cross-training builds Fitness without pounding your legs.',
        },
        {
          target: 'training',
          label: 'Low-impact recovery alongside X Training',
          detail:
            'Slot easy spins or turbo sessions between X Training run days to keep Fitness high while protecting your joints.',
        },
      ],
    },
    screens: [
      screen('ride', 'riding', 'Riding', 'Live GPS speed, distance, elapsed time and heart rate outdoors.'),
      screen('ride', 'auto-paused', 'Auto-paused', 'Clock halted automatically at a junction, ready to roll on.'),
      screen('ride', 'intervals', 'Turbo intervals', 'Indoor work and rest countdown timers for structured trainer blocks.'),
      screen('ride', 'summary', 'Summary', 'Post-ride distance, speed, climb, heart rate and zone totals.'),
      screen('ride', 'saved', 'Saved', 'Saved confirmation displaying live X Streak week count and Load.'),
      screen('ride', 'menu', 'Ride setup', 'Switch Outdoor/Indoor, Auto-pause, Auto-laps and turbo workouts.'),
    ],
  }),

  defineApp({
    slug: 'workout',
    name: 'X Workout',
    watchName: 'X Workout',
    tab: 'Workout',
    role: '8-mode gym, strength, HIIT & HYROX-style circuit timer',
    tagline: 'Eight ways to train. Every step timed.',
    summary:
      'One watch app for gym strength, Open sets, EMOM, AMRAP, Tabata, custom intervals and HYROX-style circuits — with drift-free timers, rising 3-2-1 countdown tones and FIT strength sets.',
    athleteBenefit:
      'Ditch wall clocks and phone timers in the gym: press one button between heavy sets or let the watch drive every HIIT interval while X Streak automatically tags your session as Strength, Hybrid or Workout.',
    palette: {
      ground: '#161618',
      deep: '#0C0C0D',
      lightTint: '#FDF1F6',
      inkOnLight: '#A80E56',
      inkOnDark: '#EDEDED',
      accent: '#FF2E88',
      accentSecondary: '#161618',
      onAccent: '#0B0D0F',
      watch: 'black',
    },
    features: [
      feat(
        'Eight ways to train',
        'Free, Strength (sets + rest timer), Open sets, EMOM, AMRAP, Tabata, Custom Intervals and HYROX-style Circuits — all built into one focused gym app.',
        true,
      ),
      feat(
        'Open sets with zero setup',
        'Start straight away and tap R2 to flip smoothly between Set (counting up) and Rest (counting up) for up to 32 sets, saved as real FIT strength sets.',
        true,
      ),
      feat(
        'Any whole minute EMOM & AMRAP',
        'Scroll any length from 1 to 60 minutes one minute at a time (or jump presets with R1), anchored to active time so a 60-minute EMOM ends on the exact second.',
        true,
      ),
      feat(
        'Rising 3-2-1 countdown tones',
        'Ascending audible tones on 3, 2, 1 into a longer finish tone plus distinct haptic patterns for work, rest, runs, stations and done.',
        true,
      ),
      feat(
        'HYROX-style conditioning circuits',
        'Configure 1 to 8 rounds of 100 m–1 km runs paired with the 8 HYROX-style stations, timing every segment cleanly on its own lap.',
      ),
      feat(
        'Context-aware X Streak tagging',
        'Records heart-rate zones, calories and FIT strength sets (no automatic rep counting), and files automatically in X Streak as Strength, Hybrid or Workout.',
      ),
    ],
    together: ['Counts in X Streak (Strength / Hybrid / Workout)', 'Writes FIT strength sets'],
    ecosystem: {
      sportTag: 'Strength / Workout / Hybrid',
      writesFile: 'act_workout.json',
      sendsToStreak: ['Auto-tagged Strength, Hybrid or Workout session', 'Edwards 5-zone HR training load'],
      receivesBack: ['Live week progress, streak & Load on Saved screen'],
      peerLinks: [
        {
          target: 'streak',
          label: 'Counts in X Streak by workout kind',
          detail:
            'Tags Strength & Open sets as Strength, Circuits as Hybrid, and HIIT/Free as Workout automatically.',
        },
        {
          target: 'race',
          label: 'Step up to HybridX Race',
          detail:
            'Train stations and short rounds in X Workout circuits, then benchmark full 8-round splits and Roxzone in HybridX Race.',
        },
      ],
    },
    screens: [
      screen('workout', 'open-sets', 'Open sets', 'Zero-setup gym timer flipping cleanly between Set and Rest on R2.'),
      screen('workout', 'strength-set', 'Strength sets', 'Structured sets with automatic rest timer and FIT set recording.'),
      screen('workout', 'rest-countdown', '3-2-1 rest', 'Rest countdown with rising audible tones before the next set.'),
      screen('workout', 'tabata', 'Tabata', 'Classic 8-round 20 s work / 10 s rest interval face.'),
      screen('workout', 'circuit-station', 'Circuit', 'HYROX-style circuit stepping through runs and all 8 stations.'),
      screen('workout', 'saved', 'Saved', 'Saved screen showing training load and live X Streak progress.'),
      screen('workout', 'menu', 'Workout picker', 'Pick any of the eight workout modes and step settings on-watch.'),
    ],
  }),
];

export const STREAK: UnaApp = defineApp({
  slug: 'streak',
  name: 'X Streak',
  watchName: 'X Streak',
  tab: 'Streak',
  role: 'The central ecosystem dashboard — weekly habit, summits & Fitness/Fatigue/Form',
  tagline: 'Where every session adds up.',
  summary:
    "Set a weekly target and climb from Arthur's Seat to Everest. Sessions saved in all six X activity apps count automatically into your streak and your Banister Fitness, Fatigue and Form.",
  athleteBenefit:
    'See your entire training life in one honest place on your wrist: consistency that rewards showing up, shields that respect real life, and heart-rate load that tells you when to build and when to ease off.',
  palette: {
    ground: '#0B1F33',
    deep: '#06121F',
    lightTint: '#EEF9F9',
    inkOnLight: '#0C636C',
    inkOnDark: '#F4FAFB',
    accent: '#2EC4C4',
    accentSecondary: '#1B6B75',
    onAccent: '#0B0D0F',
    watch: 'teal',
  },
  features: [
    feat(
      'Counts all six X apps automatically',
      'Save a session in X Training, HybridX Race, X Run, X Trail, X Ride or X Workout and it appears in your week automatically under its watch name — nothing to re-log (plus manual logging for anything else, today or yesterday).',
      true,
    ),
    feat(
      'Five cumulative mountain summits',
      "Every achieved week steps you up Arthur's Seat (4w), Snowdon (12w), Ben Nevis (26w), Mont Blanc (52w) and Everest (104w, plus repeat ascents). Progress is cumulative — a missed week never pushes you back down.",
    ),
    feat(
      'Fitness, Fatigue & Form (Banister)',
      'Folds Edwards heart-rate load from every X app into 42-day Fitness and 7-day Fatigue, naming your Form as Fresh, Steady, Building or Overreaching after an honest 14-day learning baseline.',
    ),
    feat(
      'Compassionate Shields',
      'Earn a shield every 4 achieved weeks (hold up to 2). Miss a busy week and X Streak asks whether to spend one to protect your streak — plus a pressure-free trial first week.',
    ),
    feat(
      'Broadcasts live progress to every app',
      'Shares your live week status straight back to every activity app so each one shows your Streak Line and Load right on its Saved screen.',
    ),
    feat(
      'Live-projecting X Streak Glance',
      'Check your mountain climb, weekly session beads and Form word straight from the glances screen — updated immediately after saving a session, even before opening X Streak.',
    ),
  ],
  together: ['Counts all six X apps automatically', 'Broadcasts Streak Line back to every app', 'Powers X Streak Glance'],
  ecosystem: {
    sportTag: 'Hub (All 6 X Apps)',
    writesFile: 'streak_now.json',
    sendsToStreak: [
      'Collects completed sessions from all six X apps automatically',
      'Deduplicates sessions & folds your rolling Training Load',
    ],
    receivesBack: [
      'Shows live week progress & streak on every app’s Saved screen',
      'Updates X Streak Glance live on your watch face',
    ],
    peerLinks: [
      {
        target: 'training',
        label: 'Counts X Training plans',
        detail:
          'Every completed X Training session counts toward your weekly target and drives your Fitness/Fatigue taper into race week.',
      },
      {
        target: 'race',
        label: 'Counts HybridX Race',
        detail: 'Captures race and sim efforts as Hybrid with full heart-rate load.',
      },
      {
        target: 'run',
        label: 'Counts X Run',
        detail: 'Logs road and treadmill runs seamlessly into your weekly beads.',
      },
      {
        target: 'trail',
        label: 'Counts X Trail',
        detail: 'Long trail adventures add fairly via heart-rate zone minutes.',
      },
      {
        target: 'ride',
        label: 'Counts X Ride',
        detail: 'Road rides and turbo intervals count alongside running and gym days.',
      },
      {
        target: 'workout',
        label: 'Counts X Workout',
        detail: 'Strength, HIIT and circuits appear tagged by session type.',
      },
    ],
  },
  screens: [
    screen('streak', 'home', 'Summit home', 'Weekly streak count, animated mountain climber and coach line.'),
    screen('streak', 'session-found', 'Auto-counted', 'Automatic "+1" pickup when you save in any of the six X apps.'),
    screen('streak', 'training-load', 'Training load', '42-day Fitness, 7-day Fatigue and Form balance in plain words.'),
    screen('streak', 'this-week', 'This week', 'Every counted session listed by watch app name, time and load.'),
    screen('streak', 'shield', 'Shields', 'Optional shield prompt protecting your streak when life intervenes.'),
    screen('streak', 'menu', 'Menu', 'Jump to This Week, Training Load, Trophies, Manual Log and Settings.'),
  ],
  detailHref: '/streak',
});

export const APPS: UnaApp[] = [...RECORDERS, STREAK];
export const FAMILY: UnaApp[] = APPS;

export const APP_BY_SLUG: Readonly<Record<AppSlug, UnaApp>> = {
  training: APPS[0],
  race: APPS[1],
  run: APPS[2],
  trail: APPS[3],
  ride: APPS[4],
  workout: APPS[5],
  streak: APPS[6],
};

export const TRAINING_PLANS: TrainingPlanSpec[] = [
  {
    id: '10k',
    name: '10K Plan',
    weeks: '10 weeks (min 6w)',
    headline: 'Build speed and threshold endurance for a faster 10K.',
    summary:
      'Time-dosed across Beginner, Intermediate and Experienced volumes on 3 to 6 running days, progressing from aerobic base and cruise intervals through 10K race-pace work and two 5K time trials into a crisp race-week taper.',
    longRunRange: 'Beginner 45–70 min · Intermediate 60–85 min · Experienced 70–100 min',
    keyWorkouts: [
      'Cruise intervals (3×6 to 3×10 min @ T)',
      'Intervals (5×3 min & 4×4 min @ I)',
      '10K race pace (4×5 min & 3×9 min)',
      '5K time trials (wks 4 & 8) for auto pace recalibration',
    ],
    phases: [
      {
        name: 'Base',
        weeks: 'Wks 1–3',
        focus: 'Easy aerobic volume, hill reps, 400 m reps & first cruise intervals',
      },
      {
        name: 'Cut-back & Test',
        weeks: 'Wk 4',
        focus: 'Reduced volume and a 5K time trial to recalibrate your paces',
      },
      {
        name: 'Build',
        weeks: 'Wks 5–7',
        focus: 'Threshold cruise intervals, VO2 intervals and 10K race-pace reps',
      },
      {
        name: 'Cut-back & Peak',
        weeks: 'Wks 8–9',
        focus: '5K tune-up test followed by peak 3×9 min at 10K pace',
      },
      {
        name: 'Race Week',
        weeks: 'Wk 10',
        focus: '~60% volume, sharp race-pace opener, shake-out strides and 10K Race',
      },
    ],
    streakAndRunNote:
      "Every outdoor run feeds X Run's VO2max estimate and counts with Edwards heart-rate load in X Streak.",
  },
  {
    id: 'half',
    name: 'Half Marathon Plan',
    weeks: '12 weeks (min 8w)',
    headline: 'Go the distance with long-run floors and race-pace finishes.',
    summary:
      'Scales long runs automatically (capped at 150 min) so you hit at least 16, 18 or 20 km across Beginner, Intermediate and Experienced volumes — plus optional half-marathon time input that flags if endurance trails your 5K speed.',
    longRunRange: 'Beginner 60–105 min (≥16 km) · Intermediate 70–115 min (≥18 km) · Experienced 80–130 min (≥20 km)',
    keyWorkouts: [
      'Long runs with 20–30 min Half Marathon fast finishes',
      'Half race pace blocks (3×10 min & 2×20 min)',
      'Cruise intervals (2×15 min & 3×10 min)',
      '5K test (wk 4) & 10K tune-up (wk 8) recalibration',
    ],
    phases: [
      {
        name: 'Base',
        weeks: 'Wks 1–4',
        focus: 'Progressive long runs, hills, cruise work and a Week 4 5K time trial',
      },
      {
        name: 'Build',
        weeks: 'Wks 5–8',
        focus: 'Long run fast finishes, half-pace blocks and a Week 8 10K tune-up',
      },
      {
        name: 'Race-Specific',
        weeks: 'Wks 9–10',
        focus: 'Peak long run (≥16/18/20 km), 2×20 min @ HM pace & 30 min fast finish',
      },
      {
        name: 'Taper & Race',
        weeks: 'Wks 11–12',
        focus: '75% then 50% volume taper so X Streak Form turns Fresh for 21.1 km',
      },
    ],
    streakAndRunNote:
      'Watch your 42-day Fitness rise through Weeks 5–10 and your Form swing Fresh in X Streak during the two-week taper.',
  },
  {
    id: 'vo2max',
    name: '8-Week VO2max Block',
    weeks: '8 weeks (fixed)',
    headline: 'Focused aerobic-ceiling block with before-and-after 5K tests.',
    summary:
      'No race date required: pairs classic 4×4 min intervals, Billat 30-30s and hill reps with an opening and closing 5K time trial — and displays your X Run VO2max estimate baseline and change on the Plan screen.',
    longRunRange: 'Beginner 45–65 min · Intermediate 60–80 min · Experienced 70–95 min',
    keyWorkouts: [
      '4×4 min & 5×3 min high-aerobic intervals',
      'Billat 30-30s (2×8 & 2×10 reps)',
      'Hill reps (6×45 s up to 10×60 s)',
      'Opening & Week 8 5K time trial comparison',
    ],
    phases: [
      {
        name: 'Baseline',
        weeks: 'Wk 1',
        focus: '5K time trial baseline (or immediate intervals + hills if your 5K is recent)',
      },
      {
        name: 'Build 1 & Cut-back',
        weeks: 'Wks 2–4',
        focus: 'Intervals, 30-30s and hills progressing into a Week 4 recovery week',
      },
      {
        name: 'Build 2 & Peak',
        weeks: 'Wks 5–7',
        focus: 'Higher density with shorter recovery jogs and 10×60 s hill reps',
      },
      {
        name: 'Retest',
        weeks: 'Wk 8',
        focus: 'Freshen up and retest 5K time trial alongside your X Run VO2max estimate trend',
      },
    ],
    streakAndRunNote:
      'X Training records your starting X Run VO2max estimate when the block begins so you can compare your 5K and VO2max trend side by side.',
  },
];

export const ATHLETE_WEEKS: AthleteWeekPreset[] = [
  {
    id: 'hyrox-prep',
    title: 'HYROX-Format Prep Week',
    subtitle: 'All six activity apps feeding one X Streak dashboard across a peak hybrid week.',
    weeklyTarget: 5,
    startingFitness: 52,
    startingFatigue: 54,
    days: [
      {
        day: 'Mon',
        app: 'workout',
        sessionTitle: 'Open Sets Strength',
        detail: '40 min compound lifts flipping Set and Rest on R2 · tagged Strength.',
        load: 48,
      },
      {
        day: 'Tue',
        app: 'training',
        sessionTitle: 'Cruise 3×8 min',
        detail: 'Structured threshold intervals on live pace gauge · counts as Run & feeds VO2max.',
        load: 84,
        vo2Contributes: true,
      },
      {
        day: 'Wed',
        app: null,
        sessionTitle: 'Rest & mobility',
        detail: 'Recovery day lets short-term Fatigue drop quickly while 42-day Fitness holds.',
        load: 0,
      },
      {
        day: 'Thu',
        app: 'ride',
        sessionTitle: 'Turbo Intervals',
        detail: '40 min indoor trainer block building aerobic load with low leg impact · Ride.',
        load: 76,
      },
      {
        day: 'Fri',
        app: 'run',
        sessionTitle: 'Easy 40 min + strides',
        detail: 'Steady aerobic road run logging cadence, splits & VO2max windows · Run.',
        load: 58,
        vo2Contributes: true,
      },
      {
        day: 'Sat',
        app: 'race',
        sessionTitle: 'Half A Sim (500 m runs)',
        detail: 'Rounds 1–4 with Roxzone splits & zero-GPS Pace Plan · tagged Hybrid.',
        load: 118,
      },
      {
        day: 'Sun',
        app: 'trail',
        sessionTitle: 'Ridge 14 km GPX loop',
        detail: 'Breadcrumb route with turn cues, climbs left & gradient VO2max windows · Run.',
        load: 112,
        vo2Contributes: true,
      },
    ],
  },
  {
    id: 'half-marathon',
    title: 'Half Marathon Block',
    subtitle: 'Peak X Training Half Marathon week paired with runner strength and honest recovery.',
    weeklyTarget: 4,
    startingFitness: 48,
    startingFatigue: 46,
    days: [
      {
        day: 'Mon',
        app: null,
        sessionTitle: 'Rest day',
        detail: 'Start the build week with rested legs before Tuesday quality work.',
        load: 0,
      },
      {
        day: 'Tue',
        app: 'training',
        sessionTitle: 'Intervals 5×3 min',
        detail: 'High-aerobic intervals with 5 s debounced zone alerts · Run & VO2max.',
        load: 88,
        vo2Contributes: true,
      },
      {
        day: 'Wed',
        app: 'workout',
        sessionTitle: 'Runner Strength & Core',
        detail: '35 min Strength sets with rising 3-2-1 rest countdowns · Strength.',
        load: 44,
      },
      {
        day: 'Thu',
        app: 'training',
        sessionTitle: 'Easy 45 min + strides',
        detail: 'Easy aerobic run with "too fast only" guardrail · Run & VO2max.',
        load: 62,
        vo2Contributes: true,
      },
      {
        day: 'Fri',
        app: null,
        sessionTitle: 'Rest day',
        detail: 'Planned recovery ahead of the back-to-back weekend sessions.',
        load: 0,
      },
      {
        day: 'Sat',
        app: 'training',
        sessionTitle: 'Cruise 3×10 min',
        detail: 'Threshold cruise intervals followed by post-run Feel & Form review · Run & VO2max.',
        load: 96,
        vo2Contributes: true,
      },
      {
        day: 'Sun',
        app: 'training',
        sessionTitle: 'Long 100 min (20 min HM)',
        detail: 'Long run hitting distance floor and closing at Half Marathon pace · Run & VO2max.',
        load: 148,
        vo2Contributes: true,
      },
    ],
  },
  {
    id: '10k-engine',
    title: '10K & Engine Build',
    subtitle: 'Speed, VO2max work and low-impact cycling building Fitness without hammering joints.',
    weeklyTarget: 4,
    startingFitness: 50,
    startingFatigue: 50,
    days: [
      {
        day: 'Mon',
        app: 'training',
        sessionTitle: '4×4 min VO2 Intervals',
        detail: 'Targeted aerobic-ceiling intervals paced on the watch gauge · Run & VO2max.',
        load: 90,
        vo2Contributes: true,
      },
      {
        day: 'Tue',
        app: 'workout',
        sessionTitle: 'Strength & Mobility Sets',
        detail: '35 min Open sets gym work keeping legs durable for fast running · Strength.',
        load: 46,
      },
      {
        day: 'Wed',
        app: null,
        sessionTitle: 'Rest day',
        detail: 'Mid-week absorption day before Thursday race-pace repetitions.',
        load: 0,
      },
      {
        day: 'Thu',
        app: 'training',
        sessionTitle: '10K Pace 4×5 min',
        detail: 'Goal 10K rhythm repeats with short-rep verdicts on the step card · Run & VO2max.',
        load: 92,
        vo2Contributes: true,
      },
      {
        day: 'Fri',
        app: 'ride',
        sessionTitle: 'Zone 2 Spin 45 min',
        detail: 'Easy outdoor spin with auto-pause adding aerobic volume without impact · Ride.',
        load: 48,
      },
      {
        day: 'Sat',
        app: 'run',
        sessionTitle: 'Easy 35 min + best-split check',
        detail: 'Relaxed road run feeding steady minutes into X Run VO2max · Run & VO2max.',
        load: 52,
        vo2Contributes: true,
      },
      {
        day: 'Sun',
        app: 'trail',
        sessionTitle: 'Rolling 12 km Trail Loop',
        detail: 'Off-road endurance run on GPX breadcrumb line with hill VO2max credit · Run & VO2max.',
        load: 98,
        vo2Contributes: true,
      },
    ],
  },
];

export const GLANCES: GlanceSpec[] = [
  {
    slug: 'streak-glance',
    name: 'X Streak Glance',
    icon: icon('streak-glance'),
    headline: 'Your weekly climb, beads and Form — without opening the app.',
    detail:
      'Updates automatically the moment you save in any of the six X apps, showing your mountain summit, weekly session beads and Form word.',
    previews: [
      { file: '/una/screens/streak/glance-climbing.png', label: 'Climbing' },
      { file: '/una/screens/streak/glance-week-banked.png', label: 'Week banked' },
      { file: '/una/screens/streak/glance-at-risk.png', label: 'At risk' },
    ],
  },
  {
    slug: 'run-glance',
    name: 'VO2max Glance',
    icon: icon('run-glance'),
    headline: 'Your VO2max estimate and 10-run bar chart at a flick.',
    detail:
      "Reads X Run's latest estimate (combining steady runs from X Run, X Trail and X Training), showing your current figure, last-run delta and recent trend.",
    previews: [
      { file: '/una/screens/run/glance-getting-fitter.png', label: 'Trending up' },
      { file: '/una/screens/run/glance-steady.png', label: 'Steady' },
      { file: '/una/screens/run/glance-first-runs.png', label: 'First runs' },
    ],
  },
  {
    slug: 'training-glance',
    name: 'X Training Glance',
    icon: icon('training-glance'),
    headline: "Today's session, target pace and 7-day plan strip.",
    detail:
      'Reads a 14-day pre-worded schedule written by X Training, staying accurate for two full weeks with done, today, upcoming, rest and missed pips.',
    previews: [
      { file: '/una/screens/training/glance-today.png', label: 'Today' },
      { file: '/una/screens/training/glance-long-run.png', label: 'Long run' },
      { file: '/una/screens/training/glance-done.png', label: 'Done' },
    ],
  },
];

export const STANDALONE_APPS: StandaloneApp[] = [
  {
    slug: 'weigh-in',
    name: 'X Weigh-in',
    role: 'Private weight trend & resting kcal',
    summary:
      'Fast on-watch weigh-ins with a 20% daily smoothed trend, 30-day graph, BMI, resting kcal and a companion Glance — stored privately on the watch with zero cloud sync.',
    highlight: 'Supports kg, stones & pounds, and pounds with lossless switching.',
    href: '/weigh-in',
    icon: '/weigh-in/screens/home.png',
  },
  {
    slug: 'trail-quest',
    name: 'Trail Quest',
    role: 'Retro pocket trail-running RPG',
    summary:
      'A Game Boy-inspired turn-based adventure up five stages of The Ridge with recruitable Trail Spirits, timing-needle duels and pitched watch jingles.',
    highlight: 'Built just for fun between hard training blocks.',
    href: '/trail-quest',
    icon: '/trail-quest/icon.png',
  },
];

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
