import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  HelpCircle,
  LogOut,
  Moon,
  Settings,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { PushNotifications } from '@capacitor/push-notifications';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth.js';
import { MOBILE_STORE } from '@/config/mobileStore.js';
import { MobileAnimatedSection } from '@/mobile/ui/MobileAnimatedSection.jsx';
import { MobilePageContainer } from '@/mobile/ui/MobilePageContainer.jsx';
import { MobileNativeStatusCenter } from '@/mobile/ui/MobileNativeStatusCenter.jsx';
import { useMobileShellOverlay } from '@/mobile/context/MobileShellOverlayContext.jsx';
import { useMobileMotion } from '@/mobile/ui/mobileMotion.js';
import { isCapacitorNative } from '@/utils/platform.js';
import { isBiometricUnlockEnabled, getBiometryLabel } from '@/utils/biometricAuth.js';
import { GreffioVersionCard } from '@/components/system/GreffioVersionCard.jsx';

const rows = [
  { to: '/profil', icon: UserRound, label: 'Profil', hint: 'Identité et coordonnées' },
  { to: '/settings', icon: Settings, label: 'Paramètres', hint: 'Préférences du compte' },
  { to: '/team', icon: ShieldCheck, label: 'Messages', hint: 'Échanges dossier & équipe' },
  { to: '/contact', icon: HelpCircle, label: 'Aide / support', hint: MOBILE_STORE.legal.supportEmail },
];

export const MobileAccountPage = () => {
  const { currentUser } = useAuth();
  const { staggerItem } = useMobileMotion();
  const { openLogoutDialog } = useMobileShellOverlay();
  const [biometryLabel, setBiometryLabel] = useState('Non configurée');
  const [pushLabel, setPushLabel] = useState('Non configurées');
  const nativeApp = isCapacitorNative();

  useEffect(() => {
    if (!nativeApp) return undefined;
    let mounted = true;

    const load = async () => {
      try {
        const enabled = await isBiometricUnlockEnabled();
        if (!mounted) return;
        if (enabled) {
          const label = await getBiometryLabel();
          setBiometryLabel(`Activée (${label})`);
        } else {
          setBiometryLabel('Non configurée');
        }
      } catch (_error) {
        if (mounted) setBiometryLabel('Non configurée');
      }

      try {
        const permission = await PushNotifications.checkPermissions?.();
        if (!mounted) return;
        if (permission?.receive === 'granted') setPushLabel('Activées');
        else if (permission?.receive === 'denied') setPushLabel('Désactivées');
        else setPushLabel('Non configurées');
      } catch (_error) {
        if (mounted) setPushLabel('Non configurées');
      }
    };

    void load();
    return () => { mounted = false; };
  }, [nativeApp]);

  const requestPushAgain = async () => {
    if (!PushNotifications?.requestPermissions) return;
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive === 'granted') {
      await PushNotifications.register();
      setPushLabel('Activées');
      toast.success('Notifications activées.');
      return;
    }
    toast.info('Notifications désactivées. Vous pourrez toujours consulter vos actions depuis l\'accueil Greffio.');
    setPushLabel('Désactivées');
  };

  return (
    <MobilePageContainer>
      <MobileAnimatedSection>
        <section className="rounded-3xl border border-border/70 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-primary/80">Compte</p>
          <h1 className="mt-1 text-xl font-extrabold">{currentUser?.firstName} {currentUser?.lastName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{currentUser?.email}</p>
        </section>
      </MobileAnimatedSection>

      {nativeApp ? (
        <MobileAnimatedSection delay={0.03}>
          <MobileNativeStatusCenter />
        </MobileAnimatedSection>
      ) : null}

      {nativeApp ? (
        <MobileAnimatedSection delay={0.05}>
          <section className="rounded-3xl border border-border/70 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-primary/80">Sécurité</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Biométrie</dt>
                <dd className="font-semibold">{biometryLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Notifications</dt>
                <dd className="font-semibold">{pushLabel}</dd>
              </div>
            </dl>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => openLogoutDialog('sleep')}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-border bg-secondary/40 px-4 text-sm font-semibold text-foreground"
              >
                <Moon className="h-4 w-4" />
                Mettre en veille
              </button>
              {pushLabel !== 'Activées' ? (
                <button
                  type="button"
                  onClick={() => { void requestPushAgain(); }}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 text-sm font-semibold text-primary"
                >
                  Activer les notifications
                </button>
              ) : null}
            </div>
          </section>
        </MobileAnimatedSection>
      ) : null}

      <ul className="overflow-hidden rounded-3xl border border-border/70 bg-white shadow-sm">
        {rows.map((row, index) => (
          <motion.li key={row.to} {...staggerItem(index)} className="border-b border-border/60 last:border-b-0">
            <Link to={row.to} className="flex min-h-[72px] items-center gap-3 px-4 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
                <row.icon className="h-4 w-4 text-primary" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold">{row.label}</span>
                <span className="block text-xs text-muted-foreground">{row.hint}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </motion.li>
        ))}
      </ul>

      <MobileAnimatedSection delay={0.08}>
        <GreffioVersionCard compact />
      </MobileAnimatedSection>

      <MobileAnimatedSection delay={0.1}>
        <section className="rounded-3xl border border-border/70 bg-white p-4 text-xs leading-relaxed text-muted-foreground">
          <p>
            <Link to="/confidentialite" className="font-semibold text-primary">Confidentialité</Link>
            {' · '}
            <Link to="/cookies" className="font-semibold text-primary">Cookies</Link>
            {' · '}
            <Link to="/suppression-compte" className="font-semibold text-primary">Suppression compte</Link>
          </p>
        </section>
      </MobileAnimatedSection>

      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => openLogoutDialog('logout')}
        className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-border bg-white py-3 text-sm font-semibold text-red-600"
      >
        <LogOut className="h-4 w-4" />
        Se déconnecter
      </motion.button>
    </MobilePageContainer>
  );
};
