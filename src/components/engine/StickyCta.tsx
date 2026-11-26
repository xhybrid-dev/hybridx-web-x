'use client';

import React, { useEffect, useState } from 'react';

interface StickyCtaProps {
  /** Id of the element to scroll to (a section containing a lead form). */
  targetId: string;
}

/**
 * Slim sticky bottom bar shown on mobile after the hero scrolls out of view.
 * Tapping it scrolls to the nearest lead form and focuses the email field.
 * Hides itself while any lead form is in view.
 */
export default function StickyCta({ targetId }: StickyCtaProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onScroll() {
      // Show once the user has scrolled roughly past the hero.
      const past = window.scrollY > window.innerHeight * 0.85;

      // Hide if any lead form is currently on screen.
      let formInView = false;
      document.querySelectorAll('[data-engine-form]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) formInView = true;
      });

      setShow(past && !formInView);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  function handleClick() {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const email = target.querySelector<HTMLInputElement>('input[type="email"]');
    if (email) {
      window.setTimeout(() => email.focus({ preventScroll: true }), 500);
    }
  }

  return (
    <div
      // Not while the consent banner is up: it is fixed to the same edge and would sit on top of this bar.
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-[#7A2530] bg-engine-oxdeep/95 p-3 backdrop-blur transition-transform duration-300 md:hidden [body:has([data-consent-banner])_&]:hidden ${
        show ? 'translate-y-0' : 'translate-y-full'
      }`}
      aria-hidden={!show}
    >
      <button
        type="button"
        onClick={handleClick}
        tabIndex={show ? 0 : -1}
        className="flex h-12 w-full items-center justify-center rounded-[14px] bg-engine-crimson font-archivo font-extrabold uppercase tracking-wide text-engine-paper shadow-lg transition-colors hover:bg-engine-crimsonD focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-engine-heart"
      >
        Get the free guide
      </button>
    </div>
  );
}
