'use client';

import { useCallback, useEffect, useState } from 'react';

type ManagedFile = {
  key: string;
  name: string;
  size: number;
  updatedAt: string | null;
};

type ApiResponse = {
  filesByCategory: { stundenplan: ManagedFile[] };
};

function formatDate(value: string | null): string {
  if (!value) return 'unbekannt';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('de-DE') : 'unbekannt';
}

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminFileManager() {
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [status, setStatus] = useState('Bereit.');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const loadFiles = useCallback(async () => {
    const response = await fetch('/api/admin/files', { cache: 'no-store' });
    const payload = (await response.json()) as ApiResponse & { error?: string };
    if (!response.ok) {
      setError(payload.error ?? 'Dateien konnten nicht geladen werden.');
      return;
    }

    setError(null);
    setFiles(payload.filesByCategory?.stundenplan ?? []);
  }, []);

  useEffect(() => {
    loadFiles().catch(() => setError('Dateien konnten nicht geladen werden.'));
  }, [loadFiles]);

  async function upload() {
    if (!selectedFile) {
      setError('Bitte zuerst eine Datei auswählen.');
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('category', 'stundenplan');
      formData.append('file', selectedFile);

      const response = await fetch('/api/admin/files', {
        method: 'POST',
        body: formData,
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? 'Upload fehlgeschlagen.');
        setStatus('Upload fehlgeschlagen.');
        return;
      }

      setSelectedFile(undefined);
      setStatus('Stundenplan erfolgreich gespeichert.');
      try { await loadFiles(); } catch { /* Liste wird beim nächsten Laden aktualisiert */ }
    } catch {
      setError('Upload fehlgeschlagen.');
      setStatus('Upload fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  async function remove(key: string) {
    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'stundenplan', key }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? 'Löschen fehlgeschlagen.');
        setStatus('Löschen fehlgeschlagen.');
        return;
      }

      setStatus('Stundenplan gelöscht.');
      try { await loadFiles(); } catch { /* Liste wird beim nächsten Laden aktualisiert */ }
    } catch {
      setError('Löschen fehlgeschlagen.');
      setStatus('Löschen fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
      <h2 className="mb-2 text-lg font-semibold">Stundenpläne</h2>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
        Upload, Ersetzen und Löschen für Stundenplan-PDFs.
      </p>

      <ul className="space-y-2 text-sm">
        {files.map((entry) => (
          <li key={entry.key} className="rounded border border-gray-200 p-2 dark:border-gray-700">
            <p className="font-medium">{entry.name}</p>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {formatSize(entry.size)} · aktualisiert: {formatDate(entry.updatedAt)}
            </p>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => remove(entry.key).catch(() => setError('Löschen fehlgeschlagen.'))}
              className="mt-2 rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50"
            >
              Löschen
            </button>
          </li>
        ))}
        {files.length === 0 && <li className="text-xs text-gray-500">Keine Stundenpläne vorhanden.</li>}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={(event) => setSelectedFile(event.currentTarget.files?.[0])}
          className="max-w-xs text-sm"
        />
        <button
          type="button"
          disabled={isBusy || !selectedFile}
          onClick={() => upload().catch(() => setError('Upload fehlgeschlagen.'))}
          className="rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Upload / Ersetzen
        </button>
      </div>

      <p className="mt-4 text-sm text-gray-700 dark:text-gray-200">Status: {status}</p>
      {error ? <p className="mt-1 text-sm text-red-600">Fehler: {error}</p> : null}
    </section>
  );
}
