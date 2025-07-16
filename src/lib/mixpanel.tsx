import { createContext, useContext, ReactNode } from 'react';
import { trackEvent, identifyUser } from './tracking';

interface MixpanelContextType {
  track: (event: string, properties?: Record<string, any>) => void;
  identify: (userId: string, properties?: Record<string, any>) => void;
  isInitialized: boolean;
}

const MixpanelContext = createContext<MixpanelContextType | null>(null);

export const useMixpanel = () => {
  const context = useContext(MixpanelContext);
  if (!context) {
    throw new Error('useMixpanel must be used within a MixpanelProvider');
  }
  return context;
};

export const MixpanelProvider = ({ children }: { children: ReactNode }) => {
  const isInitialized = true; // Always available through tracking.ts

  const track = (event: string, properties?: Record<string, any>) => {
    trackEvent(event, properties);
  };

  const identify = (userId: string, properties?: Record<string, any>) => {
    identifyUser(userId, properties);
  };

  return (
    <MixpanelContext.Provider value={{ track, identify, isInitialized }}>
      {children}
    </MixpanelContext.Provider>
  );
};

// Re-export tracking utilities
export { trackEvent, identifyUser, track } from './tracking';