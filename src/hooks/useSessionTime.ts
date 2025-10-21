import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useGuestSession } from '@/hooks/useGuestSession';

interface SessionTimeData {
  session_seconds_used: number;
  session_seconds_limit: number;
}

export const useSessionTime = () => {
  const { user, isGuest } = useAuth();
  const { isFreeTier } = useSubscription();
  const queryClient = useQueryClient();
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const { guestData, updateSessionTime: updateGuestTime, remainingSeconds: guestRemainingSeconds } = useGuestSession();

  // Query to get session time data
  const { data: sessionTime, isLoading } = useQuery({
    queryKey: ['session-time', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('minutes_balance')
        .select('session_seconds_used, session_seconds_limit')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is ok
        // Create initial record for new user
        const { data: newRecord, error: insertError } = await supabase
          .from('minutes_balance')
          .insert({
            user_id: user.id,
            session_seconds_used: 0,
            session_seconds_limit: 600 // 10 minutes default
          })
          .select('session_seconds_used, session_seconds_limit')
          .single();

        if (insertError) throw insertError;
        return newRecord as SessionTimeData;
      }

      return data as SessionTimeData;
    },
    enabled: !!user,
  });

  // Update session time
  const updateSessionTime = useMutation({
    mutationFn: async (secondsUsed: number) => {
      if (!user) throw new Error('No user');
      
      const { error } = await supabase
        .from('minutes_balance')
        .update({ session_seconds_used: secondsUsed })
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-time'] });
    }
  });

  // Calculate remaining time
  const remainingSeconds = isGuest
    ? guestRemainingSeconds
    : isFreeTier 
      ? Math.max(0, (sessionTime?.session_seconds_limit || 600) - (sessionTime?.session_seconds_used || 0))
      : Infinity; // Unlimited for full tier
  
  const remainingMinutes = isGuest
    ? Math.floor(guestRemainingSeconds / 60)
    : isFreeTier 
      ? Math.floor(remainingSeconds / 60)
      : Infinity;

  const hasTimeRemaining = isGuest 
    ? guestRemainingSeconds > 0 
    : isFreeTier ? remainingSeconds > 0 : true;
    
  const isTimeExhausted = isGuest
    ? guestRemainingSeconds <= 0
    : isFreeTier ? remainingSeconds <= 0 : false;

  // Start session tracking
  const startSession = () => {
    if (!sessionStartTime) {
      setSessionStartTime(Date.now());
    }
  };

  // End session and update used time
  const endSession = async () => {
    if (sessionStartTime) {
      const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
      
      if (isGuest) {
        const newUsedSeconds = (guestData?.sessionSecondsUsed || 0) + sessionDuration;
        updateGuestTime(newUsedSeconds);
      } else if (isFreeTier) {
        const newUsedSeconds = (sessionTime?.session_seconds_used || 0) + sessionDuration;
        await updateSessionTime.mutateAsync(newUsedSeconds);
      }
      
      setSessionStartTime(null);
    }
  };

  // Get current session duration
  const getCurrentSessionDuration = () => {
    if (!sessionStartTime) return 0;
    return Math.floor((Date.now() - sessionStartTime) / 1000);
  };

  // Check if session should be stopped (for free tier and guests)
  const shouldStopSession = () => {
    if (!sessionStartTime) return false;
    
    const currentSessionDuration = getCurrentSessionDuration();
    
    if (isGuest) {
      const totalUsedSeconds = (guestData?.sessionSecondsUsed || 0) + currentSessionDuration;
      return totalUsedSeconds >= (guestData?.sessionSecondsLimit || 1800);
    }
    
    if (isFreeTier) {
      const totalUsedSeconds = (sessionTime?.session_seconds_used || 0) + currentSessionDuration;
      return totalUsedSeconds >= (sessionTime?.session_seconds_limit || 600);
    }
    
    return false;
  };

  return {
    sessionTime,
    remainingSeconds,
    remainingMinutes,
    hasTimeRemaining,
    isTimeExhausted,
    loading: isLoading,
    startSession,
    endSession,
    getCurrentSessionDuration,
    shouldStopSession,
    updateSessionTime: updateSessionTime.mutate,
    isUpdating: updateSessionTime.isPending
  };
};