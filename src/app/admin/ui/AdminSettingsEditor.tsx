'use client';

import { useCallback, useEffect, useState } from 'react';

import { adminFetchSettings, adminSaveSettings } from '@/lib/api/client';
import { extractGoogleCalendarIds } from '@/lib/calendar/url-normalization';
import { AdminPasswordChange } from './AdminPasswordChange';

interface HolidayRange {
  start: string;
  end: string;
}

interface FormState {
  schoolName: string;
  schoolShort: string;
  calendarUrls: string[];
  holidays: HolidayRange[];
  messages: string;
}

const EMPTY_FORM: FormState = {
  schoolName: '',
  schoolShort: '',
  calendarUrls: [],
  holidays: [],
  messages: '{}',
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return (JSON.parse(raw) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Pflege der App-Einstellungen: Kalender, Tagesmeldungen, Ferien, Schulname.
 *
 * Ohne diesen Tab lagen diese Werte zwar in der Datenbank, waren aber über
 * keine Oberfläche änderbar — Tagesmeldungen und Kalender blieben deshalb leer.
 */
export function AdminSettingsEditor() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [newCalendarUrl, setNewCalendarUrl] = useState('');
  const [status, setStatus] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { settings } = await adminFetchSettings();
      const byKey = Object.fromEntries(settings.map((row) => [row.key, row.value]));

      const rawHolidays = parseJson<HolidayRange[] | { ranges?: HolidayRange[] }>(
        byKey.school_holidays,
        [],
      );

      setForm({
        schoolName: byKey.school_name ?? '',
        schoolShort: byKey.school_short ?? '',
        calendarUrls: parseJson<string[]>(byKey.calendar_urls, []),
        holidays: Array.isArray(rawHolidays) ? rawHolidays : rawHolidays.ranges ?? [],
        messages: JSON.stringify(parseJson<unknown>(byKey.messages, {}), null, 2),
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Einstellungen konnten nicht geladen werden.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function addCalendarUrl() {
    const url = newCalendarUrl.trim();
    if (!url) return;

    if (extractGoogleCalendarIds(url).length === 0) {
      setStatus('Aus dieser Adresse lässt sich keine Google-Kalender-ID lesen. Nutze den Einbettungs-Link aus den Kalender-Einstellungen.');
      return;
    }
    if (form.calendarUrls.includes(url)) {
      setStatus('Dieser Kalender ist bereits eingetragen.');
      return;
    }

    setForm((current) => ({ ...current, calendarUrls: [...current.calendarUrls, url] }));
    setNewCalendarUrl('');
    setStatus('Kalender hinzugefügt — noch nicht gespeichert.');
  }

  function removeCalendarUrl(url: string) {
    setForm((current) => ({
      ...current,
      calendarUrls: current.calendarUrls.filter((entry) => entry !== url),
    }));
  }

  function addHoliday() {
    setForm((current) => ({ ...current, holidays: [...current.holidays, { start: '', end: '' }] }));
  }

  function updateHoliday(index: number, field: keyof HolidayRange, value: string) {
    setForm((current) => ({
      ...current,
      holidays: current.holidays.map((range, i) => (i === index ? { ...range, [field]: value } : range)),
    }));
  }

  function removeHoliday(index: number) {
    setForm((current) => ({
      ...current,
      holidays: current.holidays.filter((_, i) => i !== index),
    }));
  }

  async function save() {
    // Vor dem Speichern prüfen, damit keine unbrauchbaren Werte in der
    // Datenbank landen — die Startseite liest sie ungefragt.
    let messages: unknown;
    try {
      messages = JSON.parse(form.messages || '{}');
    } catch {
      setStatus('Die Tagesmeldungen sind kein gültiges JSON.');
      return;
    }
    if (typeof messages !== 'object' || messages === null || Array.isArray(messages)) {
      setStatus('Die Tagesmeldungen müssen ein JSON-Objekt sein.');
      return;
    }

    const holidays = form.holidays.filter((range) => range.start || range.end);
    for (const range of holidays) {
      if (!ISO_DATE.test(range.start) || !ISO_DATE.test(range.end)) {
        setStatus('Ferienzeiträume brauchen Start- und Enddatum im Format JJJJ-MM-TT.');
        return;
      }
      if (range.end < range.start) {
        setStatus(`Ferienzeitraum ${range.start} – ${range.end}: Das Ende liegt vor dem Beginn.`);
        return;
      }
    }

    setIsBusy(true);
    setStatus('Wird gespeichert …');

    try {
      await adminSaveSettings({
        school_name: form.schoolName.trim(),
        school_short: form.schoolShort.trim(),
        calendar_urls: JSON.stringify(form.calendarUrls),
        school_holidays: JSON.stringify({ ranges: holidays }),
        messages: JSON.stringify(messages),
      });
      setStatus('Einstellungen gespeichert.');
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Speichern fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  const inputClass = 'mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900';

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
        <h2 className="mb-3 text-lg font-semibold">Schule</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Name
            <input
              type="text"
              value={form.schoolName}
              onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium">
            Kurzform
            <input
              type="text"
              value={form.schoolShort}
              onChange={(e) => setForm({ ...form, schoolShort: e.target.value })}
              className={inputClass}
            />
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
        <h2 className="mb-1 text-lg font-semibold">Google-Kalender</h2>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
          Im Google Kalender unter Einstellungen → &bdquo;Kalender integrieren&ldquo; den Einbettungs-Link
          kopieren und hier einfügen. Ohne Eintrag zeigt die App den einfachen Monatskalender.
        </p>

        <div className="flex flex-wrap gap-2">
          <input
            type="url"
            value={newCalendarUrl}
            onChange={(e) => setNewCalendarUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCalendarUrl(); } }}
            placeholder="https://calendar.google.com/calendar/embed?src=…"
            className="min-w-0 flex-1 rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <button
            type="button"
            onClick={addCalendarUrl}
            className="rounded bg-blue-600 px-3 py-2 text-sm text-white"
          >
            Hinzufügen
          </button>
        </div>

        {form.calendarUrls.length > 0 && (
          <ul className="mt-3 space-y-2">
            {form.calendarUrls.map((url) => (
              <li key={url} className="flex items-center gap-2 rounded border border-gray-200 p-2 dark:border-gray-700">
                <span className="min-w-0 flex-1 truncate text-sm">{url}</span>
                <button
                  type="button"
                  onClick={() => removeCalendarUrl(url)}
                  className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                >
                  Entfernen
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ferien und freie Tage</h2>
          <button type="button" onClick={addHoliday} className="text-sm text-blue-600 underline">
            Zeitraum hinzufügen
          </button>
        </div>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
          In diesen Zeiträumen zeigt die Startseite eine Ferien-Meldung statt des Stundenplan-Countdowns.
          Gesetzliche Feiertage in Niedersachsen sind bereits fest hinterlegt.
        </p>

        {form.holidays.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Keine Ferienzeiträume eingetragen.</p>
        ) : (
          <div className="space-y-2">
            {form.holidays.map((range, index) => (
              <div key={index} className="flex flex-wrap items-end gap-2">
                <label className="text-sm font-medium">
                  Von
                  <input
                    type="date"
                    value={range.start}
                    onChange={(e) => updateHoliday(index, 'start', e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="text-sm font-medium">
                  Bis
                  <input
                    type="date"
                    value={range.end}
                    onChange={(e) => updateHoliday(index, 'end', e.target.value)}
                    className={inputClass}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeHoliday(index)}
                  className="rounded border border-red-300 px-2 py-2 text-xs text-red-600"
                >
                  Entfernen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
        <h2 className="mb-1 text-lg font-semibold">Tagesmeldungen</h2>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
          Kurze Sprüche, die auf der Startseite je nach Tageszeit erscheinen. Aufbau und Beispiele
          stehen in <code>docs/CONTENT_FORMATS.md</code>. Leer lassen mit <code>{'{}'}</code>.
        </p>
        <textarea
          value={form.messages}
          onChange={(e) => setForm({ ...form, messages: e.target.value })}
          rows={12}
          spellCheck={false}
          className="w-full rounded border border-gray-300 p-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-900"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isBusy}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Alles speichern
        </button>
        {status && <p className="text-sm text-gray-600 dark:text-gray-300">{status}</p>}
      </div>

      {/* Eigener Bereich mit eigenem Knopf — „Alles speichern" oben betrifft ihn nicht. */}
      <hr className="border-gray-200 dark:border-gray-800" />

      <AdminPasswordChange />
    </div>
  );
}
