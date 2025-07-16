import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
        set({ isLoading: true });
        
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
        
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
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
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
    }
  )
);