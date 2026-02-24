export function GoogleCalendar({ url }: { url: string }) {
  return (
    <div className="card surface mt-3">
      <h2 className="text-base font-bold mb-3">Kalender</h2>
      <div className="google-cal-wrapper">
        <iframe
          src={url}
          style={{ border: 0 }}
          width="100%"
          height="420"
          title="Google Kalender"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          className="rounded-xl"
        />
      </div>
    </div>
  );
}
