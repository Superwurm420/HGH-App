'use client';

import { useEffect } from 'react';
import { saveLastData } from '@/lib/storage/preferences';

export function OfflineCacheSync({ payload }: { payload: unknown }) {
  useEffect(() => {
    saveLastData(payload);
  }, [payload]);
  return null;
}
