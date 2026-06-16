import { useQuery } from '@tanstack/react-query';
import { fetchNotificationsSummary } from '@/api/notifications.js';
import { useAuth } from '@/hooks/useAuth.js';

export const useNotificationsSummary = () => {
  const { isAuthenticated } = useAuth();
  const query = useQuery({
    queryKey: ['notifications', 'summary'],
    meta: { live: true },
    queryFn: fetchNotificationsSummary,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  return {
    notifications: query.data?.notifications || [],
    unreadCount: Number(query.data?.unreadCount || 0),
    loading: query.isLoading,
  };
};
