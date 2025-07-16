import mixpanel from 'mixpanel-browser';

// Initialize Mixpanel with project token
const MIXPANEL_TOKEN = 'your-mixpanel-token-here';

if (MIXPANEL_TOKEN && MIXPANEL_TOKEN !== 'your-mixpanel-token-here') {
  mixpanel.init(MIXPANEL_TOKEN);
}

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (MIXPANEL_TOKEN && MIXPANEL_TOKEN !== 'your-mixpanel-token-here') {
    mixpanel.track(eventName, properties);
  } else {
    console.log(`Mixpanel Event: ${eventName}`, properties);
  }
};

export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  if (MIXPANEL_TOKEN && MIXPANEL_TOKEN !== 'your-mixpanel-token-here') {
    mixpanel.identify(userId);
    if (properties) {
      mixpanel.people.set(properties);
    }
  } else {
    console.log(`Mixpanel Identify: ${userId}`, properties);
  }
};

export default mixpanel;