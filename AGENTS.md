# AGENTS.md

Diese Datei legt die Arbeitsregeln für Agenten im gesamten Repository fest.

## 1) Ziel & Prioritäten
- Priorität hat eine **dauerhafte, wartbare Lösung** statt schneller Provisorien.
- Lösungen sollen für Nicht-Techniker **einfach verständlich** bleiben.
- Wenn mehrere gute Wege möglich sind, ist der **einfachere** Weg zu bevorzugen.

## 2) Arbeitsmodus
- Bei neuen Aufgaben zuerst kurz Rückfragen stellen, wenn Anforderungen unklar sind.
- Vor größeren Änderungen immer einen kurzen Plan (Schritte) nennen.
- Kommunikation und UX-Texte standardmäßig auf **Deutsch**.

## 3) Qualitätsstandard
- Keine temporären/halbfertigen Workarounds einbauen.
- Änderungen so umsetzen, dass sie langfristig stabil funktionieren.
- Bei Parser-/Content-Änderungen (Stundenplan/Pinnwand) immer mit vorhandenen Beispieldateien gegenprüfen.
- Sinnvolle Standardchecks vor Abschluss: `npm run lint`, `npm run build`, `npm run validate-content`, `npm run select-latest-timetable`.

## 4) Dokumentation & Übergabe
- Änderungen müssen für Ahnungslose nachvollziehbar bleiben.
- Bei relevanten Änderungen README und ggf. `docs/ARCHITEKTUR.md` mit aktualisieren.
- Abschlusskommunikation immer in klarer Struktur:
  1. Summary
  2. Geänderte Dateien
  3. Testing
  4. Offene Punkte

## 5) Fachliche Leitplanken
- Klassenliste ist **nicht starr**: neue Klassen sollen ohne Architekturbruch ergänzbar sein.
- Erkennung der neuesten Stundenplan-PDF soll primär per Namensschema laufen, aber robust genug sein, um im Notfall auch abweichende Namen zu behandeln.
- Sondertermine haben Vorrang vor regulärem Unterricht.
- Pinnwand bleibt TXT-basiert mit Pflichtfeldern `title`, `date` und optionalen Feldern `audience`, `expires`.
- Zeitangaben im Format `TT.MM.JJJJ HH:mm` in Zeitzone `Europe/Berlin`.

## 6) Grenzen / No-Gos
- Keine unnötig großen Refactorings ohne klaren Nutzen.
- Keine unnötige Komplexität; einfache, bessere Lösung vorziehen.
- Jede Änderung soll den Zustand gegenüber vorher verbessern.

## 7) Commits & PRs
- Commit-Nachrichten klar und beschreibend halten (z. B. `docs: ...`, `feat: ...`, `fix: ...`).
- PR-Text soll mindestens enthalten: Motivation, Änderungen, Tests, offene Risiken.
