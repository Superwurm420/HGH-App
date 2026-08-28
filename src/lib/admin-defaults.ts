/**
 * Vorgaben für die Ersteinrichtung des Adminbereichs.
 *
 * Liegt in `src/lib/`, weil beide Seiten den Wert brauchen: der Server, um die
 * Anmeldung zu prüfen, und die Anmeldeseite, um ihn anzuzeigen. Code aus
 * `src/server/` darf nicht aus einer `'use client'`-Datei importiert werden —
 * eine Kopie in der Oberfläche würde beim nächsten Ändern auseinanderlaufen.
 */

/**
 * Standardpasswort für den allerersten Login.
 *
 * Bewusst öffentlich und nicht in einem Secret: Es gilt nur, bis das erste
 * eigene Passwort vergeben ist, und genau das erzwingt der Adminbereich beim
 * ersten Login (`withAdmin` sperrt bis dahin alles andere). Es ist damit ein
 * Einrichtungspasswort, kein Betriebspasswort.
 *
 * Der Preis ist bekannt: Zwischen Deploy und erster Anmeldung kommt herein, wer
 * die Adresse kennt — `Admin`/`admin` muss man nicht raten. Deshalb weist die
 * Dokumentation an mehreren Stellen darauf hin, sich unmittelbar nach dem
 * Deploy anzumelden.
 */
export const DEFAULT_ADMIN_PASSWORD = 'admin';

/** Benutzername, wenn `ADMIN_USER` in der wrangler.toml fehlt. */
export const DEFAULT_ADMIN_USER = 'Admin';
