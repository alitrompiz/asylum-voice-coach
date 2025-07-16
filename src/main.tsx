import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { MixpanelProvider } from './lib/mixpanel'

createRoot(document.getElementById("root")!).render(
  <MixpanelProvider>
    <App />
  </MixpanelProvider>
);
