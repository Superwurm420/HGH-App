'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  adminFetchEvents,
  adminCreateEvent,
  adminUpdateEvent,
  adminDeleteEvent,
  type EventData,
} from '@/lib/api/client';

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'Allgemein' },
  { value: 'exam', label: 'Klausur/Prüfung' },
  { value: 'holiday', label: 'Feiertag/Frei' },
  { value: 'project', label: 'Projekt' },
  { value: 'other', label: 'Sonstiges' },
];

type FormState = {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  category: string;
  classes: string;
};

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  all_day: true,
  category: 'general',
  classes: '',
};

export function AdminEventEditor() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      const res = await adminFetchEvents();
      setEvents(res.events);
    } catch {
      setStatus('Fehler beim Laden der Termine.');
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setStatus('Titel ist erforderlich.');
      return;
    }
    if (!form.start_date.trim()) {
      setStatus('Startdatum ist erforderlich.');
      return;
    }

    setIsBusy(true);
    try {
      const payload = {
        ...form,
        end_date: form.end_date || undefined,
        all_day: form.all_day ? 1 : 0,
      };

      if (selectedId) {
        await adminUpdateEvent(selectedId, payload);
        setStatus(`Termin "${form.title}" aktualisiert.`);
      } else {
        await adminCreateEvent(payload);
        setStatus(`Termin "${form.title}" erstellt.`);
        setForm(EMPTY_FORM);
        setSelectedId(null);
      }
      await loadEvents();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Speichern fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Termin "${title}" wirklich löschen?`)) return;
    setIsBusy(true);
    try {
      await adminDeleteEvent(id);
      setStatus(`Termin "${title}" gelöscht.`);
      if (selectedId === id) {
        setSelectedId(null);
        setForm(EMPTY_FORM);
      }
      await loadEvents();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Löschen fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  function selectEvent(event: EventData) {
    setSelectedId(event.id);
    setForm({
      title: event.title,
      description: event.description,
      start_date: event.start_date,
      end_date: event.end_date ?? '',
      all_day: event.all_day === 1,
      category: event.category,
      classes: event.classes,
    });
    setStatus(`Termin "${event.title}" geladen.`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <div className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
        <h2 className="mb-4 text-lg font-semibold">
          {selectedId ? 'Termin bearbeiten' : 'Neuer Termin'}
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
            Startdatum *
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => updateField('start_date', e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
          <label className="block text-sm font-medium">
            Enddatum (optional)
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => updateField('end_date', e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium">
            Kategorie
            <select
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
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

        <label className="mt-4 block text-sm font-medium">
          Beschreibung
          <textarea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={4}
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
        <h2 className="mb-2 text-lg font-semibold">Vorhandene Termine</h2>
        <ul className="max-h-96 space-y-2 overflow-auto text-sm">
          {events.map((event) => (
            <li key={event.id} className="rounded border border-gray-200 p-2 dark:border-gray-700">
              <button
                type="button"
                onClick={() => selectEvent(event)}
                className="block w-full text-left font-medium text-blue-700 underline"
              >
                {event.title}
              </button>
              <p className="mt-1 text-xs text-gray-500">
                {event.start_date}
                {event.end_date ? ` – ${event.end_date}` : ''}
              </p>
              <button
                type="button"
                onClick={() => handleDelete(event.id, event.title)}
                disabled={isBusy}
                className="mt-2 rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50"
              >
                Löschen
              </button>
            </li>
          ))}
          {events.length === 0 && (
            <li className="text-sm text-gray-500">Noch keine Termine vorhanden.</li>
          )}
        </ul>
      </aside>
    </div>
  );
}
