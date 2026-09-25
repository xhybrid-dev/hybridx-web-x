import { ImageResponse } from 'next/og';

// The social card for race.hybridx.club: the headline over the sixteen laps in
// the watch's run and station colours. Rendered once at build time.

export const alt = 'HybridX Race for UNA Watch: track your Hyrox with UNA.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BARS = [62, 58, 64, 40, 66, 55, 67, 51, 66, 60, 68, 24, 69, 54, 70, 74];

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
          padding: '64px 72px',
          background: 'radial-gradient(60% 80% at 85% 10%, #1b3f44 0%, #050506 60%), #050506',
          color: '#f5f5f5',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 30, letterSpacing: 6 }}>
          <span style={{ fontWeight: 700 }}>HYBRIDX</span>
          <span style={{ color: '#fadb5c', fontWeight: 700 }}>RACE</span>
          <span style={{ marginLeft: 12, fontSize: 24, letterSpacing: 1, color: '#76b7c1' }}>for UNA Watch</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 96, fontWeight: 700, lineHeight: 1, letterSpacing: -3 }}>
          <span>Track your Hyrox</span>
          <span style={{ color: '#fadb5c' }}>with UNA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
          {BARS.map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h + 26}%`,
                borderRadius: '8px 8px 2px 2px',
                background: i % 2 === 0 ? '#5ce8f0' : '#f5e663',
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
