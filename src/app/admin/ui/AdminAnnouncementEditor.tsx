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
  Select,
  Status,
  TextArea,
  TextInput,
  Toggle,
  adminStyles as styles,
} from './parts';

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
        setStatus(`Ankündigung „${form.title}“ aktualisiert.`);
      } else {
        await adminCreateAnnouncement(payload);
        setStatus(`Ankündigung „${form.title}“ erstellt.`);
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
      setStatus(`Ankündigung „${title}“ gelöscht.`);
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
                onClick={() => { setSelectedId(null); setForm(EMPTY_FORM); setStatus('Formular zurückgesetzt.'); }}
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
