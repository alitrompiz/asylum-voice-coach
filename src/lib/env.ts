export const isDev =
  (typeof import.meta !== 'undefined' && !!import.meta.env?.DEV) ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');

export const appMode = (typeof import.meta !== 'undefined' && import.meta.env?.MODE) || 
  (typeof process !== 'undefined' && process?.env?.NODE_ENV) || 'production';

// Helper to safely check debug flags
export const isDebugEnabled = (flag: string) => isDev && import.meta.env?.[flag] === 'on';