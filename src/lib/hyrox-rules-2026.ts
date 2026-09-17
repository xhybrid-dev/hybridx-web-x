/**
 * Structured data for the 2026/27 HYROX rule-change guide
 * (/hyrox-rule-changes-2026).
 *
 * Everything the interactive components render lives here so the page copy,
 * the triage board, the penalty calculator and the JSON-LD all stay in sync
 * with a single edit. Penalty values are taken from the 2026/27 Singles,
 * Doubles and Team Relay rulebooks; where a rulebook does not publish a
 * numeric penalty we deliberately store `null` rather than guess one.
 */

export type Severity = 'dq' | 'time' | 'good' | 'know';
export type RaceFormat = 'singles' | 'doubles' | 'relay';

export interface RuleChange {
  id: string;
  /** Short card headline. */
  title: string;
  severity: Severity;
  /** Which race formats the rule applies to. */
  formats: RaceFormat[];
  /** The price of getting it wrong, in as few words as possible. */
  cost: string;
  /** One-sentence plain-English summary — also used for the card collapsed state. */
  summary: string;
  /** The detail, as short paragraphs. */
  detail: string[];
  /** What to do about it in training or on race day. */
  doThis?: string;
  /** True for changes that are new or materially tightened this season. */
  isNew?: boolean;
}

export const SEVERITY_META: Record<
  Severity,
  { label: string; short: string; blurb: string }
> = {
  dq: {
    label: 'Ends your race',
    short: 'DQ',
    blurb: 'No time is recorded if you get this wrong.',
  },
  time: {
    label: 'Costs you time',
    short: 'Penalty',
    blurb: 'A published penalty is added to your finish time.',
  },
  good: {
    label: 'In your favour',
    short: 'Allowed',
    blurb: 'Things you are now explicitly allowed to do.',
  },
  know: {
    label: 'Worth knowing',
    short: 'Context',
    blurb: 'Unlikely to affect your race, but useful to know.',
  },
};

export const FORMAT_META: Record<RaceFormat, { label: string }> = {
  singles: { label: 'Singles' },
  doubles: { label: 'Doubles' },
  relay: { label: 'Relay' },
};

const ALL_FORMATS: RaceFormat[] = ['singles', 'doubles', 'relay'];

export const RULE_CHANGES: RuleChange[] = [
  {
    id: 'incomplete-station',
    title: 'An incomplete station is now a disqualification',
    severity: 'dq',
    formats: ALL_FORMATS,
    cost: 'Disqualification',
    isNew: true,
    summary:
      'All eight workout stations must be completed in full. Leaving one unfinished is a disqualification rather than a time penalty.',
    detail: [
      'The rulebook lists where this applies: leaving the SkiErg or rower before the full 1,000 metres, leaving the wall balls before 100 valid reps, missing a sled lane on the push or the pull, missing a lap on the farmers carry, and missing an entire station or an entire 1km run.',
      'The two ergs are the most likely places to get caught, because the monitor is easy to misread when you are tired. Previously there was some room for interpretation. There is none now.',
      'Wall balls are the other one to watch. The rep count is the hardest thing to keep track of late in a race, and the standard is 100 valid reps rather than 100 attempts.',
    ],
    doThis:
      'Do not leave a station until a judge confirms you are done. If you are not sure whether you have finished, ask — a few seconds costs far less than a disqualification.',
  },
  {
    id: 'missed-run-lap',
    title: 'Missed run laps now have a published penalty scale',
    severity: 'time',
    formats: ALL_FORMATS,
    cost: '3–7 min, or DQ at one-lap venues',
    isNew: true,
    summary:
      'The penalty used to be a vague range. It is now fixed, and it depends on how many laps your venue uses per kilometre.',
    detail: [
      'Four laps per kilometre costs 3 minutes per missed lap. Three laps costs 5 minutes. Two laps costs 7 minutes. At one lap per kilometre a missed lap is a disqualification.',
      'One-lap venues are worth checking for specifically, because there is no time penalty option at all.',
      'The lap screens at the venue are a convenience, not an official record, and the rulebook says so directly.',
    ],
    doThis:
      'Check the athlete map before you start so you know how many laps make up a kilometre, then count them yourself.',
  },
  {
    id: 'sandbag-support',
    title: 'Sandbag drops cost 15 seconds instead of a disqualification',
    severity: 'time',
    formats: ALL_FORMATS,
    cost: '15 sec per infringement',
    isNew: true,
    summary:
      'Dropping the sandbag twice no longer disqualifies you. Each infringement is 15 seconds instead, but the support standard is stricter than most people expect.',
    detail: [
      'The two-drop disqualification is gone, which is a more proportionate outcome for what is usually a fatigue error rather than an advantage.',
      'The standard is that the bag stays fully supported by you for the whole 100 metres. Resting it on a barricade, propping it on your feet, or putting it down to catch your breath all count as infringements.',
      'There are no warnings, so the penalty applies from the first occurrence.',
    ],
    doThis:
      'Train the second half of the lunges under load so you can rest standing, with the bag still supported.',
  },
  {
    id: 'chalk',
    title: 'Chalk is allowed at two stations only',
    severity: 'time',
    formats: ALL_FORMATS,
    cost: '2 min',
    isNew: true,
    summary:
      'Chalk is permitted at the sled pull and the farmers carry. Using it anywhere else is a 2 minute penalty.',
    detail: [
      'It has to be the chalk the event provides, and you cannot carry it from one station to another.',
      'Powdered chalk at the wall balls is listed separately, with its own 2 minute penalty.',
    ],
    doThis:
      'Chalk up at the sled pull and the farmers carry and leave it there. Do not carry any in a pocket or on a wristband.',
  },
  {
    id: 'water',
    title: 'Aid station water is for drinking only',
    severity: 'time',
    formats: ALL_FORMATS,
    cost: '2 min per occurrence',
    isNew: true,
    summary:
      'Tipping aid station water over your head is now a 2 minute penalty each time.',
    detail: [
      'The reasoning is that wet flooring on the run lanes is a hazard for the athletes behind you.',
      'If you tend to overheat, plan your cooling before the start rather than relying on the aid stations.',
    ],
    doThis: 'Pre-cool before the race and bring your own kit for cooling rather than using the cups.',
  },
  {
    id: 'skierg-jump',
    title: 'A jumping motion on the SkiErg is allowed',
    severity: 'good',
    formats: ALL_FORMATS,
    cost: 'No penalty — explicitly allowed',
    isNew: true,
    summary:
      'A dynamic or jumping stroke is now explicitly legal, and your feet may leave the base plate during the movement.',
    detail: [
      'The only requirement is that your feet land back on the base plate rather than on the floor.',
      'This was unclear enough previously that a lot of athletes were coached away from it. If a jumping stroke suits you, it is legal.',
    ],
    doThis:
      'If you have been holding back a natural jumping stroke, try it in training and compare your 1,000m split.',
  },
  {
    id: 'overtaking',
    title: 'Overtaking at three stations is explicitly allowed',
    severity: 'good',
    formats: ALL_FORMATS,
    cost: 'No penalty — explicitly allowed',
    isNew: true,
    summary:
      'You may pass a slower athlete on the lunges, burpee broad jumps and farmers carry whenever it is safe to do so.',
    detail: [
      'Grid lines and lane markings at those stations are for orientation only. You are not required to stay inside them.',
      'It matters most on the burpee broad jumps, where being stuck behind someone previously meant matching their pace.',
    ],
    doThis: 'Move out and pass early rather than settling into a pace that does not suit you.',
  },
  {
    id: 'doubles-togetherness',
    title: 'Doubles partners must stay within ten seconds',
    severity: 'time',
    formats: ['doubles'],
    cost: 'Out of ranking after 3 infringements',
    isNew: true,
    summary:
      'The maximum gap between partners is now ten seconds, measured by the timing equipment in and out of the RoxZone. Neither of you can start a station until you are both there.',
    detail: [
      'Ten seconds is a small margin when one partner is having a harder day than the other.',
      'It tends to catch mismatched teams, where the stronger runner gets ahead without realising.',
      'More than three togetherness infringements and the team is marked out of competition with no ranking, so three is the limit for the whole race.',
    ],
    doThis:
      'Practise running together at the pace of whichever partner is having the worse day, rather than at your average pace.',
  },
  {
    id: 'relay-transition-chip',
    title: 'Relay: back-to-back legs still run the transition zone',
    severity: 'time',
    formats: ['relay'],
    cost: 'Automatic penalty',
    isNew: true,
    summary:
      'If one member does two runs and two stations back to back, they still have to run through the transition zone after each workout so their chip is read.',
    detail: [
      'It is easy to skip, because you have not swapped with anyone. The timing system still needs the read, and missing it is an automatic penalty.',
      'This is the relay rule teams are most likely not to know about.',
    ],
    doThis:
      'Agree it as a team beforehand: every workout finishes with a pass through the transition zone, whether you swap or not.',
  },
  {
    id: 'relay-finish',
    title: 'Relay: the finish follows a set route',
    severity: 'know',
    formats: ['relay'],
    cost: 'Team split up at the finish',
    summary:
      'Once your fourth member leaves the transition zone for the last run, the other three follow a set route to the wall ball rig, and all four cross the line together.',
    detail: [
      'The three finished members go to the wall ball station through the spectator pathways, enter via the marked relay entry point once their teammate has started throwing, and wait under the rig.',
      'All four then run to the finisher stage and cross the line together.',
      'Teams that do not know this tend to be spread around the venue when their teammate finishes.',
    ],
    doThis: 'Walk the route together during your venue recce and agree where to meet under the rig.',
  },
  {
    id: 'out-of-ranking',
    title: 'HYROX can declare an event out of ranking',
    severity: 'know',
    formats: ALL_FORMATS,
    cost: 'Time stands, but does not count',
    isNew: true,
    summary:
      'An event, or a single day of one, can be declared out of ranking for qualification and world record purposes if conditions affect performance or safety.',
    detail: [
      'Wet flooring and extreme heat are the examples given.',
      'Your time still stands. It just does not count towards Worlds qualification or a record.',
    ],
  },
  {
    id: 'fast-lane',
    title: 'Sub 4:00/km runners must use the fast lane',
    severity: 'know',
    formats: ALL_FORMATS,
    cost: 'Lane requirement',
    summary:
      'Athletes running 4:00 per kilometre or quicker are required to use the inside fast lane. Everyone else stays outside it.',
    detail: [
      'Worth knowing which side of that pace you are on before you start, so you are not moving across lanes mid-race.',
    ],
  },
  {
    id: 'smart-glasses',
    title: 'Smart glasses are banned',
    severity: 'know',
    formats: ALL_FORMATS,
    cost: 'Banned equipment',
    isNew: true,
    summary:
      'Smart glasses join headphones, phones, body cameras and ear plugs on the banned list.',
    detail: [
      'The wording covers anything with a camera, recording, streaming or augmented reality function, so it applies to the function rather than a specific device.',
    ],
  },
  {
    id: 'challenger-division',
    title: 'New Challenger Division for athletes ranked 16 to 30',
    severity: 'know',
    formats: ['singles'],
    cost: 'New qualification route',
    isNew: true,
    summary:
      'Each Challenger race winner earns a place in the Elite 15 at the next elite event.',
    detail: [
      'It affects a small number of athletes, but it is a route into elite racing that did not previously exist.',
    ],
  },
  {
    id: 'elite-qualification',
    title: 'Elite qualification is points based',
    severity: 'know',
    formats: ['singles', 'doubles'],
    cost: 'Athlete licence required',
    isNew: true,
    summary:
      'Qualification runs on a rolling 365 day window, counting your best five singles results or best three doubles results.',
    detail: [
      'You need an athlete licence for a result to count, and licences cannot be applied retrospectively. Buy one before the race you want counted.',
    ],
  },
  {
    id: 'doubles-nationality',
    title: 'Pro doubles partners must share a nationality',
    severity: 'know',
    formats: ['doubles'],
    cost: 'Qualification eligibility',
    isNew: true,
    summary:
      'For Pro doubles chasing elite qualification, both partners must hold the same nationality, evidenced by passport.',
    detail: [
      'It affects a number of existing partnerships, which will need to change to stay eligible for qualification.',
    ],
  },
  {
    id: 'age-60',
    title: 'Age 60 and over qualify through Open',
    severity: 'know',
    formats: ['singles', 'doubles'],
    cost: 'Qualification route',
    isNew: true,
    summary:
      'You can still race Pro at regular events and take age group podiums, but qualification for Worlds is through Open only, and you race Open weights at Worlds.',
    detail: [],
  },
];

/* ── The eight stations, and what "complete" means at each ───────────────── */

export interface StationSpec {
  id: string;
  name: string;
  /** Order in the race, 1–8. */
  order: number;
  /** The completion standard. */
  standard: string;
  /** How people get it wrong. */
  trap: string;
  /** Called out explicitly in the rulebook as a DQ trigger. */
  namedInRulebook: boolean;
}

export const STATIONS: StationSpec[] = [
  {
    id: 'skierg',
    name: 'SkiErg',
    order: 1,
    standard: 'The full 1,000 metres on the monitor.',
    trap: 'Stopping when the count is close rather than complete. That used to be arguable and is now a disqualification, so read the monitor instead of estimating.',
    namedInRulebook: true,
  },
  {
    id: 'sled-push',
    name: 'Sled Push',
    order: 2,
    standard: 'Every lane of the push, for the full 50 metres.',
    trap: 'Losing track of which lane you are on. The push is hard enough that it happens, and a missed lane is now a disqualification rather than something you go back and redo.',
    namedInRulebook: true,
  },
  {
    id: 'sled-pull',
    name: 'Sled Pull',
    order: 3,
    standard: 'Every lane of the pull, for the full 50 metres.',
    trap: 'Same as the push — a missed lane is a disqualification. This is also one of only two stations where chalk is allowed.',
    namedInRulebook: true,
  },
  {
    id: 'burpee-broad-jump',
    name: 'Burpee Broad Jump',
    order: 4,
    standard: 'The full 80 metres, chest to floor, jumping from two feet.',
    trap: 'Stopping short of the line, often because the lane ahead is blocked. Overtaking here is explicitly allowed, so move around rather than waiting.',
    namedInRulebook: false,
  },
  {
    id: 'row',
    name: 'Rowing',
    order: 5,
    standard: 'The full 1,000 metres on the monitor.',
    trap: 'The same error as the SkiErg, but more common, because you are further into the race and the monitor is harder to read. There is no room for interpretation now.',
    namedInRulebook: true,
  },
  {
    id: 'farmers-carry',
    name: 'Farmers Carry',
    order: 6,
    standard: 'The full 200 metres, which is two laps at some venues and four at others.',
    trap: 'Assuming the lap count from a previous race. Check the athlete map before you start — nobody will count for you, and a missed lap is now a disqualification rather than a penalty.',
    namedInRulebook: true,
  },
  {
    id: 'sandbag-lunges',
    name: 'Sandbag Lunges',
    order: 7,
    standard: 'The full 100 metres, with the bag supported by you the whole way.',
    trap: 'Resting the bag on a barricade, on your feet or on the floor. Each of those is 15 seconds, applied without a warning first.',
    namedInRulebook: false,
  },
  {
    id: 'wall-balls',
    name: 'Wall Balls',
    order: 8,
    standard: '100 valid reps, in every division.',
    trap: 'Rep count is the hardest thing to track at the end of a race, and no reps do not count towards the total. If the screen has not gone green and your judge has not confirmed, you are not finished.',
    namedInRulebook: true,
  },
];

/* ── Lap configurations and the missed-lap scale ─────────────────────────── */

export interface LapConfig {
  /** Laps per kilometre at this venue. */
  lapsPerKm: 1 | 2 | 3 | 4;
  label: string;
  /** Penalty in seconds per missed lap, or null when the penalty is a DQ. */
  penaltySeconds: number | null;
  penaltyLabel: string;
  note: string;
}

export const LAP_CONFIGS: LapConfig[] = [
  {
    lapsPerKm: 4,
    label: '4 laps per km',
    penaltySeconds: 180,
    penaltyLabel: '3 min',
    note: 'Short loops, 32 laps across the race. The most counting to do, and the smallest penalty if you get it wrong.',
  },
  {
    lapsPerKm: 3,
    label: '3 laps per km',
    penaltySeconds: 300,
    penaltyLabel: '5 min',
    note: '24 laps across the race. Five minutes is more than most athletes spend on the wall balls.',
  },
  {
    lapsPerKm: 2,
    label: '2 laps per km',
    penaltySeconds: 420,
    penaltyLabel: '7 min',
    note: '16 laps across the race, and the largest time penalty on the scale.',
  },
  {
    lapsPerKm: 1,
    label: '1 lap per km',
    penaltySeconds: null,
    penaltyLabel: 'Disqualification',
    note: 'A single long loop, usually a large arena. There is no time penalty option here.',
  },
];

/* ── Penalty calculator inputs ───────────────────────────────────────────── */

export interface PenaltyItem {
  id: string;
  label: string;
  /** Short explanation shown under the label. */
  hint: string;
  /** Seconds added per occurrence. `null` means the outcome is not a time penalty. */
  seconds: number | null;
  /** 'dq' ends the race, 'ranking' removes you from the rankings. */
  outcome?: 'dq' | 'ranking';
  formats: RaceFormat[];
  /** Maximum times you can plausibly log it, for the counter UI. */
  max: number;
  /** Rule card this maps to. */
  ruleId: string;
}

export const PENALTY_ITEMS: PenaltyItem[] = [
  {
    id: 'sandbag',
    label: 'Sandbag unsupported',
    hint: 'Rested on a barricade, your feet or the floor. 15 seconds each, with no warning first.',
    seconds: 15,
    formats: ALL_FORMATS,
    max: 6,
    ruleId: 'sandbag-support',
  },
  {
    id: 'chalk',
    label: 'Chalk outside the sled pull or farmers carry',
    hint: 'Includes powdered chalk at the wall balls, and carrying chalk between stations.',
    seconds: 120,
    formats: ALL_FORMATS,
    max: 4,
    ruleId: 'chalk',
  },
  {
    id: 'water',
    label: 'Aid station water over your head',
    hint: 'Drinking is fine. Tipping it over yourself is 2 minutes each time.',
    seconds: 120,
    formats: ALL_FORMATS,
    max: 4,
    ruleId: 'water',
  },
  {
    id: 'missed-lap',
    label: 'Missed run lap',
    hint: 'The cost depends on your venue layout — set it in step 2.',
    seconds: 0, // resolved from the selected lap configuration
    formats: ALL_FORMATS,
    max: 4,
    ruleId: 'missed-run-lap',
  },
  {
    id: 'togetherness',
    label: 'Togetherness infringement',
    hint: 'More than a ten second gap in or out of the RoxZone. Three is the limit for the race.',
    seconds: null,
    outcome: 'ranking',
    formats: ['doubles'],
    max: 5,
    ruleId: 'doubles-togetherness',
  },
  {
    id: 'transition-zone',
    label: 'Missed transition zone chip read',
    hint: 'Back-to-back legs still pass through the zone after every workout.',
    seconds: null,
    formats: ['relay'],
    max: 4,
    ruleId: 'relay-transition-chip',
  },
  {
    id: 'incomplete',
    label: 'Left a station unfinished',
    hint: 'The change most likely to end a race this season.',
    seconds: null,
    outcome: 'dq',
    formats: ALL_FORMATS,
    max: 1,
    ruleId: 'incomplete-station',
  },
];

/* ── Doubles standards that are not new, but still catch people ──────────── */

export const DOUBLES_STANDARDS: { title: string; body: string }[] = [
  {
    title: 'The resting partner stays on their feet',
    body: 'No kneeling, sitting or lying down at any station. Rest standing.',
  },
  {
    title: 'Nothing gets passed forward',
    body: 'Kettlebells and the sandbag can never be passed forward. Sideways or backwards only.',
  },
  {
    title: 'No flying wall ball transitions',
    body: 'One partner throwing while the other catches in the squat is a no rep. Finish the rep, then swap.',
  },
  {
    title: 'Hands off the rope on the sled pull',
    body: 'You can talk to your partner and gesture, but you cannot touch the rope or step into the Racer’s Box.',
  },
];

/* ── Relay finish protocol, in order ─────────────────────────────────────── */

export const RELAY_FINISH_STEPS: { step: string; body: string }[] = [
  {
    step: 'Your fourth member leaves for the last run',
    body: 'This is the cue for the rest of the team to move.',
  },
  {
    step: 'The other three head to the wall balls',
    body: 'Through the spectator pathways, not across the race floor.',
  },
  {
    step: 'Enter at the marked relay entry point',
    body: 'Only once your teammate has started throwing.',
  },
  {
    step: 'Wait under the rig together',
    body: 'All four of you in one place, ready to move.',
  },
  {
    step: 'Run to the finisher stage and cross together',
    body: 'The whole team crosses the line at the same time.',
  },
];

/* ── FAQ (also emitted as FAQPage JSON-LD) ───────────────────────────────── */

export const RULE_FAQS: { question: string; answer: string }[] = [
  {
    question: 'What are the biggest HYROX rule changes for the 2026/27 season?',
    answer:
      'The largest change is that failing to complete any workout station in full is now a disqualification rather than a penalty. Alongside that: missed run laps have a published penalty scale (3 minutes at four-lap venues, 5 minutes at three-lap, 7 minutes at two-lap, and disqualification at one-lap venues), the sandbag two-drop disqualification has been replaced by a 15 second penalty per infringement, chalk is restricted to the sled pull and farmers carry, tipping aid station water over your head costs 2 minutes, and the doubles togetherness gap has been reduced to ten seconds.',
  },
  {
    question: 'Can you be disqualified for not finishing a HYROX station?',
    answer:
      'Yes. Under the 2026/27 rulebooks every workout station must be completed in full, and an incomplete station is a disqualification rather than a time penalty. The rulebook specifically names leaving the SkiErg or rower before 1,000 metres, leaving the wall balls before 100 valid reps, missing a sled lane, missing a farmers carry lap, and missing an entire station or 1km run.',
  },
  {
    question: 'What is the penalty for a missed run lap in HYROX?',
    answer:
      'It depends on how many laps your venue uses per kilometre. Four laps per kilometre is 3 minutes per missed lap, three laps is 5 minutes, two laps is 7 minutes, and at one-lap venues a missed lap is a disqualification. Venue lap screens are a convenience rather than an official record, so count your own laps.',
  },
  {
    question: 'Is dropping the sandbag still a disqualification in HYROX?',
    answer:
      'No. Dropping the sandbag twice no longer disqualifies you — each infringement is a 15 second penalty instead. The support standard is stricter, though: the bag must be fully supported by you for the whole 100 metres, so resting it on a barricade, on your feet or on the floor each counts as an infringement, and there are no warnings.',
  },
  {
    question: 'Can you jump on the SkiErg in HYROX?',
    answer:
      'Yes. A dynamic or jumping motion on the SkiErg is now explicitly allowed. Your feet may leave the base plate during the movement, provided they land back on the base plate and not on the floor.',
  },
  {
    question: 'What is the HYROX doubles togetherness rule for 2026/27?',
    answer:
      'Partners must stay within a maximum ten second gap, measured by the timing equipment going in and out of the RoxZone, and neither partner may start a station until both are present. More than three togetherness infringements means the team is marked out of competition with no ranking.',
  },
  {
    question: 'How many wall balls do women do in HYROX?',
    answer:
      'Women do 100 wall balls in every division, and have done since September 2024. Any page listing 75 reps is out of date.',
  },
  {
    question: 'Where can I read the official HYROX rulebooks?',
    answer:
      'The official Singles, Doubles and Team Relay rulebooks are published on hyrox.com and are the only version that counts on race day. Any summary, including this one, is a reading of them rather than a substitute for them.',
  },
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */

export function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function countBySeverity(severity: Severity): number {
  return RULE_CHANGES.filter((rule) => rule.severity === severity).length;
}
