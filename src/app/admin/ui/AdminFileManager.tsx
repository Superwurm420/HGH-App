'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type FileCategory = 'stundenplan' | 'meldungen' | 'ferien';

type ManagedFile = {
  key: string;
  name: string;
  category: FileCategory;
  size: number;
  updatedAt: string | null;
};

type ApiResponse = {
  categories: FileCategory[];
  filesByCategory: Record<FileCategory, ManagedFile[]>;
};

const labels: Record<FileCategory, string> = {
  stundenplan: 'Stundenplan',
  meldungen: 'Meldungen',
  ferien: 'Ferien',
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


function acceptedFileTypes(category: FileCategory): string {
  if (category === 'stundenplan') return '.pdf,application/pdf';
  return '.json,application/json';
}

export function AdminFileManager() {
  const [filesByCategory, setFilesByCategory] = useState<Record<FileCategory, ManagedFile[]>>({
    stundenplan: [],
    meldungen: [],
    ferien: [],
  });
  const [selectedFiles, setSelectedFiles] = useState<Partial<Record<FileCategory, File>>>({});
  const [status, setStatus] = useState('Bereit.');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const categories = useMemo(() => Object.keys(labels) as FileCategory[], []);

  const loadFiles = useCallback(async () => {
    const response = await fetch('/api/admin/files', { cache: 'no-store' });
    const payload = (await response.json()) as ApiResponse & { error?: string };
    if (!response.ok) {
      setError(payload.error ?? 'Dateien konnten nicht geladen werden.');
      return;
    }

    setError(null);
    setFilesByCategory(payload.filesByCategory);
  }, []);

  useEffect(() => {
    loadFiles().catch(() => setError('Dateien konnten nicht geladen werden.'));
  }, [loadFiles]);

  async function upload(category: FileCategory) {
    const file = selectedFiles[category];
    if (!file) {
      setError('Bitte zuerst eine Datei auswählen.');
      return;
    }

    setIsBusy(true);
    setError(null);

    const formData = new FormData();
    formData.append('category', category);
    formData.append('file', file);

    const response = await fetch('/api/admin/files', {
      method: 'POST',
      body: formData,
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? 'Upload fehlgeschlagen.');
      setStatus('Upload fehlgeschlagen.');
      setIsBusy(false);
      return;
    }

    setSelectedFiles((prev) => ({ ...prev, [category]: undefined }));
    setStatus(`${labels[category]} erfolgreich gespeichert.`);
    await loadFiles();
    setIsBusy(false);
  }

  async function remove(category: FileCategory, key?: string) {
    setIsBusy(true);
    setError(null);

    const response = await fetch('/api/admin/files', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, key }),
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? 'Löschen fehlgeschlagen.');
      setStatus('Löschen fehlgeschlagen.');
      setIsBusy(false);
      return;
    }

    setStatus(`${labels[category]} gelöscht.`);
    await loadFiles();
    setIsBusy(false);
  }

  return (
    <section className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
      <h2 className="mb-2 text-lg font-semibold">Dateiverwaltung</h2>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
        Upload, Ersetzen und Löschen für Stundenplan, Meldungen und Ferien.
      </p>

      <div className="space-y-6">
        {categories.map((category) => {
          const entries = filesByCategory[category] ?? [];
          return (
            <article key={category} className="rounded border border-gray-200 p-3 dark:border-gray-700">
              <h3 className="text-base font-semibold">{labels[category]}</h3>

              <ul className="mt-2 space-y-2 text-sm">
                {entries.map((entry) => (
                  <li key={entry.key} className="rounded border border-gray-200 p-2 dark:border-gray-700">
                    <p className="font-medium">{entry.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {formatSize(entry.size)} · aktualisiert: {formatDate(entry.updatedAt)}
                    </p>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => remove(category, entry.key).catch(() => setError('Löschen fehlgeschlagen.'))}
                      className="mt-2 rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50"
                    >
                      Löschen
                    </button>
                  </li>
                ))}
                {entries.length === 0 && <li className="text-xs text-gray-500">Keine Datei vorhanden.</li>}
              </ul>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept={acceptedFileTypes(category)}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    setSelectedFiles((prev) => ({ ...prev, [category]: file }));
                  }}
                  className="max-w-xs text-sm"
                />
                <button
                  type="button"
                  disabled={isBusy || !selectedFiles[category]}
                  onClick={() => upload(category).catch(() => setError('Upload fehlgeschlagen.'))}
                  className="rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                >
                  Upload / Ersetzen
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-gray-700 dark:text-gray-200">Status: {status}</p>
      {error ? <p className="mt-1 text-sm text-red-600">Fehler: {error}</p> : null}
    </section>
  );
}
