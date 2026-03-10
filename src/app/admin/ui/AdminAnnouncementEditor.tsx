'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  adminFetchAnnouncements,
  adminCreateAnnouncement,
  adminUpdateAnnouncement,
  adminDeleteAnnouncement,
  type AnnouncementData,
} from '@/lib/api/client';

const AUDIENCE_OPTIONS = ['alle', 'Schülerinnen und Schüler', 'Lehrkräfte', 'Eltern', 'Ausbildungspartner'];

type FormState = {
  title: string;
  body: string;
  date: string;
  expires: string;
  audience: string;
  classes: string;
  highlight: boolean;
};

const EMPTY_FORM: FormState = {
  title: '',
  body: '',
  date: '',
  expires: '',
  audience: 'alle',
  classes: '',
  highlight: false,
};

function toDateTimeLocal(isoOrGerman: string): string {
  if (!isoOrGerman) return '';
  // Versuche DD.MM.YYYY HH:mm
  const deMatch = isoOrGerman.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/);
  if (deMatch) {
    return `${deMatch[3]}-${deMatch[2]}-${deMatch[1]}T${deMatch[4]}:${deMatch[5]}`;
  }
  // ISO
  if (isoOrGerman.includes('T')) return isoOrGerman.slice(0, 16);
  return isoOrGerman;
}

function fromDateTimeLocal(value: string): string {
  if (!value) return '';
  // Konvertiere YYYY-MM-DDTHH:mm zu DD.MM.YYYY HH:mm
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (match) {
    return `${match[3]}.${match[2]}.${match[1]} ${match[4]}:${match[5]}`;
  }
  return value;
}

export function AdminAnnouncementEditor() {
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await adminFetchAnnouncements();
      setAnnouncements(res.announcements);
    } catch {
      setStatus('Fehler beim Laden der Ankündigungen.');
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setStatus('Titel ist erforderlich.');
      return;
    }
    if (!form.date.trim()) {
      setStatus('Datum ist erforderlich.');
      return;
    }

    setIsBusy(true);
    try {
      const payload = {
        title: form.title,
        body: form.body,
        date: form.date,
        expires: form.expires || undefined,
        audience: form.audience,
        classes: form.classes,
        highlight: form.highlight ? 1 : 0,
      };

      if (selectedId) {
        await adminUpdateAnnouncement(selectedId, payload);
        setStatus(`Ankündigung "${form.title}" aktualisiert.`);
      } else {
        await adminCreateAnnouncement(payload);
        setStatus(`Ankündigung "${form.title}" erstellt.`);
        setForm(EMPTY_FORM);
        setSelectedId(null);
      }
      await loadAnnouncements();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Speichern fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Ankündigung "${title}" wirklich löschen?`)) return;
    setIsBusy(true);
    try {
      await adminDeleteAnnouncement(id);
      setStatus(`Ankündigung "${title}" gelöscht.`);
      if (selectedId === id) {
        setSelectedId(null);
        setForm(EMPTY_FORM);
      }
      await loadAnnouncements();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Löschen fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  function selectAnnouncement(a: AnnouncementData) {
    setSelectedId(a.id);
    setForm({
      title: a.title,
      body: a.body,
      date: a.date,
      expires: a.expires ?? '',
      audience: a.audience,
      classes: a.classes,
      highlight: a.highlight === 1,
    });
    setStatus(`Ankündigung "${a.title}" geladen.`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <div className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
        <h2 className="mb-4 text-lg font-semibold">
          {selectedId ? 'Ankündigung bearbeiten' : 'Neue Ankündigung'}
        </h2>

        <label className="block text-sm font-medium">
          Titel *
          <input
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium">
            Start (Datum + Uhrzeit) *
            <input
              type="datetime-local"
              value={toDateTimeLocal(form.date)}
              onChange={(e) => updateField('date', fromDateTimeLocal(e.target.value))}
              className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
          <label className="block text-sm font-medium">
            Ende/Ablauf (optional)
            <input
              type="datetime-local"
              value={toDateTimeLocal(form.expires)}
              onChange={(e) => updateField('expires', fromDateTimeLocal(e.target.value))}
              className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium">
            Zielgruppe
            <select
              value={form.audience}
              onChange={(e) => updateField('audience', e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
            >
              {AUDIENCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Klassen (optional)
            <input
              value={form.classes}
              onChange={(e) => updateField('classes', e.target.value)}
              placeholder="z.B. HT11, G21"
              className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
        </div>

        <label className="mt-4 flex items-center gap-3 rounded border border-gray-300 p-3 text-sm dark:border-gray-700">
          <input
            type="checkbox"
            checked={form.highlight}
            onChange={(e) => updateField('highlight', e.target.checked)}
          />
          Als Sondertermin oberhalb des Stundenplans anzeigen
        </label>

        <label className="mt-4 block text-sm font-medium">
          Text
          <textarea
            value={form.body}
            onChange={(e) => updateField('body', e.target.value)}
            rows={6}
            className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isBusy}
            className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {selectedId ? 'Aktualisieren' : 'Erstellen'}
          </button>
          {selectedId && (
            <button
              type="button"
              onClick={() => { setSelectedId(null); setForm(EMPTY_FORM); setStatus('Formular zurückgesetzt.'); }}
              className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
            >
              Neues Formular
            </button>
          )}
        </div>

        {status && <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{status}</p>}
      </div>

      <aside className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
        <h2 className="mb-2 text-lg font-semibold">Vorhandene Ankündigungen</h2>
        <ul className="max-h-96 space-y-2 overflow-auto text-sm">
          {announcements.map((a) => (
            <li key={a.id} className="rounded border border-gray-200 p-2 dark:border-gray-700">
              <button
                type="button"
                onClick={() => selectAnnouncement(a)}
                className="block w-full text-left font-medium text-blue-700 underline"
              >
                {a.title || 'Ohne Titel'}
              </button>
              <p className="mt-1 text-xs text-gray-500">{a.date || 'ohne Datum'}</p>
              <button
                type="button"
                onClick={() => handleDelete(a.id, a.title)}
                disabled={isBusy}
                className="mt-2 rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50"
              >
                Löschen
              </button>
            </li>
          ))}
          {announcements.length === 0 && (
            <li className="text-sm text-gray-500">Noch keine Ankündigungen vorhanden.</li>
          )}
        </ul>
      </aside>
    </div>
  );
}
