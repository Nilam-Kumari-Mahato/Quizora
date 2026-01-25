import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAppStore';

export function useUserSync() {
  const { clearUser } = useAuthStore();

  useEffect(() => {

    clearUser();
  }, []);
}
