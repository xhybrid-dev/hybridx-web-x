'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

const SECTIONS = [
  { id: 'incomplete-stations', label: 'Incomplete stations' },
  { id: 'all-changes', label: 'Every change' },
  { id: 'penalty-calculator', label: 'Penalty calculator' },
  { id: 'laps', label: 'Lap map' },
  { id: 'doubles', label: 'Doubles' },
  { id: 'relay', label: 'Relay' },
  { id: 'do-this', label: 'What to do' },
  { id: 'race-card', label: 'Race day card' },
  { id: 'faq', label: 'FAQ' },
];

/**
 * Secondary nav that pins under the site header. Doubles as a reading-progress
 * indicator on a long page — the active chip tells you where you are.
 */
export default function StickySectionNav() {
  const [active, setActive] = useState(SECTIONS[0].id);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-25% 0px -60% 0px', threshold: 0 }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? Math.min(100, (doc.scrollTop / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <nav
      aria-label="Sections of this guide"
      className="sticky top-16 z-40 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75"
    >
      <div
        className="h-0.5 bg-accent transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
        aria-hidden="true"
      />
      <div className="container mx-auto max-w-5xl px-4">
        <ul className="flex gap-1.5 overflow-x-auto py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                onClick={() => trackEvent('rules_nav_click', { section: section.id })}
                aria-current={active === section.id ? 'true' : undefined}
                className={cn(
                  'inline-block whitespace-nowrap rounded-full border px-3 py-1.5 font-headline text-xs font-semibold transition-colors',
                  active === section.id
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
