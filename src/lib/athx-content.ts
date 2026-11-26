// src/lib/athx-content.ts
//
// The factual content behind the ATHX 2027 page — zones, scoring, dates, FAQ —
// pulled from the same source as the gated guide (private/what-is-athx.pdf) and
// kept here as one typed module rather than scattered through page.tsx.
//
// Two things that makes this the right home for it:
//
//   1. The page's FAQPage JSON-LD is generated from ATHX_FAQS directly, so the
//      structured data and the visible <details> blocks can never say different
//      things. Search engines penalise that mismatch, and it is an easy one to
//      introduce by hand-copying a Q&A into a schema object once and never
//      updating the second copy when the first changes.
//   2. Every fact here is traceable to one source. If the guide is ever revised
//      — a new city, a rules tweak — this is the one file that needs it, rather
//      than a search through prose for every place a date or a zone name
//      appears.
//
// Nothing here should be written from memory or inference. If a claim is not in
// the guide, it does not belong in this file.

export interface AthxZone {
  id: string;
  name: string;
  /** Display form, e.g. '15 min' or '25 min cap'. */
  time: string;
  whatYouDo: string;
  scoring: string;
}

/**
 * The three zones, as published. Order matters: it is the order they run in on
 * the day, and the order the guide's own table uses.
 */
export const ATHX_ZONES: readonly AthxZone[] = [
  {
    id: 'strength',
    name: 'Strength',
    time: '15 min',
    whatYouDo:
      'A one-rep max shoulder to overhead, a two-rep max back squat, then a three-rep max deadlift. Warm-up time is inside the fifteen minutes.',
    scoring: 'Total weight lifted, in kilograms',
  },
  {
    id: 'endurance',
    name: 'Endurance',
    time: '24 min',
    whatYouDo:
      'A 3 km run, then maximum distance on the SkiErg for whatever time is left inside the cap.',
    scoring: 'Ski metres only',
  },
  {
    id: 'metcon-x',
    name: 'MetCon X',
    time: '25 min cap',
    whatYouDo:
      'Row, dumbbell ground to overhead, dumbbell bench press, sandbag squats, a 30 m sandbag carry, burpees over a bench, then row again.',
    scoring: 'Time taken to finish',
  },
] as const;

/** Roughly how much of the ~2.5 hours at the venue is actual working time. */
export const ATHX_TOTAL_WORKING_MINUTES = 69;

/** How long an athlete is at the venue, door to door. */
export const ATHX_VENUE_HOURS = '2.5';

export interface AthxUkDate {
  city: string;
  /** En-dash range or single date, as printed. */
  dates: string;
  /** The first day of the event, YYYY-MM-DD. */
  start: string;
}

/** Every UK and Ireland date for 2027. London is first: the earliest, and the
 *  one the 12-week training block in §5.8/§5.9 is timed against. */
export const ATHX_UK_DATES: readonly AthxUkDate[] = [
  { city: 'London', dates: '23–24 January', start: '2027-01-23' },
  { city: 'Glasgow', dates: '5–6 June', start: '2027-06-05' },
  { city: 'Dublin', dates: '12–13 June', start: '2027-06-12' },
  { city: 'Birmingham', dates: '20–22 August', start: '2027-08-20' },
  { city: 'Liverpool', dates: '9–10 October', start: '2027-10-09' },
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A YYYY-MM-DD day as a UTC midnight, so day sums ignore daylight saving. */
function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

function longDate(dayNo: number): string {
  const d = new Date(dayNo * DAY_MS);
  return `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * What the Timing section says about the twelve-week block, worked out from today.
 * It used to say "starts in early November", which was true in August and then was
 * not, and the page cannot be rebuilt by hand every week. The block is 84 days with
 * the event on its last day, as the books' 84 daily pages are.
 */
export function athxTimingNote(today: Date, dates: readonly AthxUkDate[] = ATHX_UK_DATES): string {
  const todayNo = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / DAY_MS;
  const blockStart = (start: string) => dayNumber(start) - 83;
  const upcoming = dates.filter((d) => dayNumber(d.start) >= todayNo);
  if (upcoming.length === 0) return 'Weeks in the build. The 2027 UK and Ireland dates have all passed; the 2028 dates will be added when they are announced.';

  const first = upcoming[0];
  if (blockStart(first.start) >= todayNo) {
    return `Weeks in the build. If you're targeting ${first.city}, ${first.dates}, a twelve-week block starts on ${longDate(blockStart(first.start))}.`;
  }
  const weeks = Math.floor((dayNumber(first.start) - todayNo) / 7);
  const next = upcoming.find((d) => blockStart(d.start) >= todayNo);
  const base = `Weeks in the build. ${first.city}, ${first.dates}, is ${weeks} ${weeks === 1 ? 'week' : 'weeks'} away, which is closer than a full twelve-week block.`;
  return next
    ? `${base} For ${next.city}, ${next.dates}, a twelve-week block starts on ${longDate(blockStart(next.start))}.`
    : base;
}

/** A sample of the wider 2027 European calendar. Not exhaustive — the guide
 *  itself says "and others" — so this is illustrative, not a claim of completeness. */
export const ATHX_EUROPE_CITIES = ['Paris', 'Madrid', 'Milan', 'Berlin', 'Amsterdam'] as const;

export interface AthxFaq {
  question: string;
  answer: string;
}

/**
 * The page's FAQ, and the source for its FAQPage schema.
 *
 * Each answer is written to stand alone — the phrasing an AI answer engine or a
 * search snippet would lift verbatim — rather than assuming the reader has just
 * read the paragraph above it. That is why some facts (the zone list, the
 * scoring model) appear twice on the page: once in flowing prose, once here in
 * direct question-and-answer form. Both need to be correct on their own.
 */
export const ATHX_FAQS: readonly AthxFaq[] = [
  {
    question: 'What is ATHX?',
    answer:
      'ATHX is a hybrid fitness competition that started in the UK in 2023 and is backed by adidas. Athletes complete three judged zones — Strength, Endurance and MetCon X — in a single session, and are ranked on the sum of their three placings rather than one combined number. In 2027 it runs in more than twenty cities across Europe, five of them in the UK and Ireland.',
  },
  {
    question: 'How does ATHX compare to other hybrid fitness competitions?',
    answer:
      "If you've competed in a hybrid or functional fitness event before, a lot of ATHX will be familiar — strength, running and mixed conditioning under one score. The shape of the day is different enough to be worth learning properly: you complete three separate zones with recovery between them rather than racing continuously from a gun to a finish line, and only one of the three zones is scored purely on time.",
  },
  {
    question: 'How long does an ATHX event take?',
    answer:
      "You're at the venue for about two and a half hours. Total working time across all three zones is around sixty-nine minutes — the rest is recovery and transition between zones.",
  },
  {
    question: 'What are the three ATHX zones?',
    answer:
      'Strength (15 minutes): a one-rep max shoulder to overhead, a two-rep max back squat, then a three-rep max deadlift, with your warm-up inside the clock. Endurance (24 minutes): a 3 km run, then maximum distance on the SkiErg for whatever time is left. MetCon X (25-minute cap): a row, dumbbell and sandbag circuit finishing back on the rower, scored on time to finish.',
  },
  {
    question: 'How is ATHX scored?',
    answer:
      'Each zone gives you a placing, not a raw number. Your final score is the sum of your three placings, and the lowest total wins. Winning a zone outright is worth one point whether you take it by four metres or forty — an athlete who wins two zones and finishes 40th in the third scores 42, while one who goes 12th, 14th and 15th scores 41 and beats them. A bad zone tends to cost you more than a good one gains.',
  },
  {
    question: 'Does the run count towards your score in the ATHX Endurance Zone?',
    answer:
      "No. Only the SkiErg distance is scored. The 3 km run is a buy-in — the faster you cover it, the more of the 24-minute cap is left for skiing, but the run itself earns no points.",
  },
  {
    question: 'Does bodyweight affect ATHX scoring?',
    answer:
      "No. Every zone is scored in absolute terms — kilos lifted, metres skied, a fixed circuit completed — with nothing divided by bodyweight. The only place extra mass costs you is the run in the Endurance Zone, which doesn't score at all.",
  },
  {
    question: 'Is ATHX affiliated with adidas?',
    answer:
      'ATHX is backed by adidas. HybridX Club is an independent training resource and is not affiliated with, or endorsed by, ATHX Games.',
  },
  {
    question: 'When and where is ATHX in the UK and Ireland in 2027?',
    answer:
      'Five events: London on 23–24 January, Glasgow on 5–6 June, Dublin on 12–13 June, Birmingham on 20–22 August, and Liverpool on 9–10 October. ATHX also runs in more than twenty other cities across Europe in 2027, including Paris, Madrid, Milan, Berlin and Amsterdam.',
  },
  {
    question: 'Is ATHX a good first hybrid competition, or only for experienced athletes?',
    answer:
      "It suits you if you already lift and want that to count for something, or if running has been holding your times back elsewhere. It's probably not the best first event if you've never attempted a heavy triple — the Strength zone opens with a genuine one-rep max, early, before you're fully warmed up. Divisions are Lite, ATHX and Pro, as an individual or in pairs, and pairs is generally the easier way into a first one.",
  },
] as const;
