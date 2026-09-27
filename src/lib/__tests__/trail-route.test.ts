import { describe, expect, it } from 'vitest';
import {
  BACK_ON_COURSE_M,
  buildRoute,
  distanceM,
  distanceToSegmentM,
  locate,
  OFF_COURSE_M,
  offCourseStep,
  parseGpx,
  toLocal,
  type GpxPoint,
} from '../trail-route';
import { figureEight, RIDGE_LOOP } from '../trail-terrain';

// The same shapes the watch's host tests use (hybridx-trail/Tests/Host), so the
// page's reading of a GPX matches the watch's.

const LAT0 = 54.45;
const LON0 = -3.05;
const R = 6371000;

function offset(lat: number, lon: number, northM: number, eastM: number) {
  return {
    lat: lat + (northM / R) * (180 / Math.PI),
    lon: lon + (eastM / (R * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI),
  };
}

/** TestRoutes::loopTrack: a namespaced GPX 1.1 track round a 1.6 km circle, 80 m climb. */
function loopTrack(n = 5000, radius = 1600) {
  const out = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!-- synthetic test route: <gpx:trkpt lat="0" lon="0"> in a comment is not a point -->',
    '<gpx:gpx version="1.1" xmlns:gpx="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">',
    '<gpx:metadata><gpx:name>Metadata name wins</gpx:name></gpx:metadata>',
    '<gpx:trk><gpx:name>Not this one</gpx:name><gpx:trkseg>',
  ];
  for (let i = 0; i <= n; i++) {
    const a = (2 * Math.PI * i) / n;
    const p = offset(LAT0, LON0, radius * Math.sin(a), radius * (1 - Math.cos(a)));
    const ele = 200 + 40 * (1 - Math.cos(a));
    out.push(
      `<gpx:trkpt lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}"><gpx:ele>${ele.toFixed(1)}</gpx:ele>` +
        '<gpx:extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>150</gpxtpx:hr></gpxtpx:TrackPointExtension></gpx:extensions></gpx:trkpt>',
    );
  }
  out.push('</gpx:trkseg></gpx:trk></gpx:gpx>');
  return out.join('\n');
}

/** Tests/Host/fixtures/short_route.gpx, byte for byte in spirit: single quotes, CRLF, an entity, a waypoint. */
const SHORT_ROUTE = [
  "<?xml version='1.0' encoding='UTF-8'?>",
  "<gpx version='1.1' xmlns='http://www.topografix.com/GPX/1/1'>",
  "<wpt lat='54.46' lon='-3.05'><name>Summit cairn</name></wpt>",
  '<rte><name>Fell &amp; Back</name>',
  ...Array.from({ length: 11 }, (_, i) => {
    const p = offset(LAT0, LON0, 100 * i, 0);
    return `  <rtept lat='${p.lat.toFixed(7)}' lon='${p.lon.toFixed(7)}'></rtept>`;
  }),
  '</rte></gpx>',
].join('\r\n');

const circumference = (r: number) => 2 * Math.PI * r;

describe('parseGpx', () => {
  it('reads a namespaced track, skipping comments, with the metadata name', () => {
    const gpx = parseGpx(loopTrack());
    expect(gpx.points).toHaveLength(5001);
    expect(gpx.name).toBe('Metadata name wins');
    expect(gpx.points[0].ele).toBeCloseTo(200, 1);
    expect(gpx.points.every((p) => p.kind === 'track')).toBe(true);
  });

  it('reads an OS Maps-style route: single quotes, CRLF, entities, and ignores the waypoint', () => {
    const gpx = parseGpx(SHORT_ROUTE);
    expect(gpx.points).toHaveLength(11);
    expect(gpx.name).toBe('Fell & Back');
    expect(gpx.points[0].kind).toBe('route');
  });

  it('reads CDATA names and self-closing points', () => {
    const gpx = parseGpx(
      '<gpx><trk><name><![CDATA[Loch & Glen]]></name><trkseg><trkpt lat="54.1" lon="-3.1"/><trkpt lat="54.2" lon="-3.1"/></trkseg></trk></gpx>',
    );
    expect(gpx.name).toBe('Loch & Glen');
    expect(gpx.points).toHaveLength(2);
  });
});

describe('buildRoute (RouteBuilder)', () => {
  it('fits a loop with length and climb from every point', () => {
    const b = buildRoute(parseGpx(loopTrack()).points);
    expect(b.rawPoints).toBe(5001);
    expect(Math.abs(b.lengthM - circumference(1600))).toBeLessThan(5); // 10,053 m
    expect(b.hasElevation).toBe(true);
    expect(Math.abs(b.ascentM - 80)).toBeLessThanOrEqual(5);
    expect(Math.abs(b.descentM - 80)).toBeLessThanOrEqual(5);
    expect(b.spacingM).toBe(10);
    expect(b.points.length).toBeGreaterThan(990);
    expect(b.points.length).toBeLessThan(1010);
    expect(distanceM(b.points[0], b.points[b.points.length - 1])).toBeLessThan(1);
    for (let i = 1; i + 1 < b.points.length; i++) {
      expect(distanceM(b.points[i - 1], b.points[i])).toBeGreaterThanOrEqual(10);
    }
  });

  it('doubles the spacing to fit a long route', () => {
    const b = buildRoute(parseGpx(loopTrack()).points, 300);
    expect(b.points.length).toBeLessThanOrEqual(300);
    expect(b.points.length).toBeGreaterThan(150);
    expect(b.spacingM).toBe(40);
    expect(Math.abs(b.lengthM - circumference(1600))).toBeLessThan(5);
  });

  it('keeps the end even when it is close to the last kept point', () => {
    const pts: GpxPoint[] = [0, 30, 33].map((n) => ({ ...offset(LAT0, LON0, n, 0), kind: 'track' }));
    const b = buildRoute(pts, 10);
    expect(b.points).toHaveLength(3);
    expect(b.points[2].lat).toBe(pts[2].lat);
    expect(b.lengthM).toBe(33);
  });

  it('still ends at the end when the array is full', () => {
    const pts: GpxPoint[] = Array.from({ length: 41 }, (_, i) => ({ ...offset(LAT0, LON0, 100 * i, 0), kind: 'route' }));
    const b = buildRoute(pts, 4);
    expect(b.points.length).toBeLessThanOrEqual(4);
    expect(b.points[b.points.length - 1].lat).toBe(pts[40].lat);
    expect(b.points[0].lat).toBe(LAT0);
  });

  it('uses the first kind only', () => {
    const b = buildRoute([
      { lat: 54.45, lon: -3.05, kind: 'route' },
      { lat: 54.4501, lon: -3.05, kind: 'route' },
      { lat: 10, lon: 10, kind: 'track' },
    ]);
    expect(b.rawPoints).toBe(2);
    expect(b.ignoredPoints).toBe(1);
    expect(b.points).toHaveLength(2);
  });

  it('does not count elevation noise inside the 5 m band as climb', () => {
    const pts: GpxPoint[] = Array.from({ length: 100 }, (_, i) => ({
      lat: 54.45 + i * 0.0001,
      lon: -3.05,
      ele: 100 + (i % 2 ? 2 : -2) + (i >= 90 ? 20 : 0),
      kind: 'track',
    }));
    const b = buildRoute(pts, 100);
    expect(b.ascentM).toBe(20);
    expect(b.descentM).toBe(0);
  });
});

describe('distances', () => {
  it('measures a kilometre north as a kilometre', () => {
    expect(distanceM(offset(LAT0, LON0, 0, 0), offset(LAT0, LON0, 1000, 0))).toBeCloseTo(1000, 0);
  });

  it('measures the distance from a point to a segment', () => {
    const a = offset(LAT0, LON0, 0, 0);
    const b = offset(LAT0, LON0, 1000, 0);
    const p = offset(LAT0, LON0, 500, 60);
    expect(distanceToSegmentM(p, a, b)).toBeCloseTo(60, 0);
  });
});

describe('following the line', () => {
  it('keeps to the right leg where a figure of eight crosses itself', () => {
    const route = figureEight();
    // The crossing is at the origin, passed at the start and again half-way round.
    const early = locate(route, 0, 0, 30);
    const halfway = locate(route, 0, 0, route.length * 0.5 - 30);
    expect(early.off).toBeLessThan(1);
    expect(early.along).toBeLessThan(50);
    expect(halfway.off).toBeLessThan(1);
    expect(Math.abs(halfway.along - route.length * 0.5)).toBeLessThan(50);
  });

  it('alerts past the threshold and clears only well back inside it', () => {
    expect(offCourseStep(false, OFF_COURSE_M - 1).off).toBe(false);
    expect(offCourseStep(false, OFF_COURSE_M + 1).off).toBe(true);
    // Hovering just inside the threshold doesn't flicker the alert off...
    expect(offCourseStep(true, OFF_COURSE_M - 5).off).toBe(true);
    // ...only coming properly back does.
    expect(offCourseStep(true, BACK_ON_COURSE_M - 1).off).toBe(false);
  });

  it('turns a GPX into local metres from its start', () => {
    const b = buildRoute(parseGpx(SHORT_ROUTE).points);
    const local = toLocal(b.points, 'x');
    expect(local.pts[0]).toEqual([0, 0]);
    expect(local.length).toBeCloseTo(1000, 0);
  });
});

describe('the Ridge loop', () => {
  it('is the film’s 14.2 km loop, and closes', () => {
    expect(Math.abs(RIDGE_LOOP.length - 14200)).toBeLessThan(15);
    const [sx, sy] = RIDGE_LOOP.pts[0];
    const [ex, ey] = RIDGE_LOOP.pts[RIDGE_LOOP.pts.length - 1];
    expect(Math.hypot(ex - sx, ey - sy)).toBeLessThan(15);
  });
});
