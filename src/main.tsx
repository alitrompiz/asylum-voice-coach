import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { MixpanelProvider } from './lib/mixpanel'
import { initializeMonitoring } from './lib/monitoring'

console.log('[main.tsx] Starting application initialization');

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
