
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Loader2 } from 'lucide-react';

interface RequireAdminRoleProps {
  children: ReactNode;
}

export const RequireAdminRole = ({ children }: RequireAdminRoleProps) => {
  const { user } = useAuth();
  const { isAdmin, loading } = useAdminAccess();

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Show loading state while checking admin role
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking admin access...</p>
        </div>
      </div>
    );
  }

  // If not admin, redirect to dashboard
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
