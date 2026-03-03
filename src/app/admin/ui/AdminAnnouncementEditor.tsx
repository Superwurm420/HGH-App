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

type ApiFileEntry = {
  id: string;
  file: string;
  data: AnnouncementFormData;
};

type AnnouncementListEntry = {
  id: string;
  file: string;
  data: AnnouncementFormData;
  hasDataError: boolean;
  dataErrorMessage: string;
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
  const [savedFiles, setSavedFiles] = useState<AnnouncementListEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState('Bereit.');
  const [isBusy, setIsBusy] = useState(false);

  const issues = useMemo(() => validateAnnouncementForm(formData), [formData]);
  const hasErrors = issues.some((issue) => issue.severity === 'error');

  const selectableAudienceOptions = useMemo(() => {
    const trimmed = formData.audience.trim();
    if (!trimmed || audienceOptions.includes(trimmed)) return audienceOptions;
    return [trimmed, ...audienceOptions];
  }, [formData.audience]);

  const loadEntries = useCallback(async () => {
    const response = await fetch('/api/admin/announcements', { cache: 'no-store' });
    if (!response.ok) {
      setStatus('Fehler beim Laden der vorhandenen Termine.');
      return;
    }
    const payload = (await response.json()) as { files: ApiFileEntry[] };
    const normalized = payload.files.map((entry) => {
      const missingTitle = !entry.data?.title;
      const missingDate = !entry.data?.date;
      const errors: string[] = [];

      if (missingTitle) errors.push('Titel fehlt');
      if (missingDate) errors.push('Datum fehlt');

      return {
        ...entry,
        hasDataError: errors.length > 0,
        dataErrorMessage: errors.join(', '),
      };
    });

    setSavedFiles(normalized);

    setSelectedId((previousSelectedId) => {
      if (!previousSelectedId) return null;
      const stillExists = normalized.some((entry) => entry.id === previousSelectedId);
      if (stillExists) return previousSelectedId;

      setFormData(getDefaultAnnouncementFormData());
      return null;
    });
  }, []);

  useEffect(() => {
    loadEntries().catch(() => setStatus('Fehler beim Laden der Termine.'));
  }, [loadEntries]);

  function updateField<K extends keyof AnnouncementFormData>(key: K, value: AnnouncementFormData[K]) {
    setFormData((previous) => ({ ...previous, [key]: value }));
  }

  async function createEntry() {
    setIsBusy(true);
    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formData }),
      });

      const payload = (await response.json()) as { error?: string; data?: AnnouncementFormData; file?: string; issues?: ValidationIssue[] };
      if (!response.ok) {
        setStatus(payload.error ?? `Speichern von „${formData.title || 'Neuer Termin'}“ fehlgeschlagen.`);
        return;
      }

      const optimisticName = payload.data?.title || payload.file || formData.title || 'Neuer Termin';
      setStatus(`Termin „${optimisticName}“ gespeichert. Liste wird aktualisiert …`);
      setFormData(getDefaultAnnouncementFormData());
      setSelectedId(null);
    } finally {
      await loadEntries();
      setIsBusy(false);
    }
  }

  async function updateEntry() {
    if (!selectedId) return;
    setIsBusy(true);
    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId, data: formData }),
      });

      const payload = (await response.json()) as { error?: string; data?: AnnouncementFormData; file?: string };
      if (!response.ok) {
        setStatus(payload.error ?? `Aktualisieren von „${formData.title || selectedId}“ fehlgeschlagen.`);
        return;
      }

      const optimisticName = payload.data?.title || payload.file || formData.title || selectedId;
      setStatus(`Termin „${optimisticName}“ aktualisiert. Liste wird aktualisiert …`);
    } finally {
      await loadEntries();
      setIsBusy(false);
    }
  }

  async function deleteEntry(id: string) {
    setIsBusy(true);
    const deletedEntry = savedFiles.find((entry) => entry.id === id);

    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus(payload.error ?? `Löschen von „${deletedEntry?.data.title || deletedEntry?.file || id}“ fehlgeschlagen.`);
        return;
      }

      setStatus(`Termin „${deletedEntry?.data.title || deletedEntry?.file || id}“ gelöscht. Liste wird aktualisiert …`);
    } finally {
      await loadEntries();
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
            onClick={() => createEntry().catch(() => setStatus('Speichern fehlgeschlagen.'))}
            disabled={hasErrors || isBusy}
            className="rounded bg-emerald-600 px-3 py-2 text-white disabled:opacity-50"
            type="button"
          >
            Neuer Termin speichern
          </button>
          <button
            onClick={() => updateEntry().catch(() => setStatus('Aktualisieren fehlgeschlagen.'))}
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
                    setStatus(
                      entry.hasDataError
                        ? `Fehlerhafter Termin „${entry.data.title || entry.file}“ geladen (${entry.dataErrorMessage}).`
                        : `Termin „${entry.data.title || entry.file}“ geladen.`,
                    );
                  }}
                  className="block w-full text-left font-medium text-blue-700 underline"
                >
                  {entry.data.title || entry.file}
                  {entry.hasDataError ? ' ⚠️' : ''}
                </button>
                <p className="mt-1 text-xs text-gray-500">{entry.data.date || 'ohne Datum'}</p>
                {entry.hasDataError && <p className="mt-1 text-xs text-amber-600">Datenfehler: {entry.dataErrorMessage}</p>}
                <button
                  type="button"
                  onClick={() => deleteEntry(entry.id).catch(() => setStatus('Löschen fehlgeschlagen.'))}
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
