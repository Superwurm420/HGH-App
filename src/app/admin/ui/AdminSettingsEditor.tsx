'use client';

import { useCallback, useEffect, useState } from 'react';

import { adminFetchSettings, adminSaveSettings } from '@/lib/api/client';
import { extractGoogleCalendarIds } from '@/lib/calendar/url-normalization';
import { AdminPasswordChange } from './AdminPasswordChange';
import { Card, Field, Status, TextArea, TextInput, adminStyles as styles } from './parts';

interface HolidayRange {
  start: string;
  end: string;
}

interface FormState {
  schoolName: string;
  calendarUrls: string[];
  holidays: HolidayRange[];
  messages: string;
}

const EMPTY_FORM: FormState = {
  schoolName: '',
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

  return (
    <div className={styles.stack}>
      <Card
        title="Überschrift des Wandbildschirms"
        hint={<>
          Dieser Name steht als Überschrift auf <code>/tv</code>, dem Wandbildschirm in der Schule —
          sonst nirgends. Die Kopfzeile der App selbst ist fest eingebaut. Leer lassen heißt:
          „Holztechnik und Gestaltung Hildesheim“.
        </>}
      >
        <Field label="Name der Schule">
          <TextInput
            type="text"
            value={form.schoolName}
            onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
            placeholder="Holztechnik und Gestaltung Hildesheim"
          />
        </Field>
      </Card>

      <Card
        title="Google-Kalender"
        hint={<>
          Im Google Kalender unter Einstellungen → &bdquo;Kalender integrieren&ldquo; den Einbettungs-Link
          kopieren und hier einfügen. Ohne Eintrag zeigt die App den einfachen Monatskalender.
        </>}
      >
        <div className={styles.row}>
          <TextInput
            type="url"
            value={newCalendarUrl}
            onChange={(e) => setNewCalendarUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCalendarUrl(); } }}
            placeholder="https://calendar.google.com/calendar/embed?src=…"
            style={{ flex: '1 1 16rem', minWidth: 0 }}
          />
          <button type="button" onClick={addCalendarUrl} className="btn">
            Hinzufügen
          </button>
        </div>

        {form.calendarUrls.length > 0 && (
          <ul className={`${styles.list} mt-3`}>
            {form.calendarUrls.map((url) => (
              <li key={url} className={`${styles.listItem} ${styles.row}`}>
                <span className="min-w-0 flex-1 truncate text-sm">{url}</span>
                <button
                  type="button"
                  onClick={() => removeCalendarUrl(url)}
                  className={`${styles.smallBtn} ${styles.danger}`}
                >
                  Entfernen
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Ferien und freie Tage"
        action={
          <button type="button" onClick={addHoliday} className={styles.linkBtn}>
            Zeitraum hinzufügen
          </button>
        }
        hint="In diesen Zeiträumen zeigt die Startseite eine Ferien-Meldung statt des Stundenplan-Countdowns. Gesetzliche Feiertage in Niedersachsen sind bereits fest hinterlegt."
      >
        {form.holidays.length === 0 ? (
          <p className={styles.empty}>Keine Ferienzeiträume eingetragen.</p>
        ) : (
          <div className={styles.stack}>
            {form.holidays.map((range, index) => (
              <div key={index} className={styles.rangeRow}>
                <Field label="Von">
                  <TextInput
                    type="date"
                    value={range.start}
                    onChange={(e) => updateHoliday(index, 'start', e.target.value)}
                  />
                </Field>
                <Field label="Bis">
                  <TextInput
                    type="date"
                    value={range.end}
                    onChange={(e) => updateHoliday(index, 'end', e.target.value)}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => removeHoliday(index)}
                  className={`${styles.smallBtn} ${styles.danger}`}
                  aria-label={`Zeitraum ${index + 1} entfernen`}
                >
                  Entfernen
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Tagesmeldungen"
        hint={<>
          Kurze Sprüche, die auf der Startseite je nach Tageszeit erscheinen. Aufbau und Beispiele
          stehen in <code>docs/CONTENT_FORMATS.md</code>. Leer lassen mit <code>{'{}'}</code>.
        </>}
      >
        <TextArea
          value={form.messages}
          onChange={(e) => setForm({ ...form, messages: e.target.value })}
          rows={12}
          spellCheck={false}
          className={styles.mono}
        />
      </Card>

      <div className={styles.row}>
        <button type="button" onClick={save} disabled={isBusy} className="btn">
          Alles speichern
        </button>
        <Status text={status} />
      </div>

      {/* Eigener Bereich mit eigenem Knopf — „Alles speichern" oben betrifft ihn nicht. */}
      <AdminPasswordChange />
    </div>
  );
}
