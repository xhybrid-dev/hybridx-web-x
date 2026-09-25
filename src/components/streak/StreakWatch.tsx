'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import styles from './StreakWatch.module.css';

/*
 * The hero watch for HybridX Streak: the app's own demo recording
 * (hybridx-streak/docs/screens/streak-demo.mp4, copied to
 * public/streak/demo.mp4) playing on the screen of UNA's product render.
 *
 * demo.webm is the same recording re-encoded as VP9, for browsers without
 * H.264.
 *
 * The recording is the real GUI in the simulator: first week, a session found,
 * week complete, a summit with confetti, a shield, a fresh start. It is 520 px
 * square with the round display centred at radius 240; the CSS places that
 * circle on the render's transparent screen and clips the square corners away.
 *
 * Plays muted and looped, only while on screen. With reduced motion it never
 * starts, and the poster (week banked) stands in.
 */

export default function StreakWatch() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        // Autoplay can be refused (low-power mode, data saver); the poster stays.
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.frame}>
      <video
        ref={videoRef}
        className={styles.screen}
        poster="/streak/demo-poster.png"
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="HybridX Streak on a UNA Watch: a session is found, the week is completed, the climber steps up the mountain, a summit is reached, a shield saves the streak."
      >
        {/* VP9 first for browsers without H.264, then the original H.264. */}
        <source src="/streak/demo.webm" type="video/webm" />
        <source src="/streak/demo.mp4" type="video/mp4" />
      </video>
      <Image
        src="/race/una-watch-teal.png"
        alt=""
        fill
        priority
        sizes="(max-width: 600px) 84vw, 430px"
        className={styles.render}
      />
    </div>
  );
}
