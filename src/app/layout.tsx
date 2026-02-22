import './globals.css';
import type { Metadata } from 'next';
import { ThemeScript } from '@/components/ui/ThemeScript';
import { ServiceWorkerRegister } from '@/components/ui/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'HGH Stundenplan',
  description: 'Stundenplan-PWA für Schüler',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="mx-auto max-w-4xl p-4">
        <ThemeScript />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
