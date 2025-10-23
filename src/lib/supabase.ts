import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://atthfkcmknkcyfeumcrq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0dGhma2Nta25rY3lmZXVtY3JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODYyNzEsImV4cCI6MjA2ODI2MjI3MX0.-de7mr_Ycqx_yRt0HZm5zCWSPJ4R5sBdkk5T1YrPzaM';

// Safe storage for incognito/private browsing modes
const safeStorage: Storage = (() => {
  try {
    const test = '__sb_legacy_test__';
    window.localStorage.setItem(test, '1');
    window.localStorage.removeItem(test);
    return window.localStorage;
  } catch {
    // Fallback to in-memory storage for incognito/private browsing
    const memoryStore = new Map<string, string>();
    return {
      getItem: (key) => memoryStore.has(key) ? memoryStore.get(key)! : null,
      setItem: (key, value) => { memoryStore.set(key, String(value)); },
      removeItem: (key) => { memoryStore.delete(key); },
      clear: () => { memoryStore.clear(); },
      key: (index) => Array.from(memoryStore.keys())[index] ?? null,
      get length() { return memoryStore.size; }
    } as Storage;
  }
})();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Auth helpers
export const auth = {
  signUp: (email: string, password: string) => 
    supabase.auth.signUp({ email, password }),
  
  signIn: (email: string, password: string) => 
    supabase.auth.signInWithPassword({ email, password }),
  
  signOut: () => supabase.auth.signOut(),
  
  resetPassword: (email: string) => 
    supabase.auth.resetPasswordForEmail(email),
  
  getUser: () => supabase.auth.getUser(),
  
  onAuthStateChange: (callback: (event: string, session: any) => void) => 
    supabase.auth.onAuthStateChange(callback),
};

// Database helpers
export const db = {
  from: (table: string) => supabase.from(table),
  rpc: (fn: string, params?: any) => supabase.rpc(fn, params),
  storage: supabase.storage,
};

export type Database = {
  public: {
    Tables: {
      // Add your table types here
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
        };
        Update: {
          email?: string;
          updated_at?: string;
        };
      };
    };
  };
};