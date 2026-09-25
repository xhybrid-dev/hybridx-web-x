import { ImageResponse } from 'next/og';

// The social card for streak.hybridx.club: the headline over a range of five
// peaks in the watch's teal, rising left to right like the climb, with lime
// flags on the ones already summited. Rendered once at build time.

export const alt = 'HybridX Streak for UNA Watch: build your streak with UNA.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Peak heights in px, left to right; the first two carry lime (summited) flags.
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
          background: 'radial-gradient(60% 80% at 85% 10%, #1b3f44 0%, #050506 60%), #050506',
          color: '#f5f5f5',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 30, letterSpacing: 6 }}>
          <span style={{ fontWeight: 700 }}>HYBRIDX</span>
          <span style={{ color: '#fadb5c', fontWeight: 700 }}>STREAK</span>
          <span style={{ marginLeft: 12, fontSize: 24, letterSpacing: 1, color: '#76b7c1' }}>for UNA Watch</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 96, fontWeight: 700, lineHeight: 1, letterSpacing: -3 }}>
          <span>Build your streak</span>
          <span style={{ color: '#b6f23d' }}>with UNA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: 200 }}>
          {PEAKS.map((h, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', height: 22 }}>
                <div style={{ width: 3, height: 22, background: '#ffffff' }} />
                <div style={{ width: 18, height: 12, background: i < 2 ? '#b6f23d' : '#6b6b6b' }} />
              </div>
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: `${h * 1.1}px solid transparent`,
                  borderRight: `${h * 1.1}px solid transparent`,
                  borderBottom: `${h}px solid ${i % 2 === 0 ? '#1ba7a0' : '#0e5f5b'}`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
