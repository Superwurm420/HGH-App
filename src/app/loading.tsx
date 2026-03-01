export default function Loading() {
  return (
    <div className="card surface" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid var(--line)',
            borderTop: '3px solid var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px',
          }}
        />
        <p className="text-sm text-muted">Wird geladen…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
