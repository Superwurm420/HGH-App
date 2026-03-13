/** @type {import('next').NextConfig} */
function getApiOrigin() {
  const rawOrigin = process.env.API_ORIGIN
    || process.env.NEXT_PUBLIC_API_URL
    || (process.env.NODE_ENV === 'development' ? 'http://localhost:8787' : '');

  return rawOrigin.replace(/\/$/, '');
}

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiOrigin = getApiOrigin();

    return [
      // Favicon rewrites
      { source: '/favicon.ico', destination: '/content/branding/favicon.ico' },
      { source: '/favicon-96x96.png', destination: '/content/branding/favicon-96x96.png' },
      { source: '/apple-touch-icon.png', destination: '/content/branding/apple-touch-icon.png' },
      { source: '/web-app-manifest-192x192.png', destination: '/content/branding/web-app-manifest-192x192.png' },
      { source: '/web-app-manifest-512x512.png', destination: '/content/branding/web-app-manifest-512x512.png' },
      ...(apiOrigin ? [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }] : []),
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
