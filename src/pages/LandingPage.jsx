import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  FileText,
  MessageSquareText,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { NavbarDropdown } from '@/components/NavbarDropdown.jsx';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { CompanyLookupCard } from '@/components/CompanyLookupCard.jsx';
import { LEGAL_SERVICES } from '@/utils/mockData.js';
import { lookupCompanyBySiren } from '@/api/company.js';
import { useNavigate } from 'react-router-dom';

const platformFeatures = [
  { icon: FileCheck2, title: 'Dossiers guidés', text: 'Création, modification, dépôt de capital, annonce légale et envoi au greffe dans un parcours unique.' },
  { icon: MessageSquareText, title: 'Relation équipe-client', text: 'Commentaires, demandes de pièces, validations et notifications partagés entre clients, équipe Greffio et partenaires.' },
  { icon: CalendarDays, title: 'Conformité active', text: 'Échéances, relances, tâches et registre documentaire pour ne rien perdre après l’immatriculation.' },
  { icon: CreditCard, title: 'Facturation prête', text: 'Suivi des offres, paiements, justificatifs et frais légaux rattachés à chaque formalité.' },
];

const process = [
  'Choisissez votre formalité',
  'Complétez le questionnaire',
  'Échangez avec l’équipe Greffio',
  'Signez les documents',
  'Suivez l’envoi au greffe',
];

const howItWorks = [
  {
    title: '1. Cadrage du dossier',
    text: 'Vous choisissez la formalité et renseignez les informations essentielles. Greffio crée immédiatement votre dossier de travail.',
  },
  {
    title: '2. Pièces et vérifications',
    text: 'Vous déposez vos justificatifs, l’équipe contrôle la complétude et vous indique clairement la prochaine action.',
  },
  {
    title: '3. Signature et paiement',
    text: 'Les documents sont finalisés, vous signez le mandat et validez le paiement sécurisé via Mollie.',
  },
  {
    title: '4. Dépôt et suivi',
    text: 'Le dossier est préparé pour le dépôt, puis suivi avec des statuts lisibles jusqu’au retour administratif.',
  },
];

export const LandingPage = () => {
  const navigate = useNavigate();
  const [lookupIdentifier, setLookupIdentifier] = React.useState('');
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [lookupError, setLookupError] = React.useState('');
  const [lookupCompany, setLookupCompany] = React.useState(null);

  const performLookup = async () => {
    const digits = String(lookupIdentifier || '').replace(/\D/g, '');
    if (digits.length !== 9 && digits.length !== 14) {
      setLookupError('Saisissez un SIREN (9) ou SIRET (14).');
      return;
    }
    try {
      setLookupLoading(true);
      setLookupError('');
      const payload = await lookupCompanyBySiren(digits);
      setLookupCompany(payload?.company || null);
    } catch (_error) {
      setLookupCompany(null);
      setLookupError('Entreprise introuvable pour cet identifiant.');
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavbarDropdown />

      <section className="surface-grid overflow-hidden bg-[hsl(var(--greffio-citron))] px-4 pt-24 sm:px-6 lg:px-8 lg:pt-28">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 pb-14 lg:min-h-[720px] lg:grid-cols-[0.94fr_1.06fr] lg:gap-12 lg:pb-16">
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-4 py-2 text-sm font-bold text-primary shadow-elevation-sm">
              <Sparkles className="h-4 w-4" />
              SaaS de formalités greffe pour clients, pros et équipes internes
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.04] tracking-normal text-[hsl(var(--greffio-blue-900))] sm:text-5xl lg:text-7xl">
              Greffio pilote vos formalités d’entreprise.
            </h1>
            <p className="mt-7 max-w-xl text-xl leading-8 text-[hsl(var(--greffio-blue-900))]/82">
              Création, modifications, documents, signature, échanges avec l’équipe Greffio et suivi greffe dans un espace client complet.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 justify-between px-6 text-base">
                <Link to="/simulateur?type=statuts">
                  Générer mes statuts
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 bg-white px-6 text-base">
                <Link to="/login">Accéder au dashboard</Link>
              </Button>
            </div>
            <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 text-sm font-semibold text-[hsl(var(--greffio-blue-900))] sm:grid-cols-3">
              <div className="rounded-md bg-white/72 p-3">0€ pour démarrer</div>
              <div className="rounded-md bg-white/72 p-3">Équipe Greffio assignée</div>
              <div className="rounded-md bg-white/72 p-3">Dossier centralisé</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }} className="relative">
            <div className="rounded-md border border-white/80 bg-white p-4 shadow-elevation-lg">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <GreffioLogo variant="tile" className="scale-75 origin-left" />
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Vue produit</span>
              </div>
              <div className="grid gap-4 pt-4 lg:grid-cols-[1fr_260px]">
                <div className="space-y-4">
                  <div className="rounded-md border border-border bg-muted/60 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">Création de société</p>
                        <p className="mt-1 text-xs text-muted-foreground">Étapes visibles après ouverture du dossier</p>
                      </div>
                      <BadgeCheck className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-white">
                      <div className="h-2 w-[42%] rounded-full bg-[hsl(var(--greffio-blue))]" />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {['Statuts signés', 'Annonce publiée', 'Capital à compléter', 'Bénéficiaire à valider'].map((item, index) => (
                      <div key={item} className="rounded-md border border-border bg-white p-3">
                        <CheckCircle2 className={`mb-3 h-5 w-5 ${index < 2 ? 'text-emerald-600' : 'text-amber-500'}`} />
                        <p className="text-sm font-semibold">{item}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-md border border-border bg-white p-4">
                    <p className="mb-3 text-sm font-bold">Conversation équipe-client</p>
                    <div className="space-y-3">
                      <div className="rounded-md bg-secondary p-3 text-sm">Équipe Greffio : “Nous venons de valider l’annonce légale.”</div>
                      <div className="ml-10 rounded-md bg-[hsl(var(--greffio-blue))] p-3 text-sm text-white">Client : “J’ajoute l’attestation bancaire aujourd’hui.”</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-md bg-[hsl(var(--greffio-blue))] p-4 text-white">
                    <p className="text-sm font-bold">Assistant interne</p>
                    <p className="mt-2 text-sm text-white/78">Détecte les pièces manquantes, prépare les relances et résume le dossier.</p>
                    <div className="relative mt-4 h-20 overflow-hidden rounded-md bg-white/10">
                      <div className="animate-scan absolute left-0 right-0 h-8 bg-white/20" />
                    </div>
                  </div>
                  <div className="rounded-md border border-border p-4">
                    <p className="text-sm font-bold">Indicateurs</p>
                    <div className="mt-3 space-y-3 text-sm">
                      <div className="flex justify-between gap-4"><span>Dossiers actifs</span><strong>Selon espace</strong></div>
                      <div className="flex justify-between gap-4"><span>Temps moyen</span><strong>Selon formalité</strong></div>
                      <div className="flex justify-between gap-4"><span>Pièces validées</span><strong>En temps réel</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="services" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase text-primary">Formalités</p>
              <h2 className="mt-2 text-4xl font-extrabold text-foreground">Un catalogue complet, relié au dashboard.</h2>
            </div>
            <Button asChild variant="outline" className="w-fit bg-white">
              <Link to="/simulateur?type=statuts">Comparer les statuts</Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {LEGAL_SERVICES.map((service) => (
              <Link key={service.id} to={`/simulateur?type=${service.id.includes('fermeture') ? 'dissolution' : service.id.includes('modification') ? 'modification' : 'creation'}`} className="group rounded-md border border-border bg-white p-5 shadow-elevation-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevation-md">
                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-md ${service.accent}`}>
                  <Building2 className="h-6 w-6 text-[hsl(var(--greffio-blue-900))]" />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground">{service.category}</p>
                    <h3 className="mt-1 text-xl font-extrabold">{service.title}</h3>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-1 text-xs font-bold text-primary">{service.badge}</span>
                </div>
                <p className="mt-4 min-h-[72px] text-sm leading-6 text-muted-foreground">{service.description}</p>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm font-bold">
                  <span>Dès {service.price}</span>
                  <span>{service.time}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="platform" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-bold uppercase text-primary">Plateforme</p>
            <h2 className="mt-2 text-4xl font-extrabold">Pensé pour les clients et les professionnels qui traitent les formalités.</h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Greffio rapproche les entrepreneurs, l’équipe Greffio, les cabinets partenaires et les équipes administratives dans un même flux de travail.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {platformFeatures.map((feature) => (
              <div key={feature.title} className="rounded-md border border-border bg-background p-5">
                <feature.icon className="mb-4 h-6 w-6 text-primary" />
                <h3 className="text-lg font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="comment-ca-marche" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase text-primary">Parcours client</p>
              <h2 className="mt-2 text-4xl font-extrabold text-foreground">Comment ça marche ?</h2>
            </div>
            <Button asChild variant="outline" className="w-fit bg-white">
              <Link to="/simulateur">Commencer ma formalité</Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {howItWorks.map((step) => (
              <div key={step.title} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                <h3 className="text-lg font-extrabold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="inpi-like-lookup" className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-md border border-border p-6 shadow-elevation-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-primary">Informations de l’entreprise</p>
              <h2 className="mt-1 text-3xl font-extrabold">Recherche SIREN / SIRET (style guichet unique)</h2>
            </div>
            <div className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
              Signature qualifiée nécessaire (modification/dépôt)
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <input
              className="h-11 rounded-md border border-input px-3 text-sm"
              placeholder="SIREN (9) ou SIRET (14)"
              value={lookupIdentifier}
              onChange={(event) => {
                setLookupIdentifier(event.target.value);
                setLookupError('');
                setLookupCompany(null);
              }}
            />
            <Button className="h-11" onClick={() => void performLookup()} disabled={lookupLoading}>
              {lookupLoading ? 'Recherche…' : 'Rechercher une entreprise'}
            </Button>
          </div>
          {lookupError ? <p className="mt-2 text-sm text-red-600">{lookupError}</p> : null}

          {lookupCompany ? (
            <div className="mt-5">
              <CompanyLookupCard
                company={lookupCompany}
                onUse={() => {
                  navigate(`/questionnaire?prefillSiren=${encodeURIComponent(lookupCompany.siren || '')}`);
                }}
              />
            </div>
          ) : null}
        </div>
      </section>

      <section id="app-mobile" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-md border border-border bg-white p-6 shadow-elevation-md md:p-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-secondary">
              <MonitorSmartphone className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-bold uppercase text-primary">Web, mobile, tablette</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Greffio peut s’installer comme une vraie application.</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
              Le site est préparé en PWA : installation depuis le navigateur, icône Greffio, mode plein écran et socle technique compatible avec un empaquetage Android/iOS.
            </p>
            <Button asChild className="mt-6">
              <Link to="/app">
                Préparer l’application mobile
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['PWA', 'Installation immédiate depuis Chrome, Edge ou Safari compatible.'],
              ['Google Play', 'Base Capacitor prête pour génération AAB et signature.'],
              ['App Store', 'Synchronisation iOS possible puis finalisation dans Xcode.'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-md border border-border bg-background p-4">
                <p className="font-extrabold">{title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-md bg-[hsl(var(--greffio-blue))] p-6 text-white shadow-elevation-lg md:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <ShieldCheck className="mb-5 h-8 w-8 text-[hsl(var(--greffio-citron))]" />
              <h2 className="text-3xl font-extrabold">Un parcours opérationnel, pas une simple vitrine.</h2>
              <p className="mt-4 text-white/78">Chaque demande crée un dossier, des tâches, des documents attendus et un fil d’échange exploitable par l’équipe.</p>
            </div>
            <div className="grid gap-3">
              {process.map((step, index) => (
                <div key={step} className="flex items-center gap-4 rounded-md bg-white/10 p-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-extrabold text-primary">{index + 1}</span>
                  <span className="font-semibold">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm font-bold uppercase text-primary">Tarifs</p>
          <h2 className="mt-2 text-4xl font-extrabold">Des offres claires pour démarrer, déléguer ou industrialiser.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { name: 'Starter', price: '0€', text: 'Questionnaire, checklist et espace documentaire.', cta: 'Démarrer' },
              { name: 'Formalité', price: '149€', text: 'Dossier complet, relecture et dépôt au greffe.', cta: 'Créer mon dossier', highlight: true },
              { name: 'Cabinet partenaire', price: 'À venir', text: 'Gestion multi-clients, équipe, reporting et marque blanche en déploiement progressif.', cta: 'Être notifié' },
            ].map((plan) => (
              <div key={plan.name} className={`rounded-md border p-6 text-left ${plan.highlight ? 'border-primary bg-secondary shadow-elevation-md' : 'border-border bg-background'}`}>
                <p className="text-lg font-extrabold">{plan.name}</p>
                <p className="mt-3 text-3xl font-extrabold">{plan.price}</p>
                <p className="mt-3 min-h-[52px] text-sm leading-6 text-muted-foreground">{plan.text}</p>
                <Button asChild className="mt-6 w-full" variant={plan.highlight ? 'default' : 'outline'}>
                  <Link to="/simulateur">{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase text-primary">Questions clés</p>
            <h2 className="mt-2 text-4xl font-extrabold">Ce que l’app prend en charge.</h2>
          </div>
          <div className="grid gap-4">
            {[
              ['Greffio remplace-t-il mon expert ', 'Non. Greffio organise le flux, les documents, les relances et la relation. L’équipe Greffio et les professionnels autorisés gardent la main sur les validations.'],
              ['Les clients ont-ils leur dashboard ', 'Oui. Chaque utilisateur connecté accède à son tableau de bord, ses pièces, ses messages et ses échéances.'],
              ['Peut-on traiter plusieurs clients ', 'Oui. Le module équipe permet de suivre plusieurs dossiers, assigner l’équipe Greffio ou un intervenant autorisé et prioriser les actions.'],
            ].map(([question, answer]) => (
              <div key={question} className="rounded-md border border-border bg-white p-5">
                <h3 className="font-bold">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer id="mentions-legales" className="border-t border-border bg-[hsl(var(--greffio-blue-900))] px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_1.2fr]">
          <div>
            <GreffioLogo variant="inverse" />
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">Application SaaS de gestion de formalités administratives, greffe et vie juridique des entreprises.</p>
            <p className="mt-3 max-w-md text-xs leading-6 text-white/80">
              Greffio est un service privé indépendant d’assistance aux démarches administratives des entreprises. Greffio n’est pas un service officiel de l’État, des greffes des tribunaux de commerce ou d’Infogreffe.
            </p>
          </div>
          <div className="grid gap-6 text-sm text-white/72 md:grid-cols-3">
            <div>
              <p className="font-bold text-white">Produit</p>
              <Link to="/simulateur" className="mt-3 block hover:text-white">Créer un dossier</Link>
              <Link to="/login" className="mt-2 block hover:text-white">Espace client</Link>
              <Link to="/contact" className="mt-2 block hover:text-white">Contact</Link>
            </div>
            <div>
              <p className="font-bold text-white">Conformité</p>
              <p className="mt-3">RGPD, traçabilité, conservation documentaire et suivi des actions.</p>
              <p className="mt-2">Données hébergées en Europe, avec infrastructure opérée France/UE selon le service concerné.</p>
              <a href="https://greffio.willentreprises.com/confidentialite" className="mt-2 block hover:text-white">Politique de confidentialité</a>
              <a href="https://greffio.willentreprises.com/suppression-compte" className="mt-2 block hover:text-white">Suppression de compte</a>
            </div>
            <div>
              <p className="font-bold text-white">Mentions légales</p>
              <p className="mt-3">Greffio est une marque déposée de William Establishments. Tous droits réservés.</p>
              <p className="mt-2">Les contenus ne constituent pas un conseil juridique personnalisé sans validation professionnelle.</p>
              <Link to="/mentions-legales" className="mt-3 block font-semibold text-white hover:underline">Lire les mentions</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
