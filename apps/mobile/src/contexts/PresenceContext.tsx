import React, { useEffect } from 'react';

import { useAuthStore } from '@/stores';
import { bindPresenceSync } from '@/services/presenceSync';

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      return undefined;
    }

    return bindPresenceSync(userId);
  }, [isAuthenticated, userId]);

  return <>{children}</>;
};
