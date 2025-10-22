import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { MixpanelProvider } from './lib/mixpanel'
import { initializeMonitoring } from './lib/monitoring'

console.log('[main.tsx] Starting application initialization');

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
