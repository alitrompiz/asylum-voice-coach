import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Attorney {
  id: string;
  display_name: string;
  firm_name: string;
  coupon_code: string;
  ref_is_active: boolean;
}

export const useAttorneys = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  // Query to get all active attorneys
  const { data: attorneys, isLoading } = useQuery({
    queryKey: ['attorneys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attorneys')
        .select('*')
        .eq('ref_is_active', true)
        .order('display_name');

      if (error) throw error;
      return data as Attorney[];
    },
  });

  // Query to get user's selected attorney
  const { data: selectedAttorney } = useQuery({
    queryKey: ['user-attorney', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('subscribers')
        .select(`
          attorney_id,
          attorneys (
            id,
            display_name,
            firm_name,
            coupon_code
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is ok
        throw error;
      }

      return data?.attorneys || null;
    },
    enabled: !!user,
  });

  // Filter attorneys based on search term
  const filteredAttorneys = attorneys?.filter(attorney => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = attorney.display_name.toLowerCase().includes(searchLower);
    const firmMatch = attorney.firm_name.toLowerCase().includes(searchLower);
    
    return nameMatch || firmMatch;
  }) ?? []; // Use nullish coalescing instead of logical OR to ensure array

  // Select attorney mutation
  const selectAttorney = useMutation({
    mutationFn: async (attorneyId: string) => {
      if (!user) throw new Error('User not authenticated');
      
      // First, upsert the subscriber record with the attorney
      const { error } = await supabase
        .from('subscribers')
        .upsert({
          user_id: user.id,
          email: user.email!,
          attorney_id: attorneyId,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;

      // Get the attorney info for the coupon code
      const { data: attorney } = await supabase
        .from('attorneys')
        .select('coupon_code')
        .eq('id', attorneyId)
        .single();

      if (attorney?.coupon_code) {
        // Update the subscriber with the coupon code
        await supabase
          .from('subscribers')
          .update({ coupon_code: attorney.coupon_code })
          .eq('user_id', user.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-attorney'] });
      toast({
        title: 'Attorney selected',
        description: 'Your attorney selection has been saved. You\'ll receive their referral discount at checkout.'
      });
    },
    onError: (error) => {
      console.error('Error selecting attorney:', error);
      toast({
        title: 'Error',
        description: 'Failed to select attorney',
        variant: 'destructive'
      });
    }
  });

  return {
    attorneys: filteredAttorneys,
    selectedAttorney,
    loading: isLoading,
    searchTerm,
    setSearchTerm,
    selectAttorney: selectAttorney.mutate,
    isSelecting: selectAttorney.isPending
  };
};