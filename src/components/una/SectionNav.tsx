'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const SECTIONS = [
  { id: 'family', label: 'The family' },
  { id: 'glances', label: 'Glances' },
  { id: 'hardware', label: 'The watch' },
] as const;

/** Header links that mark the section being read. Hidden on phones, where the page is short enough not to need it. */
export default function SectionNav({ className }: { className?: string }) {
  const [current, setCurrent] = useState<string>('');

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    if (els.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const seen = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        let best = '';
        let bestRatio = 0;
        for (const [id, ratio] of seen) {
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }
        setCurrent(best);
      },
      { rootMargin: '-72px 0px -35% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <nav className={className} aria-label="Page sections">
      {SECTIONS.map((s) => (
        <a key={s.id} href={`#${s.id}`} aria-current={current === s.id ? 'true' : undefined}>
          {s.label}
        </a>
      ))}
      <Link href="/una/nerdy-bits">The Maths</Link>
    </nav>
  );
}
