import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { PushNotifications } from '@capacitor/push-notifications';
import { toast } from 'sonner';
import { registerPushToken } from '@/api/mobile.js';
import { isCapacitorNative, getNativePlatform } from '@/utils/platform.js';
import { useAuth } from '@/hooks/useAuth.js';
import { MobilePermissionPrompt } from '@/mobile/ui/MobilePermissionPrompt.jsx';

const PUSH_PROMPT_KEY = 'greffio.mobile.pushPromptSeen';

export const MobilePushRegistration = () => {
  const { isAuthenticated } = useAuth();
  const [promptOpen, setPromptOpen] = useState(false);

  useEffect(() => {
    if (!isCapacitorNative() || !isAuthenticated || !PushNotifications?.requestPermissions) return undefined;

    let registrationHandle;
    let registrationErrorHandle;
    let pushReceivedHandle;
    let pushActionHandle;

    const registerPush = async () => {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== 'granted') return;
      await PushNotifications.register();
    };

    const setup = async () => {
      try {
        const existing = await PushNotifications.checkPermissions?.();
        if (existing?.receive === 'granted') {
          await PushNotifications.register();
          return;
        }
      } catch (_error) {
        // fallback to prompt flow
      }

      try {
        const seen = window.localStorage.getItem(PUSH_PROMPT_KEY) === '1';
        if (!seen) {
          setPromptOpen(true);
          return;
        }
      } catch (_error) {
        // ignore
      }

      await registerPush();
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

  const confirmPush = async () => {
    try {
      window.localStorage.setItem(PUSH_PROMPT_KEY, '1');
    } catch (_error) {
      // ignore
    }
    setPromptOpen(false);
    if (!PushNotifications?.requestPermissions) return;
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive === 'granted') {
      await PushNotifications.register();
    }
  };

  const dismissPush = () => {
    try {
      window.localStorage.setItem(PUSH_PROMPT_KEY, '1');
    } catch (_error) {
      // ignore
    }
    setPromptOpen(false);
  };

  return (
    <MobilePermissionPrompt
      open={promptOpen}
      icon={Bell}
      title="Restez informé de votre dossier"
      description="Greffio peut vous alerter lorsque l’équipe valide une pièce, demande un document ou avance votre formalité."
      benefit="Vous gardez le contrôle — désactivable à tout moment dans les réglages Android."
      confirmLabel="Activer les notifications"
      onConfirm={() => { void confirmPush(); }}
      onCancel={dismissPush}
    />
  );
};
