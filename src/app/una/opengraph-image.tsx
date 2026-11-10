import { ImageResponse } from 'next/og';
import { FAMILY } from '@/lib/una-family';

// The social card for hybridx.club/una: the family's six colourways as flat
// bands with one white line through them, the page's own argument. Rendered
// once at build time.

export const alt = 'The X family: six linked apps for UNA Watch, by HybridX.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#0a0a0a',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', padding: '52px 64px 40px' }}>
          <div style={{ display: 'flex', fontSize: 26, letterSpacing: 6, color: '#fadb5c' }}>
            HYBRIDX · FOR UNA WATCH
          </div>
          <div style={{ display: 'flex', fontSize: 132, fontWeight: 700, lineHeight: 1, letterSpacing: -4, marginTop: 10 }}>
            <span>THE&nbsp;</span>
            <span style={{ color: '#fadb5c' }}>X</span>
            <span>&nbsp;FAMILY</span>
          </div>
          <div style={{ display: 'flex', fontSize: 34, marginTop: 14 }}>
            Six apps. One watch. Every session counts.
          </div>
        </div>
        <div style={{ display: 'flex', flex: 1, position: 'relative', borderTop: '4px solid #ffffff' }}>
          {FAMILY.map((a) => (
            <div
              key={a.slug}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '0 0 30px 22px',
                background: a.ground,
                color: a.ink,
                borderRight: '4px solid #ffffff',
              }}
            >
              <div style={{ display: 'flex', fontSize: 25, fontWeight: 700, letterSpacing: 1 }}>
                {a.name.toUpperCase().replace('HYBRIDX ', '')}
              </div>
            </div>
          ))}
          <div style={{ position: 'absolute', left: 60, right: 100, top: 70, height: 8, background: '#ffffff', display: 'flex' }} />
          {FAMILY.map((a, i) => (
            <div
              key={a.slug}
              style={{
                position: 'absolute',
                left: 22 + i * 200,
                top: 34,
                width: 80,
                height: 80,
                borderRadius: 40,
                background: a.accent,
                border: '8px solid #ffffff',
                display: 'flex',
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
