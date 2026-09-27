import { ImageResponse } from 'next/og';
import { bounds, RIDGE_LOOP } from '@/lib/trail-terrain';

// The social card for trail.hybridx.club, in the film's palette: black, the
// Ridge loop as one orchid line, and the headline. Rendered once at build time.

export const alt = 'HybridX Trail for UNA Watch: follow the line with UNA.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function loopPath(w: number, h: number) {
  const b = bounds(RIDGE_LOOP);
  const k = Math.min(w / (b.x1 - b.x0), h / (b.y1 - b.y0));
  const ox = (w - (b.x1 - b.x0) * k) / 2;
  const oy = (h - (b.y1 - b.y0) * k) / 2;
  const pts = RIDGE_LOOP.pts.filter((_, i) => i % 4 === 0);
  return `M${pts.map(([x, y]) => `${(ox + (x - b.x0) * k).toFixed(1)},${(oy + (b.y1 - y) * k).toFixed(1)}`).join(' L')}`;
}

export default function OpengraphImage() {
  const d = loopPath(420, 380);
  const [sx, sy] = d.slice(1).split(' L')[0].split(',').map(Number);
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '64px 64px 64px 72px',
          background: 'radial-gradient(70% 90% at 78% 50%, #1c0a22 0%, #050507 65%), #050507',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 28, letterSpacing: 6 }}>
            <span style={{ fontWeight: 700 }}>HYBRIDX</span>
            <span style={{ color: '#ff55ff', fontWeight: 700 }}>TRAIL</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 92, fontWeight: 700, lineHeight: 1, letterSpacing: -3 }}>
            <span>Follow the line</span>
            <span style={{ color: '#ff55ff' }}>with UNA</span>
          </div>
          <div style={{ display: 'flex', fontSize: 22, letterSpacing: 4, color: '#6e747c' }}>
            BREADCRUMB NAVIGATION · FOR UNA WATCH
          </div>
        </div>
        <svg width="440" height="400" viewBox="-10 -10 440 400" style={{ display: 'flex', flexShrink: 0 }}>
          <path d={d} fill="none" stroke="#ff55ff" strokeOpacity="0.25" strokeWidth="16" strokeLinejoin="round" strokeLinecap="round" />
          <path d={d} fill="none" stroke="#ff55ff" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={sx} cy={sy} r="10" fill="none" stroke="#55ff00" strokeWidth="4" />
        </svg>
      </div>
    ),
    size,
  );
}
