'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  adminFetchEvents,
  adminCreateEvent,
  adminUpdateEvent,
  adminDeleteEvent,
  type EventData,
} from '@/lib/api/client';
import {
  Card,
  ClassPicker,
  Field,
  Select,
  Status,
  TextArea,
  TextInput,
  Toggle,
  adminStyles as styles,
} from './parts';

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
        setStatus(`Termin „${form.title}“ aktualisiert.`);
      } else {
        await adminCreateEvent(payload);
        setStatus(`Termin „${form.title}“ erstellt.`);
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
      setStatus(`Termin „${title}“ gelöscht.`);
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
    setStatus(`Termin „${event.title}“ geladen.`);
  }

  return (
    <div className={styles.editorGrid}>
      <Card title={selectedId ? 'Termin bearbeiten' : 'Neuer Termin'}>
        <div className={styles.stack}>
          <Field label="Titel *">
            <TextInput
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Worum geht es?"
            />
          </Field>

          <div className={styles.grid2}>
            <Field label="Startdatum *">
              <TextInput
                type="date"
                value={form.start_date}
                onChange={(e) => updateField('start_date', e.target.value)}
              />
            </Field>
            <Field label="Enddatum (optional)">
              <TextInput
                type="date"
                value={form.end_date}
                onChange={(e) => updateField('end_date', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Kategorie">
            <Select
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </Field>

          <ClassPicker value={form.classes} onChange={(next) => updateField('classes', next)} />

          <Toggle
            checked={form.all_day}
            onChange={(next) => updateField('all_day', next)}
            title="Ganztägig"
            hint="Aus, wenn der Termin nur einen Teil des Tages betrifft."
          />

          <Field label="Beschreibung">
            <TextArea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={5}
            />
          </Field>

          <div className={styles.row}>
            <button type="button" onClick={handleSave} disabled={isBusy} className="btn">
              {selectedId ? 'Aktualisieren' : 'Erstellen'}
            </button>
            {selectedId && (
              <button
                type="button"
                onClick={() => { setSelectedId(null); setForm(EMPTY_FORM); setStatus('Formular zurückgesetzt.'); }}
                className="btn secondary"
              >
                Neuer Termin
              </button>
            )}
            <Status text={status} />
          </div>
        </div>
      </Card>

      <Card title="Vorhandene Termine">
        {events.length === 0 ? (
          <p className={styles.empty}>Noch keine Termine vorhanden.</p>
        ) : (
          <ul className={styles.list}>
            {events.map((event) => (
              <li key={event.id} className={styles.listItem} data-selected={selectedId === event.id}>
                <button
                  type="button"
                  onClick={() => selectEvent(event)}
                  className={styles.listTitleBtn}
                >
                  {event.title}
                </button>
                <p className={styles.listMeta}>
                  {event.start_date}
                  {event.end_date ? ` – ${event.end_date}` : ''}
                  {event.classes ? ` · ${event.classes}` : ''}
                </p>
                <button
                  type="button"
                  onClick={() => handleDelete(event.id, event.title)}
                  disabled={isBusy}
                  className={`${styles.smallBtn} ${styles.danger} mt-2`}
                >
                  Löschen
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
