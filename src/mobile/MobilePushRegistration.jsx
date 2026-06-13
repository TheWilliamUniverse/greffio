import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { PushNotifications } from '@capacitor/push-notifications';
import { toast } from 'sonner';
import { registerPushToken } from '@/api/mobile.js';
import { isCapacitorNative, getNativePlatform } from '@/utils/platform.js';
import { useAuth } from '@/hooks/useAuth.js';
import { MobilePermissionPrompt } from '@/mobile/ui/MobilePermissionPrompt.jsx';
import { isNativePushPromptReady } from '@/utils/nativeAppStorage.js';
import { resolveDossierContinueUrl } from '@/utils/dossierContinueUrl.js';

const PUSH_PROMPT_KEY = 'greffio.mobile.pushPromptSeen';

export const MobilePushRegistration = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [promptOpen, setPromptOpen] = useState(false);
  const [pushReady, setPushReady] = useState(() => isNativePushPromptReady());

  useEffect(() => {
    if (pushReady) return undefined;
    const timer = window.setInterval(() => {
      if (isNativePushPromptReady()) {
        setPushReady(true);
        window.clearInterval(timer);
      }
    }, 400);
    return () => window.clearInterval(timer);
  }, [pushReady]);

  useEffect(() => {
    if (!isCapacitorNative() || !isAuthenticated || !pushReady || !PushNotifications?.requestPermissions) {
      return undefined;
    }

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
        // silent – backend may not be deployed yet
      });
    });

    registrationErrorHandle = PushNotifications.addListener('registrationError', () => {
      // FCM requires google-services.json on Android
    });

    pushReceivedHandle = PushNotifications.addListener('pushNotificationReceived', (notification) => {
      const title = notification?.title || 'Greffio';
      const body = notification?.body || '';
      if (body) toast.info(`${title} – ${body}`);
    });

    pushActionHandle = PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
      const data = event?.notification?.data || {};
      const route = data.route || data.path;
      if (route) {
        const target = String(route).startsWith('/') ? String(route) : `/${route}`;
        navigate(target);
        return;
      }
      if (data.dossierId) {
        navigate(resolveDossierContinueUrl({
          id: data.dossierId,
          status: data.status,
          progressPercent: data.progressPercent,
        }));
      }
    });

    void setup();

    return () => {
      void registrationHandle?.then((handle) => handle.remove());
      void registrationErrorHandle?.then((handle) => handle.remove());
      void pushReceivedHandle?.then((handle) => handle.remove());
      void pushActionHandle?.then((handle) => handle.remove());
    };
  }, [isAuthenticated, navigate, pushReady]);

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
      return;
    }
    toast.info('Notifications désactivées. Vous pourrez toujours consulter vos actions depuis l\'accueil Greffio.');
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
      benefit="Vous gardez le contrôle – désactivable à tout moment dans les réglages Android."
      confirmLabel="Activer les notifications"
      onConfirm={() => { void confirmPush(); }}
      onCancel={dismissPush}
    />
  );
};
