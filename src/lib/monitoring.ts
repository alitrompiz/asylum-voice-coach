// Configuration from environment variables
const SENTRY_DSN = 'your-sentry-dsn-here'; // Replace with actual DSN
const DATADOG_APPLICATION_ID = 'your-datadog-app-id-here'; // Replace with actual app ID
const DATADOG_CLIENT_TOKEN = 'your-datadog-client-token-here'; // Replace with actual token
const GIT_SHA = 'development'; // Replace with actual git SHA in production

// Dynamic SDK instances
let Sentry: any = null;
let datadogRum: any = null;

export const initializeMonitoring = async () => {
  // Initialize Sentry
  if (SENTRY_DSN && SENTRY_DSN !== 'your-sentry-dsn-here') {
    try {
      const SentryModule = await import('@sentry/react');
      Sentry = SentryModule;
      
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
    } catch (error) {
      console.warn('[Monitoring] Failed to initialize Sentry:', error);
    }
  }

  // Initialize Datadog RUM
  if (DATADOG_APPLICATION_ID && DATADOG_APPLICATION_ID !== 'your-datadog-app-id-here' &&
      DATADOG_CLIENT_TOKEN && DATADOG_CLIENT_TOKEN !== 'your-datadog-client-token-here') {
    try {
      const DatadogModule = await import('@datadog/browser-rum');
      datadogRum = DatadogModule.datadogRum;
      
      datadogRum.init({
        applicationId: DATADOG_APPLICATION_ID,
        clientToken: DATADOG_CLIENT_TOKEN,
        site: 'datadoghq.com',
        service: 'interview-app',
        env: import.meta.env.MODE,
        version: GIT_SHA,
        sessionSampleRate: 50,
        sessionReplaySampleRate: 20,
        trackUserInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: 'mask-user-input',
      });
    } catch (error) {
      console.warn('[Monitoring] Failed to initialize Datadog RUM:', error);
    }
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
  if (Sentry) {
    try {
      Sentry.addBreadcrumb({
        message: `AI Call: ${functionName}`,
        category: 'ai',
        level: 'info',
        data: tags,
      });
    } catch (error) {
      console.warn('[Monitoring] Failed to track AI call in Sentry:', error);
    }
  }

  // Track in Datadog RUM
  if (datadogRum) {
    try {
      datadogRum.addAction(`ai_call_${functionName}`, tags);
      datadogRum.setGlobalContextProperty('ai.model', metrics.model);
      datadogRum.setGlobalContextProperty('ai.latency_ms', metrics.latency_ms);
      datadogRum.setGlobalContextProperty('ai.cost_usd', metrics.cost_usd);
      
      if (metrics.total_tokens) {
        datadogRum.setGlobalContextProperty('ai.tokens_used', metrics.total_tokens);
      }
    } catch (error) {
      console.warn('[Monitoring] Failed to track AI call in Datadog:', error);
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
  if (Sentry) {
    try {
      Sentry.withScope((scope: any) => {
        if (context) {
          Object.entries(context).forEach(([key, value]) => {
            scope.setTag(key, value);
          });
        }
        Sentry.captureException(error);
      });
    } catch (err) {
      console.warn('[Monitoring] Failed to track error in Sentry:', err);
    }
  }

  // Track in Datadog RUM
  if (datadogRum) {
    try {
      datadogRum.addError(error, context);
    } catch (err) {
      console.warn('[Monitoring] Failed to track error in Datadog:', err);
    }
  }
};

// Performance tracking
export const trackPerformance = (name: string, duration: number, tags?: Record<string, any>) => {
  // Track in Sentry
  if (Sentry) {
    try {
      Sentry.addBreadcrumb({
        message: `Performance: ${name}`,
        category: 'performance',
        level: 'info',
        data: { duration_ms: duration, ...tags },
      });
    } catch (error) {
      console.warn('[Monitoring] Failed to track performance in Sentry:', error);
    }
  }

  // Track in Datadog RUM
  if (datadogRum) {
    try {
      datadogRum.addTiming(name, duration);
    } catch (error) {
      console.warn('[Monitoring] Failed to track performance in Datadog:', error);
    }
  }
};

// User identification
export const identifyUser = (userId: string, userAttributes?: Record<string, any>) => {
  // Set user context in Sentry
  if (Sentry) {
    try {
      Sentry.setUser({
        id: userId,
        ...userAttributes,
      });
    } catch (error) {
      console.warn('[Monitoring] Failed to set user in Sentry:', error);
    }
  }

  // Set user context in Datadog RUM
  if (datadogRum) {
    try {
      datadogRum.setUser({
        id: userId,
        ...userAttributes,
      });
    } catch (error) {
      console.warn('[Monitoring] Failed to set user in Datadog:', error);
    }
  }
};

export { Sentry, datadogRum };