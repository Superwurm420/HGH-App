'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  adminFetchAnnouncements,
  adminCreateAnnouncement,
  adminUpdateAnnouncement,
  adminDeleteAnnouncement,
  type AnnouncementData,
} from '@/lib/api/client';
import {
  Card,
  ClassPicker,
  Field,
  Status,
  TextArea,
  TextInput,
  Toggle,
  adminStyles as styles,
} from './parts';

/**
 * Pflege der Ankündigungen.
 *
 * Termine gab es hier einmal als zweite Art — mit eigener Tabelle, eigener API
 * und eigenem Formular, aber ohne Anzeige: Die Sondertermine über dem
 * Stundenplan kommen aus hervorgehobenen Ankündigungen, nicht aus jener
 * Tabelle. Eine Ankündigung mit Zeitraum leistet dasselbe, deshalb ist sie
 * jetzt die einzige Art.
 */

type FormState = {
  title: string;
  date: string; // „Sichtbar ab" — deutsches TT.MM.JJJJ HH:mm
  expires: string; // „Läuft ab"
  highlight: boolean;
  classes: string;
  body: string;
};

const EMPTY_FORM: FormState = {
  title: '',
  date: '',
  expires: '',
  highlight: false,
  classes: '',
  body: '',
};

/**
 * Gespeichertes Datum → Wert für `datetime-local`.
 *
 * Ein- und zweistellige Tages- und Monatsangaben sind beide zu erwarten: Das
 * Format stammt aus der TXT-Zeit und wurde nie erzwungen. Wer ein „1.9.2026
 * 8:00" vorfand, sah bisher ein leeres Feld und überschrieb den Wert beim
 * nächsten Speichern.
 */
function toDateTimeLocal(stored: string): string {
  if (!stored) return '';

  const de = stored.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\D+(\d{1,2}):(\d{2}))?/);
  if (de) {
    const [, day, month, year, hour = '00', minute = '00'] = de;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}`;
  }

  // ISO — inklusive Sekunden, die manche Browser mitschicken.
  const iso = stored.trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (iso) return `${iso[1]}T${iso[2]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(stored.trim())) return `${stored.trim()}T00:00`;

  return '';
}

/** Wert aus `datetime-local` → Speicherformat TT.MM.JJJJ HH:mm. */
function fromDateTimeLocal(value: string): string {
  if (!value) return '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (match) {
    return `${match[3]}.${match[2]}.${match[1]} ${match[4]}:${match[5]}`;
  }
  return value;
}

export function AdminContentEditor() {
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

  function resetForm() {
    setForm(EMPTY_FORM);
    setSelectedId(null);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setStatus('Titel ist erforderlich.');
      return;
    }
    if (!form.date.trim()) {
      setStatus('„Sichtbar ab“ ist erforderlich.');
      return;
    }
    // Ein Ende vor dem Beginn hieße: sofort abgelaufen und nie zu sehen.
    if (form.expires && toDateTimeLocal(form.expires) < toDateTimeLocal(form.date)) {
      setStatus('„Läuft ab“ liegt vor „Sichtbar ab“.');
      return;
    }

    setIsBusy(true);
    try {
      const payload = {
        title: form.title,
        body: form.body,
        date: form.date,
        expires: form.expires || undefined,
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
      setStatus(`Ankündigung „${title}“ gelöscht.`);
      if (selectedId === id) resetForm();
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
      date: a.date,
      expires: a.expires ?? '',
      highlight: a.highlight === 1,
      classes: a.classes,
      body: a.body,
    });
    setStatus(`Ankündigung „${a.title}“ geladen.`);
  }

  return (
    <div className={styles.editorGrid}>
      <Card title={selectedId ? 'Ankündigung bearbeiten' : 'Neue Ankündigung'}>
        <div className={styles.stack}>
          <Field label="Titel *">
            <TextInput
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Worum geht es?"
            />
          </Field>

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

          <ClassPicker value={form.classes} onChange={(next) => updateField('classes', next)} />

          <Toggle
            checked={form.highlight}
            onChange={(next) => updateField('highlight', next)}
            title="Als Sondertermin hervorheben"
            hint="Erscheint dann oberhalb des Stundenplans statt nur auf der Pinnwand."
          />

          <Field label="Text">
            <TextArea
              value={form.body}
              onChange={(e) => updateField('body', e.target.value)}
              rows={6}
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
                Neue Ankündigung
              </button>
            )}
            <Status text={status} />
          </div>
        </div>
      </Card>

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
                  {a.expires ? ` – ${a.expires}` : ''}
                  {a.classes ? ` · ${a.classes}` : ''}
                </p>
                <button
                  type="button"
                  onClick={() => handleDelete(a.id, a.title)}
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
