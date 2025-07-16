import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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