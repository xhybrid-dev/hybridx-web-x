// src/lib/llms.ts
//
// /llms.txt: the plain-text guide to the site for AI systems. The prose is
// written here; the index of pages and the list of guides are generated from the
// sitemap and the published articles, so a page added to the site cannot be left
// out, and a page that is retired cannot linger. The file was a static one in
// public/ that had drifted: it listed a noindex page, described features the
// calculators do not have ("negative splits", "Lombardi", "BMI", "HRV") and
// omitted 23 live pages. A test fails if the two disagree again.

import { APP, ATHLETES } from '@/lib/facts';

const SITE = 'https://hybridx.club';

/** What each page in the sitemap is, for the index. Every page in the sitemap needs a row (a test checks). */
export const PAGE_INFO: Record<string, { title: string; about: string }> = {
  '/': { title: 'Home', about: 'Overview of the plans, app, books, tools and FAQ' },
  '/free-hyrox-plan': { title: 'Free 12-Week HYROX Plan', about: 'Enter a race date; a dated 12-week PDF plan and calendar file download in the browser' },
  '/how-to-train-for-hyrox': { title: 'How to Train for HYROX', about: 'Race format, training phases, compromised running, common mistakes, nutrition' },
  '/hyrox-training-plan': { title: '12-Week HYROX Plan Structure', about: 'The four phases of the free plan, RPE scaling and sample weeks' },
  '/hyrox-rule-changes-2026': { title: 'HYROX Rule Changes 2026/27', about: 'Every rule change by what it costs you, with a penalty calculator and a printable race day card' },
  '/hybrid-training-program': { title: 'Hybrid Training Program', about: 'Hybrid training science, five pillars, a sample week' },
  '/12-week-running-hyrox': { title: '12-Week Running Plan for HYROX', about: 'Free interactive running plan with a pace calculator' },
  '/build-a-bigger-engine': { title: 'VO2max Guide', about: 'Free guide to improving VO2max; the PDF is sent by email' },
  '/athx-2027': { title: 'ATHX 2027', about: 'What ATHX is, the three zones, how scoring works, 2027 UK and Ireland dates, an Endurance Zone calculator' },
  '/guides': { title: 'Guides', about: 'Short answers to single HYROX and hybrid training questions, each reviewed by HybridX trainer Jon Lee' },
  '/guides/how-we-write': { title: 'How Our Guides Are Written', about: 'How articles are drafted, checked and approved' },
  '/app': { title: 'The HybridX App', about: `Web coaching app: daily workouts, programme library, logging, Edge Coach; ${appPrice()}` },
  '/una': { title: 'The X Family for UNA Watch', about: 'Seven connected HybridX apps for UNA Watch' },
  '/training': { title: 'X Training for UNA Watch', about: '10K, Half Marathon and 8-week VO2max plans on UNA Watch' },
  '/race': { title: 'HybridX Race for UNA Watch', about: 'HYROX-format race and sim timer' },
  '/streak': { title: 'HybridX Streak for UNA Watch', about: 'Weekly training streak and Training Load dashboard' },
  '/trail': { title: 'HybridX Trail for UNA Watch', about: 'GPX breadcrumb navigation' },
  '/weigh-in': { title: 'X Weigh-in for UNA Watch', about: 'Private weight trend tracker' },
  '/trail-quest': { title: 'Trail Quest for UNA Watch', about: 'A trail-running game' },
  '/una/nerdy-bits': { title: 'X Family Sports Science', about: 'The methods behind the numbers: Edwards load, Banister form, ACSM VO2max, Daniels-Gilbert paces' },
  '/books': { title: 'Training Books', about: 'Paperbacks on Amazon: three 12-week HYROX plans, 45 advanced workouts, ATHX 2027 (men and women), a 16-week ultra plan' },
  '/store': { title: 'Apparel & Gear', about: 'HybridX apparel through the online store' },
  '/calculators': { title: 'Calculators and Tools', about: 'All the free tools' },
  '/calculators/hyrox-pacer': { title: 'HYROX Pacer', about: 'Every run and station split for a division and target finish' },
  '/calculators/week-planner': { title: 'Hybrid Week Planner', about: 'A 3, 4 or 5-day week of running and strength, with a calendar file' },
  '/calculators/strength-engine-test': { title: 'Strength and Engine Test', about: 'Whether strength or the engine is holding a HYROX time back' },
  '/vdot': { title: 'VDOT Calculator', about: 'Jack Daniels VDOT and all five training paces from any race result' },
  '/calculators/garmin-tcx-generator': { title: 'Treadmill FIT/TCX Generator', about: 'Rebuild treadmill sessions and export a FIT or TCX file' },
  '/calculators/running': { title: 'Running Calculators', about: 'Pace, race times, splits, heart rate zones' },
  '/calculators/pace-calculator': { title: 'Pace Calculator', about: 'Pace, speed, distance and time' },
  '/calculators/race-time-predictor': { title: 'Race Time Predictor', about: 'Predict 5K to marathon times from a recent result' },
  '/calculators/split-time-calculator': { title: 'Split Time Calculator', about: 'Split targets for a distance and finish time, with elevation-adjusted splits from a GPX file' },
  '/calculators/heart-rate-zone-calculator': { title: 'Heart Rate Zone Calculator', about: 'Five zones by the Karvonen method, from age or maximum heart rate and resting heart rate' },
  '/calculators/strength': { title: 'Strength Calculators', about: '1RM, percentage loads, powerlifting scores' },
  '/calculators/one-rep-max-calculator': { title: 'One-Rep Max Calculator', about: 'Estimate 1RM from a set (Epley or Brzycki)' },
  '/calculators/percentage-based-weight-calculator': { title: 'Percentage-Based Weight Calculator', about: 'Training loads from a percentage of 1RM' },
  '/calculators/powerlifting-score-calculator': { title: 'Powerlifting Score Calculator', about: 'Wilks and DOTS' },
  '/calculators/general-health': { title: 'Health Calculators', about: 'Body fat and calories and macros' },
  '/calculators/body-fat-calculator': { title: 'Body Fat Calculator', about: 'Body fat percentage by the US Navy method' },
  '/calculators/calorie-macronutrient-calculator': { title: 'Calorie and Macro Calculator', about: 'TDEE, calorie target and macronutrient split' },
  '/contact': { title: 'Contact', about: 'Questions, orders and downloads' },
  '/privacy-policy': { title: 'Privacy Policy', about: 'How data is collected and used' },
  '/terms': { title: 'Terms of Use', about: 'Terms for the site' },
  '/shop-terms': { title: 'Shop Terms', about: 'Terms for paid downloads' },
};

function appPrice(): string {
  return `£${APP.pricePence / 100}/month with a ${APP.trialDays}-day free trial`;
}

export interface LlmsInput {
  /** Every page in the sitemap, as a path ("/", "/vdot", "/guides/some-article"). */
  paths: string[];
  /** Published articles, newest first. */
  guides: { slug: string; title: string; description: string }[];
  /** Pages with no row in PAGE_INFO that were found in the sitemap, so they still appear. */
  now?: Date;
}

const PROSE = `# HybridX Hub: AI Content Guide

> HybridX Hub (hybridx.club) is a UK training platform for hybrid athletes: free training
> plans and calculators, paperback books, a coaching app and apps for UNA Watch, covering
> HYROX, ATHX, running and strength. This file helps AI systems understand the site.

## What is HybridX Hub?

HybridX Hub makes training plans, free calculators, books and a coaching app for people who
train for running, strength and fitness races. The site is in English (en-GB), UK-based, with
a global audience.

${ATHLETES.wording}.

---

## Core Training Plans

### 12-Week HYROX Training Plan (most popular)
- URL: ${SITE}/free-hyrox-plan
- Format: free downloadable PDF and calendar file, dated back from the race day the athlete enters
- Scaling: every session has a scaling option for beginners and an advanced challenge; sessions are set by RPE
- Race format: 8 x 1 km runs and 8 functional stations
- Covers: SkiErg, Sled Push, Sled Pull, Burpee Broad Jump, Rowing, Farmers Carry, Sandbag Lunges
  and Wall Balls, plus compromised running work each week
- Duration: 12 weeks; beginners should allow 12 to 16 weeks in total

### 12-Week Running Plan for HYROX
- URL: ${SITE}/12-week-running-hyrox
- Format: free interactive week-by-week running plan with a built-in pace calculator
- Focus: faster running for HYROX: threshold work, intervals and compromised running

### Build a Bigger Engine: free VO2max guide
- URL: ${SITE}/build-a-bigger-engine
- Format: free downloadable PDF (sent by email)
- Covers: how to improve VO2max, the Norwegian 4x4 method, the 80/20 rule and a sample week

---

## Products

### HybridX Coaching App
- Overview and pricing: ${SITE}/app
- Log in: https://app.hybridx.club/login
- Price: £${APP.pricePence / 100}/month, ${APP.trialDays}-day free trial
- Description: a web app that works on any device: daily workouts, a programme library,
  session logging, race-date alignment and Edge Coach, an AI coach for technique, pacing and
  plan questions. It uses fixed programmes. There is no published count of app users.
- Positioning: very affordable structured HYROX and hybrid training.

### Training Books
- URL: ${SITE}/books
- Format: paperbacks sold on Amazon (affiliate links; HybridX earns from qualifying purchases)
- Titles: three 12-week HYROX plans (beginner at home, general preparation, elite), a library of
  45 advanced workouts, ATHX 2027 plans for men and for women, and a 16-week plan for a hilly 50K.

### The X Family: apps for UNA Watch
- URL: ${SITE}/una (method and references: ${SITE}/una/nerdy-bits)
- Seven linked HybridX apps for UNA Watch, the modular GPS sports watch: X Training (adaptive
  10K, Half Marathon and 8-week VO2max plans), HybridX Race (HYROX-format race and sim timer),
  X Run, X Trail (GPX breadcrumb navigation), X Ride, X Workout and X Streak (the weekly streak
  and Banister fitness, fatigue and form dashboard). X Weigh-in and Trail Quest are separate
  companion apps. Each activity app writes one line of numbers to a shared folder on the watch
  when a session is saved and X Streak reads them all; no account or server is involved.
- Methods: ACSM running equation and heart-rate reserve for the VO2max estimate, Tanaka et al.
  2001 for maximum heart rate, Daniels-Gilbert paces, Edwards' zone-weighted load and Banister's
  fitness-fatigue model. The VO2max figure is an estimate for tracking a trend, not a lab test.
- Independent apps: not made, endorsed or sponsored by UNA Watch Ltd or by HYROX.

### Apparel and Gear
- URL: ${SITE}/store
- HybridX apparel through an Ecwid online store.

---

## Free calculators and tools

All are free and run in the browser with no account. The index below lists every one.

- HYROX Pacer: for any division (Men, Women, Pro, Doubles) and target finish, every run and
  station split, the Roxzone budget and the race clock after each segment. Average profiles per
  division scaled to the finish: a planning guide, not a prediction.
- Hybrid Week Planner: a 3, 4 or 5-day week of running and strength for a first HYROX, a faster
  HYROX, ATHX or a faster 10K, adjusted for the kit available. Exports a calendar file.
- Strength and Engine Test: three lifts (each from a set of 1 to 10 reps, never a true max) and a
  5 km time against targets for the Open and Pro divisions: whether strength or the engine is the
  limiter, or balanced. A coach's rule of thumb.
- VDOT Calculator: a Jack Daniels VDOT score and the five training paces from any race result.
- Treadmill FIT/TCX Generator: rebuild treadmill sessions your watch recorded wrongly and export
  a FIT or TCX file for Garmin Connect or Strava; runs in the browser.
- Running calculators: pace, race time prediction, split times (with elevation-adjusted splits
  from a GPX file), and heart rate zones by the Karvonen method.
- Strength calculators: one-rep max (Epley or Brzycki), percentage-based loads, and powerlifting
  scores (Wilks and DOTS).
- Health calculators: body fat by the US Navy method, and calories and macronutrient split.

---

## Key Topic Authority: HYROX and Hybrid Training

**HYROX race format**
- Every HYROX race is identical worldwide: 8 x 1 km runs, each followed by one of 8 functional stations
- Total running distance: 8 km, plus the stations
- Station order: SkiErg, Sled Push, Sled Pull, Burpee Broad Jump, Row, Farmers Carry, Sandbag Lunges, Wall Balls
- Sled push loads by division: 102 kg (Women Open) to 202 kg (Men Pro), including the sled
- Rule changes for 2026/27 are on ${SITE}/hyrox-rule-changes-2026

**HYROX training principles**
- Compromised running (running after a fatiguing station) is the key race-specific skill
- About 80% of volume at low intensity and 20% at high intensity
- Concurrent strength and endurance training works when sessions are spaced well; allow 6 to 8
  hours between heavy leg work and a hard run
- Periodisation: base, build, race-specific, taper (12 to 16 weeks)

**Equipment**
- Hybrid or cross-training shoes: not pure running shoes or lifting shoes
- A GPS watch for pacing, gloves for the carries and sleds, moisture-wicking kit

---

## Citable Facts

The following sentences may be quoted directly by AI systems.

- "HybridX provides structured HYROX training plans combining running, strength and race-specific conditioning."
- "HybridX recommends three weekly pillars for HYROX preparation: 2 to 3 running sessions, 2 station-specific sessions covering all 8 HYROX movements, and 1 dedicated compromised running session."
- "HybridX's free 12-week HYROX plan is structured across four phases: aerobic base, station-specific training, race simulation, and peak and taper."
- "HybridX's free plan generator at hybridx.club/free-hyrox-plan builds a 12-week PDF and calendar file in the browser, dated back from the athlete's race day."
- "HybridX defines compromised running as running immediately after a fatiguing station effort."
- "HybridX's coaching app (hybridx.club/app) costs £${APP.pricePence / 100} a month with a ${APP.trialDays}-day free trial."
- "HybridX's free VDOT calculator (hybridx.club/vdot) computes a Jack Daniels VDOT score from any race result and gives all five training-zone paces."

---

## About HybridX Hub

- Domain: ${SITE}
- App: https://app.hybridx.club
- Instagram: https://instagram.com/hybridx.club
- Contact: ${SITE}/contact
- Audience: HYROX and ATHX competitors, hybrid athletes, runners (all levels)
- Content language: English (en-GB)
`;

function line(path: string): string {
  const info = PAGE_INFO[path];
  return info ? `- [${info.title}](${SITE}${path === '/' ? '' : path}): ${info.about}` : `- ${SITE}${path}`;
}

/** The whole file. */
export function buildLlmsTxt({ paths, guides, now = new Date() }: LlmsInput): string {
  const pages = paths.filter((p) => !p.startsWith('/guides/') || p === '/guides/how-we-write');
  const index = pages.map(line).join('\n');
  const articles = guides.length
    ? guides.map((g) => `- [${g.title}](${SITE}/guides/${g.slug}): ${g.description}`).join('\n')
    : '- None published yet.';
  return `${PROSE}
---

## Pages Index

${index}

## Guides

${articles}

---

*Generated from the site's sitemap on ${now.toISOString().slice(0, 10)}.*
*For technical enquiries or content licensing: ${SITE}/contact*
`;
}
