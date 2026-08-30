'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  adminFetchAnnouncements,
  adminCreateAnnouncement,
  adminUpdateAnnouncement,
  adminDeleteAnnouncement,
  adminFetchEvents,
  adminCreateEvent,
  adminUpdateEvent,
  adminDeleteEvent,
  type AnnouncementData,
  type EventData,
} from '@/lib/api/client';
import {
  Card,
  ClassPicker,
  Field,
  Segmented,
  Select,
  Status,
  TextArea,
  TextInput,
  Toggle,
  adminStyles as styles,
} from './parts';

/**
 * Ankündigungen und Termine in einem Formular.
 *
 * Beide werden fast gleich gepflegt — Titel, Datum, Klassen, Text — der
 * Umschalter oben wählt nur die Art. Je nach Art erscheinen die wenigen
 * Extras (Ankündigung: Ablauf, Zielgruppe, Hervorheben; Termin: Enddatum,
 * Kategorie, Ganztägig). Die Daten bleiben getrennt (Ankündigungen laufen ab
 * und stehen auf der Pinnwand, Termine haben ein Datum und stehen im Kalender),
 * die Bedienung ist eine.
 */

type Kind = 'announcement' | 'event';

const AUDIENCE_OPTIONS = ['alle', 'Schülerinnen und Schüler', 'Lehrkräfte', 'Eltern', 'Ausbildungspartner'];

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'Allgemein' },
  { value: 'exam', label: 'Klausur/Prüfung' },
  { value: 'holiday', label: 'Feiertag/Frei' },
  { value: 'project', label: 'Projekt' },
  { value: 'other', label: 'Sonstiges' },
];

type FormState = {
  kind: Kind;
  title: string;
  date: string; // Ankündigung „Sichtbar ab" — deutsches DD.MM.YYYY HH:mm
  expires: string; // Ankündigung „Läuft ab"
  start_date: string; // Termin „Startdatum" — ISO YYYY-MM-DD
  end_date: string; // Termin „Enddatum"
  audience: string; // Ankündigung
  highlight: boolean; // Ankündigung
  category: string; // Termin
  all_day: boolean; // Termin
  classes: string; // gemeinsam
  body: string; // gemeinsam (Ankündigung: Text, Termin: Beschreibung)
};

const EMPTY_FORM: FormState = {
  kind: 'announcement',
  title: '',
  date: '',
  expires: '',
  start_date: '',
  end_date: '',
  audience: 'alle',
  highlight: false,
  category: 'general',
  all_day: true,
  classes: '',
  body: '',
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

export function AdminContentEditor() {
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
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

  const loadEvents = useCallback(async () => {
    try {
      const res = await adminFetchEvents();
      setEvents(res.events);
    } catch {
      setStatus('Fehler beim Laden der Termine.');
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
    loadEvents();
  }, [loadAnnouncements, loadEvents]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Die Art zu wechseln heißt: neuer Eintrag dieser Art. Ein bestehender
  // Datensatz lässt sich nicht in den anderen Typ umschreiben, deshalb fällt
  // die Auswahl weg — die gemeinsamen Felder bleiben aber erhalten.
  function changeKind(next: Kind) {
    setForm((prev) => ({ ...prev, kind: next }));
    setSelectedId(null);
  }

  function resetForm() {
    setForm((prev) => ({ ...EMPTY_FORM, kind: prev.kind }));
    setSelectedId(null);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setStatus('Titel ist erforderlich.');
      return;
    }
    if (form.kind === 'announcement' && !form.date.trim()) {
      setStatus('Datum ist erforderlich.');
      return;
    }
    if (form.kind === 'event' && !form.start_date.trim()) {
      setStatus('Startdatum ist erforderlich.');
      return;
    }

    setIsBusy(true);
    try {
      if (form.kind === 'announcement') {
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
          setStatus(`Ankündigung „${form.title}“ aktualisiert.`);
        } else {
          await adminCreateAnnouncement(payload);
          setStatus(`Ankündigung „${form.title}“ erstellt.`);
          resetForm();
        }
        await loadAnnouncements();
      } else {
        const payload = {
          title: form.title,
          description: form.body,
          start_date: form.start_date,
          end_date: form.end_date || undefined,
          all_day: form.all_day ? 1 : 0,
          category: form.category,
          classes: form.classes,
        };
        if (selectedId) {
          await adminUpdateEvent(selectedId, payload);
          setStatus(`Termin „${form.title}“ aktualisiert.`);
        } else {
          await adminCreateEvent(payload);
          setStatus(`Termin „${form.title}“ erstellt.`);
          resetForm();
        }
        await loadEvents();
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Speichern fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteAnnouncement(id: string, title: string) {
    if (!confirm(`Ankündigung "${title}" wirklich löschen?`)) return;
    setIsBusy(true);
    try {
      await adminDeleteAnnouncement(id);
      setStatus(`Ankündigung „${title}“ gelöscht.`);
      if (selectedId === id) resetForm();
      await loadAnnouncements();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Löschen fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteEvent(id: string, title: string) {
    if (!confirm(`Termin "${title}" wirklich löschen?`)) return;
    setIsBusy(true);
    try {
      await adminDeleteEvent(id);
      setStatus(`Termin „${title}“ gelöscht.`);
      if (selectedId === id) resetForm();
      await loadEvents();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Löschen fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  function selectAnnouncement(a: AnnouncementData) {
    setSelectedId(a.id);
    setForm({
      kind: 'announcement',
      title: a.title,
      date: a.date,
      expires: a.expires ?? '',
      start_date: '',
      end_date: '',
      audience: a.audience,
      highlight: a.highlight === 1,
      category: 'general',
      all_day: true,
      classes: a.classes,
      body: a.body,
    });
    setStatus(`Ankündigung „${a.title}“ geladen.`);
  }

  function selectEvent(event: EventData) {
    setSelectedId(event.id);
    setForm({
      kind: 'event',
      title: event.title,
      date: '',
      expires: '',
      start_date: event.start_date,
      end_date: event.end_date ?? '',
      audience: 'alle',
      highlight: false,
      category: event.category,
      all_day: event.all_day === 1,
      classes: event.classes,
      body: event.description,
    });
    setStatus(`Termin „${event.title}“ geladen.`);
  }

  const isAnnouncement = form.kind === 'announcement';
  const formTitle = selectedId
    ? isAnnouncement
      ? 'Ankündigung bearbeiten'
      : 'Termin bearbeiten'
    : isAnnouncement
      ? 'Neue Ankündigung'
      : 'Neuer Termin';

  return (
    <div className={styles.stack}>
      <Segmented<Kind>
        label="Art des Eintrags"
        value={form.kind}
        onChange={changeKind}
        options={[
          { value: 'announcement', label: 'Ankündigung' },
          { value: 'event', label: 'Termin' },
        ]}
      />

      <div className={styles.editorGrid}>
        <Card title={formTitle}>
          <div className={styles.stack}>
            <Field label="Titel *">
              <TextInput
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Worum geht es?"
              />
            </Field>

            {isAnnouncement ? (
              <div className={styles.grid2}>
                <Field label="Sichtbar ab *">
                  <TextInput
                    type="datetime-local"
                    value={toDateTimeLocal(form.date)}
                    onChange={(e) => updateField('date', fromDateTimeLocal(e.target.value))}
                  />
                </Field>
                <Field label="Läuft ab (optional)">
                  <TextInput
                    type="datetime-local"
                    value={toDateTimeLocal(form.expires)}
                    onChange={(e) => updateField('expires', fromDateTimeLocal(e.target.value))}
                  />
                </Field>
              </div>
            ) : (
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
            )}

            {isAnnouncement ? (
              <Field label="Zielgruppe">
                <Select
                  value={form.audience}
                  onChange={(e) => updateField('audience', e.target.value)}
                >
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </Select>
              </Field>
            ) : (
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
            )}

            <ClassPicker value={form.classes} onChange={(next) => updateField('classes', next)} />

            {isAnnouncement ? (
              <Toggle
                checked={form.highlight}
                onChange={(next) => updateField('highlight', next)}
                title="Als Sondertermin hervorheben"
                hint="Erscheint dann oberhalb des Stundenplans statt nur auf der Pinnwand."
              />
            ) : (
              <Toggle
                checked={form.all_day}
                onChange={(next) => updateField('all_day', next)}
                title="Ganztägig"
                hint="Aus, wenn der Termin nur einen Teil des Tages betrifft."
              />
            )}

            <Field label={isAnnouncement ? 'Text' : 'Beschreibung'}>
              <TextArea
                value={form.body}
                onChange={(e) => updateField('body', e.target.value)}
                rows={isAnnouncement ? 6 : 5}
              />
            </Field>

            <div className={styles.row}>
              <button type="button" onClick={handleSave} disabled={isBusy} className="btn">
                {selectedId ? 'Aktualisieren' : 'Erstellen'}
              </button>
              {selectedId && (
                <button
                  type="button"
                  onClick={() => { resetForm(); setStatus('Formular zurückgesetzt.'); }}
                  className="btn secondary"
                >
                  {isAnnouncement ? 'Neue Ankündigung' : 'Neuer Termin'}
                </button>
              )}
              <Status text={status} />
            </div>
          </div>
        </Card>

        {isAnnouncement ? (
          <Card title="Vorhandene Ankündigungen">
            {announcements.length === 0 ? (
              <p className={styles.empty}>Noch keine Ankündigungen vorhanden.</p>
            ) : (
              <ul className={styles.list}>
                {announcements.map((a) => (
                  <li key={a.id} className={styles.listItem} data-selected={selectedId === a.id}>
                    <button
                      type="button"
                      onClick={() => selectAnnouncement(a)}
                      className={styles.listTitleBtn}
                    >
                      {a.title || 'Ohne Titel'}
                    </button>
                    <p className={styles.listMeta}>
                      {a.date || 'ohne Datum'}
                      {a.classes ? ` · ${a.classes}` : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDeleteAnnouncement(a.id, a.title)}
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
        ) : (
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
                      onClick={() => handleDeleteEvent(event.id, event.title)}
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
        )}
      </div>
    </div>
  );
}
