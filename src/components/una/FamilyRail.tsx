'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { FAMILY, icon } from '@/lib/una-family';
import styles from './FamilyRail.module.css';

/*
 * The line that runs beside the six chapters: one disc per app, joined, with
 * the one you are reading lit. It is the page's argument in miniature — the
 * chapters change colour completely, the line does not move.
 */
export default function FamilyRail() {
  const [active, setActive] = useState<string>(FAMILY[0].slug);

  useEffect(() => {
    const sections = FAMILY.map((a) => document.getElementById(a.slug)).filter(
      (el): el is HTMLElement => el !== null,
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      // A band across the middle of the viewport: whichever chapter crosses it is "the one".
      { rootMargin: '-45% 0px -45% 0px' },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className={styles.rail} aria-label="The six apps">
      <ol>
        {FAMILY.map((a) => (
          <li key={a.slug} data-active={a.slug === active}>
            <a href={`#${a.slug}`} aria-current={a.slug === active ? 'true' : undefined}>
              <Image src={icon(a.slug)} alt="" width={48} height={48} />
              <span>{a.name}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
