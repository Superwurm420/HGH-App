'use client';

import { useCallback, useEffect, useState } from 'react';

import { AdminAnnouncementEditor } from './AdminAnnouncementEditor';
import { AdminUploadManager } from './AdminUploadManager';
import { AdminEventEditor } from './AdminEventEditor';
import { AdminMediaManager } from './AdminMediaManager';
import { AdminSettingsEditor } from './AdminSettingsEditor';
import {
  adminLogin,
  adminLogout,
  checkAdminSession,
  checkSetupStatus,
  type SetupStatus,
} from '@/lib/api/client';

type Tab = 'uploads' | 'announcements' | 'events' | 'media' | 'settings';

const TABS: { key: Tab; label: string }[] = [
  { key: 'uploads', label: 'Stundenplan' },
  { key: 'announcements', label: 'Ankündigungen' },
  { key: 'events', label: 'Termine' },
  { key: 'media', label: 'Bilder' },
  { key: 'settings', label: 'Einstellungen' },
];

/**
 * Erklärt, warum eine Anmeldung gerade nicht klappen kann.
 * Ohne diese Hinweise bleibt bei fehlender Migration nur „Ungültige Anmeldedaten".
 */
function SetupHints({ setupStatus, apiReachable }: { setupStatus: SetupStatus | null; apiReachable: boolean }) {
  const hints: { message: string; detail: string }[] = [];

  if (!apiReachable) {
    hints.push({
      message: 'Die App erreicht ihre eigene Schnittstelle nicht.',
      detail: 'Läuft der Server? Lokal wird er mit "npm run dev" gestartet.',
    });
  } else if (setupStatus) {
    if (!setupStatus.dbReady) {
      hints.push({
        message: 'Die Datenbank ist noch nicht eingerichtet.',
        detail: 'Lokal: "npm run db:migrate:local". Auf Cloudflare: "npm run db:migrate".',
      });
    }
    if (!setupStatus.passwordConfigured) {
      hints.push({
        message: 'Es ist kein Admin-Passwort hinterlegt.',
        detail: 'Lokal: ADMIN_PASSWORD in der Datei .dev.vars eintragen. Auf Cloudflare: "npx wrangler secret put ADMIN_PASSWORD".',
      });
    }
    if (setupStatus.dbReady && setupStatus.passwordConfigured && !setupStatus.hasUsers) {
      hints.push({
        message: 'Ersteinrichtung: Es gibt noch kein Admin-Konto.',
        detail: `Melde dich mit dem Benutzernamen "${setupStatus.adminUser}" und dem hinterlegten Passwort an — das Konto wird dabei automatisch angelegt.`,
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
  const [isReady, setIsReady] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginPending, setIsLoginPending] = useState(false);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('uploads');
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [apiReachable, setApiReachable] = useState(true);

  const fetchSetupStatus = useCallback(async () => {
    try {
      setSetupStatus(await checkSetupStatus());
      setApiReachable(true);
    } catch {
      setApiReachable(false);
    }
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const res = await checkAdminSession();
      setApiReachable(true);
      setIsAuthenticated(res.authenticated);
      if (!res.authenticated) {
        await fetchSetupStatus();
      }
    } catch {
      await fetchSetupStatus();
    } finally {
      setIsReady(true);
    }
  }, [fetchSetupStatus]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  async function login() {
    setIsLoginPending(true);
    try {
      await adminLogin(username, password);
      setUsername('');
      setPassword('');
      setIsAuthenticated(true);
      setSetupStatus(null);
      setStatus('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Anmeldung fehlgeschlagen.');
      await fetchSetupStatus();
    } finally {
      setIsLoginPending(false);
    }
  }

  async function logout() {
    try {
      await adminLogout();
    } catch {
      // Auch wenn der Server nicht antwortet: lokal abmelden.
    }
    setIsAuthenticated(false);
    setStatus('Abgemeldet.');
    await fetchSetupStatus();
  }

  if (!isReady) {
    return <p className="text-sm text-gray-600 dark:text-gray-300">Wird geladen …</p>;
  }

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-md">
        <SetupHints setupStatus={setupStatus} apiReachable={apiReachable} />
        <div className="rounded-lg border border-gray-300 p-6 dark:border-gray-700">
          <h2 className="mb-2 text-lg font-semibold">Anmeldung</h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
            Bitte Benutzername und Passwort eingeben.
          </p>
          <label className="block text-sm font-medium">
            Benutzername
            <input
              type="text"
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Passwort
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); login(); } }}
              className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
          <button
            type="button"
            onClick={login}
            disabled={isLoginPending}
            className="mt-4 rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
          >
            {isLoginPending ? 'Wird geprüft …' : 'Anmelden'}
          </button>
          {status && <p className="mt-3 text-sm text-red-600">{status}</p>}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav className="flex flex-wrap gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-current={activeTab === tab.key ? 'page' : undefined}
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
      {activeTab === 'media' && <AdminMediaManager />}
      {activeTab === 'settings' && <AdminSettingsEditor />}
    </section>
  );
}
