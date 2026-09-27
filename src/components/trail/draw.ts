/*
 * Drawing for the Trail page's canvases: the watch's map screen and the
 * topographic backdrop.
 *
 * The map screen is a port of the promo film's concept design
 * (promo/lib/ui-trail.mjs, mapScreen and bannerBand): a 240 x 240 round
 * screen in the watch's colours — the line ahead in ORCHID, the line behind in
 * PURPLE, the start in CHARTREUSE, you as a white arrow, north in red, and the
 * off-course banner in amber. It's a concept: the app's real screens are
 * phase T3 of the brief, and the page says so.
 */

import type { Contours } from '@/lib/trail-terrain';
import { pointAt, slice, type LocalRoute } from '@/lib/trail-route';

export const COLOUR = {
  line: '#FF55FF', // ORCHID: the line to follow
  done: '#AA00AA', // PURPLE: the line behind you
  start: '#55FF00', // CHARTREUSE
  amber: '#FFAA00', // YELLOW_DARK: off course, and the R2 button hint
  red: '#FF0000',
  gray: '#AAAAAA',
  grayDark: '#555555',
};

export interface MapState {
  /** Where you are, metres along the route (for done/ahead). */
  along: number;
  /** Your position, when it isn't on the line (wandering). */
  you?: [number, number];
  /** Radians, 0 north, clockwise. Defaults to the route's heading there. */
  heading?: number;
  headingUp: boolean;
  /** Metres shown across 100 px (the screen's safe radius); 0 = whole route. */
  radiusM: number;
  scaleLabel: string;
  scaleM: number;
  toGoM?: number;
  banner?: 'off' | 'back' | null;
  bannerP?: number;
  offByM?: number;
  font: string;
}

function arcHint(ctx: CanvasRenderingContext2D, from: number, to: number, colour: string) {
  ctx.beginPath();
  ctx.arc(120, 120, 111, (from * Math.PI) / 180, (to * Math.PI) / 180);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** Draws the map screen into a 240 x 240 space (scale the context first). */
export function drawWatchMap(ctx: CanvasRenderingContext2D, route: LocalRoute, s: MapState) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(120, 120, 120, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 240, 240);

  const here = pointAt(route, s.along);
  const whole = s.radiusM <= 0;
  let centre: [number, number];
  let k: number;
  let th: number;
  if (whole) {
    // The whole route, fitted like the SDK's track overview, north up.
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const [x, y] of route.pts) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    centre = [(x0 + x1) / 2, (y0 + y1) / 2];
    k = 150 / Math.max(x1 - x0, y1 - y0, 1);
    th = 0;
  } else {
    centre = s.you ?? [here.x, here.y];
    k = 100 / s.radiusM;
    th = s.headingUp ? (s.heading ?? here.heading) : 0;
  }
  const cth = Math.cos(th);
  const sth = Math.sin(th);
  const toScr = (x: number, y: number): [number, number] => {
    const dx = (x - centre[0]) * k;
    const dy = (y - centre[1]) * k;
    return [120 + (dx * cth - dy * sth), 120 - (dx * sth + dy * cth)];
  };

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const stroke = (pts: [number, number][], colour: string, w: number) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const [X, Y] = toScr(x, y);
      if (i) ctx.lineTo(X, Y);
      else ctx.moveTo(X, Y);
    });
    ctx.stroke();
  };
  stroke(slice(route, 0, s.along), COLOUR.done, 4);
  stroke(slice(route, s.along, route.length), COLOUR.line, 4);

  // Start / finish ring.
  const [sx, sy] = toScr(route.pts[0][0], route.pts[0][1]);
  ctx.beginPath();
  ctx.arc(sx, sy, 7, 0, Math.PI * 2);
  ctx.strokeStyle = COLOUR.start;
  ctx.lineWidth = 3;
  ctx.stroke();

  // You: a white arrow pointing the way you face.
  const youPos = s.you ?? [here.x, here.y];
  const heading = s.heading ?? here.heading;
  const [ux, uy] = toScr(youPos[0], youPos[1]);
  ctx.save();
  ctx.translate(ux, uy);
  ctx.rotate(whole || !s.headingUp ? heading : 0);
  const a = whole ? 0.7 : 1;
  ctx.scale(a, a);
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(8, 8);
  ctx.lineTo(0, 4);
  ctx.lineTo(-8, 8);
  ctx.closePath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();

  // North: an "N" on the edge of the disc.
  const nx = 120 - sth * 92;
  const ny = 120 - cth * 92;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(nx, ny, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOUR.red;
  ctx.font = `600 18px ${s.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', nx, ny + 1);

  // Distance to go at the top, the scale at the bottom.
  ctx.textBaseline = 'alphabetic';
  if (s.toGoM != null) {
    ctx.fillStyle = '#fff';
    ctx.font = `500 17px ${s.font}`;
    ctx.fillText(`${(s.toGoM / 1000).toFixed(1)} km to go`, 120, 62);
  }
  if (!whole) {
    const px = s.scaleM * k;
    if (px < 170) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(120 - px / 2, 204, px, 3);
      ctx.fillRect(120 - px / 2, 199, 2, 8);
      ctx.fillRect(120 + px / 2 - 2, 199, 2, 8);
    }
  }
  ctx.fillStyle = COLOUR.gray;
  ctx.font = `400 13px ${s.font}`;
  ctx.fillText(s.scaleLabel, 120, 194);

  // The off-course / back-on-course banner.
  const p = s.bannerP ?? 1;
  if (s.banner && p > 0) {
    const h = 70 * Math.min(1, p);
    ctx.fillStyle = s.banner === 'off' ? COLOUR.amber : COLOUR.line;
    ctx.fillRect(0, 120 - h / 2, 240, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 120 - h / 2, 240, h);
    ctx.clip();
    ctx.fillStyle = '#000';
    if (s.banner === 'off') {
      ctx.font = `600 23px ${s.font}`;
      ctx.fillText('Off course', 120, 116);
      ctx.font = `500 16px ${s.font}`;
      ctx.fillText(`${Math.round(s.offByM ?? 0)} m from the line`, 120, 140);
    } else {
      ctx.font = `600 22px ${s.font}`;
      ctx.fillText('Back on course', 120, 128);
    }
    ctx.restore();
  }

  // The SDK's button hints: white for L1, L2 and R1, amber for R2.
  arcHint(ctx, -40, -24, '#fff');
  arcHint(ctx, 22, 38, COLOUR.amber);
  arcHint(ctx, 204, 220, '#fff');
  arcHint(ctx, 142, 158, '#fff');
  ctx.restore();
}

/** Contour lines, transformed from metres to canvas pixels. */
export function drawContours(
  ctx: CanvasRenderingContext2D,
  c: Contours,
  toPx: (x: number, y: number) => [number, number],
  minor = 'rgba(155, 161, 168, 0.13)',
  index = 'rgba(155, 161, 168, 0.26)',
) {
  const pass = (segs: Float32Array, colour: string, w: number) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (let i = 0; i < segs.length; i += 4) {
      const [ax, ay] = toPx(segs[i], segs[i + 1]);
      const [bx, by] = toPx(segs[i + 2], segs[i + 3]);
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }
    ctx.stroke();
  };
  pass(c.minor, minor, 1);
  pass(c.index, index, 1.4);
}

/** A glowing polyline, as the films draw the route. */
export function glowLine(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  toPx: (x: number, y: number) => [number, number],
  colour: string,
  width: number,
  glow = 18,
) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const [X, Y] = toPx(x, y);
    if (i) ctx.lineTo(X, Y);
    else ctx.moveTo(X, Y);
  });
  ctx.shadowColor = colour;
  ctx.shadowBlur = glow;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1, width * 0.45);
  ctx.strokeStyle = '#ffd6ff';
  ctx.globalAlpha = 0.7;
  ctx.stroke();
  ctx.restore();
}

/** Sets a canvas's backing store to its CSS size times the device pixel ratio. */
export function fitCanvas(canvas: HTMLCanvasElement, maxDpr = 2) {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { w, h, dpr };
}
