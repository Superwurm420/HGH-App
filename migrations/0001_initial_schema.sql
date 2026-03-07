-- HGH-App D1 Schema
-- Zentrale Datenbank für Stundenplan, Ankündigungen, Termine und Admin

-- ── Users & Sessions ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'editor')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ── Classes ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  code TEXT NOT NULL UNIQUE,
  display_name TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Timetable Uploads ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS timetable_uploads (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  filename TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  file_size INTEGER NOT NULL,
  calendar_week INTEGER,
  half_year INTEGER CHECK (half_year IN (1, 2)),
  year_start INTEGER,
  year_end_short INTEGER,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'parsing', 'parsed', 'active', 'error', 'archived')),
  parse_error TEXT,
  parse_started_at TEXT,
  parse_finished_at TEXT,
  uploaded_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_timetable_uploads_status ON timetable_uploads(status);
CREATE INDEX IF NOT EXISTS idx_timetable_uploads_week ON timetable_uploads(calendar_week, half_year);

-- ── Timetable Entries ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS timetable_entries (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  upload_id TEXT NOT NULL REFERENCES timetable_uploads(id) ON DELETE CASCADE,
  class_code TEXT NOT NULL,
  weekday TEXT NOT NULL CHECK (weekday IN ('MO', 'DI', 'MI', 'DO', 'FR')),
  period INTEGER NOT NULL,
  period_end INTEGER,
  time_range TEXT NOT NULL,
  subject TEXT,
  detail TEXT,
  room TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_timetable_entries_upload ON timetable_entries(upload_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_class ON timetable_entries(class_code, weekday);

-- ── Announcements ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  expires TEXT,
  audience TEXT NOT NULL DEFAULT 'alle',
  classes TEXT NOT NULL DEFAULT '',
  highlight INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_announcements_expires ON announcements(expires);
CREATE INDEX IF NOT EXISTS idx_announcements_highlight ON announcements(highlight);

-- ── Events (Termine) ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  end_date TEXT,
  all_day INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'exam', 'holiday', 'project', 'other')),
  classes TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);

-- ── Media Files ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS media_files (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  filename TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  uploaded_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── App Settings ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT REFERENCES users(id)
);

-- Defaults
INSERT OR IGNORE INTO app_settings (key, value) VALUES
  ('school_name', 'Holztechnik und Gestaltung Hildesheim'),
  ('school_short', 'HGH'),
  ('calendar_urls', '[]'),
  ('messages', '{}'),
  ('school_holidays', '{"ranges":[]}'),
  ('active_timetable_id', '');

-- ── Audit Log ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
