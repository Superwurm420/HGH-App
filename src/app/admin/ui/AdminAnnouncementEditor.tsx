'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AnnouncementFormData,
  ValidationIssue,
  fromLocalDateTimeInput,
  getDefaultAnnouncementFormData,
  toLocalDateTimeInput,
  validateAnnouncementForm,
} from '@/lib/announcements/editor';
import { formatApiStatus, parseApiError, parseRequestFailure } from './apiError';

type ApiFileEntry = {
  id: string;
  file: string;
  data: AnnouncementFormData;
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
  const [formData, setFormData] = useState<AnnouncementFormData>(getDefaultAnnouncementFormData());
  const [savedFiles, setSavedFiles] = useState<ApiFileEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState('Bereit.');
  const [error, setError] = useState<string | null>(null);
  const [lastApiStatus, setLastApiStatus] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const issues = useMemo(() => validateAnnouncementForm(formData), [formData]);
  const hasErrors = issues.some((issue) => issue.severity === 'error');

  const selectableAudienceOptions = useMemo(() => {
    const trimmed = formData.audience.trim();
    if (!trimmed || audienceOptions.includes(trimmed)) return audienceOptions;
    return [trimmed, ...audienceOptions];
  }, [formData.audience]);

  const loadFiles = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/announcements', { cache: 'no-store' });
      setLastApiStatus(formatApiStatus(response));
      if (!response.ok) {
        const apiError = await parseApiError(response);
        setError(apiError.message);
        setStatus('Fehler beim Laden der vorhandenen Termine.');
        return;
      }

      const payload = (await response.json()) as { files: ApiFileEntry[] };
      setSavedFiles(payload.files);
      setError(null);
    } catch (caughtError) {
      const apiError = parseRequestFailure(caughtError);
      setLastApiStatus(null);
      setError(apiError.message);
      setStatus('Fehler beim Laden der Termine.');
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  function updateField<K extends keyof AnnouncementFormData>(key: K, value: AnnouncementFormData[K]) {
    setFormData((previous) => ({ ...previous, [key]: value }));
  }

  async function createEntry() {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formData }),
      });
      setLastApiStatus(formatApiStatus(response));

      if (!response.ok) {
        const apiError = await parseApiError(response);
        setError(apiError.message);
        setStatus('Speichern fehlgeschlagen.');
        return;
      }

      setStatus('Termin gespeichert.');
      setError(null);
      setFormData(getDefaultAnnouncementFormData());
      setSelectedId(null);
      await loadFiles();
    } catch (caughtError) {
      const apiError = parseRequestFailure(caughtError);
      setLastApiStatus(null);
      setError(apiError.message);
      setStatus('Speichern fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  async function updateEntry() {
    if (!selectedId) return;
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId, data: formData }),
      });
      setLastApiStatus(formatApiStatus(response));

      if (!response.ok) {
        const apiError = await parseApiError(response);
        setError(apiError.message);
        setStatus('Aktualisieren fehlgeschlagen.');
        return;
      }

      setStatus('Termin aktualisiert.');
      setError(null);
      await loadFiles();
    } catch (caughtError) {
      const apiError = parseRequestFailure(caughtError);
      setLastApiStatus(null);
      setError(apiError.message);
      setStatus('Aktualisieren fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  async function deleteEntry(id: string) {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setLastApiStatus(formatApiStatus(response));

      if (!response.ok) {
        const apiError = await parseApiError(response);
        setError(apiError.message);
        setStatus('Löschen fehlgeschlagen.');
        return;
      }

      if (selectedId === id) {
        setSelectedId(null);
        setFormData(getDefaultAnnouncementFormData());
      }
      setStatus('Termin gelöscht.');
      setError(null);
      await loadFiles();
    } catch (caughtError) {
      const apiError = parseRequestFailure(caughtError);
      setLastApiStatus(null);
      setError(apiError.message);
      setStatus('Löschen fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <div className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Termin-Editor</h2>
        </div>

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
            <label className="block text-sm font-medium">Start (Datum + Uhrzeit) *</label>
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
          <button
            onClick={() => createEntry()}
            disabled={hasErrors || isBusy}
            className="rounded bg-emerald-600 px-3 py-2 text-white disabled:opacity-50"
            type="button"
          >
            Neuer Termin speichern
          </button>
          <button
            onClick={() => updateEntry()}
            disabled={hasErrors || !selectedId || isBusy}
            className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
            type="button"
          >
            Ausgewählten Termin aktualisieren
          </button>
          <button
            onClick={() => {
              setSelectedId(null);
              setFormData(getDefaultAnnouncementFormData());
              setStatus('Formular zurückgesetzt.');
            }}
            className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700"
            type="button"
          >
            Neues Formular
          </button>
        </div>

        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Status: {status}</p>
        {lastApiStatus ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Letzter API-Status: {lastApiStatus}</p> : null}
        {error ? <p className="mt-1 text-sm text-red-600">Fehler: {error}</p> : null}
      </div>

      <aside className="space-y-4 rounded-lg border border-gray-300 p-4 dark:border-gray-700">
        <div>
          <h2 className="mb-2 text-lg font-semibold">Vorhandene Termine</h2>
          <ul className="max-h-96 space-y-2 overflow-auto text-sm">
            {savedFiles.map((entry) => (
              <li key={entry.id} className="rounded border border-gray-300 p-2 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(entry.id);
                    setFormData(entry.data);
                    setStatus(`Termin „${entry.data.title || entry.file}“ geladen.`);
                  }}
                  className="block w-full text-left font-medium text-blue-700 underline"
                >
                  {entry.data.title || entry.file}
                </button>
                <p className="mt-1 text-xs text-gray-500">{entry.data.date || 'ohne Datum'}</p>
                <button
                  type="button"
                  onClick={() => deleteEntry(entry.id)}
                  className="mt-2 rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                >
                  Löschen
                </button>
              </li>
            ))}
            {savedFiles.length === 0 && <li className="text-sm text-gray-500">Noch keine Termine vorhanden.</li>}
          </ul>
        </div>
      </aside>
    </section>
  );
}
