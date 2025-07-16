import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <>{children}</>;
}