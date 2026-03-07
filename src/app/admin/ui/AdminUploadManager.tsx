'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  adminFetchUploads,
  adminUploadPdf,
  adminActivateUpload,
  adminDeleteUpload,
} from '@/lib/api/client';

type UploadEntry = {
  id: string;
  filename: string;
  file_size: number;
  calendar_week: number | null;
  half_year: number | null;
  status: string;
  parse_error: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  uploaded: 'Hochgeladen',
  parsing: 'Wird geparst ...',
  parsed: 'Bereit zur Aktivierung',
  active: 'Aktiv',
  error: 'Fehler',
  archived: 'Archiviert',
};

const STATUS_COLORS: Record<string, string> = {
  uploaded: 'bg-gray-100 text-gray-700',
  parsing: 'bg-yellow-100 text-yellow-800',
  parsed: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
  archived: 'bg-gray-100 text-gray-500',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminUploadManager() {
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [status, setStatus] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadUploads = useCallback(async () => {
    try {
      const res = await adminFetchUploads();
      setUploads(res.uploads);
    } catch (error) {
      setStatus('Fehler beim Laden der Uploads.');
      console.error(error);
    }
  }, []);

  useEffect(() => {
    loadUploads();
  }, [loadUploads]);

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setStatus('Bitte eine PDF-Datei auswählen.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setStatus('Nur PDF-Dateien erlaubt.');
      return;
    }

    setIsBusy(true);
    setStatus(`Lade ${file.name} hoch ...`);

    try {
      await adminUploadPdf(file);
      setStatus(`${file.name} hochgeladen und Parsing gestartet.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadUploads();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Upload fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleActivate(id: string, filename: string) {
    setIsBusy(true);
    try {
      await adminActivateUpload(id);
      setStatus(`${filename} als aktiven Stundenplan gesetzt.`);
      await loadUploads();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Aktivierung fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete(id: string, filename: string) {
    if (!confirm(`Upload "${filename}" wirklich löschen?`)) return;
    setIsBusy(true);
    try {
      await adminDeleteUpload(id);
      setStatus(`${filename} gelöscht.`);
      await loadUploads();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Löschen fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
        <h2 className="mb-3 text-lg font-semibold">Stundenplan-PDF hochladen</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm font-medium">
            PDF-Datei
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
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
        <p className="mt-2 text-xs text-gray-500">
          Dateiname sollte dem Muster <code>Stundenplan_kw_XX_HjY_YYYY_YY.pdf</code> folgen.
        </p>
        {status && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{status}</p>}
      </div>

      <div className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Uploads</h2>
          <button
            type="button"
            onClick={loadUploads}
            className="text-sm text-blue-600 underline"
          >
            Aktualisieren
          </button>
        </div>

        {uploads.length === 0 ? (
          <p className="text-sm text-gray-500">Noch keine Uploads vorhanden.</p>
        ) : (
          <div className="space-y-2">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="flex flex-wrap items-center gap-3 rounded border border-gray-200 p-3 dark:border-gray-700"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{upload.filename}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(upload.file_size)}
                    {upload.calendar_week != null && ` · KW ${upload.calendar_week}`}
                    {upload.half_year != null && ` · Hj ${upload.half_year}`}
                    {' · '}{new Date(upload.created_at).toLocaleDateString('de-DE')}
                  </p>
                  {upload.parse_error && (
                    <p className="mt-1 text-xs text-red-600">{upload.parse_error}</p>
                  )}
                </div>

                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[upload.status] ?? ''}`}>
                  {STATUS_LABELS[upload.status] ?? upload.status}
                </span>

                <div className="flex gap-1">
                  {upload.status === 'parsed' && (
                    <button
                      type="button"
                      onClick={() => handleActivate(upload.id, upload.filename)}
                      disabled={isBusy}
                      className="rounded bg-green-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                    >
                      Aktivieren
                    </button>
                  )}
                  {upload.status !== 'active' && (
                    <button
                      type="button"
                      onClick={() => handleDelete(upload.id, upload.filename)}
                      disabled={isBusy}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50"
                    >
                      Löschen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
