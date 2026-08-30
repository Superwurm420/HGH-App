// BUILD_VERSION wird von scripts/prebuild.mjs bei jedem Build neu gesetzt —
// diese eine Zeile bitte nicht von Hand ändern. Ohne frische Version behalten
// installierte Geräte ihren alten Cache und sehen Updates nie.
const BUILD_VERSION = '__BUILD_VERSION__';
const CACHE = 'hgh-pwa-v3-' + BUILD_VERSION;

// Routen, die bei der Installation vorgeladen werden, damit die App auch
// offline startet. Bewusst nur die Startseite: Jede weitere Route wäre eine
// zusätzliche Anfrage pro Gerät und Build — und offline landet ohnehin alles
// beim Rückfall auf '/' (siehe unten), solange die Seite nicht schon besucht
// und dabei gecacht wurde.
const PRECACHE_ROUTES = ['/'];

// Routen, die als HTML behandelt werden (network-first). Nicht alle davon
// werden vorgeladen — sie landen im Cache, sobald sie einmal besucht wurden.
const HTML_ROUTES = ['/', '/stundenplan', '/woche', '/weiteres', '/pinnwand'];

// HTML-Routen: network-first (immer frische Inhalte wenn online).
// /tv gehört dazu, aber nicht in den Precache: Der Wandbildschirm läuft im
// Dauerbetrieb und braucht frische Seiten — vorladen müssten sie dafür aber
// alle Schülergeräte, die die TV-Ansicht nie öffnen.
const HTML_SET = new Set([...HTML_ROUTES, '/tv']);

// ── Install: Kern-Routen precachen ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_ROUTES))
  );
  // Sofort aktivieren, ohne auf das Schließen aller Tabs zu warten
  self.skipWaiting();
});

// ── Activate: Alte Caches aufräumen, Navigation Preload, sofort Kontrolle ────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE)
            .map((key) => caches.delete(key))
        )
      ),
      // Navigation Preload: HTML-Request startet parallel zum SW-Boot
      self.registration.navigationPreload
        ? self.registration.navigationPreload.enable()
        : Promise.resolve(),
    ])
  );
  // Alle offenen Tabs sofort übernehmen (kein erneutes Laden nötig)
  self.clients.claim();
});

// ── Update-Hinweis ───────────────────────────────────────────────────────────
// UpdateNotice/ServiceWorkerRegister schicken SKIP_WAITING, wenn die Nutzerin
// „Jetzt aktualisieren" antippt. Ohne diesen Listener blieb der Knopf wirkungslos.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Nur GET anfassen. Ein POST hier durchzureichen bringt nichts und riskiert
  // nur, den Request-Body zu verlieren; der Cache-Zweig weiter unten würde an
  // `cache.put()` mit einem Nicht-GET-Request ohnehin scheitern.
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Nur Same-Origin-Requests behandeln
  if (url.origin !== self.location.origin) return;

  // Die API gehört nie in den Cache — der Browser holt sie selbst.
  if (url.pathname.startsWith('/api/')) return;

  const isHtml = HTML_SET.has(url.pathname);

  if (isHtml) {
    // Network-first für HTML: immer frische Inhalte, Cache als Fallback offline.
    // Navigation Preload wird genutzt falls verfügbar (parallel zum SW-Boot).
    event.respondWith(
      (async () => {
        try {
          const preloaded = await event.preloadResponse;
          const response = preloaded || await fetch(event.request);
          // Nur brauchbare Antworten cachen — eine gecachte Fehlerseite wäre
          // offline schlimmer als der Rückfall auf die Startseite.
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        } catch {
          const cached = await caches.match(event.request);
          return cached || caches.match('/');
        }
      })()
    );
  } else {
    // Cache-first für statische Assets (JS/CSS mit Hash-URL, Bilder etc.)
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});
