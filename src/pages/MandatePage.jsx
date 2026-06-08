import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Download, FileSignature, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { GREFFIO_CONTACT, INPI_UPLOAD_RULES } from '@/config/legalFlow.js';
import { getCurrentDossierId } from '@/utils/sessionStore.js';
import { downloadMandatePdf, getMandateState, signMandate } from '@/api/mandate.js';
import { MobileStickyFormActions } from '@/mobile/ui/MobileStickyFormActions.jsx';
import { triggerMobileHaptic } from '@/utils/mobileHaptics.js';

const longMandateSummary = [
  'Le mandataire est autorise a preparer, deposer, suivre et regulariser la formalite dans la limite de la mission confiee.',
  "Le mandant reste responsable de l exactitude, de la completude et de la mise a jour des informations transmises.",
  'La procuration peut etre signee en ligne et utilisee comme justificatif aupres des organismes competents.',
  'Le mandat n autorise pas le mandataire a prendre des decisions de gestion hors du cadre administratif de la formalite.',
];

const mandateArticles = [
  {
    title: 'Article 1 - Objet du mandat',
    lines: [
      'Le mandant donne pouvoir au mandataire pour preparer, constituer, deposer, suivre et regulariser un dossier de formalite de creation, immatriculation, declaration ou enregistrement.',
      'Le mandat couvre les demarches utiles aupres du guichet unique, greffe, registres et organismes competents.',
      'Le mandataire agit comme prestataire administratif et technique dans les limites de mission.',
    ],
  },
  {
    title: 'Article 2 - Etendue des pouvoirs',
    lines: [
      'Collecte des informations et pieces justificatives.',
      'Preparation des formulaires, televersement des pieces, depot et suivi.',
      'Reception des notifications, demandes de complement et transmissions associees.',
      'Corrections et regularisations materielles dans le cadre de la mission.',
    ],
  },
  {
    title: 'Article 3 - Formalite concernee',
    lines: [
      'Le mandat est limite a la formalite confiee et decrite dans le dossier client.',
      'Le client confirme la forme juridique, l activite, la denomination, le siege et la date d effet.',
    ],
  },
  {
    title: 'Article 4 - Documents remis par le mandant',
    lines: [
      'Piece d identite a jour, justificatif de domicile, procuration signee.',
      'Selon la formalite: statuts signes, attestation de depot de capital, annonce legale, DBE, justificatif de siege et pieces sectorielles.',
      'Chaque piece doit etre lisible, a jour, complete et correctement nommee.',
    ],
  },
  {
    title: 'Article 5 - Exactitude des informations',
    lines: [
      'Le mandant garantit la sincerite, completude et actualite des informations transmises.',
      'Le mandataire ne peut etre responsable des consequences d informations inexactes, incompletes ou contradictoires.',
    ],
  },
  {
    title: 'Article 6 - Correction et regularisation',
    lines: [
      'Le mandataire peut corriger les erreurs materielles sans modifier la volonte substantielle du client.',
      'Toute modification substantielle requiert validation prealable du mandant.',
    ],
  },
  {
    title: 'Article 7 - Signature electronique',
    lines: [
      'Le mandat peut etre signe manuscritement ou electroniquement.',
      'La signature electronique vaut consentement libre, eclaire et non equivoque.',
      'La version signee peut etre produite comme justificatif aupres des organismes competents.',
    ],
  },
  {
    title: 'Article 8 - Responsabilite du mandant',
    lines: [
      'Le mandant conserve la responsabilite des choix juridiques, fiscaux, sociaux et economiques de son projet.',
      'Le mandataire ne se substitue pas au client dans ses decisions entrepreneuriales.',
    ],
  },
  {
    title: 'Article 9 - Limites du mandat',
    lines: [
      'Le mandat n inclut pas, sauf accord distinct, ouverture de compte bancaire, signature de bail, engagements financiers, gestion comptable ou conseil reglemente personnalise.',
      'Aucun engagement hors formalite confiee ne peut etre pris au nom du client sans autorisation expresse.',
    ],
  },
  {
    title: 'Article 10 - Delais et dependance aux tiers',
    lines: [
      'Les delais dependent de la completude du dossier et des organismes tiers.',
      'Aucune garantie de delai d immatriculation ne peut etre donnee.',
    ],
  },
  {
    title: 'Article 11 - Frais et debours',
    lines: [
      'Les frais de greffe, publication, depot et autres frais administratifs restent en principe a la charge du mandant.',
      'Le mandataire peut demander le reglement prealable des frais necessaires.',
    ],
  },
  {
    title: 'Article 12 - Confidentialite et donnees',
    lines: [
      'Les informations sont traitees de maniere confidentielle pour les besoins de la mission.',
      'Certaines donnees peuvent etre transmises aux organismes competents et prestataires techniques necessaires.',
    ],
  },
  {
    title: 'Article 13 - Conservation des documents',
    lines: [
      'Les documents peuvent etre conserves pour traitement, suivi, preuve de mission et respect des obligations applicables.',
      'A l issue, ils peuvent etre archives, anonymises ou supprimes selon les regles en vigueur.',
    ],
  },
  {
    title: 'Article 14 - Absence de garantie d acceptation',
    lines: [
      'Le mandataire met en oeuvre une diligence raisonnable.',
      'L acceptation finale releve exclusivement des organismes competents.',
    ],
  },
  {
    title: 'Article 15 - Duree, revocation et renonciation',
    lines: [
      'Le mandat prend effet a la signature et prend fin a la cloture de la formalite confiee.',
      'Le mandant peut revoquer le mandat sous reserve des actes deja engages.',
      'Le mandataire peut renoncer en cas de fraude, illegalite ou impossibilite d execution.',
    ],
  },
];

export const MandatePage = () => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    accepted: false,
    signature: '',
  });
  const [signedAt, setSignedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signatureEvidence, setSignatureEvidence] = useState(null);
  const dossierId = getCurrentDossierId();

  const dossierReference = useMemo(
    () => `F${Math.floor(10000000 + (Math.random() * 90000000))}`,
    []
  );

  useEffect(() => {
    const load = async () => {
      if (!dossierId) {
        setLoading(false);
        return;
      }
      try {
        const state = await getMandateState(dossierId);
        if (state?.signature?.signedAt) {
          setSignedAt(state.signature.signedAt);
          setSignatureEvidence(state.signature);
        }
      } catch (_error) {
        // silent fallback
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [dossierId]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!form.accepted) {
      toast.error('Vous devez accepter la procuration avant signature.');
      return;
    }
    if (!form.signature || form.signature.trim().length < 4) {
      toast.error('Veuillez renseigner votre signature.');
      return;
    }
    if (!dossierId) {
      toast.error('Aucun dossier actif.');
      return;
    }
    try {
      setSigning(true);
      const payload = await signMandate({
        dossierId,
        signerFullName: form.signature.trim(),
        accepted: form.accepted,
        documentVersion: 'v1',
      });
      setSignedAt(payload?.signature?.signedAt || new Date().toISOString());
      setSignatureEvidence(payload?.signature || null);
      void triggerMobileHaptic('success');
      toast.success('Procuration signée avec succès.');
    } catch (_error) {
      toast.error('La signature a échoué.');
    } finally {
      setSigning(false);
    }
  };

  const onDownloadSignedPdf = async () => {
    if (!dossierId) return;
    try {
      const blob = await downloadMandatePdf(dossierId);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Procuration_Greffio_${dossierReference}.pdf`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (_error) {
      toast.error('PDF signé introuvable pour ce dossier.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <GreffioLogo variant="full" to="/" />
          <Button variant="outline" asChild className="bg-white">
            <Link to="/guide">Guide</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <section className="rounded-md border border-border bg-white p-6 shadow-elevation-sm md:p-8">
          <div className="mb-6">
            <p className="text-sm font-bold uppercase text-primary">Procuration / mandat</p>
            <h1 className="mt-2 text-3xl font-extrabold">Signature de la procuration Greffio</h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Reference dossier : <strong>{dossierReference}</strong>
            </p>
            {loading ? <p className="text-xs text-muted-foreground">Chargement de l’état de signature...</p> : null}
          </div>

          <div className="space-y-3 rounded-md border border-border bg-muted p-5">
            <p className="text-sm font-bold uppercase text-primary">Points essentiels</p>
            {longMandateSummary.map((item) => (
              <p key={item} className="flex gap-2 text-sm leading-6 text-muted-foreground">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </p>
            ))}
          </div>

          <article className="mt-6 rounded-md border border-border bg-white p-5">
            <h2 className="text-lg font-extrabold">Exigences documentaires guichet unique</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Pour limiter les rejets, chaque justificatif doit etre transmis dans un fichier unique, lisible, avec un nom en rapport direct avec son contenu.
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>- Piece d identite a jour</li>
              <li>- Justificatif de domicile</li>
              <li>- Procuration signee si mandataire</li>
              <li>- Documents complementaires selon la formalite</li>
              <li>- Format recommande : {INPI_UPLOAD_RULES.acceptedFormats.join(', ')} ({INPI_UPLOAD_RULES.maxFileSizeMb} Mo max par fichier)</li>
            </ul>
          </article>

          <article className="mt-6 rounded-md border border-border bg-white p-5">
            <h2 className="text-lg font-extrabold">Modele long - procuration professionnelle</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Le texte ci-dessous est structure en articles pour lecture avant signature en ligne.
            </p>
            <div className="mt-4 max-h-[420px] space-y-4 overflow-auto rounded-md border border-border bg-muted p-4">
              {mandateArticles.map((article) => (
                <section key={article.title} className="rounded-md bg-white p-4">
                  <h3 className="text-sm font-extrabold">{article.title}</h3>
                  <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {article.lines.map((line) => (
                      <p key={line}>- {line}</p>
                    ))}
                  </div>
                </section>
              ))}
              <section className="rounded-md bg-white p-4">
                <h3 className="text-sm font-extrabold">Annexe 1 - Pieces indicatives</h3>
                <p className="mt-2 text-sm text-muted-foreground">Piece identite, justificatif domicile, procuration signee, et documents complementaires selon la formalite.</p>
              </section>
              <section className="rounded-md bg-white p-4">
                <h3 className="text-sm font-extrabold">Annexe 2 - Règles de transmission</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Une piece par fichier, lisible, complet, correctement nomme, format PDF recommande, {INPI_UPLOAD_RULES.maxFileSizeMb} Mo max par fichier.
                </p>
              </section>
              <section className="rounded-md bg-white p-4">
                <h3 className="text-sm font-extrabold">Annexe 3 - Validation électronique</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  La signature electronique ou validation explicite dans le parcours Greffio vaut acceptation du mandat.
                </p>
              </section>
            </div>
          </article>

          <form className="mt-7 grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>Prenom</Label>
              <Input required value={form.firstName} onChange={(event) => setForm((c) => ({ ...c, firstName: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input required value={form.lastName} onChange={(event) => setForm((c) => ({ ...c, lastName: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Email</Label>
              <Input required type="email" value={form.email} onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Signature electronique (nom complet)</Label>
              <Input required value={form.signature} onChange={(event) => setForm((c) => ({ ...c, signature: event.target.value }))} placeholder="Nom Prenom" className="text-base" />
            </div>
            <label className="md:col-span-2 flex items-start gap-3 rounded-md border border-border bg-white p-4">
              <input
                type="checkbox"
                checked={form.accepted}
                onChange={(event) => setForm((c) => ({ ...c, accepted: event.target.checked }))}
                className="mt-1"
              />
              <span className="text-sm leading-6 text-muted-foreground">
                En signant ce document, je reconnais avoir lu integralement la procuration, compris sa portee, et autorise {GREFFIO_CONTACT.company} / {GREFFIO_CONTACT.brand} a accomplir pour mon compte les demarches necessaires au depot, suivi et regularisation de ma formalite.
              </span>
            </label>
            <div className="md:col-span-2">
              <MobileStickyFormActions className="md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                <Button type="submit" className="h-11 flex-1 sm:flex-none" disabled={signing}>{signing ? 'Signature...' : 'Signer la procuration'}</Button>
                <Button type="button" variant="outline" className="h-11 flex-1 bg-white sm:flex-none" onClick={onDownloadSignedPdf} disabled={!signedAt}>
                  <Download className="h-4 w-4" />
                  Télécharger le PDF signé
                </Button>
              </MobileStickyFormActions>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
            <FileSignature className="mb-4 h-5 w-5 text-primary" />
            <p className="font-extrabold">Mandataire</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {GREFFIO_CONTACT.company} - {GREFFIO_CONTACT.brand}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{GREFFIO_CONTACT.supportEmail}</p>
            <p className="mt-1 text-sm text-muted-foreground">{GREFFIO_CONTACT.supportPhone}</p>
          </div>

          <div className="rounded-md bg-[hsl(var(--greffio-blue))] p-5 text-white shadow-elevation-md">
            <ShieldCheck className="mb-4 h-5 w-5 text-[hsl(var(--greffio-citron))]" />
            <p className="font-extrabold">Statut de signature</p>
            <p className="mt-2 text-sm text-white/80">
              {signedAt ? `Signee le ${new Date(signedAt).toLocaleString('fr-FR')}` : 'En attente de signature'}
            </p>
            {signatureEvidence?.documentHash ? (
              <p className="mt-2 break-all text-xs text-white/80">Hash: {signatureEvidence.documentHash}</p>
            ) : null}
          </div>

          <div className="rounded-md border border-border bg-white p-4 text-xs text-muted-foreground shadow-elevation-sm">
            Greffio est un service privé indépendant d’assistance aux démarches administratives des entreprises. Greffio n’est pas un service officiel de l’État, des greffes des tribunaux de commerce ou d’Infogreffe.
          </div>
        </aside>
      </main>
    </div>
  );
};
