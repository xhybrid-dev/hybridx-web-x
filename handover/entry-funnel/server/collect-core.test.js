// Run with: node --test server/
// Uses only Node's built-in test runner. No dependencies.
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateBatch, scrubText, IDENTIFYING_KEYS, findIdentifyingKey, DEFAULT_SCHEMA } = require('./collect-core.js');
const schema = require('../data/events.schema.json');
const funnel = require('../data/funnel.json');
const { route } = require('../data/routing.js');

const NOW = Date.UTC(2026, 8, 29, 12, 0, 0);
const SID = 'k3j9x0a7b2c4d6e8';
const CTX = { site: '1.0.0', route: '1.0.0', catalog: '2026-09-29', mode: 'entry', variant: 'A', path: '/', ref: 'google.com', vw: 'phone', lang: 'en-GB' };
const L = schema.limits;

// Build an envelope; events get t = NOW + i*100 and q = i unless given.
function batch(events, extra) {
  return Object.assign({ v: 1, sid: SID, ctx: CTX, events: events.map((e, i) => Object.assign({ t: NOW + i * 100, q: i }, e)) }, extra);
}
const run = (body, opts) => validateBatch(body, Object.assign({ now: NOW + 5000 }, opts));

const RESULT_ANSWERS = { goal: 'first', level: 'new', place: 'home', obst: ['run', 'time'], format: 'paper', race: '12-23' };
const r = route(RESULT_ANSWERS);

test('happy path: a realistic batch is accepted whole', () => {
  const events = [
    { n: 'page_view' },
    { n: 'entry_shown' },
    { n: 'finder_open', source: 'entry', step: 1 },
    { n: 'q_view', step: 1 },
    { n: 'q_answer', step: 1, key: 'goal', value: 'first', ms: 4200 },
    { n: 'q_view', step: 2 },
    { n: 'q_answer', step: 2, key: 'level', value: 'new', ms: 6100 },
    { n: 'q_answer', step: 2, key: 'place', value: 'home', ms: 6900 },
    { n: 'q_view', step: 3 },
    { n: 'q_answer', step: 3, key: 'obst', value: ['run', 'time'], ms: 12000 },
    { n: 'q_view', step: 4 },
    { n: 'q_answer', step: 4, key: 'format', value: 'paper', ms: 3000 },
    { n: 'q_view', step: 5 },
    { n: 'q_answer', step: 5, key: 'race', value: '12-23', ms: 5000 },
    { n: 'q_answer', step: 5, key: 'note', value: 'Email me at jo.bloggs@example.com or call 07700 900123, I am in M1 1AE', ms: 20000 },
    { n: 'result_view', answers: RESULT_ANSWERS, primary: r.primary, secondary: r.secondary, trace: r.trace, weeks: 14 },
    { n: 'result_click', product: r.primary, slot: 'primary', dest: 'amazon-affiliate', affiliate: true },
    { n: 'result_feedback', fit: 'partly', reasons: ['price', 'format'] },
    { n: 'talk_open', from: 'result' },
    { n: 'talk_invalid', fields: ['name', 'email'] },
    { n: 'talk_submit', ok: true, attached: false },
    { n: 'section_view', id: 'plans' },
    { n: 'scroll_depth', pct: 50 },
    { n: 'cta_click', id: 'nav-app', kind: 'nav', host: 'app.hybridx.club' },
    { n: 'faq_open', i: 2 },
    { n: 'page_hide', ms: 95000, scroll: 60, step: 0, result: true }
  ];
  const res = run(batch(events));
  assert.equal(res.ok, true, res.error);
  assert.equal(res.sid, SID);
  assert.deepEqual(res.ctx, CTX);
  assert.equal(res.events.length, events.length);
  assert.deepEqual(res.dropped, { events: 0, props: 0 });
  assert.equal(res.skewed, false);
  assert.equal(res.receivedAt, NOW + 5000);
  // The note is scrubbed, everything else is unchanged.
  const note = res.events.find((e) => e.key === 'note');
  assert.equal(note.value, 'Email me at [email] or call [number], I am in [postcode]');
  const expected = batch(events).events.map((e) => (e.key === 'note' ? Object.assign({}, e, { value: note.value }) : e));
  assert.deepEqual(res.events, expected);
  // Every stored event carries n, t, q
  res.events.forEach((e, i) => { assert.equal(typeof e.n, 'string'); assert.equal(typeof e.t, 'number'); assert.equal(e.q, i); });
  assert.equal(findIdentifyingKey(res), null);
});

test('receivedAt is set by the server, never taken from the client', () => {
  const res = run(batch([{ n: 'page_view' }], { receivedAt: 1 }), { now: NOW });
  assert.equal(res.receivedAt, NOW);
  assert.equal('receivedAt' in res.events[0], false);
});

test('unknown events are dropped and counted', () => {
  const res = run(batch([{ n: 'page_view' }, { n: 'mouse_move' }, { n: '__proto__' }, { n: 42 }, 'nope', null]));
  assert.equal(res.ok, true);
  assert.deepEqual(res.events.map((e) => e.n), ['page_view']);
  assert.equal(res.dropped.events, 5);
});

test('events without a numeric t are dropped', () => {
  const res = run(batch([{ n: 'page_view', t: 'yesterday' }, { n: 'page_view', t: NaN }, { n: 'page_view' }]));
  assert.equal(res.events.length, 1);
  assert.equal(res.dropped.events, 2);
});

test('unknown props are dropped: email on talk_submit never survives', () => {
  const res = run(batch([{ n: 'talk_submit', ok: true, attached: true, email: 'a@b.com', name: 'Jo', message: 'hi', ip: '1.2.3.4', ua: 'x', userAgent: 'y', phone: '1', msg: 'z', extra: 1 }]));
  assert.equal(res.ok, true);
  assert.deepEqual(res.events[0], { n: 'talk_submit', t: NOW, q: 0, ok: true, attached: true });
  assert.equal(res.dropped.props, 9);
  for (const k of IDENTIFYING_KEYS) assert.equal(k in res.events[0], false, k);
  assert.equal(findIdentifyingKey(res), null);
});

test('identifying keys are dropped from ctx and the envelope too', () => {
  const res = run(batch([{ n: 'page_view' }], { ip: '1.2.3.4', ua: 'Mozilla', ctx: Object.assign({}, CTX, { email: 'a@b.com', userAgent: 'x' }) }));
  assert.equal(res.ok, true);
  assert.deepEqual(res.ctx, CTX);
  assert.equal(res.dropped.props, 2);
  assert.equal(findIdentifyingKey(res), null);
});

test('the final guard refuses a batch if a schema edit ever allowed an identifying prop', () => {
  const bad = JSON.parse(JSON.stringify(schema));
  bad.events.talk_submit.props.email = { type: 'string', max: 50 };
  const res = validateBatch(batch([{ n: 'talk_submit', ok: true, email: 'a@b.com' }]), { schema: bad, now: NOW });
  assert.equal(res.ok, false);
  assert.match(res.error, /identifying key/);
});

test('talk_invalid.fields may contain the words name and email: those are values, not keys', () => {
  const res = run(batch([{ n: 'talk_invalid', fields: ['name', 'email', 'goal', 'bogus'] }]));
  assert.equal(res.ok, true);
  assert.deepEqual(res.events[0].fields, ['name', 'email', 'goal']);
});

test('enum violations drop the prop, keep the event', () => {
  const res = run(batch([
    { n: 'entry_skip', from: 'nowhere', step: 0, ms: 1200 },
    { n: 'skip_reason', reason: 'because' },
    { n: 'scroll_depth', pct: 50 },
    { n: 'scroll_depth', pct: 60 }
  ]));
  assert.deepEqual(res.events[0], { n: 'entry_skip', t: NOW, q: 0, step: 0, ms: 1200 });
  assert.deepEqual(res.events[1], { n: 'skip_reason', t: NOW + 100, q: 1 }, 'optional prop failed: event kept without it');
  assert.deepEqual(res.events[2], { n: 'scroll_depth', t: NOW + 200, q: 2, pct: 50 });
  assert.equal(res.events.length, 3, 'scroll_depth with an invalid required pct is dropped as an event');
  assert.deepEqual(res.dropped, { events: 1, props: 2 });
});

test('int out of range, wrong type and non-integers are dropped', () => {
  const res = run(batch([
    { n: 'entry_skip', from: 'bar', step: 9, ms: -5 },
    { n: 'entry_skip', from: 'bar', step: 1.5, ms: 3600001 },
    { n: 'entry_skip', from: 'bar', step: '2', ms: 10 },
    { n: 'page_hide', ms: 86400000, scroll: 100, step: 8, result: 'yes' }
  ]));
  assert.deepEqual(res.events[0], { n: 'entry_skip', t: NOW, q: 0, from: 'bar' });
  assert.deepEqual(res.events[1], { n: 'entry_skip', t: NOW + 100, q: 1, from: 'bar' });
  assert.deepEqual(res.events[2], { n: 'entry_skip', t: NOW + 200, q: 2, from: 'bar', ms: 10 });
  assert.deepEqual(res.events[3], { n: 'page_hide', t: NOW + 300, q: 3, ms: 86400000, scroll: 100, step: 8 });
  assert.equal(res.dropped.props, 2 + 2 + 1 + 1);
});

test('a required int out of range drops the whole event', () => {
  const res = run(batch([{ n: 'q_view', step: 0 }, { n: 'q_view', step: 9 }, { n: 'q_view', step: 3 }]));
  assert.deepEqual(res.events.map((e) => e.step), [3]);
  assert.equal(res.dropped.events, 2);
});

test('strings are truncated, slugs validated, arrays capped', () => {
  const long = 'a'.repeat(50);
  const res = run(batch([
    { n: 'cta_click', id: 'x'.repeat(60), host: 'App.HybridX.club' },
    { n: 'section_view', id: 'has spaces' },
    { n: 'result_view', answers: {}, primary: long, secondary: ['a', 'b', 'c', 'd'], trace: Array.from({ length: 20 }, (_, i) => 'rule:' + i) }
  ]));
  assert.equal(res.events[0].id.length, 40);
  assert.equal(res.events[0].host, 'app.hybridx.club');
  assert.equal(res.events.filter((e) => e.n === 'section_view').length, 0, 'invalid required slug drops the event');
  const rv = res.events.find((e) => e.n === 'result_view');
  assert.equal(rv.primary.length, 20);
  assert.deepEqual(rv.secondary, ['a', 'b']);
  assert.equal(rv.trace.length, 12);
  assert.deepEqual(rv.answers, {});
});

test('answers: only allowed keys and values survive', () => {
  const res = run(batch([{ n: 'result_view', primary: 'app', answers: { goal: 'first', level: 'legend', place: 'gym', obst: ['run', 'evil', 'run'], format: 'phone', race: '5-11', email: 'a@b.c', extra: 1 } }]));
  assert.deepEqual(res.events[0].answers, { goal: 'first', place: 'gym', obst: ['run'], format: 'phone', race: '5-11' });
  assert.equal(res.dropped.props, 3); // level, email, extra
  const bad = run(batch([{ n: 'result_view', primary: 'app', answers: 'first' }]));
  assert.equal(bad.events.length, 0, 'answers is required and must be an object');
});

test('q_answer value depends on key: option id, obst array, race bucket or scrubbed note', () => {
  const res = run(batch([
    { n: 'q_answer', step: 1, key: 'goal', value: 'nope' },
    { n: 'q_answer', step: 1, key: 'goal', value: 'ultra' },
    { n: 'q_answer', step: 3, key: 'obst', value: ['plateau', 'x'] },
    { n: 'q_answer', step: 3, key: 'obst', value: 'plateau' },
    { n: 'q_answer', step: 5, key: 'race', value: '24+' },
    { n: 'q_answer', step: 5, key: 'race', value: 'soon' },
    { n: 'q_answer', step: 5, key: 'note', value: 'x'.repeat(2000) },
    { n: 'q_answer', step: 5, key: 'note', value: ['not', 'text'] },
    { n: 'q_answer', step: 5, key: 'level', value: 'first' },
    { n: 'q_answer', step: 5, key: 'bogus', value: 'first' }
  ]));
  const vals = res.events.map((e) => e.value);
  assert.deepEqual(vals, [undefined, 'ultra', ['plateau'], undefined, '24+', undefined, 'x'.repeat(L.maxNoteChars), undefined, undefined]);
  assert.equal(res.events.length, 9, 'the event with an invalid key is dropped (key is required)');
  assert.equal(res.dropped.events, 1);
});

test('oversize body is refused, as string and as object', () => {
  const big = JSON.stringify(batch([{ n: 'q_answer', step: 5, key: 'note', value: 'x'.repeat(L.maxBodyBytes) }]));
  const a = run(big);
  assert.deepEqual([a.ok, a.error], [false, 'body too large']);
  const b = run(JSON.parse(big));
  assert.deepEqual([b.ok, b.error], [false, 'body too large']);
  // multi-byte characters count as bytes, not characters
  const emoji = JSON.stringify(batch([{ n: 'q_answer', step: 5, key: 'note', value: '\u{1F3CB}'.repeat(Math.ceil(L.maxBodyBytes / 4) + 10) }]));
  assert.ok(emoji.length < L.maxBodyBytes + 100);
  assert.equal(run(emoji).error, 'body too large');
});

test('too many events is refused; exactly the limit is fine', () => {
  const mk = (n) => batch(Array.from({ length: n }, () => ({ n: 'page_view' })));
  assert.equal(run(mk(L.maxBatchEvents)).ok, true);
  const over = run(mk(L.maxBatchEvents + 1));
  assert.deepEqual([over.ok, over.error], [false, 'too many events']);
});

test('malformed JSON and non-object bodies are refused without throwing', () => {
  for (const body of ['{"v":1,', '', 'null', '[]', '"text"', '12', 'undefined', null, undefined, 5, [], () => 1]) {
    const res = run(body);
    assert.equal(res.ok, false, String(body));
    assert.equal(typeof res.error, 'string');
  }
  assert.equal(run('{"v":1,').error, 'malformed json');
  assert.equal(run(Buffer.from(JSON.stringify(batch([{ n: 'page_view' }])))).ok, true, 'Buffers are accepted');
});

test('cyclic objects do not throw', () => {
  const o = batch([{ n: 'page_view' }]);
  o.self = o;
  assert.equal(run(o).ok, false);
});

test('wrong or missing version is refused', () => {
  for (const v of [2, 0, '1', null, undefined, 1.5]) {
    const body = batch([{ n: 'page_view' }]);
    body.v = v;
    const res = run(body);
    assert.deepEqual([res.ok, res.error], [false, 'unsupported version'], String(v));
  }
});

test('bad session ids are refused', () => {
  for (const sid of ['short', 'x'.repeat(41), 'UPPERCASE_SID_0001', 'has space in sid', 'dots.are.not.ok', 'emoji-\u{1F3CB}-aaaaaaa', 12345678901234, null, undefined, '']) {
    const res = run(batch([{ n: 'page_view' }], { sid }));
    assert.deepEqual([res.ok, res.error], [false, 'invalid sid'], String(sid));
  }
  assert.equal(run(batch([{ n: 'page_view' }], { sid: 'a'.repeat(12) })).ok, true);
  assert.equal(run(batch([{ n: 'page_view' }], { sid: 'a_b-'.repeat(10) })).ok, true);
});

test('missing ctx, non-array events and empty batches are refused', () => {
  assert.equal(run(batch([{ n: 'page_view' }], { ctx: undefined })).error, 'missing ctx');
  assert.equal(run(batch([{ n: 'page_view' }], { ctx: 'x' })).error, 'missing ctx');
  assert.equal(run(batch([{ n: 'page_view' }], { events: {} })).error, 'events must be an array');
  assert.equal(run(batch([])).error, 'no events');
});

test('ctx.path: query string and hash are stripped, non-paths dropped', () => {
  const paths = {
    '/plan-finder?utm_source=x&email=a@b.com#step-3': '/plan-finder',
    '/#faq': '/',
    '/a/b/?q=1': '/a/b/',
    ['/' + 'p'.repeat(200)]: '/' + 'p'.repeat(119)
  };
  for (const [input, want] of Object.entries(paths)) {
    const res = run(batch([{ n: 'page_view' }], { ctx: { path: input } }));
    assert.equal(res.ctx.path, want, input.slice(0, 30));
  }
  for (const bad of ['plan-finder', 'https://hybridx.club/x', '?x=1', '/has space', 5]) {
    const res = run(batch([{ n: 'page_view' }], { ctx: { path: bad } }));
    assert.equal('path' in res.ctx, false, String(bad));
    assert.equal(res.dropped.props, 1);
  }
});

test('ctx.ref: a full URL is reduced to a lowercase hostname', () => {
  const refs = {
    'https://www.Google.com/search?q=hyrox+plan&email=a@b.com#x': 'www.google.com',
    'http://l.instagram.com:8080/?u=1': 'l.instagram.com',
    'Reddit.com': 'reddit.com',
    'https://user:pw@example.org/path': 'example.org',
    'android-app://com.google.android.gm': 'com.google.android.gm'
  };
  for (const [input, want] of Object.entries(refs)) {
    assert.equal(run(batch([{ n: 'page_view' }], { ctx: { ref: input } })).ctx.ref, want, input);
  }
  for (const bad of ['has space.com', 'https://bad host/x', 'not_a_host!', '[::1]', 'a'.repeat(101) + '.com', 42]) {
    const res = run(batch([{ n: 'page_view' }], { ctx: { ref: bad } }));
    assert.equal('ref' in res.ctx, false, String(bad));
  }
  // direct traffic: empty referrer is simply omitted, not counted as dropped
  const direct = run(batch([{ n: 'page_view' }], { ctx: { ref: '' } }));
  assert.equal('ref' in direct.ctx, false);
  assert.equal(direct.dropped.props, 0);
});

test('ctx.utm: only the five known keys with slug-ish values survive', () => {
  const res = run(batch([{ n: 'page_view' }], {
    ctx: {
      utm: {
        utm_source: 'Instagram', utm_medium: 'social', utm_campaign: 'spring launch', utm_content: 'a@b.com', utm_term: 'x'.repeat(61),
        utm_id: 'nope', gclid: 'abc', fbclid: 'def'
      }
    }
  }));
  assert.deepEqual(res.ctx.utm, { utm_source: 'instagram', utm_medium: 'social', utm_campaign: 'spring-launch' });
  const none = run(batch([{ n: 'page_view' }], { ctx: { utm: { gclid: 'abc' } } }));
  assert.equal('utm' in none.ctx, false);
  assert.equal(run(batch([{ n: 'page_view' }], { ctx: { utm: 'utm_source=x' } })).dropped.props, 1);
});

test('ctx: unknown keys, bad enums and slugs are dropped', () => {
  const res = run(batch([{ n: 'page_view' }], { ctx: { site: '1.0.0', route: 'bad slug', mode: 'popup', variant: 'B', vw: 'watch', lang: 'en-GB', screen: '1x1', title: 'x' } }));
  assert.deepEqual(res.ctx, { site: '1.0.0', variant: 'B', lang: 'en-GB' });
  assert.equal(res.dropped.props, 5);
});

test('clock skew: t further than clockSkewMs from now is replaced with now and flagged', () => {
  const day = L.clockSkewMs;
  const res = run(batch([
    { n: 'page_view', t: NOW + 5000 - day - 1 },
    { n: 'page_view', t: NOW + 5000 + day + 1 },
    { n: 'page_view', t: NOW + 5000 - day },
    { n: 'page_view', t: NOW + 5000 + 1000 }
  ]));
  assert.deepEqual(res.events.map((e) => e.t), [NOW + 5000, NOW + 5000, NOW + 5000 - day, NOW + 6000]);
  assert.equal(res.skewed, true);
  assert.equal(res.dropped.events, 0);
  assert.equal(run(batch([{ n: 'page_view' }])).skewed, false);
});

test('q falls back to the position in the batch when missing or invalid', () => {
  const res = run(batch([{ n: 'page_view', q: undefined }, { n: 'page_view', q: -1 }, { n: 'page_view', q: 'x' }, { n: 'page_view', q: 7 }]));
  assert.deepEqual(res.events.map((e) => e.q), [0, 1, 2, 7]);
});

test('bad input never throws', () => {
  const junk = [{ v: 1, sid: SID, ctx: {}, events: [null, 1, 'x', [], { n: null }, { n: 'q_answer', t: NOW, key: {}, value: {} }] },
    { v: 1, sid: SID, ctx: { path: {}, ref: [], utm: [] }, events: [{ n: 'result_view', t: NOW, answers: { obst: 'x', goal: {} }, primary: {}, trace: 'x', secondary: 5 }] },
    { v: 1, sid: SID, ctx: {}, events: [{ n: 'talk_invalid', t: NOW, fields: { length: 1e9 } }] }];
  for (const j of junk) {
    const res = run(j);
    assert.equal(typeof res.ok, 'boolean');
  }
  assert.equal(validateBatch('{}', null).ok, false);
  assert.equal(validateBatch(batch([{ n: 'page_view', t: 1 }])).ok, true, 'no opts: defaults to schema and Date.now, skewed t replaced');
});

// ---------------------------------------------------------------------------------------------
// Schema-driven coverage: samples are generated FROM events.schema.json
// ---------------------------------------------------------------------------------------------

const AV = schema.answerValues;
function sampleValue(spec, key, variantIndex) {
  const pick = (arr) => arr[Math.min(variantIndex || 0, arr.length - 1)];
  switch (spec.type) {
    case 'enum': return pick(spec.values);
    case 'int': return variantIndex ? spec.max : spec.min;
    case 'bool': return variantIndex ? false : true;
    case 'string': return 'sample';
    case 'slug': return 'sample-1';
    case 'path': return '/sample';
    case 'hostname': return 'sample.example.com';
    case 'note': return 'a short note';
    case 'enumArray': return spec.values.slice(0, spec.max || L.maxArrayItems);
    case 'stringArray': return ['rule:a', 'rule-b'];
    case 'answers': return { goal: AV.goal[0], level: AV.level[0], place: AV.place[0], obst: AV.obst.slice(0, 2), format: AV.format[0], race: AV.race[0] };
    case 'valueOrNote':
      if (key === 'note') return 'I want to finish my first Hyrox in under two hours';
      if (key === 'obst') return AV.obst.slice(0, 2);
      return AV[key][0];
    default: throw new Error('sample missing for type ' + spec.type);
  }
}
// One valid event using every prop of the event; `variantIndex` moves enums/ints/bools to other values.
function sampleEvent(name, variantIndex) {
  const e = { n: name, t: NOW };
  const props = schema.events[name].props;
  for (const [k, spec] of Object.entries(props)) {
    if (spec.type !== 'valueOrNote') e[k] = sampleValue(spec, null, variantIndex);
  }
  for (const [k, spec] of Object.entries(props)) {
    if (spec.type === 'valueOrNote') e[k] = sampleValue(spec, e.key, variantIndex);
  }
  return e;
}

test('every event and every prop in events.schema.json is accepted by a generated valid event', () => {
  const names = Object.keys(schema.events);
  assert.ok(names.length >= 20);
  const res = run(batch(names.map((n) => sampleEvent(n, 0)), {}));
  // 50 event limit is not an issue for the current schema; guard it so the test fails loudly if it grows
  assert.ok(names.length <= L.maxBatchEvents);
  assert.equal(res.ok, true, res.error);
  assert.deepEqual(res.dropped, { events: 0, props: 0 });
  assert.equal(res.events.length, names.length);
  res.events.forEach((e, i) => {
    const want = Object.keys(schema.events[names[i]].props);
    assert.equal(e.n, names[i]);
    for (const p of want) assert.ok(p in e, names[i] + '.' + p + ' should be stored');
    assert.deepEqual(Object.keys(e).filter((k) => !['n', 't', 'q'].includes(k)).sort(), want.slice().sort());
  });
});

test('every enum value, int bound and bool value in the schema is accepted', () => {
  let checked = 0;
  for (const [name, def] of Object.entries(schema.events)) {
    for (const [prop, spec] of Object.entries(def.props)) {
      const variants = [];
      if (spec.type === 'enum') spec.values.forEach((v) => variants.push(v));
      if (spec.type === 'int') { variants.push(spec.min); variants.push(spec.max); }
      if (spec.type === 'bool') variants.push(true, false);
      if (spec.type === 'enumArray') spec.values.forEach((v) => variants.push([v]));
      for (const value of variants) {
        const e = sampleEvent(name, 0);
        e[prop] = value;
        if (name === 'q_answer' && prop === 'key') e.value = sampleValue(def.props.value, value);
        const res = run(batch([e]));
        assert.equal(res.events.length, 1, name + '.' + prop + '=' + JSON.stringify(value));
        assert.deepEqual(res.events[0][prop], value, name + '.' + prop);
        assert.equal(res.dropped.props, 0, name + '.' + prop + '=' + JSON.stringify(value));
        checked++;
      }
      // the value just past each bound is refused
      if (spec.type === 'int') {
        for (const bad of [spec.min - 1, spec.max + 1]) {
          const e = sampleEvent(name, 0);
          e[prop] = bad;
          const res = run(batch([e]));
          assert.equal(res.events[0] ? prop in res.events[0] : false, false, name + '.' + prop + '=' + bad + ' must not be stored');
        }
      }
    }
  }
  assert.ok(checked > 80);
});

test('ctx fields in the schema are all accepted with valid samples', () => {
  const ctx = {};
  for (const [k, spec] of Object.entries(schema.ctx)) {
    ctx[k] = spec.type === 'utm' ? { utm_source: 'a', utm_medium: 'b', utm_campaign: 'c', utm_content: 'd', utm_term: 'e' } : sampleValue(spec, k);
  }
  const res = run(batch([{ n: 'page_view' }], { ctx }));
  assert.deepEqual(res.dropped, { events: 0, props: 0 });
  assert.deepEqual(Object.keys(res.ctx).sort(), Object.keys(schema.ctx).sort());
  for (const v of schema.ctx.mode.values) assert.equal(run(batch([{ n: 'page_view' }], { ctx: { mode: v } })).ctx.mode, v);
  for (const v of schema.ctx.variant.values) assert.equal(run(batch([{ n: 'page_view' }], { ctx: { variant: v } })).ctx.variant, v);
  for (const v of schema.ctx.vw.values) assert.equal(run(batch([{ n: 'page_view' }], { ctx: { vw: v } })).ctx.vw, v);
});

test('the validator uses the schema it is given (data-driven), not a hard-coded list', () => {
  const custom = JSON.parse(JSON.stringify(schema));
  custom.events.new_thing = { props: { size: { type: 'enum', values: ['s', 'm'], required: true } } };
  delete custom.events.page_view;
  custom.limits.maxBatchEvents = 2;
  const ok = validateBatch(batch([{ n: 'new_thing', size: 'm' }, { n: 'page_view' }]), { schema: custom, now: NOW });
  assert.deepEqual(ok.events.map((e) => e.n), ['new_thing']);
  assert.equal(ok.dropped.events, 1);
  assert.equal(validateBatch(batch([{ n: 'new_thing', size: 'm' }, { n: 'new_thing', size: 's' }, { n: 'new_thing', size: 's' }]), { schema: custom, now: NOW }).error, 'too many events');
  assert.equal(DEFAULT_SCHEMA.version, schema.version);
});

test('schema answerValues match funnel.json option ids exactly', () => {
  const ids = (l) => l.map((x) => x.id);
  assert.deepEqual(schema.answerValues.goal, ids(funnel.goals));
  assert.deepEqual(schema.answerValues.level, ids(funnel.levels));
  assert.deepEqual(schema.answerValues.place, ids(funnel.places));
  assert.deepEqual(schema.answerValues.obst, ids(funnel.obstacles));
  assert.deepEqual(schema.answerValues.format, ids(funnel.formats));
  assert.ok(Array.isArray(schema.answerValues.race) && schema.answerValues.race.length >= 2);
});

test('result_view.primary examples come from funnel.catalog and fit the schema limits', () => {
  const props = schema.events.result_view.props;
  const clickProps = schema.events.result_click.props;
  const catalogIds = Object.keys(funnel.catalog);
  assert.ok(catalogIds.length >= 10);
  for (const id of catalogIds) {
    assert.ok(id.length <= props.primary.max, id + ' fits result_view.primary');
    assert.ok(funnel.catalog[id].destinationType.length <= clickProps.dest.max, id + ' destinationType fits result_click.dest');
    const res = run(batch([
      { n: 'result_view', answers: {}, primary: id, secondary: [id] },
      { n: 'result_click', product: id, slot: 'primary', dest: funnel.catalog[id].destinationType }
    ]));
    assert.equal(res.events[0].primary, id);
    assert.deepEqual(res.events[0].secondary, [id]);
    assert.equal(res.events[1].product, id);
    assert.equal(res.events[1].dest, funnel.catalog[id].destinationType);
    assert.equal(res.dropped.props, 0);
  }
  // Every route() result (all trace items and products) survives the collector untouched.
  const seen = new Set();
  let maxTrace = 0;
  for (const goal of schema.answerValues.goal) for (const level of schema.answerValues.level) for (const place of schema.answerValues.place)
    for (const format of schema.answerValues.format) for (const obst of [[], ['run'], ['options'], ['structure', 'time'], ['plateau', 'generic', 'injury']]) {
      const rr = route({ goal, level, place, format, obst });
      assert.ok(catalogIds.includes(rr.primary), 'primary in catalog: ' + rr.primary);
      rr.secondary.forEach((s) => assert.ok(catalogIds.includes(s)));
      maxTrace = Math.max(maxTrace, rr.trace.length);
      rr.trace.forEach((t) => seen.add(t));
    }
  assert.ok(maxTrace <= props.trace.max);
  const tr = [...seen];
  assert.ok(tr.length > 10);
  const res = run(batch([{ n: 'result_view', answers: {}, primary: 'home', trace: tr.slice(0, props.trace.max) }]));
  assert.deepEqual(res.events[0].trace, tr.slice(0, props.trace.max), 'routing trace items (which contain ":") pass unchanged');
  tr.forEach((t) => assert.ok(t.length <= props.trace.itemMax, t));
});

// ---------------------------------------------------------------------------------------------
// scrubText
// ---------------------------------------------------------------------------------------------

test('scrubText table', () => {
  const table = [
    ['jo.bloggs@example.com', '[email]'],
    ['Mail JO+hyrox@Example.co.uk now', 'Mail [email] now'],
    ['Call +44 7700 900123 tomorrow', 'Call [number] tomorrow'],
    ['Call +44 (0)7700 900 123', 'Call [number]'],
    ['My mobile is 07700 900123.', 'My mobile is [number].'],
    ['07700-900-123', '[number]'],
    ['07700.900.123', '[number]'],
    ['landline (020) 7946 0958', 'landline [number]'],
    ['ref 123456 please', 'ref [number] please'],
    ['I live in M1 1AE', 'I live in [postcode]'],
    ['postcode ta1 1aa, thanks', 'postcode [postcode], thanks'],
    ['SW1A 2AA and EC1A1BB', '[postcode] and [postcode]'],
    ['see https://hybridx.club/plans?x=1 for more', 'see [link] for more'],
    ['see http://example.com.', 'see [link].'],
    ['www.myblog.co.uk/hyrox', '[link]'],
    ['instagram.com/jonlee is mine', '[link] is mine'],
    ['follow me @jon_lee please', 'follow me [handle] please'],
    ['DM @jon.lee.', 'DM [handle].'],
    ['  lots   of\n\tspace  ', 'lots of space'],
    ['a\u0000b\u0007c', 'a b c'],
    ['5k in 22 minutes, race in 12 weeks', '5k in 22 minutes, race in 12 weeks'],
    ['Squat 100kg, run 5km, 3x10 at 80kg', 'Squat 100kg, run 5km, 3x10 at 80kg'],
    ['I am Sam Smith and I train 4 days a week', 'I am Sam Smith and I train 4 days a week'],
    ['Aiming for 1:30:00 on 12/10, PB 4.5 min/km', 'Aiming for 1:30:00 on 12/10, PB 4.5 min/km'],
    ['12345 is not long enough', '12345 is not long enough'],
    ['', ''],
    [null, ''],
    [12345, ''],
    ['jo@example.com, 07700 900123, M1 1AE, www.x.com/y, @jo', '[email], [number], [postcode], [link], [handle]']
  ];
  assert.ok(table.length >= 12);
  for (const [input, want] of table) assert.equal(scrubText(input), want, JSON.stringify(input));
});

test('scrubText truncates at maxNoteChars and never leaves half a surrogate pair', () => {
  assert.equal(scrubText('a'.repeat(900)).length, L.maxNoteChars);
  assert.equal(scrubText('a'.repeat(50), 10), 'a'.repeat(10));
  const cut = scrubText('\u{1F3CB}'.repeat(400), 11);
  assert.doesNotMatch(cut, /[\uD800-\uDBFF]$/);
  assert.ok(cut.length <= 11);
  // scrubbing happens before truncation, so an email straddling the limit is not half-kept
  const t = scrubText('x'.repeat(490) + ' me@example.com', 500);
  assert.match(t, /\[email\]$/);
});

test('notes stored through validateBatch are scrubbed and capped', () => {
  const res = run(batch([{ n: 'q_answer', step: 5, key: 'note', value: 'x'.repeat(480) + ' mail me@example.com or 07700 900123' + 'y'.repeat(500), ms: 100 }]));
  const v = res.events[0].value;
  assert.ok(v.length <= L.maxNoteChars);
  assert.doesNotMatch(v, /@|07700/);
  const empty = run(batch([{ n: 'q_answer', step: 5, key: 'note', value: '   ', ms: 100 }]));
  assert.equal('value' in empty.events[0], false);
});

test('IDENTIFYING_KEYS lists the never-store names and findIdentifyingKey finds them anywhere', () => {
  assert.deepEqual(IDENTIFYING_KEYS.slice().sort(), ['email', 'ip', 'message', 'msg', 'name', 'phone', 'ua', 'userAgent']);
  assert.equal(findIdentifyingKey({ a: [{ b: { Email: 1 } }] }), '$.a[0].b.Email');
  assert.equal(findIdentifyingKey({ a: { fields: ['name'] } }), null, 'values are not keys');
  assert.equal(findIdentifyingKey(null), null);
});
