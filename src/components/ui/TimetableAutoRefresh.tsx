'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const POLL_MS = 60_000;

export function TimetableAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let etag: string | null = null;
    let running = false;
    const debug = process.env.NODE_ENV !== 'production';

    const check = async () => {
      if (running || document.visibilityState !== 'visible') return;
      running = true;
      try {
        const response = await fetch('/api/bootstrap', {
          method: 'GET',
          cache: 'no-store',
          headers: etag ? { 'If-None-Match': etag } : {},
        });

        if (response.status === 304) return;
        if (!response.ok) {
          if (debug) console.warn('[TT_BOOTSTRAP_FETCH_FAILED]', response.status);
          return;
        }

        const nextEtag = response.headers.get('etag');
        if (!etag) {
          etag = nextEtag;
          return;
        }

        if (nextEtag && nextEtag !== etag) {
          etag = nextEtag;
          router.refresh();
          return;
        }

        etag = nextEtag;
      } catch (error) {
        if (debug) console.warn('[TT_BOOTSTRAP_NETWORK_FAILED]', error);
      } finally {
        running = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void check();
      }
    };

    void check();
    document.addEventListener('visibilitychange', onVisible);
    const intervalId = window.setInterval(() => {
      void check();
    }, POLL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(intervalId);
    };
  }, [router]);

  return null;
}
