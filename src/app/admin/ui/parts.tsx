'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { fetchTimetableClasses } from '@/lib/api/client';
import styles from './admin.module.css';

/**
 * Gemeinsame Bausteine des Adminbereichs.
 *
 * Ankündigungen, Uploads und Einstellungen bauten dieselben Karten,
 * Felder und Listen jeweils neu aus Tailwind-Klassen zusammen — und jede
 * Abschrift wich ein wenig ab. Hier steht das Aussehen einmal.
 */

export function Card({
  title,
  action,
  hint,
  children,
}: {
  title?: string;
  action?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.card}>
      {(title || action) && (
        <header className={styles.cardHeader}>
          {title && <h2 className={styles.cardTitle}>{title}</h2>}
          {action}
        </header>
      )}
      {hint && <p className={styles.hint}>{hint}</p>}
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function TextInput(props: InputProps) {
  return <input {...props} className={`${styles.input} ${props.className ?? ''}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${styles.textarea} ${props.className ?? ''}`} />;
}

export function Toggle({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  title: string;
  hint?: string;
}) {
  return (
    <div className={styles.switchRow} onClick={() => onChange(!checked)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        className={styles.switch}
        onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      />
      <div className={styles.switchText}>
        <div className={styles.switchTitle}>{title}</div>
        {hint && <div className={styles.switchHint}>{hint}</div>}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div className={styles.segmented} role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={styles.segment}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Status({ text }: { text: string }) {
  if (!text) return null;
  // Fehlermeldungen der API enden nicht auf einem freundlichen Wort, sondern
  // enthalten „fehlgeschlagen"/„Fehler" — das reicht, um sie rot zu zeigen,
  // ohne jede Aufrufstelle um ein zweites Feld zu erweitern.
  const isError = /fehl|ungültig|nicht/i.test(text);
  return <p className={styles.status} data-tone={isError ? 'error' : undefined}>{text}</p>;
}

export function Notice({
  title,
  children,
  tone,
}: {
  title?: string;
  children: ReactNode;
  tone?: 'warn' | 'info';
}) {
  return (
    <div className={styles.notice} data-tone={tone === 'info' ? 'info' : undefined}>
      {title && <p className={styles.noticeTitle}>{title}</p>}
      <div>{children}</div>
    </div>
  );
}

/**
 * Klassenauswahl für Ankündigungen.
 *
 * Gespeichert wird weiterhin eine Liste wie „HT11, G21" — das Format liegt so
 * in der Datenbank und wird von den Filtern der öffentlichen Seiten erwartet.
 * Getippt werden muss es aber nicht mehr: Die Klassen kommen aus dem aktiven
 * Stundenplan und werden als Chips ausgewählt.
 */
export function ClassPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [available, setAvailable] = useState<string[]>([]);

  useEffect(() => {
    fetchTimetableClasses()
      .then((res) => setAvailable(res.classes))
      .catch(() => setAvailable([]));
  }, []);

  const selected = value.split(',').map((entry) => entry.trim()).filter(Boolean);
  const options = [...new Set([...available, ...selected])].sort();

  function toggle(code: string) {
    const next = selected.includes(code)
      ? selected.filter((entry) => entry !== code)
      : [...selected, code];
    onChange(next.join(', '));
  }

  return (
    <div>
      <span className={styles.fieldLabel}>Klassen (leer = alle)</span>

      {options.length > 0 ? (
        <div className={styles.chips}>
          {options.map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={selected.includes(code)}
              onClick={() => toggle(code)}
              className={styles.chip}
            >
              {code}
            </button>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>
          Noch kein aktiver Stundenplan — Klassen erscheinen, sobald ein Plan aktiv ist.
        </p>
      )}
    </div>
  );
}

export { styles as adminStyles };
