import { ImageResponse } from 'next/og';
import { SAMPLE_DAYS_LIST, SAMPLE_RANGE } from '@/components/weighin/sample';

// The social card for hybridx.club/weigh-in, in the page's palette: black, the
// sample log's forty mornings as grey dots with the lime trend through them,
// and the headline. Rendered once at build time.

export const alt = 'X Weigh-in for UNA Watch: weigh in with UNA.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  const W = 1200;
  const n = SAMPLE_DAYS_LIST.length;
  const X = (i: number) => 60 + (i / (n - 1)) * (W - 120);
  const Y = (v: number) => 380 + ((SAMPLE_RANGE.hi - v) / (SAMPLE_RANGE.hi - SAMPLE_RANGE.lo)) * 190;
  const line = `M${SAMPLE_DAYS_LIST.map((d, i) => `${X(i).toFixed(1)},${Y(d.trend).toFixed(1)}`).join(' L')}`;
  const last = SAMPLE_DAYS_LIST[n - 1];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: 'radial-gradient(70% 80% at 80% 75%, #142006 0%, #040504 65%), #040504',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <svg width={W} height={630} viewBox={`0 0 ${W} 630`} style={{ position: 'absolute', left: 0, top: 0 }}>
          {SAMPLE_DAYS_LIST.map((d, i) =>
            d.weight ? <circle key={i} cx={X(i)} cy={Y(d.weight)} r={6} fill="#8b9187" /> : null,
          )}
          <path d={line} fill="none" stroke="#aaff00" strokeOpacity="0.25" strokeWidth="18" strokeLinejoin="round" strokeLinecap="round" />
          <path d={line} fill="none" stroke="#aaff00" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={X(n - 1)} cy={Y(last.trend)} r={11} fill="#aaff00" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '60px 72px', gap: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 28, letterSpacing: 6 }}>
            <span style={{ fontWeight: 700 }}>X</span>
            <span style={{ color: '#aaff00', fontWeight: 700 }}>WEIGH-IN</span>
            <span style={{ color: '#6c7366', fontSize: 20, letterSpacing: 4 }}>FOR UNA WATCH</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 92, fontWeight: 700, lineHeight: 1, letterSpacing: -3 }}>
            <span>Weigh in</span>
            <span style={{ color: '#aaff00' }}>with UNA</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
