import './index.css'

console.log('[main.tsx] Starting application initialization');

// Clear service worker and caches on first production load (prevents blank screens from stale cache)
if (import.meta.env.PROD && !sessionStorage.getItem('sw-cleared-v1')) {
  sessionStorage.setItem('sw-cleared-v1', 'true');
  (async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      console.log('[main.tsx] SW/caches cleared on first production load');
    } catch (e) {
      console.error('[main.tsx] Failed to clear SW/caches:', e);
    }
  })();
}

// Global error handler for dynamic import failures
window.addEventListener('error', (event) => {
  if (event.message?.includes('Failed to fetch dynamically imported module')) {
    const hasReloaded = sessionStorage.getItem('chunk-reload-attempted');
    if (!hasReloaded) {
      console.log('[main.tsx] Chunk load error detected, purging SW/caches and reloading...');
      sessionStorage.setItem('chunk-reload-attempted', 'true');
      (async () => {
        try {
          if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(r => r.unregister()));
          }
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
          }
        } catch (e) {
          console.error('[main.tsx] Failed to purge SW/caches:', e);
        } finally {
          window.location.reload();
        }
      })();
    } else {
      sessionStorage.removeItem('chunk-reload-attempted');
    }
  }
});

// Global unhandled rejection handler for promise-based chunk failures
window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event.reason?.message || event.reason || '');
  if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('Loading chunk') || msg.includes('ChunkLoadError')) {
    const hasReloaded = sessionStorage.getItem('chunk-reload-attempted');
    if (!hasReloaded) {
      console.log('[main.tsx] Chunk load error (promise) detected, purging SW/caches and reloading...');
      sessionStorage.setItem('chunk-reload-attempted', 'true');
      (async () => {
        try {
          if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(r => r.unregister()));
          }
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
          }
        } catch (e) {
          console.error('[main.tsx] Failed to purge SW/caches:', e);
        } finally {
          window.location.reload();
        }
      })();
    } else {
      sessionStorage.removeItem('chunk-reload-attempted');
    }
  }
});

console.log('[main.tsx] Rendering React app');

// Dynamically import React, ReactDOM and the App to guarantee React is resolved first
(async () => {
  try {
    const [{ default: React }, { createRoot }, { default: App }] = await Promise.all([
      import('react'),
      import('react-dom/client'),
      import('./App.tsx'),
    ]);
    const rootEl = document.getElementById('root')!;
    createRoot(rootEl).render(React.createElement(App));
    // Mark app as mounted and hide boot overlay
    (window as any).__APP_MOUNTED__ = true;
    document.getElementById('boot-overlay')?.classList.add('hidden');
  } catch (e) {
    console.error('[main.tsx] Failed to bootstrap React app:', e);
    // Let global listeners handle purge/reload path
    throw e;
  }
})();
