import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { MixpanelProvider } from './lib/mixpanel'
import { initializeMonitoring } from './lib/monitoring'

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

// Initialize monitoring before React renders
try {
  initializeMonitoring();
  console.log('[main.tsx] Monitoring initialized');
} catch (error) {
  console.error('[main.tsx] Failed to initialize monitoring:', error);
}

console.log('[main.tsx] Rendering React app');

createRoot(document.getElementById("root")!).render(
  <MixpanelProvider>
    <App />
  </MixpanelProvider>
);

// Mark app as mounted and hide boot overlay
(window as any).__APP_MOUNTED__ = true;
document.getElementById('boot-overlay')?.classList.add('hidden');
