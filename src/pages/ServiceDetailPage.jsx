import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, CheckCircle, Zap, Shield, Clock, Check } from 'lucide-react';
import { NavbarDropdown } from '@/components/NavbarDropdown.jsx';
import { ProcessTimeline } from '@/components/ProcessTimeline.jsx';
import { FAQAccordion } from '@/components/FAQAccordion.jsx';
import { TestimonialCard } from '@/components/TestimonialCard.jsx';
import { Button } from '@/components/ui/button.jsx';

export const ServiceDetailPage = () => {
  const { id } = useParams();
  
  // Mock data based on ID
  const service = {
    title: "Création de SAS / SASU",
    subtitle: "La forme juridique préférée des startups et entrepreneurs ambitieux. Protégez votre patrimoine et optimisez votre fiscalité.",
    badge: "Populaire",
    price: "149€",
    legalFees: "~230€",
  };

  const timelineSteps = [
    { icon: Briefcase, title: 'Informations', description: 'Remplissez le formulaire en ligne avec les détails de votre future société.', duration: '10 min' },
    { icon: Zap, title: 'Génération', description: 'Vos statuts et documents annexes sont générés instantanément.', duration: 'Immédiat' },
    { icon: Shield, title: 'Vérification', description: 'L’équipe Greffio vérifie votre dossier pour éviter tout rejet du greffe.', duration: '24h' },
    { icon: CheckCircle, title: 'Immatriculation', description: 'Nous déposons le dossier. Vous recevez votre Kbis.', duration: '48h' },
  ];

  const faqs = [
    { question: 'Quel est le capital minimum pour une SAS ', answer: 'Le capital social minimum pour créer une SAS ou SASU est de 1€ symbolique.' },
    { question: 'Dois-je avoir un commissaire aux comptes ', answer: 'Non, ce n\'est obligatoire que si vous dépassez certains seuils (bilan, CA, salariés).' },
    { question: 'Puis-je être président non rémunéré ', answer: 'Oui, vous pouvez exercer votre mandat à titre gratuit et continuer à percevoir vos allocations chômage (ARE).' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavbarDropdown />

      {/* Header */}
      <section className="pt-32 pb-20 px-4 bg-secondary/30 border-b border-border">
        <div className="max-w-4xl mx-auto text-center">
          {service.badge && (
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6">
              {service.badge}
            </span>
          )}
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-6">{service.title}</h1>
          <p className="text-lg text-muted-foreground mb-10">{service.subtitle}</p>
          <Button size="lg" asChild className="h-14 px-8 text-base">
            <Link to={`/signup?service=${id}`}>Commencer la création</Link>
          </Button>
        </div>
      </section>

      {/* Benefits & Checklist */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <h2 className="text-2xl font-bold mb-8">Pourquoi choisir Greffio </h2>
            <div className="space-y-6">
              {[
                { icon: Clock, title: 'Gain de temps', desc: 'Ne perdez plus des heures à comprendre les formulaires Cerfa.' },
                { icon: Shield, title: 'Zéro erreur', desc: 'Notre algorithme et nos experts garantissent un dossier parfait.' },
                { icon: Zap, title: '100% en ligne', desc: 'De la signature à l\'envoi, tout se fait depuis votre canapé.' }
              ].map((b, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <b.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{b.title}</h3>
                    <p className="text-sm text-muted-foreground">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-2xl p-8 shadow-elevation-sm">
            <h2 className="text-2xl font-bold mb-6">Ce que vous obtenez</h2>
            <ul className="space-y-4">
              {['Statuts constitutifs personnalisés', 'Attestation de non-condamnation', 'Déclaration des bénéficiaires effectifs', 'Publication de l\'annonce légale', 'Dépôt au greffe inclus', 'Kbis numérique et papier'].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing Breakdown */}
      <section className="py-20 px-4 bg-secondary/30 border-y border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">Une tarification transparente</h2>
          <div className="bg-card border border-border rounded-2xl p-8 shadow-elevation-sm flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-left">
              <p className="text-sm text-muted-foreground mb-1">Frais de service Greffio</p>
              <p className="text-4xl font-extrabold text-foreground">{service.price} <span className="text-lg font-normal text-muted-foreground">HT</span></p>
            </div>
            <div className="text-4xl text-muted-foreground font-light hidden md:block">+</div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground mb-1">Frais légaux obligatoires</p>
              <p className="text-4xl font-extrabold text-foreground">{service.legalFees} <span className="text-lg font-normal text-muted-foreground">TTC</span></p>
              <p className="text-xs text-muted-foreground mt-1">(Greffe, INPI, Annonce légale)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Les étapes de votre création</h2>
          <ProcessTimeline steps={timelineSteps} />
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-secondary/30 border-y border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Questions fréquentes</h2>
          <FAQAccordion items={faqs} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 bg-primary text-primary-foreground text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Prêt à commencer </h2>
          <p className="text-primary-foreground/80 mb-10 text-lg">Votre Kbis n'est plus qu'à quelques clics.</p>
          <Button size="lg" variant="secondary" asChild className="h-14 px-8 text-base text-primary">
            <Link to={`/signup?service=${id}`}>Créer mon dossier</Link>
          </Button>
        </div>
      </section>
      
      <footer className="bg-background py-8 px-4 border-t border-border text-center text-sm text-muted-foreground">
        <p>© 2026 Greffio. Tous droits réservés.</p>
      </footer>
    </div>
  );
};
