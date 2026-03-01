'use client';

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AnnouncementFormData,
  ValidationIssue,
  fromLocalDateTimeInput,
  getDefaultAnnouncementFormData,
  parseAnnouncementTxt,
  serializeAnnouncementTxt,
  toLocalDateTimeInput,
  validateAnnouncementForm,
} from '@/lib/announcements/editor';

type ApiFileEntry = {
  file: string;
  raw: string;
  parsed: AnnouncementFormData;
  issues: ValidationIssue[];
};

const audienceOptions = ['alle', 'Schülerinnen und Schüler', 'Lehrkräfte', 'Eltern', 'Ausbildungspartner'];

function FieldError({ issues, field }: { issues: ValidationIssue[]; field: keyof AnnouncementFormData }) {
  const relevant = issues.filter((issue) => issue.field === field);
  if (relevant.length === 0) return null;

  return (
    <ul className="mt-1 space-y-1 text-sm">
      {relevant.map((issue, idx) => (
        <li key={`${field}-${idx}`} className={issue.severity === 'error' ? 'text-red-600' : 'text-yellow-700'}>
          {issue.message}
        </li>
      ))}
    </ul>
  );
}

function localNowRoundedToFiveMinutes(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  const minutes = now.getMinutes();
  const rounded = Math.ceil(minutes / 5) * 5;
  now.setMinutes(rounded);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(
    now.getHours(),
  ).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function AdminAnnouncementEditor() {
  const [filename, setFilename] = useState('neuer_eintrag');
  const [formData, setFormData] = useState<AnnouncementFormData>(getDefaultAnnouncementFormData());
  const [savedFiles, setSavedFiles] = useState<ApiFileEntry[]>([]);
  const [status, setStatus] = useState('Bereit.');

  const issues = useMemo(() => validateAnnouncementForm(formData), [formData]);
  const hasErrors = issues.some((issue) => issue.severity === 'error');

  const selectableAudienceOptions = useMemo(() => {
    const trimmed = formData.audience.trim();
    if (!trimmed || audienceOptions.includes(trimmed)) return audienceOptions;
    return [trimmed, ...audienceOptions];
  }, [formData.audience]);

  const loadFiles = useCallback(async () => {
    const response = await fetch('/api/admin/announcements', { cache: 'no-store' });
    if (!response.ok) {
      setStatus('Fehler beim Laden der vorhandenen Dateien.');
      return;
    }
    const payload = (await response.json()) as { files: ApiFileEntry[] };
    setSavedFiles(payload.files);
  }, []);

  useEffect(() => {
    loadFiles().catch(() => setStatus('Fehler beim Laden der vorhandenen Dateien.'));
  }, [loadFiles]);

  function updateField<K extends keyof AnnouncementFormData>(key: K, value: AnnouncementFormData[K]) {
    setFormData((previous) => ({ ...previous, [key]: value }));
  }

  function handleImportText(event: ChangeEvent<HTMLTextAreaElement>) {
    const imported = event.target.value;
    const parsed = parseAnnouncementTxt(imported);
    setFormData(parsed);
    setStatus('TXT-Inhalt importiert (lokal, noch nicht gespeichert).');
  }

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const parsed = parseAnnouncementTxt(content);
      setFormData(parsed);
      setFilename(file.name.replace(/\.txt$/i, ''));
      setStatus(`Datei „${file.name}“ importiert (lokal, noch nicht gespeichert).`);
    };
    reader.readAsText(file, 'utf8');
  }

  function exportTxt() {
    const txt = serializeAnnouncementTxt(formData);
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename || 'announcement'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('TXT-Datei exportiert.');
  }

  async function saveOnServer() {
    const response = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, data: formData }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.error ?? 'Speichern fehlgeschlagen.');
      return;
    }

    setStatus(`Gespeichert als ${payload.file}.`);
    await loadFiles();
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <div className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
        <label className="mb-3 block text-sm font-medium">
          Dateiname (ohne .txt)
          <input
            value={filename}
            onChange={(event) => setFilename(event.target.value)}
            className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>

        <label className="block text-sm font-medium">
          Titel *
          <input
            value={formData.title}
            onChange={(event) => updateField('title', event.target.value)}
            className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <FieldError issues={issues} field="title" />
        </label>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Start (Datum + Uhrzeit)</label>
            <input
              type="datetime-local"
              value={toLocalDateTimeInput(formData.date)}
              onChange={(event) => updateField('date', fromLocalDateTimeInput(event.target.value))}
              className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => updateField('date', fromLocalDateTimeInput(localNowRoundedToFiveMinutes()))}
                className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700"
              >
                Jetzt
              </button>
              <button
                type="button"
                onClick={() => updateField('date', '')}
                className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700"
              >
                Leeren
              </button>
            </div>
            <FieldError issues={issues} field="date" />
          </div>

          <div>
            <label className="block text-sm font-medium">Ende/Ablauf (optional)</label>
            <input
              type="datetime-local"
              value={toLocalDateTimeInput(formData.expires)}
              onChange={(event) => updateField('expires', fromLocalDateTimeInput(event.target.value))}
              className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => updateField('expires', '')}
                className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700"
              >
                Keine Ablaufzeit
              </button>
            </div>
            <FieldError issues={issues} field="expires" />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium">
            Zielgruppe
            <select
              value={formData.audience}
              onChange={(event) => updateField('audience', event.target.value)}
              className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
            >
              {selectableAudienceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium">
            Klassen (optional, z. B. HT11, G21)
            <input
              value={formData.classes}
              onChange={(event) => updateField('classes', event.target.value)}
              placeholder="leer = alle Klassen"
              className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
        </div>

        <label className="mt-4 flex items-center gap-3 rounded border border-gray-300 p-3 text-sm dark:border-gray-700">
          <input
            type="checkbox"
            checked={formData.anzeige.trim().toLowerCase() === 'ja'}
            onChange={(event) => updateField('anzeige', event.target.checked ? 'ja' : 'nein')}
          />
          Als Sondertermin oberhalb des Stundenplans anzeigen
        </label>

        <label className="mt-4 block text-sm font-medium">
          Text (body)
          <textarea
            value={formData.body}
            onChange={(event) => updateField('body', event.target.value)}
            rows={8}
            className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <FieldError issues={issues} field="body" />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={exportTxt} className="rounded bg-blue-600 px-3 py-2 text-white" type="button">
            TXT exportieren
          </button>
          <button
            onClick={saveOnServer}
            disabled={hasErrors}
            className="rounded bg-emerald-600 px-3 py-2 text-white disabled:opacity-50"
            type="button"
          >
            Auf Server speichern
          </button>
        </div>

        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Status: {status}</p>
      </div>

      <aside className="space-y-4 rounded-lg border border-gray-300 p-4 dark:border-gray-700">
        <div>
          <h2 className="mb-2 text-lg font-semibold">TXT importieren</h2>
          <input type="file" accept=".txt,text/plain" onChange={handleFileUpload} className="mb-2 block w-full text-sm" />
          <textarea
            placeholder="Oder TXT hier einfügen ..."
            onChange={handleImportText}
            rows={6}
            className="w-full rounded border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">Vorhandene Dateien</h2>
          <ul className="max-h-80 space-y-2 overflow-auto text-sm">
            {savedFiles.map((entry) => (
              <li key={entry.file} className="rounded border border-gray-300 p-2 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setFilename(entry.file.replace(/\.txt$/i, ''));
                    setFormData(entry.parsed);
                    setStatus(`Datei „${entry.file}“ geladen.`);
                  }}
                  className="font-medium text-blue-700 underline"
                >
                  {entry.file}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </section>
  );
}
