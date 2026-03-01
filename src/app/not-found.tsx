import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="card surface" style={{ textAlign: 'center', padding: '32px 18px' }}>
      <h2 className="section-title" style={{ marginBottom: '8px' }}>Seite nicht gefunden</h2>
      <p className="text-sm text-muted" style={{ marginBottom: '18px' }}>
        Die angeforderte Seite existiert nicht.
      </p>
      <Link href="/" className="btn">
        Zur Startseite
      </Link>
    </div>
  );
}
