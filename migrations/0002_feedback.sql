-- Rückmeldungen aus der App
--
-- Jede und jeder kann ohne Anmeldung schreiben; gelesen wird ausschließlich
-- im Adminbereich. `status` trennt Neues von Erledigtem, damit die Liste nicht
-- gelöscht werden muss, um übersichtlich zu bleiben.

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('bug', 'idea', 'timetable', 'content', 'other')),
  -- Freiwillig: Name oder Kontakt für eine Rückfrage. Ohne Angabe anonym.
  contact TEXT NOT NULL DEFAULT '',
  klasse TEXT NOT NULL DEFAULT '',
  -- Seite, von der aus geschrieben wurde — hilft beim Nachvollziehen.
  page TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'done')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status, created_at);
