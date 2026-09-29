/*
 * HybridX collector core. Pure functions, no I/O, no dependencies, never throws.
 *
 * validateBatch(rawBody, { schema, now }) -> { ok, error?, sid, ctx, events, dropped, skewed, receivedAt }
 *
 * Everything is driven by data/events.schema.json: event names, prop names, types, enums and
 * limits all come from the schema, so adding an event there is enough for the collector to
 * accept it. Unknown events and unknown props are dropped, never stored.
 *
 * Deliberately absent: any handling of IP address or user agent. The collector's HTTP wrapper
 * must not pass them in, and nothing here could store them (unknown props are dropped, and a
 * final guard refuses any batch that still carries an identifying key).
 *
 * Judgement calls (see also the hand-over notes):
 *  - `q` is an event-level sequence number (per page load) that the tracker sends next to `n`
 *    and `t`. It is not in the schema; if missing or invalid it falls back to the event's
 *    position in the batch.
 *  - An event that is missing a required prop (or whose required prop failed validation) is
 *    dropped as a whole and counted in dropped.events.
 *  - dropped.props counts props removed from surviving events plus removed ctx fields. Items
 *    filtered out of an array do not count; an array that ends up empty from a non-empty input does.
 *  - Hostnames and utm values longer than their max are dropped, not truncated (a cut-off
 *    hostname is misleading). Strings, slugs, paths and notes are truncated.
 */
'use strict';

const DEFAULT_SCHEMA = require('../data/events.schema.json');

// Property names that must never appear anywhere in a stored event.
const IDENTIFYING_KEYS = ['email', 'name', 'phone', 'ip', 'ua', 'userAgent', 'message', 'msg'];
const IDENT_SET = new Set(IDENTIFYING_KEYS.map((k) => k.toLowerCase()));

const SID_RE = /^[a-z0-9_-]+$/; // session id: lowercase slug, length from schema.envelope.sid
const SLUG_RE = /^[a-z0-9._-]+$/i; // slug type
const ITEM_RE = /^[a-z0-9._:-]+$/i; // stringArray items: slug plus ":" (routing trace items look like "paper:first-home-or-both")
const HOST_RE = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/; // lowercase hostname
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const UTM_MAX = 60;
const MAX_Q = 1e9;

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const NO = { ok: false };
const yes = (value) => ({ ok: true, value });

// ---------------------------------------------------------------------------------------------
// Free text scrubbing
// ---------------------------------------------------------------------------------------------

const EMAIL_RE = /[a-z0-9._%+'-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi;
const TAIL = '[^\\s<>"\'.,;:!?)\\]]'; // last char of a URL must not be trailing punctuation
const URL_RE = new RegExp(
  // http(s)://..., www...., or word.tld/path
  '\\b(?:https?:\\/\\/|www\\.)[^\\s<>"\']*' + TAIL +
  '|\\b(?:[a-z0-9-]+\\.)+[a-z]{2,}\\/(?:[^\\s<>"\']*' + TAIL + ')?' +
  // bare domains on common TLDs ("mysite.com"); deliberately short list to avoid "e.g." style false hits
  '|\\b(?:[a-z0-9-]+\\.)+(?:com|net|org|io|club|uk|me|app|dev|info|co)\\b',
  'gi'
);
// UK postcode. Inward letters exclude C I K M O V, so "5km" and "100kg" are not postcodes.
const POSTCODE_RE = /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[ABD-HJLNP-UW-Z]{2}\b/gi;
const HANDLE_RE = /(^|[^A-Za-z0-9_@.])@[A-Za-z0-9_]{2,30}(?:\.[A-Za-z0-9_]+)*/g;
// 7+ digits, allowing up to two separator chars (space ( ) . -) between digits and a leading +
const PHONE_RE = /(?:\+\s?)?\(?\d(?:[\s().-]{0,2}\d){6,}/g;
const LONG_DIGITS_RE = /\d{6,}/g;

/** Remove personal identifiers from free text. Names are deliberately left alone. */
function scrubText(s, maxChars) {
  if (typeof s !== 'string') return '';
  const max = maxChars > 0 ? maxChars : DEFAULT_SCHEMA.limits.maxNoteChars;
  let t = s
    .replace(EMAIL_RE, '[email]')
    .replace(URL_RE, '[link]')
    .replace(POSTCODE_RE, '[postcode]')
    .replace(HANDLE_RE, '$1[handle]')
    .replace(PHONE_RE, '[number]')
    .replace(LONG_DIGITS_RE, '[number]')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length > max) {
    t = t.slice(0, max);
    if (/[\uD800-\uDBFF]$/.test(t)) t = t.slice(0, -1); // do not leave half a surrogate pair
    t = t.trimEnd();
  }
  return t;
}

// ---------------------------------------------------------------------------------------------
// Per-type value cleaners. Each returns { ok:false } or { ok:true, value }.
// ---------------------------------------------------------------------------------------------

function cleanHostname(v, max) {
  if (typeof v !== 'string' || /\s/.test(v)) return NO;
  let h = v.replace(/^[a-z][a-z0-9+.-]*:\/\//i, ''); // protocol
  h = h.split(/[/?#]/)[0]; // path, query, hash
  h = h.slice(h.lastIndexOf('@') + 1); // user:pass@
  h = h.replace(/:\d*$/, '').toLowerCase(); // port
  if (!h || h.length > max || !HOST_RE.test(h)) return NO;
  return yes(h);
}

function cleanPath(v, max) {
  if (typeof v !== 'string') return NO;
  const p = v.split(/[?#]/)[0];
  if (p[0] !== '/' || /[\s\u0000-\u001f\u007f]/.test(p)) return NO;
  return yes(p.slice(0, max));
}

function cleanUtm(v) {
  if (!isObj(v)) return NO;
  const out = {};
  for (const k of UTM_KEYS) {
    if (!hasOwn(v, k) || typeof v[k] !== 'string') continue;
    const s = v[k].trim().toLowerCase().replace(/\s+/g, '-');
    if (s && s.length <= UTM_MAX && SLUG_RE.test(s)) out[k] = s;
  }
  return Object.keys(out).length ? yes(out) : NO;
}

function cleanEnumArray(v, spec, limits) {
  if (!Array.isArray(v)) return NO;
  const max = spec.max || limits.maxArrayItems;
  const out = [];
  for (const item of v) {
    if (out.length >= max) break;
    if (spec.values.indexOf(item) > -1 && out.indexOf(item) < 0) out.push(item);
  }
  return out.length || v.length === 0 ? yes(out) : NO;
}

function cleanStringArray(v, spec, limits) {
  if (!Array.isArray(v)) return NO;
  const max = spec.max || limits.maxArrayItems;
  const itemMax = spec.itemMax || limits.maxString;
  const out = [];
  for (const item of v) {
    if (out.length >= max) break;
    if (typeof item === 'string' && ITEM_RE.test(item)) out.push(item.slice(0, itemMax));
  }
  return out.length || v.length === 0 ? yes(out) : NO;
}

// The plan finder answers object. Returns { value, dropped } so bad inner keys can be counted.
function cleanAnswers(v, schema) {
  if (!isObj(v)) return NO;
  const av = schema.answerValues;
  const out = {};
  let dropped = 0;
  for (const k of Object.keys(v)) {
    if (k === 'obst') {
      const r = cleanEnumArray(v.obst, { values: av.obst, max: schema.limits.maxArrayItems }, schema.limits);
      if (r.ok) out.obst = r.value; else dropped++; // [] is kept: "nothing got in the way"
    } else if (hasOwn(av, k) && k !== 'obst') { // goal, level, place, format, race
      if (av[k].indexOf(v[k]) > -1) out[k] = v[k]; else dropped++;
    } else dropped++;
  }
  return { ok: true, value: out, dropped };
}

// q_answer.value: meaning depends on the sibling `key`.
function cleanValueOrNote(v, key, schema) {
  const av = schema.answerValues;
  if (key === 'note') {
    if (typeof v !== 'string') return NO;
    const t = scrubText(v, schema.limits.maxNoteChars);
    return t ? yes(t) : NO;
  }
  if (key === 'obst') return cleanEnumArray(v, { values: av.obst, max: schema.limits.maxArrayItems }, schema.limits);
  if (typeof key === 'string' && hasOwn(av, key) && av[key].indexOf(v) > -1) return yes(v);
  return NO;
}

// Clean one prop against its schema spec. `ctxKey` is the sibling `key` for valueOrNote.
// Returns NO / yes(value) / { ok:true, value, dropped } (answers only).
function cleanProp(spec, v, schema, ctxKey) {
  const limits = schema.limits;
  switch (spec.type) {
    case 'enum':
      return spec.values.indexOf(v) > -1 ? yes(v) : NO;
    case 'int': {
      if (typeof v !== 'number' || !Number.isSafeInteger(v)) return NO;
      if (spec.min != null && v < spec.min) return NO;
      if (spec.max != null && v > spec.max) return NO;
      return yes(v);
    }
    case 'bool':
      return typeof v === 'boolean' ? yes(v) : NO;
    case 'string': {
      if (typeof v !== 'string') return NO;
      const s = v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, spec.max || limits.maxString);
      return s ? yes(s) : NO;
    }
    case 'slug':
      return typeof v === 'string' && SLUG_RE.test(v) ? yes(v.slice(0, spec.max || limits.maxString)) : NO;
    case 'path':
      return cleanPath(v, spec.max || limits.maxString);
    case 'hostname':
      return cleanHostname(v, spec.max || limits.maxString);
    case 'utm':
      return cleanUtm(v);
    case 'note': {
      const t = typeof v === 'string' ? scrubText(v, limits.maxNoteChars) : '';
      return t ? yes(t) : NO;
    }
    case 'enumArray':
      return cleanEnumArray(v, spec, limits);
    case 'stringArray':
      return cleanStringArray(v, spec, limits);
    case 'answers':
      return cleanAnswers(v, schema);
    case 'valueOrNote':
      return cleanValueOrNote(v, ctxKey, schema);
    default:
      return NO; // unknown type in the schema: fail closed
  }
}

const isAbsent = (v) => v === undefined || v === null;

// ---------------------------------------------------------------------------------------------
// Envelope pieces
// ---------------------------------------------------------------------------------------------

// ctx: only fields listed in schema.ctx. Returns { ctx, dropped }.
function cleanCtx(raw, schema) {
  const ctx = {};
  let dropped = 0;
  for (const k of Object.keys(raw)) {
    const spec = hasOwn(schema.ctx, k) ? schema.ctx[k] : null;
    const v = raw[k];
    if (!spec) { dropped++; continue; }
    if (isAbsent(v) || (v === '' && spec.type === 'hostname')) continue; // empty referrer = direct: just omit
    const r = cleanProp(spec, v, schema);
    if (r.ok) ctx[k] = r.value; else dropped++;
  }
  return { ctx, dropped };
}

// One event. Returns null when the event is unusable, else { event, dropped, skewed }.
function cleanEvent(raw, index, schema, now) {
  if (!isObj(raw) || typeof raw.n !== 'string' || !hasOwn(schema.events, raw.n)) return null;
  if (typeof raw.t !== 'number' || !Number.isFinite(raw.t)) return null;
  const def = schema.events[raw.n];
  const propSpecs = def.props || {};

  let t = Math.round(raw.t);
  let skewed = false;
  if (Math.abs(t - now) > schema.limits.clockSkewMs) { t = now; skewed = true; }
  const q = Number.isSafeInteger(raw.q) && raw.q >= 0 && raw.q <= MAX_Q ? raw.q : index;

  const event = { n: raw.n, t, q };
  let dropped = 0;
  const deferred = [];
  for (const k of Object.keys(raw)) {
    if (k === 'n' || k === 't' || k === 'q') continue;
    if (!hasOwn(propSpecs, k)) dropped++; // unknown prop
  }
  for (const k of Object.keys(propSpecs)) {
    if (!hasOwn(raw, k) || isAbsent(raw[k])) continue;
    if (propSpecs[k].type === 'valueOrNote') { deferred.push(k); continue; } // needs the cleaned `key` first
    const r = cleanProp(propSpecs[k], raw[k], schema);
    if (!r.ok) { dropped++; continue; }
    event[k] = r.value;
    if (r.dropped) dropped += r.dropped;
  }
  for (const k of deferred) {
    const r = cleanProp(propSpecs[k], raw[k], schema, event.key);
    if (r.ok) event[k] = r.value; else dropped++;
  }
  for (const k of Object.keys(propSpecs)) {
    if (propSpecs[k].required && !hasOwn(event, k)) return null; // required prop missing or invalid
  }
  return { event, dropped, skewed };
}

// Deep scan for identifying key names. Returns the offending path or null.
function findIdentifyingKey(value, path, depth) {
  const d = depth || 0;
  const p = path || '$';
  if (d > 16 || value === null || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const f = findIdentifyingKey(value[i], p + '[' + i + ']', d + 1);
      if (f) return f;
    }
    return null;
  }
  for (const k of Object.keys(value)) {
    if (IDENT_SET.has(k.toLowerCase())) return p + '.' + k;
    const f = findIdentifyingKey(value[k], p + '.' + k, d + 1);
    if (f) return f;
  }
  return null;
}

const fail = (error) => ({ ok: false, error });

/**
 * Validate and clean one request body. rawBody may be a JSON string, a Buffer or an object.
 * opts.schema defaults to data/events.schema.json; opts.now (ms) defaults to Date.now().
 */
function validateBatch(rawBody, opts) {
  try {
    const o = opts || {};
    const schema = o.schema || DEFAULT_SCHEMA;
    const limits = schema.limits;
    const now = Number.isFinite(o.now) ? o.now : Date.now();

    // 1. Size, then parse
    let body = rawBody;
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(rawBody)) body = rawBody.toString('utf8');
    if (typeof body === 'string') {
      if (Buffer.byteLength(body, 'utf8') > limits.maxBodyBytes) return fail('body too large');
      try { body = JSON.parse(body); } catch (e) { return fail('malformed json'); }
    } else if (isObj(body)) {
      const s = JSON.stringify(body);
      if (typeof s === 'string' && Buffer.byteLength(s, 'utf8') > limits.maxBodyBytes) return fail('body too large');
    }
    if (!isObj(body)) return fail('body must be a JSON object');

    // 2. Envelope
    if (!cleanProp(schema.envelope.v, body.v, schema).ok) return fail('unsupported version');
    const sidSpec = schema.envelope.sid;
    const sid = body.sid;
    if (typeof sid !== 'string' || !SID_RE.test(sid) || sid.length < (sidSpec.min || 1) || sid.length > (sidSpec.max || 64)) {
      return fail('invalid sid');
    }
    if (!isObj(body.ctx)) return fail('missing ctx');
    if (!Array.isArray(body.events)) return fail('events must be an array');
    if (body.events.length > limits.maxBatchEvents) return fail('too many events');
    if (body.events.length === 0) return fail('no events');

    // 3. ctx and events
    const c = cleanCtx(body.ctx, schema);
    const dropped = { events: 0, props: c.dropped };
    let skewed = false;
    const events = [];
    body.events.forEach((raw, i) => {
      const r = cleanEvent(raw, i, schema, now);
      if (!r) { dropped.events++; return; }
      events.push(r.event);
      dropped.props += r.dropped;
      if (r.skewed) skewed = true;
    });

    // 4. Final guard: nothing identifying may survive (cannot happen unless the schema is edited to allow it)
    const bad = findIdentifyingKey({ ctx: c.ctx, events });
    if (bad) return fail('identifying key present: ' + bad);

    return { ok: true, sid, ctx: c.ctx, events, dropped, skewed, receivedAt: now };
  } catch (e) {
    return fail('invalid body');
  }
}

module.exports = { validateBatch, scrubText, IDENTIFYING_KEYS, findIdentifyingKey, DEFAULT_SCHEMA };
