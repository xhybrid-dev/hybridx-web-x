// Run with: node --test data/
// Uses only Node's built-in test runner. No dependencies.
const test = require('node:test');
const assert = require('node:assert/strict');
const { route, explain, VERSION } = require('./routing.js');
const funnel = require('./funnel.json');

const ids = (list) => list.map((x) => x.id);
const GOALS = ids(funnel.goals), LEVELS = ids(funnel.levels), PLACES = ids(funnel.places), FORMATS = ids(funnel.formats), OBST = ids(funnel.obstacles);

function* allAnswers() {
  for (const goal of GOALS) for (const level of LEVELS) for (const place of PLACES) for (const format of FORMATS)
    for (let mask = 0; mask < (1 << OBST.length); mask++) {
      const obst = OBST.filter((_, i) => mask & (1 << i));
      yield { goal, level, place, format, obst };
    }
}

// An independent statement of the primary-product table, written as data rather than branching code.
const PAPER = { first: { gym: 'twelve', home: 'home', both: 'home' }, faster: 'elite', athx: 'athx', ultra: 'ultra', xenom: { adv: 'elite', std: 'twelve' }, hybrid: { adv: 'elite', std: 'twelve' } };
const FREE = { first: 'free', faster: 'rtp', athx: 'free', xenom: 'free', ultra: 'vdot', hybrid: 'free' };
const TOOLS = { first: 'free', faster: 'rtp', athx: 'rtp', xenom: 'vo2', ultra: 'vdot', hybrid: 'vo2' };
function oraclePrimary(a) {
  const adv = a.level === 'raced' || a.level === 'compete';
  if (a.format === 'phone') return 'app';
  if (a.format === 'free') return FREE[a.goal];
  if (a.format === 'tools') return TOOLS[a.goal];
  const p = PAPER[a.goal];
  if ((a.goal === 'first' || a.goal === 'hybrid') && adv) return 'elite';
  if (typeof p === 'string') return p;
  return a.goal === 'first' ? p[a.place] : p[adv ? 'adv' : 'std'];
}

test('primary product matches the routing table for every combination', () => {
  let n = 0;
  for (const a of allAnswers()) {
    assert.equal(route(a).primary, oraclePrimary(a), JSON.stringify(a));
    n++;
  }
  assert.equal(n, 6 * 4 * 3 * 4 * 256);
});

test('structural rules hold for every combination', () => {
  for (const a of allAnswers()) {
    const r = route(a);
    assert.ok(funnel.catalog[r.primary], 'primary exists in catalog: ' + r.primary);
    assert.ok(r.secondary.length <= 2, 'at most two extras');
    assert.equal(new Set(r.secondary).size, r.secondary.length, 'extras are unique');
    assert.ok(!r.secondary.includes(r.primary), 'extras never repeat the primary');
    r.secondary.forEach((id) => assert.ok(funnel.catalog[id], 'extra exists in catalog: ' + id));
    if (a.obst.includes('options')) assert.deepEqual(r.secondary, [], 'too many options shows one recommendation');
    else assert.ok(r.secondary.length >= 1, 'otherwise at least one extra: ' + JSON.stringify(a));
    if (a.obst.includes('run') && !a.obst.includes('options')) {
      const expected = ['run12', 'vdot'].filter((x) => x !== r.primary);
      assert.deepEqual(r.secondary.slice(0, expected.length), expected, 'running weak spot leads the extras: ' + JSON.stringify(a));
    }
    assert.ok(Array.isArray(r.trace) && r.trace.length >= 3);
    assert.equal(r.version, VERSION);
  }
});

test('missing answers fall back to a valid result', () => {
  const r = route({});
  assert.equal(r.primary, 'home');
  assert.deepEqual(route().secondary, r.secondary);
});

const GOLDEN = [
  [{ goal: 'first', level: 'new', place: 'home', obst: ['run'], format: 'paper' }, 'home', ['run12', 'vdot']],
  [{ goal: 'first', level: 'new', place: 'gym', obst: ['structure'], format: 'paper' }, 'twelve', ['app', 'free']],
  [{ goal: 'faster', level: 'raced', place: 'gym', obst: ['plateau'], format: 'phone' }, 'app', ['rtp', 'elite']],
  [{ goal: 'ultra', level: 'regular', place: 'both', obst: ['time'], format: 'free' }, 'vdot', ['free', 'ultra']],
  [{ goal: 'xenom', level: 'compete', place: 'gym', obst: ['options'], format: 'tools' }, 'vo2', []],
  [{ goal: 'athx', level: 'new', place: 'home', obst: [], format: 'paper' }, 'athx', ['free', 'app']],
  [{ goal: 'hybrid', level: 'raced', place: 'both', obst: ['injury'], format: 'paper' }, 'elite', ['free', 'app']],
  [{ goal: 'first', level: 'new', place: 'home', obst: ['generic', 'time'], format: 'free' }, 'free', ['home']],
  [{ goal: 'faster', level: 'compete', place: 'gym', obst: ['run', 'plateau'], format: 'tools' }, 'rtp', ['run12', 'vdot']],
  [{ goal: 'hybrid', level: 'new', place: 'both', obst: ['none'], format: 'phone' }, 'app', ['free', 'twelve']]
];
test('golden examples', () => {
  for (const [a, primary, secondary] of GOLDEN) {
    const r = route(a);
    assert.equal(r.primary, primary, JSON.stringify(a));
    assert.deepEqual(r.secondary, secondary, JSON.stringify(a));
  }
});

test('funnel.json is internally consistent', () => {
  for (const list of [funnel.goals, funnel.levels, funnel.places, funnel.obstacles, funnel.formats]) {
    assert.equal(new Set(ids(list)).size, list.length, 'option ids are unique');
  }
  for (const [id, c] of Object.entries(funnel.catalog)) {
    assert.equal(c.id, id);
    assert.match(c.href, /^https:\/\//, id + ' has an https link');
    for (const k of ['kind', 'badge', 'head', 'title', 'meta', 'price', 'cta', 'status', 'destinationType']) assert.ok(c[k], id + ' has ' + k);
    assert.ok(['live', 'confirm'].includes(c.status));
  }
  assert.equal(funnel.stations.length, 5);
  for (let s = 1; s <= 5; s++) assert.ok(funnel.steps[s].title, 'step ' + s + ' has copy');
  assert.ok(funnel.faq.length >= 5);
});

test('explain works for every combination and reflects the answers', () => {
  for (const goal of GOALS) for (const level of LEVELS) for (const place of PLACES) for (const format of FORMATS) {
    const e = explain({ goal, level, place, format, obst: ['run'] }, funnel, { weeks: 0 });
    assert.match(e.why, /^You are training for /);
    assert.ok(e.chips.length >= 5);
  }
  assert.match(explain({ goal: 'first', obst: [] }, funnel, { weeks: 20 }).why, /20 weeks until your race, which is enough for a full 12-week plan/);
  assert.match(explain({ goal: 'first', obst: [] }, funnel, { weeks: 1 }).why, /1 week until your race, so start this week/);
});
