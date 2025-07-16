import mixpanel from 'mixpanel-browser';

// Configuration
const MIXPANEL_TOKEN = 'your-mixpanel-token-here'; // Replace with actual token or use runtime config

// Initialize Mixpanel
const isInitialized = MIXPANEL_TOKEN && MIXPANEL_TOKEN !== 'your-mixpanel-token-here';

if (isInitialized) {
  mixpanel.init(MIXPANEL_TOKEN, {
    debug: import.meta.env.MODE === 'development',
    track_pageview: true,
    persistence: 'localStorage',
  });
}

// Base tracking function
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (isInitialized) {
    mixpanel.track(eventName, {
      ...properties,
      timestamp: new Date().toISOString(),
      page: window.location.pathname,
    });
  } else {
    console.log(`[Mixpanel] ${eventName}`, properties);
  }
};

// User identification
export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  if (isInitialized) {
    mixpanel.identify(userId);
    if (properties) {
      mixpanel.people.set(properties);
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

export default mixpanel;