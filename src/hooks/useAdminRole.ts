import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

export const useAdminRole = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const assignAdminRole = async (userId?: string): Promise<boolean> => {
    if (!user && !userId) {
      toast.error('User must be authenticated');
      return false;
    }

    const targetUserId = userId || user?.id;
    if (!targetUserId) {
      toast.error('No user ID provided');
      return false;
    }

    setLoading(true);
    try {
      // First check if any admin exists
      const { data: hasAdmin, error: checkError } = await supabase
        .rpc('has_any_admin');

      if (checkError) {
        throw checkError;
      }

      // If no admin exists, allow self-assignment
      if (!hasAdmin) {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: targetUserId,
            role: 'admin'
          });

        if (insertError) {
          throw insertError;
        }

        toast.success('Admin role assigned successfully');
        return true;
      } else {
        // If admin exists, use the assign_admin_role function (requires admin privileges)
        const { error: assignError } = await supabase
          .rpc('assign_admin_role', { _user_id: targetUserId });

        if (assignError) {
          throw assignError;
        }

        toast.success('Admin role assigned successfully');
        return true;
      }
    } catch (error: any) {
      console.error('Error assigning admin role:', error);
      toast.error(`Failed to assign admin role: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeAdminRole = async (userId: string): Promise<boolean> => {
    if (!user) {
      toast.error('User must be authenticated');
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .rpc('remove_admin_role', { _user_id: userId });

      if (error) {
        throw error;
      }

      toast.success('Admin role removed successfully');
      return true;
    } catch (error: any) {
      console.error('Error removing admin role:', error);
      toast.error(`Failed to remove admin role: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const checkAdminExists = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('has_any_admin');
      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking admin existence:', error);
      return false;
    }
  };

  return {
    assignAdminRole,
    removeAdminRole,
    checkAdminExists,
    loading
  };
};