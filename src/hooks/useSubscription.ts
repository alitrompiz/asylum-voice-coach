import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: 'free' | 'full';
  subscription_end: string | null;
  grace_period_end: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Query to get subscription status
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('subscribers')
        .select('subscribed, subscription_tier, subscription_end, grace_period_end')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is ok
        throw error;
      }

      return data as SubscriptionData | null;
    },
    enabled: !!user,
  });

  // Check subscription status with Stripe
  const checkSubscription = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: (error) => {
      console.error('Error checking subscription:', error);
    }
  });

  // Create checkout session
  const createCheckout = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, '_blank');
        if (data.attorney_benefit_applied) {
          toast({
            title: 'Attorney benefit applied',
            description: 'Your attorney discount has been applied to this subscription.'
          });
        }
      }
    },
    onError: (error) => {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Error',
        description: 'Failed to create checkout session',
        variant: 'destructive'
      });
    }
  });

  // Get customer portal URL
  const getPortalUrl = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error) => {
      console.error('Error getting portal URL:', error);
      toast({
        title: 'Error',
        description: 'Failed to open customer portal',
        variant: 'destructive'
      });
    }
  });

  // Auto-check subscription on login
  useEffect(() => {
    if (user && !subscription && !isLoading) {
      checkSubscription.mutate();
    }
  }, [user, subscription, isLoading]);

  const isSubscribed = subscription?.subscribed || false;
  const tier = subscription?.subscription_tier || 'free';
  const isFreeTier = tier === 'free';
  const isFullTier = tier === 'full';

  return {
    subscription,
    isSubscribed,
    tier,
    isFreeTier,
    isFullTier,
    loading: loading || isLoading || checkSubscription.isPending,
    checkSubscription: () => checkSubscription.mutate(),
    createCheckout: () => createCheckout.mutate(),
    openPortal: () => getPortalUrl.mutate(),
    checkingSubscription: checkSubscription.isPending,
    creatingCheckout: createCheckout.isPending,
    openingPortal: getPortalUrl.isPending,
  };
};