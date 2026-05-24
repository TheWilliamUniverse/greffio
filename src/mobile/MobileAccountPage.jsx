import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, HelpCircle, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.js';
import { MOBILE_STORE } from '@/config/mobileStore.js';

const rows = [
  { to: '/profil', icon: UserRound, label: 'Profil', hint: 'Identité & coordonnées' },
  { to: '/settings', icon: ShieldCheck, label: 'Sécurité', hint: 'MFA, alertes, biométrie' },
  { to: '/contact', icon: HelpCircle, label: 'Aide & contact', hint: MOBILE_STORE.legal.supportEmail },
];

export const MobileAccountPage = () => {
  const { currentUser, logout } = useAuth();

  return (
    <div className="space-y-5 px-4 py-5">
      <section className="rounded-2xl border border-border/70 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-primary/80">Compte</p>
        <h1 className="mt-1 text-xl font-extrabold">{currentUser?.firstName} {currentUser?.lastName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{currentUser?.email}</p>
        <p className="mt-3 text-xs text-muted-foreground">Rôle : {currentUser?.role || 'CLIENT'}</p>
      </section>

      <ul className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm">
        {rows.map((row) => (
          <li key={row.to} className="border-b border-border/60 last:border-b-0">
            <Link to={row.to} className="flex items-center gap-3 px-4 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                <row.icon className="h-4 w-4 text-primary" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold">{row.label}</span>
                <span className="block text-xs text-muted-foreground">{row.hint}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      <section className="rounded-2xl border border-border/70 bg-white p-4 text-xs leading-relaxed text-muted-foreground">
        <p>
          <Link to="/confidentialite" className="font-semibold text-primary">Confidentialité</Link>
          {' · '}
          <Link to="/cookies" className="font-semibold text-primary">Cookies</Link>
          {' · '}
          <Link to="/suppression-compte" className="font-semibold text-primary">Suppression compte</Link>
        </p>
      </section>

      <button
        type="button"
        onClick={logout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-white py-3 text-sm font-semibold text-red-600"
      >
        <LogOut className="h-4 w-4" />
        Se déconnecter
      </button>
    </div>
  );
};
