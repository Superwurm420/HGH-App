'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  adminActivateUpload,
  adminDeleteUpload,
  adminFetchSettings,
  adminFetchUploads,
  adminSaveSetting,
  adminUploadTimetable,
  type UploadData,
} from '@/lib/api/client';
import { parseTimetableFileInBrowser } from '@/lib/timetable/parse-pdf-browser';
import { WEEKDAYS, type ParsedSchedule } from '@/lib/timetable/types';
import { formatLessonTime, formatPeriodLabel } from '@/lib/timetable/lesson-times';
import { Card, Notice, Status, Toggle, adminStyles as styles } from './parts';

const STATUS_LABELS: Record<string, string> = {
  parsed: 'Bereit zur Aktivierung',
  active: 'Aktiv',
  archived: 'Archiviert',
  error: 'Fehler',
  uploaded: 'Hochgeladen',
  parsing: 'Wird ausgewertet …',
};

const STATUS_TONES: Record<string, string | undefined> = {
  parsed: 'ready',
  active: 'active',
  error: 'error',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Preview {
  file: File;
  schedule: ParsedSchedule;
  classes: string[];
  lessons: number;
  warnings: string[];
}

const DAY_LABELS: Record<string, string> = {
  MO: 'Montag',
  DI: 'Dienstag',
  MI: 'Mittwoch',
  DO: 'Donnerstag',
  FR: 'Freitag',
};

/**
 * Zeigt an, was aus dem PDF geworden ist — Stunde für Stunde.
 *
 * Ohne diese Ansicht ließ sich vor dem Hochladen nur die Zahl der Stunden
 * prüfen; ob ein Raum im Fachnamen gelandet ist oder ein Tag fehlt, sah man
 * erst hinterher in der App.
 */
function PreviewTable({ schedule }: { schedule: ParsedSchedule }) {
  const [openClass, setOpenClass] = useState<string | null>(null);
  const classes = Object.keys(schedule).sort();

  return (
    <div className="mt-3 space-y-1">
      {classes.map((cls) => {
        const week = schedule[cls];
        const total = WEEKDAYS.reduce((sum, day) => sum + (week[day]?.length ?? 0), 0);
        const isOpen = openClass === cls;

        return (
          <div key={cls} className={styles.listItem}>
            <button
              type="button"
              onClick={() => setOpenClass(isOpen ? null : cls)}
              className={`${styles.listTitleBtn} flex items-center justify-between`}
            >
              <span>{cls}</span>
              <span className={styles.listMeta}>
                {total} Stunden {isOpen ? '▾' : '▸'}
              </span>
            </button>

            {isOpen && (
              <div className="mt-2 border-t pt-2" style={{ borderColor: 'var(--line)' }}>
                {WEEKDAYS.map((day) => (
                  <div key={day} className="mb-2 last:mb-0">
                    <p className={styles.listMeta}>{DAY_LABELS[day]}</p>
                    {(week[day]?.length ?? 0) === 0 ? (
                      <p className={styles.empty}>— kein Unterricht —</p>
                    ) : (
                      <ul className="text-xs">
                        {week[day].map((lesson, index) => (
                          <li key={index} className="flex flex-wrap gap-x-2 py-0.5">
                            <span className="w-14 shrink-0 tabular-nums" style={{ color: 'var(--muted)' }}>
                              {formatPeriodLabel(lesson.period, lesson.periodEnd)}
                            </span>
                            <span className="w-24 shrink-0 tabular-nums" style={{ color: 'var(--muted)' }}>
                              {formatLessonTime(lesson.time)}
                            </span>
                            <span className="font-medium">{lesson.subject}</span>
                            {lesson.detail && <span style={{ color: 'var(--muted)' }}>{lesson.detail}</span>}
                            {lesson.room && <span style={{ color: 'var(--muted)' }}>Raum {lesson.room}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function summarize(schedule: ParsedSchedule): { classes: string[]; lessons: number } {
  const classes = Object.keys(schedule).sort();
  let lessons = 0;
  for (const week of Object.values(schedule)) {
    for (const day of WEEKDAYS) {
      lessons += week[day]?.length ?? 0;
    }
  }
  return { classes, lessons };
}

export function AdminUploadManager() {
  const [uploads, setUploads] = useState<UploadData[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [status, setStatus] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [autoActivate, setAutoActivate] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadUploads = useCallback(async () => {
    try {
      const res = await adminFetchUploads();
      setUploads(res.uploads);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Uploads konnten nicht geladen werden.');
    }
  }, []);

  const loadAutoActivate = useCallback(async () => {
    try {
      const { settings } = await adminFetchSettings();
      const row = settings.find((entry) => entry.key === 'timetable_auto_activate');
      // Kein Eintrag heißt „noch nie entschieden" — dann gilt die Automatik,
      // genau wie im Server (services/activation.ts).
      setAutoActivate(row?.value !== '0');
    } catch {
      // Der Schalter bleibt dann auf der Vorgabe; die Liste darunter ist
      // wichtiger als diese eine Einstellung.
    }
  }, []);

  useEffect(() => {
    loadUploads();
    loadAutoActivate();
  }, [loadUploads, loadAutoActivate]);

  async function changeAutoActivate(next: boolean) {
    setAutoActivate(next);
    try {
      await adminSaveSetting('timetable_auto_activate', next ? '1' : '0');
      setStatus(
        next
          ? 'Automatik an: Ein neu hochgeladener Plan wird sofort angezeigt.'
          : 'Automatik aus: Der angezeigte Plan wird von Hand ausgewählt.',
      );
    } catch (error) {
      setAutoActivate(!next);
      setStatus(error instanceof Error ? error.message : 'Einstellung konnte nicht gespeichert werden.');
    }
  }

  function resetSelection() {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  /**
   * Das PDF wird direkt hier im Browser ausgewertet — der Server bekommt
   * anschließend nur noch das Ergebnis. So sieht die Redaktion vor dem
   * Hochladen, ob die Klassen richtig erkannt wurden.
   */
  async function handleFileSelected() {
    const file = fileInputRef.current?.files?.[0];
    setPreview(null);

    if (!file) {
      setStatus('');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setStatus('Nur PDF-Dateien sind erlaubt.');
      return;
    }

    setIsBusy(true);
    setStatus(`${file.name} wird ausgewertet …`);

    try {
      const { schedule, warnings } = await parseTimetableFileInBrowser(file);
      const { classes, lessons } = summarize(schedule);

      if (classes.length === 0 || lessons === 0) {
        setStatus('Im PDF wurde kein Stundenplan erkannt. Stimmt das Format der Datei?');
        return;
      }

      setPreview({ file, schedule, classes, lessons, warnings });
      setStatus('Auswertung fertig. Bitte prüfen und dann hochladen.');
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? `Auswertung fehlgeschlagen: ${error.message}` : 'Auswertung fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUpload() {
    if (!preview) return;

    setIsBusy(true);
    setStatus(`${preview.file.name} wird hochgeladen …`);

    try {
      const result = await adminUploadTimetable(preview.file, preview.schedule);
      setStatus(
        result.activated
          ? `${preview.file.name} hochgeladen und aktiviert — der Plan ist jetzt sichtbar.`
          : `${preview.file.name} hochgeladen. Jetzt noch aktivieren, damit der Plan sichtbar wird.`,
      );
      resetSelection();
      await loadUploads();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Upload fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleActivate(upload: UploadData) {
    setIsBusy(true);
    try {
      await adminActivateUpload(upload.id);
      setStatus(`${upload.filename} ist jetzt der aktive Stundenplan.`);
      await loadUploads();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Aktivierung fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete(upload: UploadData) {
    if (!confirm(`Upload "${upload.filename}" wirklich löschen?`)) return;
    setIsBusy(true);
    try {
      await adminDeleteUpload(upload.id);
      setStatus(`${upload.filename} gelöscht.`);
      await loadUploads();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Löschen fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  const activeUpload = uploads.find((upload) => upload.status === 'active');

  return (
    <div className={styles.stack}>
      <Card title="Welcher Plan wird angezeigt?">
        <div className={styles.stack}>
          <Toggle
            checked={autoActivate}
            onChange={changeAutoActivate}
            title="Immer den neuesten Plan anzeigen"
            hint="An: Ein hochgeladener Plan geht sofort online. Aus: Du wählst unten selbst aus, welcher Plan gilt."
          />
          <p className={styles.status}>
            {activeUpload
              ? `Aktiv: ${activeUpload.filename}`
              : 'Zurzeit ist kein Plan aktiviert — angezeigt wird der zuletzt hochgeladene.'}
          </p>
        </div>
      </Card>

      <Card
        title="Stundenplan-PDF hochladen"
        hint={<>Dateiname möglichst nach dem Muster <code>Stundenplan_kw_XX_HjY_YYYY_YY.pdf</code> — daraus werden Kalenderwoche und Halbjahr übernommen.</>}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelected}
          disabled={isBusy}
          className="block w-full text-sm"
        />

        {preview && (
          <div className="mt-4">
            <Notice tone="info" title={`${preview.classes.length} Klassen mit ${preview.lessons} Stunden erkannt`}>
              <p className="break-words">{preview.classes.join(' · ')}</p>

              {preview.warnings.length > 0 && (
                <div className="mt-3">
                  <Notice title="Bitte prüfen:">
                    <ul className="list-disc space-y-0.5 pl-4">
                      {preview.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </Notice>
                </div>
              )}

              <PreviewTable schedule={preview.schedule} />

              <div className={`${styles.row} mt-3`}>
                <button type="button" onClick={handleUpload} disabled={isBusy} className="btn">
                  {autoActivate ? 'Hochladen und anzeigen' : 'Hochladen'}
                </button>
                <button
                  type="button"
                  onClick={() => { resetSelection(); setStatus(''); }}
                  disabled={isBusy}
                  className="btn secondary"
                >
                  Verwerfen
                </button>
              </div>
            </Notice>
          </div>
        )}

        <div className="mt-3">
          <Status text={status} />
        </div>
      </Card>

      <Card
        title="Hochgeladene Pläne"
        action={
          <button type="button" onClick={loadUploads} className={styles.linkBtn}>
            Aktualisieren
          </button>
        }
      >
        {uploads.length === 0 ? (
          <p className={styles.empty}>Noch keine Uploads vorhanden.</p>
        ) : (
          <ul className={styles.list} style={{ maxHeight: 'none' }}>
            {uploads.map((upload) => (
              <li
                key={upload.id}
                className={`${styles.listItem} ${styles.row}`}
                data-selected={upload.status === 'active'}
                style={{ justifyContent: 'space-between' }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{upload.filename}</p>
                  <p className={styles.listMeta}>
                    {formatFileSize(upload.file_size)}
                    {upload.calendar_week != null && ` · KW ${upload.calendar_week}`}
                    {upload.half_year != null && ` · Hj ${upload.half_year}`}
                    {` · ${upload.class_count} Klassen · ${upload.entry_count} Stunden`}
                    {` · ${new Date(upload.created_at).toLocaleDateString('de-DE')}`}
                  </p>
                  {upload.parse_error && (
                    <p className={styles.status} data-tone="error">{upload.parse_error}</p>
                  )}
                </div>

                <span className={styles.badge} data-tone={STATUS_TONES[upload.status]}>
                  {STATUS_LABELS[upload.status] ?? upload.status}
                </span>

                <div className={styles.row}>
                  {/* Bei eingeschalteter Automatik gibt es nichts auszuwählen —
                      der nächste Upload würde die Wahl ohnehin überschreiben. */}
                  {!autoActivate && upload.status !== 'active' && upload.entry_count > 0 && (
                    <button
                      type="button"
                      onClick={() => handleActivate(upload)}
                      disabled={isBusy}
                      className={styles.smallBtn}
                    >
                      Anzeigen
                    </button>
                  )}
                  {upload.status !== 'active' && (
                    <button
                      type="button"
                      onClick={() => handleDelete(upload)}
                      disabled={isBusy}
                      className={`${styles.smallBtn} ${styles.danger}`}
                    >
                      Löschen
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
