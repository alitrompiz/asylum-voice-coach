import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/tracking';

interface AdminAction {
  admin_user_id: string;
  target_user_id: string;
  action_type: string;
  action_details: any;
}

export const useUserActions = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const logAdminAction = async (action: AdminAction) => {
    try {
      const { error } = await supabase
        .from('admin_actions')
        .insert([action]);

      if (error) throw error;
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  };

  const banUser = async (userId: string, reason?: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update user's banned status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_banned: true })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Revoke all refresh tokens for the user
      const { error: revokeError } = await supabase.auth.admin.signOut(userId);
      if (revokeError) console.warn('Failed to revoke tokens:', revokeError);

      // Log admin action
      await logAdminAction({
        admin_user_id: user.id,
        target_user_id: userId,
        action_type: 'ban_user',
        action_details: { reason },
      });

      // Track event
      trackEvent('admin_ban_user', {
        target_user_id: userId,
        reason,
      });

      toast({
        title: 'Success',
        description: 'User has been banned successfully',
      });
    } catch (error) {
      console.error('Error banning user:', error);
      toast({
        title: 'Error',
        description: 'Failed to ban user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const unbanUser = async (userId: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: false })
        .eq('user_id', userId);

      if (error) throw error;

      await logAdminAction({
        admin_user_id: user.id,
        target_user_id: userId,
        action_type: 'unban_user',
        action_details: {},
      });

      trackEvent('admin_unban_user', {
        target_user_id: userId,
      });

      toast({
        title: 'Success',
        description: 'User has been unbanned successfully',
      });
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast({
        title: 'Error',
        description: 'Failed to unban user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const adjustMinutes = async (userId: string, minutesChange: number, reason: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current balance
      const { data: currentBalance, error: fetchError } = await supabase
        .from('minutes_balance')
        .select('session_seconds_used, session_seconds_limit')
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      const currentSeconds = currentBalance.session_seconds_used || 0;
      const minutesToSeconds = minutesChange * 60;
      const newSeconds = Math.max(0, currentSeconds + minutesToSeconds);

      // Update session seconds
      const { error: updateError } = await supabase
        .from('minutes_balance')
        .update({ session_seconds_used: newSeconds })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      const actionType = minutesChange > 0 ? 'grant_minutes' : 'refund_minutes';

      await logAdminAction({
        admin_user_id: user.id,
        target_user_id: userId,
        action_type: actionType,
        action_details: {
          minutes_change: minutesChange,
          previous_balance: Math.floor(currentSeconds / 60),
          new_balance: Math.floor(newSeconds / 60),
          reason,
        },
      });

      trackEvent(`admin_${actionType}`, {
        target_user_id: userId,
        minutes_change: minutesChange,
        reason,
      });

      toast({
        title: 'Success',
        description: `Minutes ${minutesChange > 0 ? 'granted' : 'refunded'} successfully`,
      });
    } catch (error) {
      console.error('Error adjusting minutes:', error);
      toast({
        title: 'Error',
        description: 'Failed to adjust minutes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const grantMinutes = async (userId: string, minutes: number, reason: string) => {
    await adjustMinutes(userId, minutes, reason);
  };

  const refundMinutes = async (userId: string, minutes: number, reason: string) => {
    await adjustMinutes(userId, -minutes, reason);
  };

  return {
    loading,
    banUser,
    unbanUser,
    grantMinutes,
    refundMinutes,
  };
};