import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ThemeScript } from '@/components/ui/ThemeScript';
import { ServiceWorkerRegister } from '@/components/ui/ServiceWorkerRegister';
import { Topbar } from '@/components/ui/Topbar';
import { BottomNav } from '@/components/ui/BottomNav';

export const metadata: Metadata = {
  title: 'HGH Stundenplan',
  description: 'Stundenplan-PWA – Holztechnik und Gestaltung Hildesheim',
  manifest: '/manifest.webmanifest',
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
        <div className="mx-auto max-w-3xl px-4">
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
