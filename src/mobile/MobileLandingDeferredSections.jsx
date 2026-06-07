import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MonitorSmartphone } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { LandingPricingSection } from '@/components/pricing/LandingPricingSection.jsx';
import { GooglePlayStoreLink } from '@/components/store/GooglePlayStoreLink.jsx';
import { MobileAnimatedSection } from '@/mobile/ui/MobileAnimatedSection.jsx';
import { GreffioUltraFooter } from '@/components/layout/GreffioUltraFooter.jsx';
import { useMobileMotion } from '@/mobile/ui/mobileMotion.js';

const faq = [
  {
    q: 'Combien coûte Greffio pour démarrer ?',
    a: 'Vous pouvez commencer sans frais initiaux. Les tarifs détaillés par formalité sont affichés avant validation.',
  },
  {
    q: 'Greffio remplace-t-il mon expert-comptable ?',
    a: 'Non. Greffio organise le flux, les documents et les relances. Les validations réglementées restent du ressort des professionnels habilités.',
  },
  {
    q: 'Quels sont les délais habituels ?',
    a: 'Ils varient selon la formalité et la complétude du dossier. Greffio vous indique la prochaine action à chaque étape.',
  },
];

export const MobileLandingDeferredSections = () => {
  const { staggerItem } = useMobileMotion();

  return (
    <>
      <MobileAnimatedSection id="pricing" className="px-4 py-10" delay={0.04}>
        <LandingPricingSection />
      </MobileAnimatedSection>

      <MobileAnimatedSection id="app-mobile" className="border-y border-border bg-white px-4 py-10" delay={0.02}>
        <p className="text-sm font-bold uppercase text-primary">Application</p>
        <h2 className="mt-2 text-2xl font-extrabold">Greffio sur mobile</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Suivez votre dossier, vos documents et vos notifications depuis l’application Android ou l’espace web mobile.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <GooglePlayStoreLink size="md" />
          <Button asChild variant="outline" className="h-11 rounded-2xl bg-white">
            <Link to="/app">
              <MonitorSmartphone className="h-4 w-4" />
              Ouvrir l’espace web mobile
            </Link>
          </Button>
        </div>
      </MobileAnimatedSection>

      <MobileAnimatedSection id="faq" className="px-4 pb-10" delay={0.04}>
        <p className="text-sm font-bold uppercase text-primary">Questions clés</p>
        <div className="mt-4 space-y-3">
          {faq.map((item, index) => (
            <motion.article
              key={item.q}
              {...staggerItem(index)}
              className="rounded-2xl border border-border bg-white p-4"
            >
              <h3 className="font-bold">{item.q}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.a}</p>
            </motion.article>
          ))}
        </div>
      </MobileAnimatedSection>

      <GreffioUltraFooter compact showIntro={false} />
    </>
  );
};
