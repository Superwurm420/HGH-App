'use client';

import { useState } from 'react';

import { AdminAnnouncementEditor } from './AdminAnnouncementEditor';
import { AdminEventEditor } from './AdminEventEditor';
import { Segmented, adminStyles as styles } from './parts';

type Kind = 'announcements' | 'events';

/**
 * Ankündigungen und Termine unter einem Reiter.
 *
 * Beide werden gleich gepflegt — Titel, Zeitraum, Zielgruppe, Klassen, Text —
 * und lagen trotzdem zwei Klicks auseinander. Die Daten bleiben getrennt
 * (Ankündigungen laufen ab und stehen auf der Pinnwand, Termine haben ein
 * Datum und stehen im Kalender), die Oberfläche nicht.
 */
export function AdminContentEditor() {
  const [kind, setKind] = useState<Kind>('announcements');

  return (
    <div className={styles.stack}>
      <Segmented<Kind>
        label="Art des Eintrags"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'announcements', label: 'Ankündigungen' },
          { value: 'events', label: 'Termine' },
        ]}
      />

      {kind === 'announcements' ? <AdminAnnouncementEditor /> : <AdminEventEditor />}
    </div>
  );
}
