import React, { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { toast } from 'sonner';
import { registerPushToken } from '@/api/mobile.js';
import { isCapacitorNative, getNativePlatform } from '@/utils/platform.js';
import { useAuth } from '@/hooks/useAuth.js';

export const MobilePushRegistration = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isCapacitorNative() || !isAuthenticated || !PushNotifications?.requestPermissions) return undefined;

    let registrationHandle;
    let registrationErrorHandle;
    let pushReceivedHandle;
    let pushActionHandle;

    const setup = async () => {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== 'granted') return;
      await PushNotifications.register();
    };

    registrationHandle = PushNotifications.addListener('registration', (event) => {
      const token = String(event?.value || '').trim();
      if (!token) return;
      void registerPushToken({
        token,
        platform: getNativePlatform(),
        deviceLabel: `${getNativePlatform()} Greffio`,
      }).catch(() => {
        // silent — backend may not be deployed yet
      });
    });

    registrationErrorHandle = PushNotifications.addListener('registrationError', () => {
      // FCM requires google-services.json on Android
    });

    pushReceivedHandle = PushNotifications.addListener('pushNotificationReceived', (notification) => {
      const title = notification?.title || 'Greffio';
      const body = notification?.body || '';
      if (body) toast.info(`${title} — ${body}`);
    });

    pushActionHandle = PushNotifications.addListener('pushNotificationActionPerformed', () => {
      // deep link routing handled separately later
    });

    void setup();

    return () => {
      void registrationHandle?.then((handle) => handle.remove());
      void registrationErrorHandle?.then((handle) => handle.remove());
      void pushReceivedHandle?.then((handle) => handle.remove());
      void pushActionHandle?.then((handle) => handle.remove());
    };
  }, [isAuthenticated]);

  return null;
};
