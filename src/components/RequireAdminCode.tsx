import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface RequireAdminCodeProps {
  children: ReactNode;
}

export const RequireAdminCode = ({ children }: RequireAdminCodeProps) => {
  const isAdminUnlocked = localStorage.getItem('isAdminUnlocked') === 'true';

  if (!isAdminUnlocked) {
    return <Navigate to="/admin-login" replace />;
  }

  return <>{children}</>;
};