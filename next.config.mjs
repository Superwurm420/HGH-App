import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// Stellt D1 und R2 auch im normalen `next dev` bereit (lokal über Miniflare),
// damit `npm run dev` ohne zweiten Prozess auskommt.
initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Die API liegt unter src/app/api/ im selben Worker — hier wird nichts
    // mehr weitergeleitet. Es bleiben die Favicon-Pfade, die Browser und
    // Betriebssysteme fest im Wurzelverzeichnis erwarten.
    return [
      { source: '/favicon.ico', destination: '/content/branding/favicon.ico' },
      { source: '/favicon-96x96.png', destination: '/content/branding/favicon-96x96.png' },
      { source: '/apple-touch-icon.png', destination: '/content/branding/apple-touch-icon.png' },
      { source: '/web-app-manifest-192x192.png', destination: '/content/branding/web-app-manifest-192x192.png' },
      { source: '/web-app-manifest-512x512.png', destination: '/content/branding/web-app-manifest-512x512.png' },
    ];
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      {
        source: '/content/branding/:icon(favicon.ico|favicon-96x96.png|apple-touch-icon.png|web-app-manifest-192x192.png|web-app-manifest-512x512.png|school-logo.svg)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
