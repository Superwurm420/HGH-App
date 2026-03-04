'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatApiStatus, parseApiError, parseRequestFailure } from './apiError';

type MessageCategories = {
  vorUnterricht?: string[];
  inPause?: string[];
  nachUnterricht?: string[];
  wochenende?: string[];
  feiertag?: string[];
  freierTag?: string[];
};

type MessagesPayload = {
  standard?: MessageCategories;
  klassen?: Record<string, MessageCategories>;
};

const CATEGORY_LABELS: Record<keyof MessageCategories, string> = {
  vorUnterricht: 'Vor dem Unterricht',
  inPause: 'In der Pause',
  nachUnterricht: 'Nach dem Unterricht',
  wochenende: 'Wochenende',
  feiertag: 'Feiertag',
  freierTag: 'Freier Tag',
};

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as (keyof MessageCategories)[];

function CategoryEditor({
  label,
  messages,
  onChange,
}: {
  label: string;
  messages: string[];
  onChange: (next: string[]) => void;
}) {
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(messages.length > 0);

  return (
    <div className="rounded border border-gray-200 p-2 dark:border-gray-700">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left text-sm font-medium"
      >
        <span>{label} ({messages.length})</span>
        <span className="text-xs text-gray-500">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="mt-2 space-y-1">
          {messages.map((msg, index) => (
            <div key={index} className="flex items-start gap-1">
              <input
                type="text"
                value={msg}
                onChange={(e) => {
                  const next = [...messages];
                  next[index] = e.target.value;
                  onChange(next);
                }}
                className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
              <button
                type="button"
                onClick={() => onChange(messages.filter((_, i) => i !== index))}
                className="shrink-0 rounded border border-red-300 px-1.5 py-1 text-xs text-red-600"
                title="Entfernen"
              >
                ×
              </button>
            </div>
          ))}

          <div className="flex items-start gap-1 pt-1">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Neue Meldung..."
              className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newMessage.trim()) {
                  e.preventDefault();
                  onChange([...messages, newMessage.trim()]);
                  setNewMessage('');
                }
              }}
            />
            <button
              type="button"
              disabled={!newMessage.trim()}
              onClick={() => {
                if (newMessage.trim()) {
                  onChange([...messages, newMessage.trim()]);
                  setNewMessage('');
                }
              }}
              className="shrink-0 rounded bg-emerald-600 px-1.5 py-1 text-xs text-white disabled:opacity-50"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminMessagesEditor() {
  const [standard, setStandard] = useState<MessageCategories>({});
  const [klassen, setKlassen] = useState<Record<string, MessageCategories>>({});
  const [newClassName, setNewClassName] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastApiStatus, setLastApiStatus] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/messages', { cache: 'no-store' });
      setLastApiStatus(formatApiStatus(response));
      if (!response.ok) {
        const apiError = await parseApiError(response);
        setError(apiError.message);
        return;
      }
      const payload = (await response.json()) as { messages?: MessagesPayload; error?: string };
      setStandard(payload.messages?.standard ?? {});
      setKlassen(payload.messages?.klassen ?? {});
      setIsDirty(false);
      setError(null);
    } catch (caughtError) {
      const apiError = parseRequestFailure(caughtError);
      setLastApiStatus(null);
      setError(apiError.message);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  function updateStandardCategory(key: keyof MessageCategories, messages: string[]) {
    setStandard((prev) => ({ ...prev, [key]: messages }));
    setIsDirty(true);
  }

  function updateClassCategory(className: string, key: keyof MessageCategories, messages: string[]) {
    setKlassen((prev) => ({
      ...prev,
      [className]: { ...prev[className], [key]: messages },
    }));
    setIsDirty(true);
  }

  function addClass() {
    const name = newClassName.trim().toUpperCase();
    if (!name) return;

    if (klassen[name]) {
      setError(`Klasse "${name}" existiert bereits.`);
      return;
    }

    setKlassen((prev) => ({ ...prev, [name]: {} }));
    setNewClassName('');
    setIsDirty(true);
  }

  function removeClass(name: string) {
    setKlassen((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setIsDirty(true);
  }

  async function save() {
    setIsBusy(true);
    setError(null);

    // Leere Klassen-Overrides entfernen
    const cleanedKlassen: Record<string, MessageCategories> = {};
    for (const [name, categories] of Object.entries(klassen)) {
      const hasContent = Object.values(categories).some(
        (arr) => Array.isArray(arr) && arr.length > 0,
      );
      if (hasContent) {
        cleanedKlassen[name] = categories;
      }
    }

    try {
      const response = await fetch('/api/admin/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: {
            standard,
            klassen: Object.keys(cleanedKlassen).length > 0 ? cleanedKlassen : undefined,
          },
        }),
      });
      setLastApiStatus(formatApiStatus(response));

      if (!response.ok) {
        const apiError = await parseApiError(response);
        setError(apiError.message);
        setStatus('Speichern fehlgeschlagen.');
        return;
      }

      const payload = (await response.json()) as { messages?: MessagesPayload; error?: string };
      setStandard(payload.messages?.standard ?? standard);
      setKlassen(payload.messages?.klassen ?? cleanedKlassen);
      setIsDirty(false);
      setStatus('Gespeichert.');
      setError(null);
    } catch (caughtError) {
      const apiError = parseRequestFailure(caughtError);
      setLastApiStatus(null);
      setError(apiError.message);
      setStatus('Speichern fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  const classNames = Object.keys(klassen).sort();

  return (
    <section className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tägliche Meldungen</h2>
        {isDirty && (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            Ungespeichert
          </span>
        )}
      </div>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
        Meldungen für verschiedene Tageszeiten. Optional können klassenspezifische Meldungen hinzugefügt werden.
      </p>

      <h3 className="mb-2 text-sm font-semibold">Standard-Meldungen</h3>
      <div className="space-y-1">
        {CATEGORY_KEYS.map((key) => (
          <CategoryEditor
            key={key}
            label={CATEGORY_LABELS[key]}
            messages={standard[key] ?? []}
            onChange={(msgs) => updateStandardCategory(key, msgs)}
          />
        ))}
      </div>

      <h3 className="mb-2 mt-6 text-sm font-semibold">Klassen-Meldungen (optional)</h3>
      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
        Klassenspezifische Meldungen überschreiben die Standard-Meldungen für die jeweilige Klasse.
      </p>

      {classNames.map((name) => (
        <div key={name} className="mb-3 rounded border border-gray-200 p-2 dark:border-gray-700">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">{name}</span>
            <button
              type="button"
              onClick={() => removeClass(name)}
              className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-600"
            >
              Klasse entfernen
            </button>
          </div>
          <div className="space-y-1">
            {CATEGORY_KEYS.map((key) => (
              <CategoryEditor
                key={key}
                label={CATEGORY_LABELS[key]}
                messages={klassen[name]?.[key] ?? []}
                onChange={(msgs) => updateClassCategory(name, key, msgs)}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          placeholder="z.B. HT11"
          className="w-32 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addClass();
            }
          }}
        />
        <button
          type="button"
          disabled={!newClassName.trim()}
          onClick={addClass}
          className="rounded bg-emerald-600 px-3 py-1 text-sm text-white disabled:opacity-50"
        >
          Klasse hinzufügen
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={isBusy || !isDirty}
          onClick={() => save()}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Speichern
        </button>
        {isDirty && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => loadMessages()}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
          >
            Verwerfen
          </button>
        )}
      </div>

      {status && <p className="mt-3 text-sm text-gray-700 dark:text-gray-200">Status: {status}</p>}
      {lastApiStatus ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Letzter API-Status: {lastApiStatus}</p> : null}
      {error && <p className="mt-1 text-sm text-red-600">Fehler: {error}</p>}
    </section>
  );
}
