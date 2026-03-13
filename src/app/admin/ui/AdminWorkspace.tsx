'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminAnnouncementEditor } from './AdminAnnouncementEditor';
import { AdminUploadManager } from './AdminUploadManager';
import { AdminEventEditor } from './AdminEventEditor';
import {
  adminLogin,
  adminLogout,
  checkAdminSession,
  checkSetupStatus,
  type SetupStatus,
} from '@/lib/api/client';

type Tab = 'uploads' | 'announcements' | 'events';

function SetupHints({ setupStatus, apiReachable }: { setupStatus: SetupStatus | null; apiReachable: boolean }) {
  if (apiReachable && !setupStatus) return null;

  const hints: { message: string; detail: string }[] = [];

  if (!apiReachable) {
    hints.push({
      message: 'API ist nicht erreichbar.',
      detail: 'Stelle sicher, dass die Worker-API läuft (npm run dev:api).',
    });
  } else if (setupStatus) {
    if (!setupStatus.dbReady) {
      hints.push({
        message: 'Datenbank ist nicht eingerichtet.',
        detail: 'Führe "npm run db:migrate:local" aus oder starte das Setup erneut mit "npm run setup".',
      });
    }
    if (!setupStatus.passwordConfigured) {
      hints.push({
        message: 'Admin-Passwort ist nicht konfiguriert.',
        detail: 'Prüfe, ob die Datei worker/.dev.vars existiert und ADMIN_PASSWORD enthält.',
      });
    }
    if (setupStatus.dbReady && setupStatus.passwordConfigured && !setupStatus.hasUsers) {
      hints.push({
        message: 'Ersteinrichtung: Noch kein Admin-Konto vorhanden.',
        detail: 'Melde dich mit Benutzername "redaktion" und dem konfigurierten Passwort an. Das Admin-Konto wird beim ersten Login automatisch erstellt.',
      });
    }
  }

  if (hints.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {hints.map((hint) => (
        <div
          key={hint.message}
          className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950"
        >
          <p className="font-medium text-amber-800 dark:text-amber-200">{hint.message}</p>
          <p className="mt-1 text-amber-700 dark:text-amber-300">{hint.detail}</p>
        </div>
      ))}
    </div>
  );
}

export function AdminWorkspace() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginPending, setIsLoginPending] = useState(false);
  const [status, setStatus] = useState('Bitte anmelden.');
  const [activeTab, setActiveTab] = useState<Tab>('uploads');
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [apiReachable, setApiReachable] = useState(true);

  const fetchSetupStatus = useCallback(async () => {
    try {
      const res = await checkSetupStatus();
      setSetupStatus(res);
      setApiReachable(true);
    } catch {
      setApiReachable(false);
    }
  }, []);

  const doCheckSession = useCallback(async () => {
    try {
      const res = await checkAdminSession();
      setIsAuthenticated(res.authenticated);
      setApiReachable(true);
      if (res.authenticated) {
        setStatus('Angemeldet.');
      } else {
        // Session nicht vorhanden — Setup-Status prüfen für hilfreiche Hinweise
        await fetchSetupStatus();
      }
    } catch {
      // API nicht erreichbar oder DB-Fehler — Setup-Status prüfen
      await fetchSetupStatus();
    }
  }, [fetchSetupStatus]);

  useEffect(() => {
    doCheckSession();
  }, [doCheckSession]);

  async function login() {
    setIsLoginPending(true);
    try {
      await adminLogin(username, password);
      setUsername('');
      setPassword('');
      setIsAuthenticated(true);
      setSetupStatus(null);
      setStatus('Anmeldung erfolgreich.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Anmeldung fehlgeschlagen.';
      setStatus(message);
      // Setup-Status aktualisieren für kontextuelle Hinweise
      await fetchSetupStatus();
    } finally {
      setIsLoginPending(false);
    }
  }

  async function logout() {
    try {
      await adminLogout();
    } catch { /* ignore */ }
    setIsAuthenticated(false);
    setStatus('Abgemeldet.');
  }

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-md">
        <SetupHints setupStatus={setupStatus} apiReachable={apiReachable} />
        <div className="rounded-lg border border-gray-300 p-6 dark:border-gray-700">
          <h2 className="mb-2 text-lg font-semibold">Admin-Anmeldung</h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
            Bitte Benutzername und Passwort eingeben, um den Adminbereich zu öffnen.
          </p>
          <label className="block text-sm font-medium">
            Benutzername
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Passwort
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); login(); } }}
            />
          </label>
          <button
            type="button"
            onClick={login}
            disabled={isLoginPending}
            className="mt-4 rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
          >
            Anmelden
          </button>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Status: {status}</p>
        </div>
      </section>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'uploads', label: 'Stundenplan' },
    { key: 'announcements', label: 'Ankündigungen' },
    { key: 'events', label: 'Termine' },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded px-3 py-2 text-sm font-medium ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 dark:border-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          onClick={logout}
          className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
        >
          Abmelden
        </button>
      </div>

      {activeTab === 'uploads' && <AdminUploadManager />}
      {activeTab === 'announcements' && <AdminAnnouncementEditor />}
      {activeTab === 'events' && <AdminEventEditor />}
    </section>
  );
}
