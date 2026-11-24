'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './EcosystemReel.module.css';

/*
 * The 20-second ecosystem reel on /una, beside the family's section head.
 *
 * Source: marketing/una-hybridx-ecosystem-9x16-60fps.mp4 (1080×1920, 60 fps,
 * no audio track), re-encoded for the web at 720×1280 H.264 into
 * public/una/ecosystem.mp4, with a 540×960 poster from the one-second mark.
 *
 * It has no sound, so it plays muted and loops like a story card instead of
 * waiting behind a play button like the app pages' FilmPlayer.
 *   - Only the poster loads until the reel scrolls into view (preload="none");
 *     it pauses again when scrolled away.
 *   - Reduced motion: it never starts on its own; the button plays it.
 *   - Pausing is the viewer's to keep (WCAG 2.2.2): scrolling back to a reel
 *     they paused does not restart it.
 *
 * On phones (≤759 px, motion allowed) it is a scroll-driven zoom: the card
 * grows to the full screen width as it enters, then stays pinned there while
 * the page scrolls through a hold (--hold in the CSS), then scrolls on. The
 * zoom is the scroll position and nothing else: no timers, and the page is
 * never locked. This file only writes --zoom (0 to 1) and --hdr (the sticky
 * header's height) onto the stage; the sizes and the pin are in the CSS.
 * Wider screens and reduced motion get the plain card, with no stage boxes.
 */

const SRC = '/una/ecosystem.mp4';
const POSTER = '/una/ecosystem-poster.jpg';
const DESCRIPTION =
  'A 20-second tour of the X apps on UNA Watch: X Race, X Training, X Run, X Ride, X Workout and X Trail in turn, then all six feeding one picture.';

// Keep in step with the media query in EcosystemReel.module.css.
const PHONE = '(max-width: 759px)';
const REDUCED = '(prefers-reduced-motion: reduce)';

// The small card first shows when the stage's top is this share of the pinned
// box above the bottom edge; the zoom runs from there until the box is pinned.
const ENTRY_SHARE = 0.24;

export default function EcosystemReel({ className }: { className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // True when the reel must not start on its own: paused by the viewer, or reduced motion.
  const heldRef = useRef(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // React does not reliably render the muted attribute, and browsers only
    // allow unprompted play() on a muted video.
    video.muted = true;
    heldRef.current = window.matchMedia(REDUCED).matches;
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!heldRef.current) video.play().catch(() => {});
        } else if (!video.paused) {
          video.pause();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const pin = pinRef.current;
    if (!stage || !pin || !('IntersectionObserver' in window)) return;

    const phone = window.matchMedia(PHONE);
    const reduced = window.matchMedia(REDUCED);
    let frame = 0;
    let near = false;

    const apply = () => {
      frame = 0;
      if (!phone.matches || reduced.matches) {
        stage.style.removeProperty('--zoom');
        stage.style.removeProperty('--hdr');
        return;
      }
      const header = document.querySelector('header');
      const hdr = header ? Math.round(header.getBoundingClientRect().height) : 58;
      stage.style.setProperty('--hdr', `${hdr}px`);

      const top = stage.getBoundingClientRect().top;
      const start = window.innerHeight - pin.offsetHeight * ENTRY_SHARE;
      const raw = Math.min(1, Math.max(0, (start - top) / (start - hdr)));
      // Smoothstep: the zoom eases in and settles into the pin.
      stage.style.setProperty('--zoom', (raw * raw * (3 - 2 * raw)).toFixed(4));
    };
    // `force` makes the frame that leaves the screen settle on 0 or 1, so a
    // jump past the stage (an anchor link, a fast fling) never strands it.
    const schedule = (force = false) => {
      if ((force || near) && !frame) frame = requestAnimationFrame(apply);
    };
    const onMove = () => schedule();
    const onMode = () => schedule(true);

    const observer = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting;
        schedule(true);
      },
      { rootMargin: '50% 0px' },
    );
    observer.observe(stage);
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove);
    phone.addEventListener('change', onMode);
    reduced.addEventListener('change', onMode);
    schedule(true);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onMove);
      window.removeEventListener('resize', onMove);
      phone.removeEventListener('change', onMode);
      reduced.removeEventListener('change', onMode);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      heldRef.current = false;
      video.muted = true;
      video.play().catch(() => {});
    } else {
      heldRef.current = true;
      video.pause();
    }
  };

  return (
    <div ref={stageRef} className={styles.stage}>
      <div ref={pinRef} className={styles.pin}>
        <figure className={`${styles.reel} ${className ?? ''}`}>
          <div className={styles.frame}>
            <video
              ref={videoRef}
              className={styles.video}
              poster={POSTER}
              width={720}
              height={1280}
              muted
              loop
              playsInline
              preload="none"
              disablePictureInPicture
              aria-label={DESCRIPTION}
              onClick={toggle}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            >
              <source src={SRC} type="video/mp4" />
            </video>
            <button
              type="button"
              className={styles.toggle}
              onClick={toggle}
              aria-label={playing ? 'Pause the tour' : 'Play the tour'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {playing ? <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> : <path d="M8 5v14l11-7z" />}
              </svg>
            </button>
          </div>
        </figure>
      </div>
    </div>
  );
}
