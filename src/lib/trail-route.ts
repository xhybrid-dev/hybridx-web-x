/*
 * src/lib/trail-route.ts
 *
 * The route maths behind trail.hybridx.club, the page for HybridX Trail on UNA
 * Watch. Runs in the browser: a GPX a visitor drops on the page is read and
 * thinned here, on their own device, and never uploaded.
 *
 * Mirrors the watch app's core (hybridx-trail/Software/Libs/Core), so the page
 * shows what the watch would make of a file:
 *   - distanceM(), distanceToSegmentM(): Geo:: in GeoPoint.cpp. Flat-earth
 *     distances about the mid-latitude, Earth radius 6,371 km.
 *   - parseGpx(): GpxReader. trkpt and rtept, any namespace prefix, comments,
 *     CDATA and entities; the name is the first <name> outside a point or a
 *     waypoint.
 *   - buildRoute(): RouteBuilder. Keeps a point once it is at least the
 *     spacing from the last kept (10 m to start); when the array is full the
 *     spacing doubles and the kept points are thinned in place; the first and
 *     last points are always kept. Length, ascent and descent come from every
 *     point in the file, with a 5 m dead band on elevation. If a file holds
 *     both a track and a route, the kind that arrives first wins.
 *
 * Along-the-line progress and the off-course rule are the brief's v1
 * features (HYBRIDX_TRAIL_BRIEF.md F6, F7). The watch builds them in phase
 * T1, so their exact tuning (hysteresis, confirmation time) isn't decided
 * yet; OFF_COURSE_* below are the page's illustration of the 50 m default.
 *
 * src/lib/__tests__/trail-route.test.ts checks these against the same shapes
 * the watch's host tests use.
 */

export const EARTH_RADIUS_M = 6371000;
/** RouteBuilder::kStartSpacingM */
export const START_SPACING_M = 10;
/** The probe's route array (Tools/Probe Service.cpp kRoutePoints). */
export const ROUTE_CAPACITY = 2000;
/** RouteBuilder::kEleBandCm, in metres. */
export const ELE_BAND_M = 5;

/** The brief's default off-course threshold (F6). */
export const OFF_COURSE_M = 50;
/** Back on course once this close again: the "some hysteresis" of F6. */
export const BACK_ON_COURSE_M = 35;

/** The brief's fixed zoom scales (F4), plus the whole route. */
export const ZOOMS = [
  { id: '200m', label: '200 m', metres: 200 },
  { id: '500m', label: '500 m', metres: 500 },
  { id: '1km', label: '1 km', metres: 1000 },
  { id: '2km', label: '2 km', metres: 2000 },
  { id: 'all', label: 'Whole route', metres: 0 },
] as const;

export type PointKind = 'track' | 'route';

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface GpxPoint extends GeoPoint {
  ele?: number;
  kind: PointKind;
}

const RAD = Math.PI / 180;

/** Longitude difference in degrees, the short way round the antimeridian. */
function lonDelta(from: number, to: number) {
  let d = to - from;
  if (d > 180) d -= 360;
  else if (d < -180) d += 360;
  return d;
}

export function distanceM(a: GeoPoint, b: GeoPoint) {
  const midLat = (a.lat + b.lat) / 2;
  const dy = (b.lat - a.lat) * RAD * EARTH_RADIUS_M;
  const dx = lonDelta(a.lon, b.lon) * RAD * EARTH_RADIUS_M * Math.cos(midLat * RAD);
  return Math.hypot(dx, dy);
}

export function distanceToSegmentM(p: GeoPoint, a: GeoPoint, b: GeoPoint) {
  const sx = RAD * EARTH_RADIUS_M * Math.cos(p.lat * RAD);
  const sy = RAD * EARTH_RADIUS_M;
  const ax = lonDelta(p.lon, a.lon) * sx;
  const ay = (a.lat - p.lat) * sy;
  const bx = lonDelta(p.lon, b.lon) * sx;
  const by = (b.lat - p.lat) * sy;
  const vx = bx - ax;
  const vy = by - ay;
  const len = vx * vx + vy * vy;
  let t = 0;
  if (len > 0) t = Math.min(1, Math.max(0, -(ax * vx + ay * vy) / len));
  return Math.hypot(ax + t * vx, ay + t * vy);
}

// ── Reading a GPX ─────────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeEntities(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function textOf(inner: string) {
  const cdata = inner.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return (cdata ? cdata[1] : decodeEntities(inner.replace(/<[^>]*>/g, ''))).trim();
}

function attr(tag: string, name: string) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`));
  return m ? (m[2] ?? m[3]) : undefined;
}

export interface ParsedGpx {
  name?: string;
  points: GpxPoint[];
}

/** Reads the points and name of a GPX file, as GpxReader does. */
export function parseGpx(xml: string): ParsedGpx {
  // Comments can hold anything, including things that look like points.
  const doc = xml.replace(/<!--[\s\S]*?-->/g, '');
  const points: GpxPoint[] = [];

  const pt = /<((?:[\w.-]+:)?)(trkpt|rtept)\b([^>]*?)(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = pt.exec(doc))) {
    const [open, prefix, tag, attrs, selfClosing] = m;
    const lat = Number(attr(attrs, 'lat'));
    const lon = Number(attr(attrs, 'lon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;

    let ele: number | undefined;
    if (!selfClosing) {
      const close = doc.indexOf(`</${prefix}${tag}`, m.index + open.length);
      const inner = close > 0 ? doc.slice(m.index + open.length, close) : '';
      const e = inner.match(/<(?:[\w.-]+:)?ele\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?ele>/);
      if (e) {
        const v = Number(textOf(e[1]));
        if (Number.isFinite(v)) ele = v;
      }
    }
    points.push({ lat, lon, ele, kind: tag === 'trkpt' ? 'track' : 'route' });
  }

  // The first <name> outside a point or a waypoint, as GpxReader takes it:
  // usually the file's metadata name, else the track's or route's.
  const outside = doc
    .replace(/<((?:[\w.-]+:)?)(wpt|trkpt|rtept)\b[^>]*\/>/g, '')
    .replace(/<((?:[\w.-]+:)?)(wpt|trkpt|rtept)\b[\s\S]*?<\/\1\2>/g, '');
  const n = outside.match(/<(?:[\w.-]+:)?name\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?name>/);
  const name = n ? textOf(n[1]) : undefined;
  return { name: name || undefined, points };
}

// ── Thinning, as RouteBuilder ─────────────────────────────────────────────

export interface BuiltRoute {
  points: GeoPoint[];
  spacingM: number;
  rawPoints: number;
  ignoredPoints: number;
  lengthM: number;
  hasElevation: boolean;
  ascentM: number;
  descentM: number;
}

export function buildRoute(input: GpxPoint[], capacity = ROUTE_CAPACITY): BuiltRoute {
  const kept: GeoPoint[] = [];
  let spacing = START_SPACING_M;
  let kind: PointKind | undefined;
  let raw = 0;
  let ignored = 0;
  let length = 0;
  let last: GeoPoint | undefined;
  let lastKept = false;
  let eleSeen = false;
  let eleRef = 0;
  let ascent = 0;
  let descent = 0;

  const rethin = () => {
    do {
      if (spacing >= 32768) {
        const out = [kept[0]];
        for (let i = 2; i < kept.length; i += 2) out.push(kept[i]);
        kept.splice(0, kept.length, ...out);
        return;
      }
      spacing *= 2;
      const out = [kept[0]];
      for (let i = 1; i < kept.length; i++) {
        if (distanceM(out[out.length - 1], kept[i]) >= spacing) out.push(kept[i]);
      }
      kept.splice(0, kept.length, ...out);
    } while (kept.length === capacity);
  };

  const keep = (p: GeoPoint) => {
    if (kept.length === capacity) {
      rethin();
      if (distanceM(kept[kept.length - 1], p) < spacing) return;
    }
    kept.push(p);
    lastKept = true;
  };

  for (const p of input) {
    if (kind === undefined) kind = p.kind;
    else if (p.kind !== kind) {
      ignored++;
      continue;
    }
    if (raw > 0 && last) length += distanceM(last, p);
    raw++;

    if (p.ele !== undefined) {
      if (!eleSeen) {
        eleSeen = true;
        eleRef = p.ele;
      } else if (p.ele - eleRef >= ELE_BAND_M) {
        ascent += p.ele - eleRef;
        eleRef = p.ele;
      } else if (eleRef - p.ele >= ELE_BAND_M) {
        descent += eleRef - p.ele;
        eleRef = p.ele;
      }
    }

    const point = { lat: p.lat, lon: p.lon };
    last = point;
    lastKept = false;
    if (kept.length === 0 || distanceM(kept[kept.length - 1], point) >= spacing) keep(point);
  }

  if (raw > 1 && !lastKept && last) {
    if (kept.length === capacity) kept[kept.length - 1] = last;
    else kept.push(last);
  }

  return {
    points: kept,
    spacingM: spacing,
    rawPoints: raw,
    ignoredPoints: ignored,
    lengthM: Math.round(length),
    hasElevation: eleSeen,
    ascentM: Math.floor(ascent),
    descentM: Math.floor(descent),
  };
}

// ── A route in local metres, for drawing and following ────────────────────

export interface LocalRoute {
  name: string;
  /** Metres east and north of the route's first point. */
  pts: [number, number][];
  /** Distance along the route at each point, metres. */
  along: number[];
  length: number;
  ascentM?: number;
  /** Stats from the file, when it came from one. */
  file?: BuiltRoute;
}

export function toLocal(points: GeoPoint[], name: string, file?: BuiltRoute): LocalRoute {
  const o = points[0];
  const sy = RAD * EARTH_RADIUS_M;
  const sx = sy * Math.cos(o.lat * RAD);
  const pts = points.map((p) => [lonDelta(o.lon, p.lon) * sx, (p.lat - o.lat) * sy] as [number, number]);
  return fromMetres(pts, name, file);
}

export function fromMetres(pts: [number, number][], name: string, file?: BuiltRoute): LocalRoute {
  const along = [0];
  for (let i = 1; i < pts.length; i++) {
    along.push(along[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  return { name, pts, along, length: along[along.length - 1], ascentM: file?.ascentM, file };
}

/** The point s metres along, and the heading there (radians, 0 north, clockwise). */
export function pointAt(route: LocalRoute, s: number): { x: number; y: number; heading: number; i: number } {
  const { along, pts, length } = route;
  const clamped = Math.min(Math.max(s, 0), length);
  let lo = 0;
  let hi = along.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (along[mid] <= clamped) lo = mid;
    else hi = mid;
  }
  const f = (clamped - along[lo]) / (along[hi] - along[lo] || 1);
  const x = pts[lo][0] + (pts[hi][0] - pts[lo][0]) * f;
  const y = pts[lo][1] + (pts[hi][1] - pts[lo][1]) * f;
  // Heading smoothed over ~60 m, so it doesn't flick at each vertex.
  const a = rawAt(route, clamped - 30);
  const b = rawAt(route, clamped + 30);
  return { x, y, heading: Math.atan2(b[0] - a[0], b[1] - a[1]), i: lo };
}

function rawAt(route: LocalRoute, s: number): [number, number] {
  const { along, pts, length } = route;
  const c = Math.min(Math.max(s, 0), length);
  let lo = 0;
  let hi = along.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (along[mid] <= c) lo = mid;
    else hi = mid;
  }
  const f = (c - along[lo]) / (along[hi] - along[lo] || 1);
  return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * f, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * f];
}

/** The route's points between two distances along it. */
export function slice(route: LocalRoute, s0: number, s1: number): [number, number][] {
  const out: [number, number][] = [rawAt(route, s0)];
  for (let i = 0; i < route.pts.length; i++) {
    if (route.along[i] > s0 && route.along[i] < s1) out.push(route.pts[i]);
  }
  out.push(rawAt(route, s1));
  return out;
}

/**
 * Where a position is along the route: the nearest point on the line, looked
 * for near where you were last (within `window` metres either side), so a
 * loop that crosses itself or an out-and-back never jumps to the wrong leg.
 * With no previous position, the whole route is searched.
 */
export function locate(route: LocalRoute, x: number, y: number, lastAlong?: number, window = 400) {
  const { pts, along } = route;
  let best = Infinity;
  let bestAlong = 0;
  for (let i = 1; i < pts.length; i++) {
    if (lastAlong !== undefined && (along[i] < lastAlong - window || along[i - 1] > lastAlong + window)) continue;
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const vx = bx - ax;
    const vy = by - ay;
    const len = vx * vx + vy * vy;
    const t = len > 0 ? Math.min(1, Math.max(0, ((x - ax) * vx + (y - ay) * vy) / len)) : 0;
    const d = Math.hypot(ax + t * vx - x, ay + t * vy - y);
    if (d < best) {
      best = d;
      bestAlong = along[i - 1] + t * Math.sqrt(len);
    }
  }
  return { along: bestAlong, off: best };
}

/** The off-course alert: on past OFF_COURSE_M, off again only back inside BACK_ON_COURSE_M. */
export function offCourseStep(wasOff: boolean, offM: number) {
  if (!wasOff && offM > OFF_COURSE_M) return { off: true, changed: true };
  if (wasOff && offM < BACK_ON_COURSE_M) return { off: false, changed: true };
  return { off: wasOff, changed: false };
}

/** "10.1 km", or "850 m" under a kilometre. */
export function formatDistance(m: number, decimals = 1) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(decimals)} km`;
}
