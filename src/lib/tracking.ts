// Configuration
const MIXPANEL_TOKEN = 'your-mixpanel-token-here'; // Replace with actual token or use runtime config

// Dynamic Mixpanel instance
let mixpanelInstance: any = null;
let isInitialized = false;

// Safe initialization - only load if token is valid
const initMixpanel = async () => {
  if (MIXPANEL_TOKEN && MIXPANEL_TOKEN !== 'your-mixpanel-token-here') {
    try {
      const { default: mixpanel } = await import('mixpanel-browser');
      
      // Check if localStorage is available
      let persistence: 'localStorage' | 'cookie' = 'cookie';
      try {
        const test = '__mp_test__';
        window.localStorage.setItem(test, '1');
        window.localStorage.removeItem(test);
        persistence = 'localStorage';
      } catch {
        // Use cookie persistence in private/incognito mode
      }
      
      mixpanel.init(MIXPANEL_TOKEN, {
        debug: import.meta.env.MODE === 'development',
        track_pageview: true,
        persistence,
      });
      
      mixpanelInstance = mixpanel;
      isInitialized = true;
    } catch (error) {
      console.warn('[Mixpanel] Failed to initialize:', error);
    }
  }
};

// Start initialization (non-blocking)
initMixpanel();

// Base tracking function
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (isInitialized && mixpanelInstance) {
    try {
      mixpanelInstance.track(eventName, {
        ...properties,
        timestamp: new Date().toISOString(),
        page: window.location.pathname,
      });
    } catch (error) {
      console.log(`[Mixpanel] ${eventName}`, properties);
    }
  } else {
    console.log(`[Mixpanel] ${eventName}`, properties);
  }
};

// User identification
export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  if (isInitialized && mixpanelInstance) {
    try {
      mixpanelInstance.identify(userId);
      if (properties) {
        mixpanelInstance.people.set(properties);
      }
    } catch (error) {
      console.log(`[Mixpanel] Identify: ${userId}`, properties);
    }
  } else {
    console.log(`[Mixpanel] Identify: ${userId}`, properties);
  }
};

// Utility function for common tracking events
export const track = {
  onboardingComplete: (properties?: Record<string, any>) => 
    trackEvent('onboarding_complete', properties),
  
  minutesPurchase: (properties: { amount: number; package: string; success: boolean }) => 
    trackEvent('minutes_purchase', properties),
  
  interviewStart: (properties?: Record<string, any>) => 
    trackEvent('interview_start', properties),
  
  interviewEnd: (properties?: Record<string, any>) => 
    trackEvent('interview_end', properties),
  
  buttonClick: (label: string, properties?: Record<string, any>) => 
    trackEvent('button_click', { label, ...properties }),
  
  featureStubClick: (feature: string, properties?: Record<string, any>) => 
    trackEvent('feature_stub_click', { feature, ...properties }),
  
  error: (error: string | Error, properties?: Record<string, any>) => 
    trackEvent('error', { 
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      ...properties 
    }),
};

export default mixpanelInstance;