import { ImageResponse } from 'next/og';

// The social card for streak.hybridx.club, in the page's own palette: a night
// sky warming to dawn, the headline in plain type, and five peaks
// rising left to right like the climb, lime flags on the ones summited.
// Rendered once at build time.

export const alt = 'HybridX Streak for UNA Watch: build your streak with UNA.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Peak heights in px, left to right; the first two are climbed (teal, lime flags).
const PEAKS = [70, 105, 130, 160, 190];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px 0',
          background: 'linear-gradient(180deg, #050c15 0%, #0d1d33 45%, #2a2745 70%, #6b3f55 88%, #c86a5a 100%)',
          color: '#eef4f8',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 30, letterSpacing: 6 }}>
          <span style={{ fontWeight: 700 }}>HYBRIDX</span>
          <span style={{ color: '#b6f23d', fontWeight: 700 }}>STREAK</span>
          <span style={{ marginLeft: 12, fontSize: 24, letterSpacing: 1, color: '#76b7c1' }}>for UNA Watch</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 92, fontWeight: 700, lineHeight: 1, letterSpacing: -3 }}>
          <span>Build your streak</span>
          <span style={{ color: '#b6f23d' }}>with UNA</span>
        </div>
        <svg width="1056" height="230" viewBox="0 -30 1056 230" style={{ display: 'flex' }}>
          {PEAKS.map((h, i) => {
            const cx = 90 + i * 215;
            const half = h * 1.15;
            const apex = 200 - h;
            const climbed = i < 2;
            return (
              <g key={i}>
                <polygon points={`${cx - half},200 ${cx},${apex} ${cx},200`} fill={climbed ? '#1ba7a0' : '#1d3347'} />
                <polygon points={`${cx},${apex} ${cx + half},200 ${cx},200`} fill={climbed ? '#0e5f5b' : '#152838'} />
                <line x1={cx} y1={apex} x2={cx} y2={apex - 24} stroke="#eef4f8" strokeWidth="3" />
                <polygon points={`${cx},${apex - 24} ${cx + 20},${apex - 18} ${cx},${apex - 12}`} fill={climbed ? '#b6f23d' : '#6b6b6b'} />
              </g>
            );
          })}
        </svg>
      </div>
    ),
    size,
  );
}
