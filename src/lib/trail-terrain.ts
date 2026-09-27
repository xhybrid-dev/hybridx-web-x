/*
 * src/lib/trail-terrain.ts
 *
 * The made-up landscape of the Trail page: a height field, its contour lines
 * and the "Ridge loop", a 14.2 km horseshoe across it. Ported from the promo
 * film's promo/lib/terrain.mjs and promo/lib/core.mjs (noise, fbm) so the page
 * and the film "Follow the line" show the same hills and the same route.
 *
 * Deterministic: the same numbers on the server, in every browser, every time.
 * The route is fictional; it is a demo, not a real place.
 */

import { fromMetres, type LocalRoute } from './trail-route';

const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** mulberry32, as the film seeds its noise. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PERM = (() => {
  const r = rng(1729);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return Uint8Array.from([...p, ...p]);
})();

const GRAD = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071],
];
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export function noise2(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const X = xi & 255;
  const Y = yi & 255;
  const g = (ix: number, iy: number, dx: number, dy: number) => {
    const v = GRAD[PERM[PERM[ix] + iy] & 7];
    return v[0] * dx + v[1] * dy;
  };
  const u = fade(xf);
  const v = fade(yf);
  return lerp(lerp(g(X, Y, xf, yf), g(X + 1, Y, xf - 1, yf), u), lerp(g(X, Y + 1, xf, yf - 1), g(X + 1, Y + 1, xf - 1, yf - 1), u), v);
}

function fbm(x: number, y: number, octaves = 4, lac = 2, gain = 0.5) {
  let a = 1;
  let f = 1;
  let s = 0;
  let n = 0;
  for (let i = 0; i < octaves; i++) {
    s += a * noise2(x * f, y * f);
    n += a;
    a *= gain;
    f *= lac;
  }
  return s / n;
}

/** Height in metres at (x east, y north), metres from the map's centre. */
export function height(x: number, y: number) {
  const u = x / 3800 + 11.3;
  const v = y / 3800 + 4.7;
  let h = fbm(u, v, 5, 2, 0.5);
  const ridge = Math.exp(-Math.pow((x * 0.6 - y * 0.8 - 400) / 2600, 2));
  h = 330 + h * 520 + ridge * 280 + noise2(x / 900 + 3, y / 900 - 7) * 35;
  return h;
}

// ── Contours (marching squares) over a box ───────────────────────────────

export interface Contours {
  /** Segments as x0, y0, x1, y1 in metres. */
  minor: Float32Array;
  /** Every 100 m: drawn heavier. */
  index: Float32Array;
}

export function contours(x0: number, y0: number, x1: number, y1: number, cell = 60, step = 25): Contours {
  const nx = Math.ceil((x1 - x0) / cell);
  const ny = Math.ceil((y1 - y0) / cell);
  const H = new Float32Array((nx + 1) * (ny + 1));
  let lo = Infinity;
  let hi = -Infinity;
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const v = height(x0 + i * cell, y0 + j * cell);
      H[j * (nx + 1) + i] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  const minor: number[] = [];
  const index: number[] = [];
  const at = (i: number, j: number) => H[j * (nx + 1) + i];
  for (let level = Math.ceil(lo / step) * step; level <= hi; level += step) {
    const out = level % 100 === 0 ? index : minor;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const a = at(i, j);
        const b = at(i + 1, j);
        const c = at(i + 1, j + 1);
        const d = at(i, j + 1);
        const code = (a > level ? 1 : 0) | (b > level ? 2 : 0) | (c > level ? 4 : 0) | (d > level ? 8 : 0);
        if (code === 0 || code === 15) continue;
        const X = x0 + i * cell;
        const Y = y0 + j * cell;
        const e = (p: number, q: number) => (level - p) / (q - p);
        const top = [X + e(a, b) * cell, Y];
        const right = [X + cell, Y + e(b, c) * cell];
        const bottom = [X + e(d, c) * cell, Y + cell];
        const left = [X, Y + e(a, d) * cell];
        const seg = (p: number[], q: number[]) => out.push(p[0], p[1], q[0], q[1]);
        switch (code) {
          case 1: case 14: seg(left, top); break;
          case 2: case 13: seg(top, right); break;
          case 3: case 12: seg(left, right); break;
          case 4: case 11: seg(right, bottom); break;
          case 5: seg(left, top); seg(right, bottom); break;
          case 6: case 9: seg(top, bottom); break;
          case 7: case 8: seg(left, bottom); break;
          case 10: seg(top, right); seg(left, bottom); break;
          default: break;
        }
      }
    }
  }
  return { minor: Float32Array.from(minor), index: Float32Array.from(index) };
}

// ── The Ridge loop ────────────────────────────────────────────────────────

type P = [number, number];

function resample(pts: P[], step: number): P[] {
  const out: P[] = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    let pos = step - carry;
    while (pos <= seg) {
      const f = pos / seg;
      out.push([x0 + (x1 - x0) * f, y0 + (y1 - y0) * f]);
      pos += step;
    }
    carry = seg - (pos - step);
  }
  return out;
}

function catmull(p0: P, p1: P, p2: P, p3: P, t: number): P {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
}

const pathLength = (pts: P[]) => pts.reduce((acc, p, i) => (i ? acc + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);

function buildRidgeLoop(): LocalRoute {
  // Out along the valley, a switchback climb, along the ridge, and home.
  const W = [[0, 0], [1.1, 0.7], [1.9, 1.9], [2.6, 2.8], [3.9, 2.6], [4.9, 1.9], [5.1, 0.7],
    [4.3, -0.4], [3.0, -1.0], [1.6, -1.1], [0.5, -0.7]].map(([x, y]) => [x * 1000 - 2500, y * 1000 - 700] as P);
  const n = W.length;
  let pts: P[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = W[(i - 1 + n) % n];
    const p1 = W[i];
    const p2 = W[(i + 1) % n];
    const p3 = W[(i + 2) % n];
    for (let k = 0; k < 60; k++) pts.push(catmull(p0, p1, p2, p3, k / 60));
  }
  pts.push(pts[0]);
  pts = resample(pts, 5);
  const L0 = pathLength(pts);
  let sAcc = 0;
  const out: P[] = [];
  for (let i = 0; i < pts.length; i++) {
    if (i) sAcc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const nxv = -dy / l;
    const nyv = dx / l;
    const f = sAcc / L0;
    const win = Math.max(0, Math.sin(Math.PI * clamp((f - 0.09) / 0.15)));
    const tri = (x: number) => (2 / Math.PI) * Math.asin(0.985 * Math.sin(2 * Math.PI * x));
    const zig = tri(sAcc / 300) * 115 * win;
    const wig = noise2(sAcc / 380, 3.3) * 70 + noise2(sAcc / 110, 8.1) * 16;
    const edge = Math.min(f, 1 - f) < 0.01 ? Math.min(f, 1 - f) / 0.01 : 1;
    out.push([pts[i][0] + nxv * (zig + wig) * edge, pts[i][1] + nyv * (zig + wig) * edge]);
  }
  pts = out;
  const k = 14200 / pathLength(pts);
  const [sx, sy] = pts[0];
  pts = pts.map(([x, y]) => [sx + (x - sx) * k, sy + (y - sy) * k] as P);
  pts = resample(pts, 10);
  const route = fromMetres(pts, 'Ridge loop');
  let ascent = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = height(pts[i][0], pts[i][1]) - height(pts[i - 1][0], pts[i - 1][1]);
    if (d > 0) ascent += d;
  }
  route.ascentM = Math.round(ascent);
  return route;
}

/** The film's route, in metres from the map's centre (x east, y north). */
export const RIDGE_LOOP: LocalRoute = buildRidgeLoop();

/** The route's box, with a margin, for drawing the map around it. */
export function bounds(route: LocalRoute, margin = 0) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of route.pts) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return { x0: x0 - margin, y0: y0 - margin, x1: x1 + margin, y1: y1 + margin };
}

/** A figure of eight, for "measured along the line". Metres, 7.2 km round. */
export function figureEight(): LocalRoute {
  const pts: P[] = [];
  const n = 720;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    pts.push([1150 * Math.sin(t), 620 * Math.sin(2 * t)]);
  }
  const route = fromMetres(pts, 'Figure of eight');
  const k = 7200 / route.length;
  return fromMetres(pts.map(([x, y]) => [x * k, y * k] as P), 'Figure of eight');
}
