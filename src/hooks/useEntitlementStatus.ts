import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isDev } from '@/lib/env';

const DEBUG_GATING = isDev; // Enable debug logging in development

export const useEntitlementStatus = () => {
  const { user } = useAuth();

  const { data: entitlementStatus, isLoading, error } = useQuery({
    queryKey: ['entitlement-status', user?.id],
    queryFn: async (): Promise<'free_trial' | 'full_prep'> => {
      if (!user) return 'free_trial';
      
      const { data, error } = await supabase.rpc('get_user_entitlement_status', {
        target_user_id: user.id
      });
      
      if (error) {
        console.error('Error checking entitlement:', error);
        return 'free_trial';
      }
      
      const status = data as 'free_trial' | 'full_prep';
      
      if (DEBUG_GATING) {
        console.log('[GATING DEBUG] User entitlement status:', {
          userId: user.id,
          status,
          email: user.email
        });
      }
      
      return status;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  return {
    entitlementStatus: entitlementStatus || 'free_trial',
    isLoading,
    error,
    isFreeTrial: entitlementStatus === 'free_trial',
    isFullPrep: entitlementStatus === 'full_prep',
  };
};