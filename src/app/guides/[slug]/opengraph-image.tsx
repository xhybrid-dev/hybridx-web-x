import { ImageResponse } from 'next/og';
import { getPublicGuide } from '@/lib/guides/store';
import { pillar as pillarOf } from '@/lib/guides/topics';

// The social card for an article: its title on the brand's black, with the
// pillar above it. Rendered on request, like the article itself, and never
// written to public/ (commit b982d11 is why).

export const alt = 'A HybridX guide';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = await getPublicGuide(slug).catch(() => null);
  const title = guide?.status === 'published' ? guide.title : 'HybridX guides';
  const kicker = guide?.status === 'published' ? pillarOf(guide.pillar).name : 'HYROX and hybrid training';

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
          background: '#0a0a0a',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, letterSpacing: 6, color: '#fadb5c' }}>
          {`HYBRIDX GUIDES · ${kicker.toUpperCase()}`}
        </div>
        <div style={{ display: 'flex', fontSize: title.length > 48 ? 64 : 76, fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
        <div style={{ display: 'flex', fontSize: 28, color: '#b3b3b3' }}>Reviewed by Jon Lee, HybridX trainer · hybridx.club</div>
      </div>
    ),
    size,
  );
}
