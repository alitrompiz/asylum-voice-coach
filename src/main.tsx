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
      console.log('[main.tsx] Chunk load error detected, reloading...');
      sessionStorage.setItem('chunk-reload-attempted', 'true');
      window.location.reload();
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
