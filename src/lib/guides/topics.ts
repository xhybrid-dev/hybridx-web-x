// src/lib/guides/topics.ts
//
// The topic map: every page an article may link to, the pillars articles
// cluster under, and the tools an article may embed. docs/content-engine-plan.md,
// section 4.3.
//
// An article never links to a page that is not listed here (src/lib/guides/inline.ts
// enforces it), and src/lib/__tests__/guides.test.ts fails if a page listed
// here is missing from the sitemap. Together those mean a generated link can
// only ever point at a real, indexable page.

export const PILLAR_IDS = ['hyrox', 'running-lifting', 'starting-out', 'athx', 'tools'] as const;
export type PillarId = (typeof PILLAR_IDS)[number];

export interface Pillar {
  id: PillarId;
  name: string;
  /** The page that owns the pillar: articles link up to it. */
  page: string;
  blurb: string;
}

export const PILLARS: readonly Pillar[] = [
  {
    id: 'hyrox',
    name: 'HYROX stations and race',
    page: '/how-to-train-for-hyrox',
    blurb: 'Station technique, pacing and race-day decisions.',
  },
  {
    id: 'running-lifting',
    name: 'Running and lifting together',
    page: '/hybrid-training-program',
    blurb: 'How to build strength and an engine in the same week without one wrecking the other.',
  },
  {
    id: 'starting-out',
    name: 'Starting out',
    page: '/free-hyrox-plan',
    blurb: 'Your first race, your baseline, and choosing a division.',
  },
  {
    id: 'athx',
    name: 'ATHX',
    page: '/athx-2027',
    blurb: 'The three zones, and how to prepare for all of them on one day.',
  },
  {
    id: 'tools',
    name: 'Tools',
    page: '/calculators',
    blurb: 'Free calculators that turn your numbers into paces, loads and zones.',
  },
];

export function pillar(id: PillarId): Pillar {
  return PILLARS.find((p) => p.id === id)!;
}

export interface SitePage {
  route: string;
  title: string;
  pillar?: PillarId;
  /** Shown on the /guides hub under its pillar, with this line. */
  hub?: string;
}

/**
 * Every hand-built page an article may link to: the sitemap's main-host pages,
 * minus the legal pages and the shop, which an article has no reason to send
 * anyone to. The pillar pages are listed with their pillar.
 */
export const SITE_PAGES: readonly SitePage[] = [
  { route: '/', title: 'HybridX home' },
  { route: '/free-hyrox-plan', title: 'Free 12-week HYROX plan', pillar: 'starting-out', hub: 'A personalised 12-week plan built around your race date, free as a PDF.' },
  { route: '/hyrox-training-plan', title: '12-week HYROX plan structure', pillar: 'starting-out', hub: 'How the 12 weeks are built, phase by phase, for each level.' },
  { route: '/how-to-train-for-hyrox', title: 'How to train for HYROX', pillar: 'hyrox', hub: 'The complete guide: format, phases, compromised running and the common mistakes.' },
  { route: '/hyrox-rule-changes-2026', title: 'HYROX 2026/27 rule changes', pillar: 'hyrox', hub: 'What changed this season, what it costs, and what to do about it.' },
  { route: '/12-week-running-hyrox', title: '12-week running plan for HYROX', pillar: 'hyrox', hub: 'Faster running for HYROX: threshold, intervals and compromised runs, week by week.' },
  { route: '/hybrid-training-program', title: 'Hybrid athlete training programme', pillar: 'running-lifting', hub: 'The science of training strength and endurance together, with a sample week.' },
  { route: '/build-a-bigger-engine', title: 'Build a bigger engine: free VO2max guide', pillar: 'running-lifting', hub: 'How to raise your VO2max, with the sessions that do it.' },
  { route: '/athx-2027', title: 'ATHX 2027', pillar: 'athx', hub: 'The three zones, how ATHX is scored, and the endurance pacing calculator.' },
  { route: '/calculators', title: 'Free calculators', pillar: 'tools', hub: 'Every HybridX calculator in one place.' },
  { route: '/vdot', title: 'VDOT calculator', pillar: 'tools', hub: 'Your VDOT from any race, and the five training paces it gives you.' },
  { route: '/calculators/running', title: 'Running calculators', pillar: 'tools' },
  { route: '/calculators/strength', title: 'Strength calculators', pillar: 'tools' },
  { route: '/calculators/general-health', title: 'General health calculators', pillar: 'tools' },
  { route: '/calculators/pace-calculator', title: 'Pace calculator', pillar: 'tools' },
  { route: '/calculators/race-time-predictor', title: 'Race time predictor', pillar: 'tools' },
  { route: '/calculators/split-time-calculator', title: 'Split time calculator', pillar: 'tools' },
  { route: '/calculators/heart-rate-zone-calculator', title: 'Heart rate zone calculator', pillar: 'tools' },
  { route: '/calculators/one-rep-max-calculator', title: 'One rep max calculator', pillar: 'tools' },
  { route: '/calculators/percentage-based-weight-calculator', title: 'Percentage-based weight calculator', pillar: 'tools' },
  { route: '/calculators/powerlifting-score-calculator', title: 'Powerlifting score calculator', pillar: 'tools' },
  { route: '/calculators/body-fat-calculator', title: 'Body fat calculator', pillar: 'tools' },
  { route: '/calculators/calorie-macronutrient-calculator', title: 'Calorie and macronutrient calculator', pillar: 'tools' },
  { route: '/calculators/garmin-tcx-generator', title: 'Treadmill FIT/TCX generator', pillar: 'tools' },
  { route: '/calculators/week-planner', title: 'Week planner', pillar: 'tools', hub: 'A 3, 4 or 5-day week of running and strength, built on HybridX rules, with a calendar file.' },
  { route: '/app', title: 'The HybridX app' },
  { route: '/books', title: 'HybridX training books' },
  { route: '/una', title: 'The X family for UNA Watch' },
  { route: '/guides', title: 'HybridX guides' },
  { route: '/guides/how-we-write', title: 'How our guides are written' },
];

const SITE_ROUTES = new Set(SITE_PAGES.map((p) => p.route));

export function isSiteRoute(route: string): boolean {
  return SITE_ROUTES.has(route);
}

/** Routes under /guides that are pages of their own, never article slugs. */
export const RESERVED_GUIDE_SLUGS = ['how-we-write'] as const;

export interface Tool {
  name: string;
  route: string;
  blurb: string;
}

/**
 * The tools an article may point to. An article's calculator block names one
 * of these; until the tools can be embedded (plan step 5), it renders as a card
 * linking to the tool's page.
 */
export const TOOLS = {
  vdot: {
    name: 'VDOT calculator',
    route: '/vdot',
    blurb: 'Enter a recent race and get your five training paces.',
  },
  pace: {
    name: 'Pace calculator',
    route: '/calculators/pace-calculator',
    blurb: 'Pace, time or distance from the other two.',
  },
  'race-time-predictor': {
    name: 'Race time predictor',
    route: '/calculators/race-time-predictor',
    blurb: 'What one race result predicts for the others.',
  },
  'split-time': {
    name: 'Split time calculator',
    route: '/calculators/split-time-calculator',
    blurb: 'The splits that add up to your target time.',
  },
  'heart-rate-zones': {
    name: 'Heart rate zone calculator',
    route: '/calculators/heart-rate-zone-calculator',
    blurb: 'Your five heart rate zones.',
  },
  'one-rep-max': {
    name: 'One rep max calculator',
    route: '/calculators/one-rep-max-calculator',
    blurb: 'Estimate your 1RM from a set you can already do.',
  },
  'percentage-weight': {
    name: 'Percentage-based weight calculator',
    route: '/calculators/percentage-based-weight-calculator',
    blurb: 'The load for any percentage of your max.',
  },
  'week-planner': {
    name: 'Week planner',
    route: '/calculators/week-planner',
    blurb: 'Pick 3, 4 or 5 days, your goal and kit, and get a week of running and strength that never stacks the hard sessions.',
  },
  'athx-endurance': {
    name: 'ATHX endurance pacing calculator',
    route: '/athx-2027',
    blurb: 'How your run pace trades against your SkiErg score.',
  },
} as const satisfies Record<string, Tool>;

export type ToolId = keyof typeof TOOLS;
export const TOOL_IDS = Object.keys(TOOLS) as [ToolId, ...ToolId[]];
