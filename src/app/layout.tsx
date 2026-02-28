import '@/styles/globals.css';
import type { Metadata, Viewport } from 'next';
import { ThemeScript } from '@/components/ui/ThemeScript';
import { ServiceWorkerRegister } from '@/components/ui/ServiceWorkerRegister';
import { TimetableAutoRefresh } from '@/components/ui/TimetableAutoRefresh';
import { Topbar } from '@/components/ui/Topbar';
import { BottomNav } from '@/components/ui/BottomNav';

export const metadata: Metadata = {
  title: 'HGH Stundenplan',
  description: 'Stundenplan-PWA – Holztechnik und Gestaltung Hildesheim',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/content/branding/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      { url: '/content/branding/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/content/branding/school-logo.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: '/content/branding/apple-touch-icon.png',
    other: [
      {
        rel: 'mask-icon',
        url: '/content/branding/school-logo.svg',
        color: '#007AFF',
      },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#007AFF',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <ThemeScript />
        <ServiceWorkerRegister />
        <TimetableAutoRefresh />
        <div className="app-shell mx-auto w-full max-w-5xl px-4">
          <Topbar />
          <main className="main-content">
            {children}
          </main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
