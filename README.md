# HGH-App
Aufgabe: Refactor + Re-Architecture meiner GitHub-Pages PWA, ohne sichtbare Änderungen.

Repo: https://github.com/Superwurm420/HGH
Live: https://superwurm420.github.io/HGH/

Ziel
Das Projekt soll professionell, wartbar und für Nicht-Programmierer leicht aktualisierbar werden. Es bleibt an der Schule. Optik und Funktionsumfang müssen identisch bleiben.

Nicht verhandelbar
- UI/Optik unverändert
- Verhalten/Funktionen unverändert (inkl. Hash-Navigation, Abläufe)
- PDF-Stundenplan Import/Parsing muss weiterhin automatisch funktionieren
- Keine Regressionen

Vorgehen
1) Repo komplett analysieren und dokumentieren, wie alles aktuell funktioniert (besonders PDF-Import, Sondertermine, Klassenlogik, Datenfluss, Service Worker/Assets).
2) Danach komplette interne Neuordnung: saubere Ordnerstruktur, klare Module, Trennung von UI, Logik, Daten, Services (PDF/Storage/Config), Assets.
3) PDF-Subsystem professionalisieren (kapseln, robust machen, klare Schnittstellen), Ausgabe identisch halten. Sondertermine zuverlässig erkennen wie bisher.
4) Updates maximal einfach machen: Links/Kalender/Bilder/Termine/Stundenplan sollen über klare Config- oder Data-Dateien und Asset-Ordner austauschbar sein, ohne Codeänderungen.
5) Code aufräumen: Duplikate entfernen, Magic-Strings reduzieren, klare Namensgebung, keine versteckten Globals, konsistente Utilities.

Deliverables
- Neue Struktur + refactorter Code (gleiches Verhalten)
- README: Architektur kurz, “So aktualisiert man Stundenplan/Links/Bilder/Termine”
- Wenn möglich: kleine Regression-Checks für PDF-Parsing (Fixtures/Golden Output), damit Updates sicher bleiben
- PR gegen main mit verständlicher Zusammenfassung und klaren Commit-Messages
