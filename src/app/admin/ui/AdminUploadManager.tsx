'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  adminActivateUpload,
  adminDeleteUpload,
  adminFetchUploads,
  adminUploadTimetable,
  type UploadData,
} from '@/lib/api/client';
import { parseTimetableFileInBrowser } from '@/lib/timetable/parse-pdf-browser';
import { WEEKDAYS, type ParsedSchedule } from '@/lib/timetable/types';

const STATUS_LABELS: Record<string, string> = {
  parsed: 'Bereit zur Aktivierung',
  active: 'Aktiv',
  archived: 'Archiviert',
  error: 'Fehler',
  uploaded: 'Hochgeladen',
  parsing: 'Wird ausgewertet …',
};

const STATUS_COLORS: Record<string, string> = {
  parsed: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-500',
  error: 'bg-red-100 text-red-800',
  uploaded: 'bg-gray-100 text-gray-700',
  parsing: 'bg-yellow-100 text-yellow-800',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Preview {
  file: File;
  schedule: ParsedSchedule;
  classes: string[];
  lessons: number;
}

function summarize(schedule: ParsedSchedule): { classes: string[]; lessons: number } {
  const classes = Object.keys(schedule).sort();
  let lessons = 0;
  for (const week of Object.values(schedule)) {
    for (const day of WEEKDAYS) {
      lessons += week[day]?.length ?? 0;
    }
  }
  return { classes, lessons };
}

export function AdminUploadManager() {
  const [uploads, setUploads] = useState<UploadData[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [status, setStatus] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadUploads = useCallback(async () => {
    try {
      const res = await adminFetchUploads();
      setUploads(res.uploads);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Uploads konnten nicht geladen werden.');
    }
  }, []);

  useEffect(() => {
    loadUploads();
  }, [loadUploads]);

  function resetSelection() {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  /**
   * Das PDF wird direkt hier im Browser ausgewertet — der Server bekommt
   * anschließend nur noch das Ergebnis. So sieht die Redaktion vor dem
   * Hochladen, ob die Klassen richtig erkannt wurden.
   */
  async function handleFileSelected() {
    const file = fileInputRef.current?.files?.[0];
    setPreview(null);

    if (!file) {
      setStatus('');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setStatus('Nur PDF-Dateien sind erlaubt.');
      return;
    }

    setIsBusy(true);
    setStatus(`${file.name} wird ausgewertet …`);

    try {
      const schedule = await parseTimetableFileInBrowser(file);
      const { classes, lessons } = summarize(schedule);

      if (classes.length === 0 || lessons === 0) {
        setStatus('Im PDF wurde kein Stundenplan erkannt. Stimmt das Format der Datei?');
        return;
      }

      setPreview({ file, schedule, classes, lessons });
      setStatus('Auswertung fertig. Bitte prüfen und dann hochladen.');
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? `Auswertung fehlgeschlagen: ${error.message}` : 'Auswertung fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUpload() {
    if (!preview) return;

    setIsBusy(true);
    setStatus(`${preview.file.name} wird hochgeladen …`);

    try {
      await adminUploadTimetable(preview.file, preview.schedule);
      setStatus(`${preview.file.name} hochgeladen. Jetzt noch aktivieren, damit der Plan sichtbar wird.`);
      resetSelection();
      await loadUploads();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Upload fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleActivate(upload: UploadData) {
    setIsBusy(true);
    try {
      await adminActivateUpload(upload.id);
      setStatus(`${upload.filename} ist jetzt der aktive Stundenplan.`);
      await loadUploads();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Aktivierung fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete(upload: UploadData) {
    if (!confirm(`Upload "${upload.filename}" wirklich löschen?`)) return;
    setIsBusy(true);
    try {
      await adminDeleteUpload(upload.id);
      setStatus(`${upload.filename} gelöscht.`);
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

        <label className="block text-sm font-medium">
          PDF-Datei
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileSelected}
            disabled={isBusy}
            className="mt-1 block w-full text-sm"
          />
        </label>

        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Dateiname möglichst nach dem Muster <code>Stundenplan_kw_XX_HjY_YYYY_YY.pdf</code> —
          daraus werden Kalenderwoche und Halbjahr übernommen.
        </p>

        {preview && (
          <div className="mt-4 rounded border border-blue-300 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-950">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              {preview.classes.length} Klassen mit {preview.lessons} Stunden erkannt
            </p>
            <p className="mt-1 break-words text-blue-800 dark:text-blue-200">
              {preview.classes.join(' · ')}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleUpload}
                disabled={isBusy}
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                Hochladen
              </button>
              <button
                type="button"
                onClick={() => { resetSelection(); setStatus(''); }}
                disabled={isBusy}
                className="rounded border border-gray-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-gray-700"
              >
                Verwerfen
              </button>
            </div>
          </div>
        )}

        {status && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{status}</p>}
      </div>

      <div className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Uploads</h2>
          <button type="button" onClick={loadUploads} className="text-sm text-blue-600 underline">
            Aktualisieren
          </button>
        </div>

        {uploads.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Noch keine Uploads vorhanden.</p>
        ) : (
          <div className="space-y-2">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="flex flex-wrap items-center gap-3 rounded border border-gray-200 p-3 dark:border-gray-700"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{upload.filename}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(upload.file_size)}
                    {upload.calendar_week != null && ` · KW ${upload.calendar_week}`}
                    {upload.half_year != null && ` · Hj ${upload.half_year}`}
                    {` · ${upload.class_count} Klassen · ${upload.entry_count} Stunden`}
                    {` · ${new Date(upload.created_at).toLocaleDateString('de-DE')}`}
                  </p>
                  {upload.parse_error && (
                    <p className="mt-1 text-xs text-red-600">{upload.parse_error}</p>
                  )}
                </div>

                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[upload.status] ?? ''}`}>
                  {STATUS_LABELS[upload.status] ?? upload.status}
                </span>

                <div className="flex gap-1">
                  {upload.status !== 'active' && upload.entry_count > 0 && (
                    <button
                      type="button"
                      onClick={() => handleActivate(upload)}
                      disabled={isBusy}
                      className="rounded bg-green-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                    >
                      Aktivieren
                    </button>
                  )}
                  {upload.status !== 'active' && (
                    <button
                      type="button"
                      onClick={() => handleDelete(upload)}
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
