'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card surface" style={{ textAlign: 'center', padding: '32px 18px' }}>
      <h2 className="section-title" style={{ marginBottom: '8px' }}>Etwas ist schiefgelaufen</h2>
      <p className="text-sm text-muted" style={{ marginBottom: '18px' }}>
        Die Seite konnte nicht geladen werden. Bitte versuche es erneut.
      </p>
      <button onClick={reset} className="btn">
        Erneut versuchen
      </button>
    </div>
  );
}
