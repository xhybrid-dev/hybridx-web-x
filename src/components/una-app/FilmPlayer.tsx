'use client';

import { useState, type CSSProperties } from 'react';
import Image from 'next/image';
import styles from './FilmPlayer.module.css';

/*
 * A promo film, shared by the three app pages. The films are the 150-second
 * motion-graphics films in the watch repo's promo/videos/, each with its own
 * score, re-encoded for the web at 720p (H.264 and VP9) into the page's own
 * public folder as film.mp4, film.webm and film-poster.jpg.
 *
 * Nothing loads until it's asked for: the poster is an image, and the video
 * element only exists once play is pressed.
 */

export interface FilmPlayerProps {
  /** The page's public folder: "/race", "/streak", "/trail". */
  base: string;
  /** The film's name, e.g. "Follow the line". */
  title: string;
  /** Under the title, e.g. "The film · 2:30 · sound on". */
  meta?: string;
  /** The play button's colour, and the ink on it. */
  accent: string;
  ink: string;
}

export default function FilmPlayer({ base, title, meta = 'The film · 2:30 · sound on', accent, ink }: FilmPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const theme = {
    '--film-accent': accent,
    '--film-ink': ink,
    '--film-glow': `color-mix(in srgb, ${accent} 35%, transparent)`,
  } as CSSProperties;

  return (
    <div className={styles.frame} style={theme}>
      {playing ? (
        <video className={styles.video} controls autoPlay playsInline poster={`${base}/film-poster.jpg`}>
          <source src={`${base}/film.mp4`} type="video/mp4" />
          <source src={`${base}/film.webm`} type="video/webm" />
        </video>
      ) : (
        <button
          type="button"
          className={styles.poster}
          onClick={() => setPlaying(true)}
          aria-label={`Play the film: ${title}, two and a half minutes, with sound`}
        >
          <Image src={`${base}/film-poster.jpg`} alt="" fill sizes="(max-width: 1200px) 100vw, 1180px" className={styles.posterImg} />
          <span className={styles.play} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className={styles.caption}>
            <strong>{title}</strong>
            <span>{meta}</span>
          </span>
        </button>
      )}
    </div>
  );
}
