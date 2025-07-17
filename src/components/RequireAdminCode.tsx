import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAccess } from '@/hooks/useAdminAccess';

interface RequireAdminCodeProps {
  children: ReactNode;
}

export const RequireAdminCode = ({ children }: RequireAdminCodeProps) => {
  const { isAdmin, loading } = useAdminAccess();
  const isAdminUnlocked = localStorage.getItem('isAdminUnlocked') === 'true';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check both localStorage flag and database role for security
  if (!isAdminUnlocked || !isAdmin) {
    return <Navigate to="/admin-login" replace />;
  }

  return <>{children}</>;
};