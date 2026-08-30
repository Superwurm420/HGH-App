'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  adminDeleteFeedback,
  adminFetchFeedback,
  adminSetFeedbackStatus,
  type FeedbackData,
} from '@/lib/api/client';
import { feedbackCategoryLabel } from '@/lib/feedback';
import { Card, Segmented, Status, adminStyles as styles } from './parts';

type Filter = 'new' | 'done' | 'all';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'new', label: 'Offen' },
  { value: 'done', label: 'Erledigt' },
  { value: 'all', label: 'Alle' },
];

/**
 * `datetime('now')` schreibt UTC ohne Zeitzonen-Kennung. Ohne das angehängte
 * „Z" läse der Browser die Zeichenkette als Ortszeit — im Sommer zwei Stunden
 * daneben.
 */
function formatCreated(value: string): string {
  const date = new Date(`${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Eingang der Rückmeldungen.
 *
 * Gelöscht wird nur, was wirklich weg soll — der Regelweg ist „erledigt".
 * So bleibt nachvollziehbar, was gemeldet wurde, ohne dass die offene Liste
 * mitwächst.
 */
export function AdminFeedbackInbox() {
  const [items, setItems] = useState<FeedbackData[]>([]);
  const [filter, setFilter] = useState<Filter>('new');
  const [status, setStatus] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminFetchFeedback();
      setItems(res.feedback);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Rückmeldungen konnten nicht geladen werden.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleStatus(item: FeedbackData) {
    const next = item.status === 'done' ? 'new' : 'done';
    setIsBusy(true);
    try {
      await adminSetFeedbackStatus(item.id, next);
      setStatus(next === 'done' ? 'Als erledigt markiert.' : 'Wieder als offen markiert.');
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Speichern fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete(item: FeedbackData) {
    if (!confirm('Diese Rückmeldung wirklich löschen?')) return;
    setIsBusy(true);
    try {
      await adminDeleteFeedback(item.id);
      setStatus('Rückmeldung gelöscht.');
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Löschen fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  const openCount = items.filter((item) => item.status === 'new').length;
  const visible = filter === 'all' ? items : items.filter((item) => item.status === filter);

  return (
    <div className={styles.stack}>
      <Card
        title="Rückmeldungen"
        hint={<>
          Was über das Formular unter <code>/weiteres</code> hereinkommt. Ohne
          Kontaktangabe ist eine Meldung anonym — dann gibt es keinen Rückweg.
        </>}
        action={
          <button type="button" onClick={load} className={styles.linkBtn}>
            Aktualisieren
          </button>
        }
      >
        <Segmented<Filter> label="Filter" value={filter} options={FILTERS} onChange={setFilter} />

        <p className={`${styles.status} mt-2`}>
          {openCount === 0
            ? 'Keine offenen Rückmeldungen.'
            : `${openCount} offen${openCount === 1 ? 'e Rückmeldung' : 'e Rückmeldungen'}.`}
        </p>

        <Status text={status} />
      </Card>

      <Card title={FILTERS.find((entry) => entry.value === filter)?.label}>
        {visible.length === 0 ? (
          <p className={styles.empty}>Hier ist gerade nichts.</p>
        ) : (
          <ul className={styles.list}>
            {visible.map((item) => (
              <li key={item.id} className={styles.listItem}>
                <div className={styles.row}>
                  <span className={styles.badge}>
                    {feedbackCategoryLabel(item.category)}
                  </span>
                  {item.status === 'done' && <span className={styles.badge}>Erledigt</span>}
                  <span className={styles.listMeta}>{formatCreated(item.created_at)}</span>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm">{item.message}</p>

                <p className={`${styles.listMeta} mt-2`}>
                  {item.contact ? `Kontakt: ${item.contact}` : 'Anonym'}
                  {item.klasse && ` · Klasse ${item.klasse}`}
                  {item.page && ` · von ${item.page}`}
                </p>

                <div className={`${styles.row} mt-2`}>
                  <button
                    type="button"
                    onClick={() => toggleStatus(item)}
                    disabled={isBusy}
                    className={styles.smallBtn}
                  >
                    {item.status === 'done' ? 'Wieder öffnen' : 'Erledigt'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={isBusy}
                    className={`${styles.smallBtn} ${styles.danger}`}
                  >
                    Löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
