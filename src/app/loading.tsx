export default function Loading() {
  return (
    <div className="card surface flex min-h-[200px] items-center justify-center">
      <div className="text-center">
        <div className="spinner mx-auto mb-3" aria-hidden="true" />
        <p className="text-sm text-muted" role="status">Wird geladen…</p>
      </div>
    </div>
  );
}
