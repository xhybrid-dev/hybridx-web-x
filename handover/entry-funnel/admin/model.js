/*
 * Shared constants and tiny helpers for the admin analytics (rollup.js, report.js, insights.js).
 * Pure, no I/O.
 */
'use strict';

const STEP_NAMES = ['Goal', 'Starting point', 'What got in the way', 'How you train', 'Anything else'];
const STEPS = [1, 2, 3, 4, 5];

// Histogram buckets. Order matters: medians and percentiles walk this list, never object key order
// (Firestore and JSON round trips do not preserve it).
const TIME_BUCKETS = ['0-5s', '5-15s', '15-30s', '30-60s', '60-120s', '120s+'];
const TIME_EDGES_S = [5, 15, 30, 60, 120];
const VISIBLE_BUCKETS = ['0-10s', '10-30s', '30-60s', '1-3m', '3-10m', '10m+'];
const VISIBLE_EDGES_S = [10, 30, 60, 180, 600];
const BUCKETS = { timeOnStep: TIME_BUCKETS, timeToResult: TIME_BUCKETS, visibleTime: VISIBLE_BUCKETS };

/** Bucket label for a duration in ms. */
function bucketFor(ms, labels, edgesSeconds) {
  for (let i = 0; i < edgesSeconds.length; i++) if (ms < edgesSeconds[i] * 1000) return labels[i];
  return labels[labels.length - 1];
}

/**
 * Turn a data value into a safe map key for a rollup doc: capped at 60 chars, and a leading "__"
 * (reserved in Firestore, and "__proto__" in JS) gets one more underscore in front.
 * Keys in value-keyed maps ARE data values: viewport "phone", format id "phone", talk field "email".
 * They are counts of a category, not properties of a person.
 */
function mapKey(v) {
  const k = String(v).slice(0, 60);
  return k.slice(0, 2) === '__' ? '_' + k : k;
}

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
/** Safe division: null when the denominator is zero. */
const div = (a, b) => (b > 0 ? a / b : null);
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

module.exports = { STEP_NAMES, STEPS, TIME_BUCKETS, VISIBLE_BUCKETS, BUCKETS, TIME_EDGES_S, VISIBLE_EDGES_S, bucketFor, mapKey, num, div, isObj };
