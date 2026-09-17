export interface Book {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  imageUrl: string;
  amazonUrl: string;
  level?: string;
}

// Single source of truth for the book catalog — used by both the homepage
// promo section and the dedicated /books page. Keep in sync with the actual
// Amazon listings; no prices or ratings are hardcoded here since those
// change on Amazon's side and must stay accurate for structured data.
export const books: Book[] = [
  {
    id: 'hyrox-12-week-prep',
    title: 'Hyrox 12 Week Training Plan for Hyrox Race Preparation',
    description: 'Excel in Hyrox with this comprehensive 12-week guide. Master movements, optimize running, and build strength with expert advice and progressive strategies. Ideal for all levels.',
    longDescription: 'A complete 12-week programme covering every one of the 8 Hyrox stations, compromised running, and race-week tapering. Built for athletes who want a structured, printed plan they can annotate and follow without needing an app.',
    imageUrl: 'https://m.media-amazon.com/images/S/aplus-media-library-service-media/d555d4e2-4284-4579-a41f-2af4bec009bd.__CR250,0,500,666_PT0_SX300_V1___.png',
    amazonUrl: 'https://amzn.to/3SSh8sz',
    level: 'All levels',
  },
  {
    id: 'elite-hyrox-training-plan',
    title: 'Elite Hyrox Training Plan - 12 Week Training Plan for Hyrox Race Preparation',
    description: 'Achieve elite Hyrox performance with this 12-week plan. Focuses on optimizing energy systems to build high-level anaerobic power and aerobic capacity for peak race-day results.',
    longDescription: 'Designed for competitive athletes chasing a faster finish time. Focuses on the energy-system work and race-simulation training that separates top-half finishers from the podium.',
    imageUrl: 'https://m.media-amazon.com/images/S/aplus-media-library-service-media/b9871c7d-2cc7-4004-8416-c3e18450520e.__CR350,0,1400,1400_PT0_SX300_V1___.png',
    amazonUrl: 'https://amzn.to/44jOd74',
    level: 'Advanced',
  },
  {
    id: 'train-for-hyrox-at-home',
    title: 'Train for Hyrox at Home - 12 Week Training Plan',
    description: 'Conquer Hyrox from home with this 12-week beginner plan. Train for all Hyrox stations and 8km running using minimal equipment. Build functional strength and endurance for your first event.',
    longDescription: 'For athletes without full gym access. Every station and the full running volume are covered using minimal equipment, so a home setup or small gym is enough to prepare for your first Hyrox.',
    imageUrl: 'https://m.media-amazon.com/images/I/61kK7bA85OL._SY466_.jpg',
    amazonUrl: 'https://amzn.to/445PMV1',
    level: 'Beginner',
  },
  {
    id: 'advanced-hyrox-workouts',
    title: '45 Advanced Hyrox Workouts',
    description: 'For experienced Hyrox competitors ready to elevate their training. This guide provides 45 advanced workouts designed to push your limits and help you achieve your best performance.',
    longDescription: 'A workout library rather than a linear programme — 45 advanced sessions to slot into your own training block once you already have a base level of Hyrox fitness.',
    imageUrl: 'https://m.media-amazon.com/images/I/612iiof3NPL._SY466_.jpg',
    amazonUrl: 'https://amzn.to/4livuyq',
    level: 'Advanced',
  },
];
