'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './Film.module.css';

/*
 * "Follow the line", the Trail promo film (promo/videos/hybridx-trail.mp4,
 * 150 s with its own score), re-encoded for the web at 720p: H.264 and VP9.
 * Nothing loads until it's asked for: the poster is an image, and the video
 * element only exists once the play button is pressed.
 */

export default function Film() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={styles.frame}>
      {playing ? (
        <video className={styles.video} controls autoPlay playsInline poster="/trail/film-poster.jpg">
          <source src="/trail/film.webm" type="video/webm" />
          <source src="/trail/film.mp4" type="video/mp4" />
        </video>
      ) : (
        <button type="button" className={styles.poster} onClick={() => setPlaying(true)} aria-label="Play the film: Follow the line, two and a half minutes, with sound">
          <Image src="/trail/film-poster.jpg" alt="" fill sizes="(max-width: 1200px) 100vw, 1180px" className={styles.posterImg} />
          <span className={styles.play} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className={styles.caption}>
            <strong>Follow the line</strong>
            <span>The film · 2:30 · sound on</span>
          </span>
        </button>
      )}
    </div>
  );
}
