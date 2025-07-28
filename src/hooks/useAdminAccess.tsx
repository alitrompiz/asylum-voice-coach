
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useAdminAccess = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Memoize the user ID to prevent unnecessary re-runs
  const userId = useMemo(() => user?.id, [user?.id]);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!userId) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Only log on first check or user change, not on every render
        if (process.env.NODE_ENV === 'development') {
          console.log('Checking admin access for user:', userId);
        }

        // Check if user has admin role
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle();

        if (error) {
          console.error('Error checking admin role:', error);
          throw error;
        }

        const hasAdminRole = !!data;
        if (process.env.NODE_ENV === 'development') {
          console.log('Admin role check result:', { hasAdminRole, data });
        }
        
        setIsAdmin(hasAdminRole);
      } catch (error: any) {
        console.error('Error checking admin access:', error);
        setError(error.message);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [userId]); // Only depend on userId, not the entire user object

  return { isAdmin, loading, error };
};
