'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  adminDeleteMedia,
  adminFetchMedia,
  adminUploadImage,
  mediaUrl,
  type MediaData,
} from '@/lib/api/client';

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
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
        <h2 className="mb-1 text-lg font-semibold">Bilder für die TV-Ansicht</h2>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
          Diese Bilder wechseln sich auf <code>/tv</code> alle 15 Sekunden ab.
          Erlaubt sind JPG, PNG, GIF und WebP bis 8 MB.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm font-medium">
            Bilder auswählen
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              className="mt-1 block w-full text-sm"
            />
          </label>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isBusy}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Hochladen
          </button>
        </div>

        {status && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{status}</p>}
      </div>

      <div className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Hochgeladene Bilder</h2>
          <button type="button" onClick={load} className="text-sm text-blue-600 underline">
            Aktualisieren
          </button>
        </div>

        {media.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Noch keine Bilder hochgeladen.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((item) => (
              <li key={item.id} className="overflow-hidden rounded border border-gray-200 dark:border-gray-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(item.id)}
                  alt={item.filename}
                  className="h-40 w-full bg-gray-100 object-contain dark:bg-gray-900"
                  loading="lazy"
                />
                <div className="flex items-center gap-2 p-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.filename}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(item.file_size)} · {new Date(item.created_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={isBusy}
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50"
                  >
                    Löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
