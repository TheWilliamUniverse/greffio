import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { NavbarDropdown } from '@/components/NavbarDropdown.jsx';
import { Button } from '@/components/ui/button.jsx';
import { PricingClarityBlock } from '@/components/pricing/PricingClarityBlock.jsx';
import { PricingFaqSection } from '@/components/pricing/PricingFaqSection.jsx';
import { PricingPlansGrid } from '@/components/pricing/PricingPlansGrid.jsx';
import { motion } from 'framer-motion';
import { usePricingMotion } from '@/components/pricing/usePricingMotion.js';

export const PricingPage = () => {
  const { reveal } = usePricingMotion();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavbarDropdown />

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <motion.div {...reveal()}>
          <p className="text-sm font-bold uppercase text-primary">Tarifs Greffio</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Des offres claires — prestation Greffio et frais légaux séparés
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
            Comparez ce que couvre Greffio avant de démarrer. Les frais de greffe, d’annonce légale ou d’organismes tiers sont indiqués avant validation.
          </p>
        </motion.div>

        <PricingClarityBlock showCta={false} className="px-0 py-10" />

        <PricingPlansGrid showHeader={false} showFooter={false} />

        <PricingFaqSection />

        <motion.div {...reveal(0.1)} className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/simulateur?type=statuts">Générer mes statuts</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="bg-white">
            <Link to="/contact">
              Parler à l&apos;équipe
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </main>
    </div>
  );
};

export default PricingPage;
