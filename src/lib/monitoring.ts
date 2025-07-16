import * as Sentry from '@sentry/react';
import { datadogRum } from '@datadog/browser-rum';

// Configuration from environment variables
const SENTRY_DSN = 'your-sentry-dsn-here'; // Replace with actual DSN
const DATADOG_APPLICATION_ID = 'your-datadog-app-id-here'; // Replace with actual app ID
const DATADOG_CLIENT_TOKEN = 'your-datadog-client-token-here'; // Replace with actual token
const GIT_SHA = 'development'; // Replace with actual git SHA in production

export const initializeMonitoring = () => {
  // Initialize Sentry
  if (SENTRY_DSN && SENTRY_DSN !== 'your-sentry-dsn-here') {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: import.meta.env.MODE,
      release: GIT_SHA,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  }

  // Initialize Datadog RUM
  if (DATADOG_APPLICATION_ID && DATADOG_APPLICATION_ID !== 'your-datadog-app-id-here' &&
      DATADOG_CLIENT_TOKEN && DATADOG_CLIENT_TOKEN !== 'your-datadog-client-token-here') {
    datadogRum.init({
      applicationId: DATADOG_APPLICATION_ID,
      clientToken: DATADOG_CLIENT_TOKEN,
      site: 'datadoghq.com',
      service: 'interview-app',
      env: import.meta.env.MODE,
      version: GIT_SHA,
      sessionSampleRate: 50, // 50% session sampling
      sessionReplaySampleRate: 20,
      trackUserInteractions: true,
      trackResources: true,
      trackLongTasks: true,
      defaultPrivacyLevel: 'mask-user-input',
    });
  }
};

// AI Call Tracking Interface
interface AICallMetrics {
  model: string;
  latency_ms: number;
  cost_usd: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  success: boolean;
  error?: string;
}

// Track AI calls with custom metrics
export const trackAICall = (
  functionName: string,
  metrics: AICallMetrics,
  additionalTags?: Record<string, any>
) => {
  const tags = {
    model: metrics.model,
    latency_ms: metrics.latency_ms,
    cost_usd: metrics.cost_usd,
    success: metrics.success,
    ...additionalTags,
  };

  // Track in Sentry
  Sentry.addBreadcrumb({
    message: `AI Call: ${functionName}`,
    category: 'ai',
    level: 'info',
    data: tags,
  });

  // Track in Datadog RUM
  if (typeof datadogRum !== 'undefined') {
    datadogRum.addAction(`ai_call_${functionName}`, tags);
    
    // Set global context for this session
    datadogRum.setGlobalContextProperty('ai.model', metrics.model);
    datadogRum.setGlobalContextProperty('ai.latency_ms', metrics.latency_ms);
    datadogRum.setGlobalContextProperty('ai.cost_usd', metrics.cost_usd);
    
    if (metrics.total_tokens) {
      datadogRum.setGlobalContextProperty('ai.tokens_used', metrics.total_tokens);
    }
  }

  // Log for development
  if (import.meta.env.MODE === 'development') {
    console.log(`[AI Call] ${functionName}:`, tags);
  }
};

// Error tracking utilities
export const trackError = (error: Error, context?: Record<string, any>) => {
  // Track in Sentry
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    Sentry.captureException(error);
  });

  // Track in Datadog RUM
  if (typeof datadogRum !== 'undefined') {
    datadogRum.addError(error, context);
  }
};

// Performance tracking
export const trackPerformance = (name: string, duration: number, tags?: Record<string, any>) => {
  // Track in Sentry
  Sentry.addBreadcrumb({
    message: `Performance: ${name}`,
    category: 'performance',
    level: 'info',
    data: { duration_ms: duration, ...tags },
  });

  // Track in Datadog RUM
  if (typeof datadogRum !== 'undefined') {
    datadogRum.addTiming(name, duration);
  }
};

// User identification
export const identifyUser = (userId: string, userAttributes?: Record<string, any>) => {
  // Set user context in Sentry
  Sentry.setUser({
    id: userId,
    ...userAttributes,
  });

  // Set user context in Datadog RUM
  if (typeof datadogRum !== 'undefined') {
    datadogRum.setUser({
      id: userId,
      ...userAttributes,
    });
  }
};

export { Sentry, datadogRum };