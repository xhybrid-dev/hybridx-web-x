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
 */

const SRC = '/una/ecosystem.mp4';
const POSTER = '/una/ecosystem-poster.jpg';
const DESCRIPTION =
  'A 20-second tour of the X apps on UNA Watch: X Race, X Training, X Run, X Ride, X Workout and X Trail in turn, then all six feeding one picture.';

export default function EcosystemReel({ className }: { className?: string }) {
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
    heldRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
      <figcaption className={styles.caption}>20-second tour · no sound</figcaption>
    </figure>
  );
}
