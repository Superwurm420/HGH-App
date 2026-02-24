'use client';

import { useEffect, useState } from 'react';

export function NetworkDot() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <span
      className="net-dot"
      data-status={online ? 'online' : 'offline'}
      aria-label={online ? 'Online' : 'Offline'}
    />
  );
}
