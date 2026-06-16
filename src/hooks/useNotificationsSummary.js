import { useEffect, useState } from 'react';
import { fetchNotificationsSummary } from '@/api/notifications.js';
import { useAuth } from '@/hooks/useAuth.js';

export const useNotificationsSummary = () => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const payload = await fetchNotificationsSummary();
        if (!mounted) return;
        setNotifications(payload?.notifications || []);
        setUnreadCount(Number(payload?.unreadCount || 0));
      } catch (_error) {
        if (!mounted) return;
        setNotifications([]);
        setUnreadCount(0);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [isAuthenticated]);

  return { notifications, unreadCount, loading };
};
