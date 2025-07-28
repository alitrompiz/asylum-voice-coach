import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from './authStore';

interface MinutesState {
  currentMinutes: number;
  freeTrialUsed: boolean;
  loading: boolean;
  error: string | null;
  
  // Actions
  setMinutes: (minutes: number) => void;
  decrementMinutes: () => void;
  updateMinutesBalance: (minutes: number) => Promise<void>;
  fetchMinutesBalance: () => Promise<void>;
  setFreeTrialUsed: (used: boolean) => void;
}

export const useMinutesStore = create<MinutesState>((set, get) => ({
  currentMinutes: 0,
  freeTrialUsed: false,
  loading: false,
  error: null,

  setMinutes: (minutes) => set({ currentMinutes: minutes }),
  
  decrementMinutes: () => {
    const { currentMinutes } = get();
    if (currentMinutes > 0) {
      set({ currentMinutes: currentMinutes - 1 });
    }
  },

  updateMinutesBalance: async (minutes) => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    set({ loading: true, error: null });
    try {
      // Convert minutes to seconds used reduction
      const secondsToGrant = minutes * 60;
      const { data: current } = await supabase
        .from('minutes_balance')
        .select('session_seconds_used')
        .eq('user_id', user.id)
        .single();
      
      const newUsedSeconds = Math.max(0, (current?.session_seconds_used || 0) - secondsToGrant);
      
      const { error } = await supabase
        .from('minutes_balance')
        .update({ session_seconds_used: newUsedSeconds })
        .eq('user_id', user.id);

      if (error) throw error;
      set({ currentMinutes: minutes });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchMinutesBalance: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('minutes_balance')
        .select('session_seconds_used, session_seconds_limit')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      const remainingSeconds = (data?.session_seconds_limit || 600) - (data?.session_seconds_used || 0);
      set({ currentMinutes: Math.max(0, Math.floor(remainingSeconds / 60)) });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  setFreeTrialUsed: (used) => set({ freeTrialUsed: used }),
}));