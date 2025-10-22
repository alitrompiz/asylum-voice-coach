import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

function safeGetStorage(): Storage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const test = '__zstd_test__';
      window.localStorage.setItem(test, '1');
      window.localStorage.removeItem(test);
      return window.localStorage;
    }
  } catch (_) {}
  const memory: Record<string, string> = {};
  return {
    getItem: (name: string) => memory[name] ?? null,
    setItem: (name: string, value: string) => { memory[name] = value; },
    removeItem: (name: string) => { delete memory[name]; },
    clear: () => { Object.keys(memory).forEach(k => delete memory[k]); },
    key: (index: number) => Object.keys(memory)[index] ?? null,
    get length() { return Object.keys(memory).length; }
  } as Storage;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,
      isInitialized: false,
      
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session, user: session?.user ?? null }),
      setLoading: (isLoading) => set({ isLoading }),
      setInitialized: (isInitialized) => set({ isInitialized }),
      
      signOut: async () => {
        set({ isLoading: true });
        await supabase.auth.signOut();
        set({ user: null, session: null, isLoading: false });
      },
      
      initialize: async () => {
        const state = get();
        if (state.isInitialized) return;
        
        set({ isLoading: true });
        
        // Get initial session first
        const { data: { session } } = await supabase.auth.getSession();
        
        // Set up auth state listener
        supabase.auth.onAuthStateChange(
          (event, session) => {
            set({ 
              session, 
              user: session?.user ?? null,
              isLoading: false,
              isInitialized: true
            });
          }
        );
        
        // Set initial state
        set({ 
          session, 
          user: session?.user ?? null,
          isLoading: false,
          isInitialized: true
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => safeGetStorage()),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
    }
  )
);