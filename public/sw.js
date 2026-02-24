// Automatisch generiert von scripts/prebuild.mjs – NICHT manuell bearbeiten!
// BUILD_VERSION wird bei jedem Build neu gesetzt, damit der Browser Updates erkennt.
const BUILD_VERSION = 'static';
const CACHE = 'hgh-pwa-v3-' + BUILD_VERSION;

// HTML-Routen: network-first (immer frische Inhalte wenn online)
const HTML_ROUTES = ['/', '/stundenplan', '/woche', '/weiteres', '/pinnwand', '/einstellungen'];
const HTML_SET = new Set(HTML_ROUTES);

// ── Install: Kern-Routen precachen ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(HTML_ROUTES))
  );
  // Sofort aktivieren, ohne auf das Schließen aller Tabs zu warten
  self.skipWaiting();
});

// ── Activate: Alte Caches aufräumen, sofort Kontrolle übernehmen ────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Alle offenen Tabs sofort übernehmen (kein erneutes Laden nötig)
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nur Same-Origin-Requests behandeln
  if (url.origin !== self.location.origin) return;

  const isHtml = HTML_SET.has(url.pathname);

  if (isHtml) {
    // Network-first für HTML: immer frische Inhalte, Cache als Fallback offline
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
    );
  } else {
    // Cache-first für statische Assets (JS/CSS mit Hash-URL, Bilder etc.)
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
  }
});
