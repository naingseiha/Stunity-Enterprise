import { authApi } from './client';

type PresenceHeartbeatResponse = {
  success: boolean;
  data: {
    isOnline: boolean;
    showOnlineStatus?: boolean;
    lastActiveAt?: string | null;
  };
};

type PresenceBatchResponse = {
  success: boolean;
  data: Record<string, boolean>;
};

export const sendPresenceHeartbeat = async (): Promise<PresenceHeartbeatResponse['data']> => {
  const { data } = await authApi.post<PresenceHeartbeatResponse>('/users/me/presence');
  return data.data;
};

export const fetchPresenceBatch = async (userIds: string[]): Promise<Record<string, boolean>> => {
  const uniqueIds = [...new Set(userIds.filter(Boolean))].slice(0, 50);
  if (uniqueIds.length === 0) {
    return {};
  }

  const { data } = await authApi.post<PresenceBatchResponse>('/users/presence', {
    userIds: uniqueIds,
  });
  return data.data || {};
};
