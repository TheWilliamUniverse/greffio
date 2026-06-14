import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Mail, ShieldCheck } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.jsx';
import { PaymentBrandBadges } from '@/components/layout/PaymentBrandBadges.jsx';
import { GREFFIO_FOOTER_COLUMNS } from '@/config/siteFooter.js';
import {
  PUBLISHER_CONTACT_EMAIL,
  PUBLISHER_ADDRESS_FULL,
  PUBLISHER_LEGAL_NAME,
  PUBLISHER_PHONE,
  PUBLISHER_RCS,
} from '@/config/publisher.js';
import { cn } from '@/lib/utils.js';

const FooterLink = ({ to, children, className }) => (
  <Link
    to={to}
    className={cn(
      'inline-flex min-h-[36px] items-center text-sm leading-snug text-white/72 transition hover:text-white',
      className,
    )}
  >
    {children}
  </Link>
);

/**
 * Footer public mobile web – contenu aligné sur GreffioUltraFooter, layout compact accordéon.
 */
export const MobileFooter = ({
  id = 'mentions-legales',
  className,
}) => {
  const year = new Date().getFullYear();

  return (
    <footer
      id={id}
      className={cn(
        'border-t border-white/10 bg-[#0b1220] text-white',
        className,
      )}
    >
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="border-b border-white/10 pb-6">
          <GreffioLogo variant="inverse" className="h-8" />
          <p className="mt-3 text-sm leading-6 text-white/70">
            Formalités d&apos;entreprise, documents et suivi avec l&apos;équipe Greffio.
          </p>
          <p className="mt-2 text-xs leading-5 text-white/55">
            Greffio est un service privé indépendant d&apos;assistance aux démarches administratives des entreprises.
            Greffio n&apos;est pas un service officiel de l&apos;État, des greffes des tribunaux de commerce ou d&apos;Infogreffe.
          </p>
          <Button
            asChild
            variant="outline"
            className="mt-4 h-11 w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          >
            <Link to="/contact">
              <Mail className="h-4 w-4" />
              Contact & support
            </Link>
          </Button>
        </div>

        <Accordion
          type="multiple"
          defaultValue={['utilitaire']}
          className="border-b border-white/10 pb-2"
        >
          {GREFFIO_FOOTER_COLUMNS.map((column) => (
            <AccordionItem
              key={column.id}
              value={column.id}
              className="border-white/10"
            >
              <AccordionTrigger className="py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/55 hover:no-underline [&[data-state=open]]:text-white/80">
                {column.title}
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <ul className="space-y-0.5">
                  {column.links.map((link) => (
                    <li key={link.to}>
                      <FooterLink to={link.to}>{link.label}</FooterLink>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-6 border-b border-white/10 pb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">
            Transactions sécurisées
          </p>
          <PaymentBrandBadges inverse compact className="mt-3" />
        </div>

        <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-950/30 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            <div>
              <p className="text-sm font-bold text-white">Conformité & traçabilité</p>
              <p className="mt-1 text-xs leading-5 text-white/65">
                Données hébergées en Europe, conservation documentaire, signatures horodatées et journalisation des actions.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="text-xs leading-6 text-white/55">
            <p>
              © {year} {PUBLISHER_LEGAL_NAME} – Greffio. Tous droits réservés.
            </p>
            <p className="mt-1">
              {PUBLISHER_RCS} · {PUBLISHER_ADDRESS_FULL}
            </p>
            <p className="mt-1">
              greffio@willentreprises.com · {PUBLISHER_PHONE}
            </p>
            <p className="mt-1">
              Les contenus ne constituent pas un conseil juridique personnalisé sans validation professionnelle.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-white/55">
              <Globe className="h-3.5 w-3.5" />
              Français
            </span>
            <FooterLink to="/a-propos" className="min-h-0 text-xs font-semibold text-white/80">
              À propos
            </FooterLink>
            <FooterLink to="/mentions-legales" className="min-h-0 text-xs font-semibold text-white/80">
              Mentions légales
            </FooterLink>
            <a
              href={`mailto:${PUBLISHER_CONTACT_EMAIL}`}
              className="text-xs text-white/72 transition hover:text-white"
            >
              {PUBLISHER_CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
