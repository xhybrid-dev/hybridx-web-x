import { ImageResponse } from 'next/og';
import { APPS } from '@/lib/una-family';

// Social card for hybridx.club/una: inviting daylight HybridX + UNA Watch
// header paired with all seven connected app colourways joined by one line.

export const alt = 'The X family: seven connected apps for UNA Watch, by HybridX.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  const count = APPS.length;
  const colWidth = size.width / count;
  const dotSize = 68;
  const firstCenter = colWidth / 2;
  const lastCenter = size.width - colWidth / 2;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#F5F7F8',
          color: '#0E1316',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '44px 56px 34px',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                display: 'flex',
                background: '#FADB5C',
                color: '#0B0D0F',
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 3,
                padding: '6px 16px',
                borderRadius: 999,
              }}
            >
              HYBRIDX
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 4,
                color: '#1B6B75',
              }}
            >
              FOR UNA WATCH · 7 CONNECTED APPS
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: 108,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: -4,
              marginTop: 18,
              color: '#0E1316',
            }}
          >
            <span>THE&nbsp;</span>
            <span style={{ color: '#1B6B75' }}>X</span>
            <span>&nbsp;FAMILY</span>
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: 31,
              fontWeight: 600,
              marginTop: 14,
              color: '#47555D',
            }}
          >
            Seven specialist apps. One watch. Every session lands in X Streak.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flex: 1,
            position: 'relative',
            borderTop: '4px solid #0E1316',
          }}
        >
          {APPS.map((a, idx) => (
            <div
              key={a.slug}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                padding: '0 8px 26px',
                background: a.palette.ground,
                color: a.palette.inkOnDark,
                borderRight: idx < count - 1 ? '3px solid #FFFFFF' : 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 21,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                }}
              >
                {a.name.toUpperCase().replace('HYBRIDX ', '')}
              </div>
            </div>
          ))}

          <div
            style={{
              position: 'absolute',
              left: firstCenter,
              width: lastCenter - firstCenter,
              top: 72,
              height: 8,
              background: '#FFFFFF',
              display: 'flex',
            }}
          />

          {APPS.map((a, i) => {
            const centerX = colWidth * i + colWidth / 2;
            return (
              <div
                key={a.slug}
                style={{
                  position: 'absolute',
                  left: Math.round(centerX - dotSize / 2),
                  top: 72 - dotSize / 2 + 4,
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  background: a.palette.accent,
                  border: '7px solid #FFFFFF',
                  display: 'flex',
                }}
              />
            );
          })}
        </div>
      </div>
    ),
    size,
  );
}
