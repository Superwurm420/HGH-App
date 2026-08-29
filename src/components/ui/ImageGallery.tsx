'use client';

import { useCallback, useEffect, useState } from 'react';

import styles from './ImageGallery.module.css';

export interface GalleryImage {
  id: string;
  filename: string;
  url: string;
}

/**
 * Bildergalerie mit Vorschau-Raster und Vollbild-Anzeige.
 *
 * Die Bilder liegen unverkleinert in R2 — deshalb laden die Kacheln erst,
 * wenn sie ins Bild scrollen (`loading="lazy"`), und das große Bild erst beim
 * Öffnen. Auf dem Handy bleibt es damit bei dem, was wirklich angesehen wird.
 */
export function ImageGallery({ images }: { images: GalleryImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);

  const step = useCallback(
    (delta: number) => {
      setOpenIndex((current) => {
        if (current === null) return current;
        return (current + delta + images.length) % images.length;
      });
    },
    [images.length],
  );

  useEffect(() => {
    if (openIndex === null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIndex, close, step]);

  if (images.length === 0) return null;

  const active = openIndex === null ? null : images[openIndex];

  return (
    <>
      <div className={styles.grid}>
        {images.map((image, position) => (
          <button
            key={image.id}
            type="button"
            className={styles.tile}
            onClick={() => setOpenIndex(position)}
            aria-label={`Bild öffnen: ${image.filename}`}
          >
            {/* next/image würde den Bildoptimierer einschalten — auf Cloudflare
                ist das kostenpflichtig, und die Bilder liegen schon in R2. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={image.filename}
              className={styles.thumb}
              loading="lazy"
              decoding="async"
            />
          </button>
        ))}
      </div>

      {active && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label={active.filename}
          onClick={(event) => {
            // Nur der Hintergrund schließt — sonst geht die Ansicht bei jedem
            // Tippen auf das Bild oder die Schaltflächen zu.
            if (event.target === event.currentTarget) close();
          }}
        >
          <button
            type="button"
            className={`${styles.control} ${styles.close}`}
            onClick={close}
            aria-label="Schließen"
          >
            {'✕'}
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={active.url} alt={active.filename} className={styles.full} />

          <p className={styles.caption}>
            {active.filename} · {(openIndex ?? 0) + 1} von {images.length}
          </p>

          {images.length > 1 && (
            <div className={styles.controls}>
              <button
                type="button"
                className={styles.control}
                onClick={() => step(-1)}
                aria-label="Vorheriges Bild"
              >
                {'←'}
              </button>
              <button
                type="button"
                className={styles.control}
                onClick={() => step(1)}
                aria-label="Nächstes Bild"
              >
                {'→'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
