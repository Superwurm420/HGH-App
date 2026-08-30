import { TimetableUpload } from '../types';
import { logAudit } from './audit';

/**
 * Aktivieren eines Stundenplan-Uploads — an einer Stelle, weil es zwei Wege
 * dorthin gibt: den Knopf „Aktivieren" und die Automatik direkt nach dem
 * Hochladen. Zwei Kopien dieser Batch-Logik könnten auseinanderlaufen, und ein
 * Zustand mit zwei aktiven Plänen wäre in der App nicht mehr zu erklären.
 */

/** Ist die Automatik eingeschaltet? Ohne Eintrag gilt: ja. */
export async function isAutoActivateEnabled(db: D1Database): Promise<boolean> {
  const row = await db.prepare(
    "SELECT value FROM app_settings WHERE key = 'timetable_auto_activate'"
  ).first<{ value: string }>();

  // Kein Eintrag heißt „noch nie entschieden" — dann ist die Automatik das
  // freundlichere Verhalten: Wer ein PDF hochlädt, will es auch zeigen.
  return row?.value !== '0';
}

/**
 * Setzt den Upload als aktiven Stundenplan und archiviert den bisherigen.
 * Beides in einem `batch()`, damit nie zwei Pläne gleichzeitig aktiv sind.
 */
export async function activateUpload(
  db: D1Database,
  upload: TimetableUpload,
  userId: string,
): Promise<void> {
  await db.batch([
    db.prepare(
      "UPDATE timetable_uploads SET status = 'archived', updated_at = datetime('now') WHERE status = 'active'"
    ),
    db.prepare(
      "UPDATE timetable_uploads SET status = 'active', updated_at = datetime('now') WHERE id = ?"
    ).bind(upload.id),
    db.prepare(
      `INSERT INTO app_settings (key, value, updated_at, updated_by)
       VALUES ('active_timetable_id', ?, datetime('now'), ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`
    ).bind(upload.id, userId),
  ]);

  await logAudit(db, userId, 'activate', 'timetable', upload.id, `Stundenplan aktiviert: ${upload.filename}`);
}
