import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, Mail, PhoneCall, Send, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { runtimeConfig } from '@/config/runtime.js';
import { submitAppointmentRequest } from '@/api/contact.js';
import { mapSecurityApiError } from '@/config/security.js';
import { SecurityChallengeWidget } from '@/components/security/SecurityChallengeWidget.jsx';
import { PublisherLegalBlock } from '@/components/legal/PublisherLegalBlock.jsx';
import { PublicPageLayout } from '@/components/layout/PublicPageLayout.jsx';
import { useSecurityConfig } from '@/hooks/useSecurityConfig.js';
import { SeoHead } from '@/components/seo/SeoHead.jsx';
import { SEO_PAGE_META } from '@/config/seoContent.js';

export const ContactPage = () => {
  const [form, setForm] = useState({
    fullName: '',
    company: '',
    email: '',
    phone: '',
    need: 'Demande commerciale',
    message: '',
    preferredDate: '',
    preferredTime: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [captcha, setCaptcha] = useState({ provider: 'turnstile', turnstileToken: '', recaptchaToken: '' });
  const security = useSecurityConfig();
  const hasCaptchaToken = Boolean(captcha.turnstileToken || captcha.recaptchaToken);
  const showContactChallenge = security.turnstileOnContact && security.captchaProvider !== 'none';

  const onChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await submitAppointmentRequest({
        ...form,
        source: 'greffio_contact_page',
        ...(showContactChallenge && hasCaptchaToken ? captcha : {}),
      });
      if (!response?.ok) {
        throw new Error(response?.error || 'APPOINTMENT_REQUEST_FAILED');
      }
      toast.success('Demande envoyée. Notre équipe revient vers vous rapidement.');
      setCaptcha({ provider: 'turnstile', turnstileToken: '', recaptchaToken: '' });
      setForm({
        fullName: '',
        company: '',
        email: '',
        phone: '',
        need: 'Demande commerciale',
        message: '',
        preferredDate: '',
        preferredTime: '',
      });
    } catch (error) {
      const securityMessage = mapSecurityApiError(error);
      if (securityMessage) {
        toast.error(securityMessage);
      } else if (String(error?.message || '').includes('EMAIL_DELIVERY_FAILED')) {
        toast.error("La demande est reçue mais l'envoi email a échoué. Réessayez dans un instant.");
      } else {
        toast.error("Impossible d'envoyer la demande pour le moment.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const meta = SEO_PAGE_META.contact;

  return (
    <>
      <SeoHead title={meta.title} description={meta.description} path={meta.path} jsonLdId="contact" />
    <PublicPageLayout footer="minimal">
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <GreffioLogo variant="full" to="/" />
          <Button variant="outline" asChild className="bg-white">
            <Link to="/mentions-legales">Mentions légales</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-7 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <section className="rounded-md border border-border bg-white p-6 shadow-elevation-sm md:p-8">
          <p className="text-sm font-bold uppercase text-primary">Contact</p>
          <h1 className="mt-2 text-3xl font-extrabold">Parlons de votre déploiement Greffio</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Utilisez ce formulaire pour démarrer un onboarding client, une migration ou un besoin multi-comptes.
          </p>

          <form className="mt-7 grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>Nom complet</Label>
              <Input required value={form.fullName} onChange={(event) => onChange('fullName', event.target.value)} placeholder="Prénom Nom" />
            </div>
            <div className="space-y-2">
              <Label>Entreprise</Label>
              <Input value={form.company} onChange={(event) => onChange('company', event.target.value)} placeholder="Société / Cabinet" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input required type="email" value={form.email} onChange={(event) => onChange('email', event.target.value)} placeholder="vous@entreprise.fr" />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={(event) => onChange('phone', event.target.value)} placeholder="+33 ..." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Objet</Label>
              <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.need} onChange={(event) => onChange('need', event.target.value)}>
                <option>Demande commerciale</option>
                <option>Onboarding client</option>
                <option>Support produit</option>
                <option>Partenariat cabinet</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Message</Label>
              <textarea
                required
                className="min-h-[130px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.message}
                onChange={(event) => onChange('message', event.target.value)}
                placeholder="Décrivez votre besoin..."
              />
            </div>
            <div className="space-y-2">
              <Label>Date souhaitée</Label>
              <Input type="date" value={form.preferredDate} onChange={(event) => onChange('preferredDate', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Heure souhaitée</Label>
              <Input type="time" value={form.preferredTime} onChange={(event) => onChange('preferredTime', event.target.value)} />
            </div>
            {showContactChallenge ? (
              <div className="md:col-span-2">
                <SecurityChallengeWidget action="contact" onTokens={setCaptcha} />
              </div>
            ) : null}
            <div className="md:col-span-2">
              <Button
                type="submit"
                className="w-full justify-between sm:w-auto"
                disabled={submitting || (showContactChallenge && !hasCaptchaToken)}
              >
                {submitting ? 'Envoi...' : 'Envoyer ma demande'}
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
            <p className="font-extrabold">Éditeur du site</p>
            <div className="mt-3">
              <PublisherLegalBlock variant="compact" showDisclaimer={false} />
            </div>
          </div>
          <div className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
            <Mail className="mb-4 h-5 w-5 text-primary" />
            <p className="font-extrabold">Support email</p>
            <a href={`mailto:${runtimeConfig.supportEmail}`} className="mt-2 block text-sm text-primary hover:underline">
              {runtimeConfig.supportEmail}
            </a>
          </div>
          <div className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
            <PhoneCall className="mb-4 h-5 w-5 text-primary" />
            <p className="font-extrabold">Téléphone</p>
            <a href={`tel:${runtimeConfig.supportPhone.replace(/\s+/g, '')}`} className="mt-2 block text-sm text-primary hover:underline">
              {runtimeConfig.supportPhone}
            </a>
          </div>
          <div className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
            <CalendarClock className="mb-4 h-5 w-5 text-primary" />
            <p className="font-extrabold">Réserver une démo</p>
            <Button asChild className="mt-4 w-full justify-between">
              <a href={runtimeConfig.bookingUrl} target="_blank" rel="noreferrer">
                Prendre un rendez-vous
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
          <div className="rounded-md bg-[hsl(var(--greffio-blue))] p-5 text-white shadow-elevation-md">
            <ShieldCheck className="mb-4 h-5 w-5 text-[hsl(var(--greffio-citron))]" />
            <p className="font-extrabold">Engagement de réponse</p>
            <p className="mt-2 text-sm leading-6 text-white/80">
              Réponse initiale sous 1 jour ouvré pour les demandes clients et partenaires.
            </p>
          </div>
        </aside>
      </main>
    </div>
    </PublicPageLayout>
    </>
  );
};
