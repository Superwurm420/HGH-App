'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  adminDeleteMedia,
  adminFetchMedia,
  adminUploadImage,
  mediaUrl,
  type MediaData,
} from '@/lib/api/client';
import { Card, Status, adminStyles as styles } from './parts';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Bilder für die TV-Slideshow verwalten.
 * Angezeigt werden sie auf /tv in der Reihenfolge des Hochladens.
 */
export function AdminMediaManager() {
  const [media, setMedia] = useState<MediaData[]>([]);
  const [status, setStatus] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await adminFetchMedia();
      setMedia(res.media);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Bilder konnten nicht geladen werden.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload() {
    const files = Array.from(fileInputRef.current?.files ?? []);
    if (files.length === 0) {
      setStatus('Bitte mindestens ein Bild auswählen.');
      return;
    }

    setIsBusy(true);
    let uploaded = 0;

    try {
      // Nacheinander statt parallel: Ein Fehler bleibt so einem Bild zuordenbar.
      for (const file of files) {
        setStatus(`${file.name} wird hochgeladen … (${uploaded + 1}/${files.length})`);
        await adminUploadImage(file);
        uploaded += 1;
      }
      setStatus(`${uploaded} ${uploaded === 1 ? 'Bild' : 'Bilder'} hochgeladen.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload fehlgeschlagen.';
      setStatus(uploaded > 0 ? `${uploaded} hochgeladen, dann abgebrochen: ${message}` : message);
      await load();
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete(item: MediaData) {
    if (!confirm(`Bild "${item.filename}" wirklich löschen?`)) return;
    setIsBusy(true);
    try {
      await adminDeleteMedia(item.id);
      setStatus(`${item.filename} gelöscht.`);
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Löschen fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className={styles.stack}>
      <Card
        title="Bilder für Wandbildschirm und Galerie"
        hint={<>
          Diese Bilder wechseln sich auf <code>/tv</code> alle 15 Sekunden ab und stehen
          zusätzlich in der Galerie. Erlaubt sind JPG, PNG, GIF und WebP bis 8 MB.
        </>}
      >
        <div className={styles.row}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            className="block text-sm"
          />
          <button type="button" onClick={handleUpload} disabled={isBusy} className="btn">
            Hochladen
          </button>
        </div>

        <div className="mt-3">
          <Status text={status} />
        </div>
      </Card>

      <Card
        title="Hochgeladene Bilder"
        action={
          <button type="button" onClick={load} className={styles.linkBtn}>
            Aktualisieren
          </button>
        }
      >
        {media.length === 0 ? (
          <p className={styles.empty}>Noch keine Bilder hochgeladen.</p>
        ) : (
          <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((item) => (
              <li key={item.id} className={`${styles.listItem} overflow-hidden`} style={{ padding: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(item.id)}
                  alt={item.filename}
                  className="h-40 w-full object-contain"
                  style={{ background: 'var(--surface)' }}
                  loading="lazy"
                />
                <div className={`${styles.row} p-2`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.filename}</p>
                    <p className={styles.listMeta}>
                      {formatFileSize(item.file_size)} · {new Date(item.created_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={isBusy}
                    className={`${styles.smallBtn} ${styles.danger}`}
                  >
                    Löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
