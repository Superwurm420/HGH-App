const CACHE = 'hgh-pwa-v2';
const URLS = ['/', '/stundenplan', '/woche', '/weiteres', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(URLS)));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('/'));
    }),
  );
});
