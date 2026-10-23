import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

// The social card for hybridx.club/trail-quest: a night ridge in the game's
// colours with the runner and the Red Fox (the game's own
// sprites, scaled by whole pixels into public/trail-quest/og-scene.png), and
// the headline. Rendered once at build time.

export const alt = 'Trail Quest for UNA Watch: run the Ridge on your wrist.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const scene = await readFile(join(process.cwd(), 'public', 'trail-quest', 'og-scene.png'));
  const src = `data:image/png;base64,${scene.toString('base64')}`;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', color: '#ffffff', fontFamily: 'sans-serif' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={1200} height={630} alt="" style={{ position: 'absolute', top: 0, left: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', padding: '64px 72px', gap: 22 }}>
          <div style={{ display: 'flex', gap: 16, fontSize: 26, letterSpacing: 6, fontWeight: 700 }}>
            <span>HYBRIDX</span>
            <span style={{ color: '#ffe14d' }}>TRAIL QUEST</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 84, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>
            <span>Run the Ridge.</span>
            <span style={{ color: '#ffe14d' }}>On your wrist.</span>
          </div>
          <div style={{ display: 'flex', fontSize: 24, letterSpacing: 4, color: '#c0c0e0' }}>A TRAIL-RUNNING ADVENTURE · FOR UNA WATCH</div>
        </div>
      </div>
    ),
    size,
  );
}
