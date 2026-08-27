'use client';

import { useEffect, useState } from 'react';

import styles from './TvSlideshow.module.css';

export interface SlideshowImage {
  id: string;
  filename: string;
  url: string;
}

/** Anzeigedauer pro Bild auf dem TV. */
const SLIDE_DURATION_MS = 15_000;

/**
 * Blendet die hochgeladenen Bilder auf der TV-Ansicht nacheinander ein.
 *
 * Alle Bilder bleiben im DOM und werden nur ein-/ausgeblendet: Der Browser lädt
 * sie damit genau einmal, was im Dauerbetrieb sowohl Bandbreite als auch
 * R2-Zugriffe spart.
 */
export function TvSlideshow({ images }: { images: SlideshowImage[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % images.length);
    }, SLIDE_DURATION_MS);

    return () => window.clearInterval(timer);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div className={styles.stage} aria-label="Bildergalerie">
      {images.map((image, position) => (
        // next/image würde den Bildoptimierer einschalten — auf Cloudflare ist
        // das kostenpflichtig, und die Bilder liegen ohnehin schon in R2.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={image.id}
          src={image.url}
          alt={image.filename}
          className={styles.slide}
          data-active={position === index ? 'true' : 'false'}
          aria-hidden={position === index ? undefined : true}
        />
      ))}
    </div>
  );
}
