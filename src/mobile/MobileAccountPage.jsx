import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, HelpCircle, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.js';
import { MOBILE_STORE } from '@/config/mobileStore.js';
import { MobileAnimatedSection } from '@/mobile/ui/MobileAnimatedSection.jsx';
import { useMobileMotion } from '@/mobile/ui/mobileMotion.js';
import { useMobileSafeBottomPadding } from '@/hooks/useMobileSafeBottomPadding.js';

const rows = [
  { to: '/contact', icon: HelpCircle, label: 'Aide & contact', hint: MOBILE_STORE.legal.supportEmail },
  { to: '/mobile/search', icon: UserRound, label: 'Assistant Greffio', hint: 'Questions rapides' },
  { to: '/team', icon: ShieldCheck, label: 'Messages', hint: 'Échanges dossier & équipe' },
];

export const MobileAccountPage = () => {
  const { currentUser, logout } = useAuth();
  const bottomPad = useMobileSafeBottomPadding();
  const { staggerItem } = useMobileMotion();

  return (
    <div className={`space-y-5 px-4 py-5 ${bottomPad}`}>
      <MobileAnimatedSection>
        <section className="rounded-3xl border border-border/70 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-primary/80">Compte</p>
          <h1 className="mt-1 text-xl font-extrabold">{currentUser?.firstName} {currentUser?.lastName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{currentUser?.email}</p>
          <p className="mt-3 text-xs text-muted-foreground">Rôle : {currentUser?.role || 'CLIENT'}</p>
        </section>
      </MobileAnimatedSection>

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
        onClick={logout}
        className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-border bg-white py-3 text-sm font-semibold text-red-600"
      >
        <LogOut className="h-4 w-4" />
        Se déconnecter
      </motion.button>
    </div>
  );
};
