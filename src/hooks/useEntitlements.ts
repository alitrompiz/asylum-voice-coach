import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useEntitlements = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Grant Full Prep access
  const grantFullPrep = useMutation({
    mutationFn: async ({ userId, weeks = 1, reason = 'Admin grant' }: { 
      userId: string; 
      weeks?: number; 
      reason?: string; 
    }) => {
      const { error } = await supabase.rpc('grant_full_prep_access', {
        target_user_id: userId,
        weeks_to_grant: weeks,
        grant_reason: reason
      });
      
      if (error) throw error;
    },
    onSuccess: (_, { weeks }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ 
        title: 'Success', 
        description: `Full Prep access granted for ${weeks} week${weeks > 1 ? 's' : ''}` 
      });
    },
    onError: (error) => {
      console.error('Error granting Full Prep access:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to grant Full Prep access',
        variant: 'destructive' 
      });
    }
  });

  // Revoke Full Prep access
  const revokeFullPrep = useMutation({
    mutationFn: async ({ userId, reason = 'Admin revocation' }: { 
      userId: string; 
      reason?: string; 
    }) => {
      const { error } = await supabase.rpc('revoke_full_prep_access', {
        target_user_id: userId,
        revoke_reason: reason
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ 
        title: 'Success', 
        description: 'Full Prep access revoked' 
      });
    },
    onError: (error) => {
      console.error('Error revoking Full Prep access:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to revoke Full Prep access',
        variant: 'destructive' 
      });
    }
  });

  // Check entitlement status
  const checkEntitlement = async (userId: string): Promise<'free_trial' | 'full_prep'> => {
    const { data, error } = await supabase.rpc('get_user_entitlement_status', {
      target_user_id: userId
    });
    
    if (error) {
      console.error('Error checking entitlement:', error);
      return 'free_trial';
    }
    
    return data as 'free_trial' | 'full_prep';
  };

  return {
    grantFullPrep,
    revokeFullPrep,
    checkEntitlement,
    isLoading: grantFullPrep.isPending || revokeFullPrep.isPending,
  };
};