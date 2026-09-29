// Readable names for the ids the tracker stores. Ids stay in the data; people read these.

import { funnel } from '@/lib/plan-finder/content';

const fromList = (list: { id: string; label: string }[]) => Object.fromEntries(list.map((o) => [o.id, o.label]));

const GOALS = fromList(funnel.goals);
const LEVELS = fromList(funnel.levels);
const PLACES = fromList(funnel.places);
const OBSTACLES = fromList(funnel.obstacles);
const FORMATS = fromList(funnel.formats);
const SKIP = fromList(funnel.copy.skipWhy.options);
const FEEDBACK = fromList(funnel.copy.feedback.reasons);
const FIT = fromList(funnel.copy.feedback.fit);
const RACE: Record<string, string> = { none: 'No race date', '1-4': '1 to 4 weeks', '5-11': '5 to 11 weeks', '12-23': '12 to 23 weeks', '24+': '24 weeks or more' };
const CLOSE: Record<string, string> = { button: 'Close button', esc: 'Escape key', backdrop: 'Clicked outside', pagehide: 'Left the page', back: 'Back button' };
const TALK_FROM: Record<string, string> = { result: 'From a result', band: 'From the page band', nav: 'From the navigation', dialog: 'From the questions' };
const SKIP_FROM: Record<string, string> = { bar: 'Entry section skip link', dialog: 'Skip inside the questions', startToday: '"Start today" link' };
const DEVICES: Record<string, string> = { phone: 'Phone', tablet: 'Tablet', desktop: 'Desktop', unknown: 'Unknown' };
const ARMS: Record<string, string> = { A: 'A: entry section', B: 'B', control: 'Control: homepage only', none: 'No experiment' };

const or = (map: Record<string, string>) => (k: string) => map[k] ?? k;

export const label = {
  goal: or(GOALS),
  level: or(LEVELS),
  place: or(PLACES),
  obst: or(OBSTACLES),
  format: or(FORMATS),
  race: or(RACE),
  skipReason: or(SKIP),
  feedbackReason: or(FEEDBACK),
  fit: or(FIT),
  close: or(CLOSE),
  talkFrom: or(TALK_FROM),
  skipFrom: or(SKIP_FROM),
  device: or(DEVICES),
  arm: or(ARMS),
  product: (k: string) => funnel.catalog[k as keyof typeof funnel.catalog]?.title ?? k,
  source: (k: string) => (k === 'direct' ? 'Direct (no referrer)' : k === '_other' ? 'All others' : k),
  field: (k: string) => ({ name: 'Name', email: 'Email', goal: 'Training for' })[k] ?? k,
  answerKey: (k: string) => ({ goal: 'Goal', level: 'Experience', place: 'Where they train', obst: 'What got in the way', format: 'Format', race: 'Weeks to race' })[k] ?? k,
};
