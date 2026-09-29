/*
 * Drawing for the Trail page's canvases: the watch's map screen and the
 * topographic backdrop.
 *
 * The map screen follows HybridX Trail's real run map (hybridx-trail's
 * RouteMap.cpp and TrackScreen.cpp, and its simulator captures in
 * public/trail/screens/): a 240 x 240 round screen with the route in magenta
 * over a dim, wider line for the glow; the part behind you dimmer; a green
 * start and a red finish; you as a white arrow; a red N on the rim; "x km to
 * go" at the top and a scale bar naming a round distance at the bottom. The
 * alerts are the app's bands: yellow "Off course" with an arrow back to the
 * line, green "Back on course", magenta turn cues.
 *
 * It's drawn by the page, not captured from the watch, so fonts and spacing
 * are close rather than exact; the real screens are shown alongside.
 */

import type { Contours } from '@/lib/trail-terrain';
import { MAP_WHOLE_LEVEL, pointAt, scaleFor, slice, type LocalRoute } from '@/lib/trail-route';

export const COLOUR = {
  line: '#FF55FF', // the route ahead
  glow: '#550055', // the wider line beneath it
  done: '#AA00AA', // the route behind you
  start: '#55FF00', // green start
  finish: '#FF0000', // red finish
  off: '#FFFF00', // the off-course band
  back: '#55FF00', // "Back on course"
  amber: '#FFAA00', // the R2 button hint
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
  /** Metres from you to the edge of the screen (MapZoom); MAP_WHOLE_LEVEL-style 0 = whole route. */
  radiusM: number;
  toGoM?: number;
  /** The next turn, when within 400 m: "Right", 120. */
  turnAhead?: { name: string; inM: number } | null;
  banner?: 'off' | 'back' | 'turn' | null;
  bannerP?: number;
  offByM?: number;
  /** Off course: where the nearest part of the route is, for the arrow back. */
  backTo?: [number, number];
  /** Turn band text: "Turn right". */
  turnText?: string;
  font: string;
}

/** The whole-route level, for callers stepping through MAP_RADII_M. */
export const WHOLE_ROUTE = MAP_WHOLE_LEVEL;

function arcHint(ctx: CanvasRenderingContext2D, from: number, to: number, colour: string) {
  ctx.beginPath();
  ctx.arc(120, 120, 111, (from * Math.PI) / 180, (to * Math.PI) / 180);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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
    // The whole route, fitted inside the circle, north up.
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
    k = 120 / s.radiusM;
    th = s.headingUp ? (s.heading ?? here.heading) : 0;
  }
  // The arrow sits a little below centre, so more of the way ahead shows.
  const oy = whole ? 0 : 18;
  const cth = Math.cos(th);
  const sth = Math.sin(th);
  const toScr = (x: number, y: number): [number, number] => {
    const dx = (x - centre[0]) * k;
    const dy = (y - centre[1]) * k;
    return [120 + (dx * cth - dy * sth), 120 + oy - (dx * sth + dy * cth)];
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
  const ahead = slice(route, s.along, route.length);
  stroke(ahead, COLOUR.glow, 9);
  stroke(slice(route, 0, s.along), COLOUR.done, 3);
  stroke(ahead, COLOUR.line, 3.5);

  // Start in green, finish in red.
  const dot = (p: [number, number], colour: string) => {
    const [X, Y] = toScr(p[0], p[1]);
    ctx.beginPath();
    ctx.arc(X, Y, 5, 0, Math.PI * 2);
    ctx.fillStyle = colour;
    ctx.fill();
  };
  dot(route.pts[route.pts.length - 1], COLOUR.finish);
  dot(route.pts[0], COLOUR.start);

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

  // North: a red "N" on the rim.
  const nx = 120 - sth * 94;
  const ny = 120 - cth * 94;
  ctx.fillStyle = COLOUR.red;
  ctx.font = `600 18px ${s.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', nx, ny + 1);

  // Distance to go at the top, the next turn under it, the scale at the bottom.
  ctx.textBaseline = 'alphabetic';
  if (s.toGoM != null) {
    ctx.fillStyle = '#fff';
    ctx.font = `600 17px ${s.font}`;
    const toGo = s.toGoM >= 1000 ? `${(s.toGoM / 1000).toFixed(1)} km to go` : `${Math.round(s.toGoM)} m to go`;
    ctx.fillText(toGo, 120, 58);
  }
  if (s.turnAhead && !s.banner) {
    ctx.fillStyle = COLOUR.line;
    ctx.font = `500 15px ${s.font}`;
    ctx.fillText(`${s.turnAhead.name} ${Math.round(s.turnAhead.inM / 10) * 10} m`, 120, 78);
  }
  if (!whole) {
    const scale = scaleFor(1 / k);
    const px = scale.metres * k;
    ctx.fillStyle = '#fff';
    ctx.fillRect(120 - px / 2, 212, px, 2);
    ctx.fillRect(120 - px / 2, 206, 2, 8);
    ctx.fillRect(120 + px / 2 - 2, 206, 2, 8);
    ctx.font = `400 13px ${s.font}`;
    ctx.fillText(scale.label, 120, 203);
  }

  // The bands: off course (yellow, with the way back), back on (green), a turn (magenta).
  const p = s.bannerP ?? 1;
  if (s.banner && p > 0) {
    const h = 64 * Math.min(1, p);
    const colour = s.banner === 'off' ? COLOUR.off : s.banner === 'back' ? COLOUR.back : COLOUR.line;
    ctx.save();
    roundRect(ctx, 14, 120 - h / 2, 212, h, 12);
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = '#000';
    if (s.banner === 'off') {
      let tx = 120;
      if (s.backTo && !whole) {
        // An arrow pointing at the nearest part of the route.
        const [bx, by] = toScr(s.backTo[0], s.backTo[1]);
        const ang = Math.atan2(bx - ux, -(by - uy));
        ctx.save();
        ctx.translate(46, 120);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(11, 3);
        ctx.lineTo(4, 3);
        ctx.lineTo(4, 14);
        ctx.lineTo(-4, 14);
        ctx.lineTo(-4, 3);
        ctx.lineTo(-11, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        tx = 136;
      }
      ctx.font = `600 21px ${s.font}`;
      ctx.fillText('Off course', tx, 117);
      ctx.font = `500 14px ${s.font}`;
      ctx.fillText(`${Math.round(s.offByM ?? 0)} m from line`, tx, 138);
    } else if (s.banner === 'back') {
      ctx.font = `600 21px ${s.font}`;
      ctx.fillText('Back on course', 120, 128);
    } else {
      ctx.font = `600 21px ${s.font}`;
      ctx.fillText(s.turnText ?? 'Turn', 120, 117);
      ctx.font = `500 14px ${s.font}`;
      ctx.fillText('in 50 m', 120, 138);
    }
    ctx.restore();
  }

  // The SDK's button hints.
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
