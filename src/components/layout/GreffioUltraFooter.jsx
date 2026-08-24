import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Mail, ShieldCheck } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { PaymentBrandBadges } from '@/components/layout/PaymentBrandBadges.jsx';
import { GREFFIO_FOOTER_COLUMNS } from '@/config/siteFooter.js';
import {
  PUBLISHER_CONTACT_EMAIL,
  PUBLISHER_ADDRESS_FULL,
  PUBLISHER_LEGAL_NAME,
  PUBLISHER_RCS,
} from '@/config/publisher.js';
import { cn } from '@/lib/utils.js';

const FooterLink = ({ to, children, className }) => (
  <Link to={to} className={cn('inline-flex min-h-[36px] items-center text-sm leading-snug text-white/72 transition hover:text-white', className)}>
    {children}
  </Link>
);

const FooterColumn = ({ title, links, compact = false }) => (
  <div>
    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">{title}</p>
    <ul className={cn('mt-3 space-y-1', compact && 'space-y-0.5')}>
      {links.map((link) => <li key={link.to}><FooterLink to={link.to}>{link.label}</FooterLink></li>)}
    </ul>
  </div>
);

export const GreffioUltraFooter = ({ id = 'mentions-legales', className, compact = false, showIntro = true }) => {
  const year = new Date().getFullYear();
  const columns = compact ? GREFFIO_FOOTER_COLUMNS.slice(0, 3) : GREFFIO_FOOTER_COLUMNS;

  return (
    <footer id={id} className={cn('border-t border-white/10 bg-[#0b1220] text-white', compact ? 'px-4 py-8' : 'px-4 py-10 sm:px-6 lg:px-8 lg:py-12', className)}>
      <div className="mx-auto max-w-7xl">
        {!compact ? (
          <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">Clareffio</p>
              <p className="mt-1 text-sm text-white/72">Formalités d&apos;entreprise, documents et suivi avec l&apos;équipe Clareffio.</p>
            </div>
            <Button asChild variant="outline" className="h-11 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              <Link to="/contact"><Mail className="h-4 w-4" />Contact & support</Link>
            </Button>
          </div>
        ) : null}

        {showIntro && !compact ? (
          <div className="mt-8 grid gap-8 border-b border-white/10 pb-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)]">
            <div>
              <GreffioLogo variant="inverse" />
              <p className="mt-4 max-w-md text-sm leading-7 text-white/70">Application SaaS de gestion de formalités administratives et vie juridique des entreprises.</p>
              <p className="mt-3 max-w-lg text-xs leading-6 text-white/55">
                Clareffio est un service privé indépendant d&apos;assistance aux démarches administratives des entreprises.
                Clareffio n&apos;est pas un service officiel de l&apos;État, des greffes des tribunaux de commerce ou d&apos;Infogreffe.
              </p>
            </div>
            <div className={cn('grid gap-8', compact ? 'grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-5')}>
              {columns.map((column) => <FooterColumn key={column.id} title={column.title} links={column.links} compact={compact} />)}
            </div>
          </div>
        ) : (
          <div className={cn('grid gap-8', compact ? 'grid-cols-2' : 'mt-8 border-b border-white/10 pb-8 sm:grid-cols-2 lg:grid-cols-5')}>
            {columns.map((column) => <FooterColumn key={column.id} title={column.title} links={column.links} compact={compact} />)}
          </div>
        )}

        {!compact ? (
          <div className="mt-8 grid gap-6 border-b border-white/10 pb-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">Transactions sécurisées</p>
              <PaymentBrandBadges inverse className="mt-3" />
            </div>
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-950/30 p-4 lg:max-w-sm">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                <div>
                  <p className="text-sm font-bold text-white">Conformité & traçabilité</p>
                  <p className="mt-1 text-xs leading-5 text-white/65">Données hébergées en Europe, conservation documentaire, signatures horodatées et journalisation des actions.</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className={cn('flex flex-col gap-4', compact ? 'mt-6' : 'mt-8 lg:flex-row lg:items-end lg:justify-between')}>
          <div className="flex items-start gap-3">
            {compact ? <GreffioLogo variant="inverse" className="h-7 w-auto" /> : null}
            <div className="text-xs leading-6 text-white/55">
              <p>© {year} {PUBLISHER_LEGAL_NAME} – Clareffio. Tous droits réservés.</p>
              <p className="mt-1">{PUBLISHER_RCS} · {PUBLISHER_ADDRESS_FULL}</p>
              <p className="mt-1">greffio@willentreprises.com · 04 11 81 86 70</p>
              <p className="mt-1">Les contenus ne constituent pas un conseil juridique personnalisé sans validation professionnelle.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/55">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5"><Globe className="h-3.5 w-3.5" />Français</span>
            <FooterLink to="/a-propos" className="min-h-0 text-xs font-semibold text-white/80">À propos</FooterLink>
            <FooterLink to="/mentions-legales" className="min-h-0 text-xs font-semibold text-white/80">Mentions légales</FooterLink>
            <a href={`mailto:${PUBLISHER_CONTACT_EMAIL}`} className="text-xs text-white/72 transition hover:text-white">{PUBLISHER_CONTACT_EMAIL}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
