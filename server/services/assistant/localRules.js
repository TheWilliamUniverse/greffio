import { formatDocKeys, hintForDossierStatus } from './assistantCopy.js';
import {
  commonObjections,
  detectLegalFormKey,
  formatLegalFormChecklist,
  phoneScripts,
  williamBusinessFaq,
} from './williamBusinessKnowledge.js';

const normalize = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const faqKeywords = (question = '') => normalize(question)
  .split(/[^a-z0-9]+/)
  .filter((word) => word.length > 3);

const scoreFaqMatch = (text, question) => {
  const normalizedQuestion = normalize(question);
  if (text === normalizedQuestion || text.includes(normalizedQuestion)) return 100;
  const keywords = faqKeywords(question);
  if (!keywords.length) return 0;
  const hits = keywords.filter((word) => text.includes(word)).length;
  const ratio = hits / keywords.length;
  return ratio >= 0.55 ? Math.round(60 + ratio * 40) : 0;
};

const tryFaqAnswer = (text) => {
  let best = null;
  let bestScore = 0;
  for (const faq of williamBusinessFaq) {
    const score = scoreFaqMatch(text, faq.question);
    if (score > bestScore) {
      best = faq;
      bestScore = score;
    }
  }
  if (!best || bestScore < 70) return null;
  return best.answer;
};

const tryObjectionAnswer = (text) => {
  for (const item of commonObjections) {
    const objectionNorm = normalize(item.objection);
    const stem = objectionNorm.replace(/[?.!]/g, '').trim();
    if (text.includes(stem) || text.includes(normalize(item.objection.split(' ').slice(0, 3).join(' ')))) {
      return item.response;
    }
  }
  return null;
};

const tryPhoneScriptAnswer = (text) => {
  const wantsScript = text.includes('script') || text.includes('teleph') || text.includes('appel');
  if (!wantsScript) return null;

  if (text.includes('greffe') || text.includes('guichet') || text.includes('suivi')) {
    const script = phoneScripts.find((item) => item.id === 'script_greffe_suivi_dossier');
    return [script.title, '', ...script.script.map((line, index) => `${index + 1}. ${line}`)].join('\n');
  }
  if (text.includes('regularisation') || text.includes('regularis')) {
    const script = phoneScripts.find((item) => item.id === 'script_client_regularisation');
    return [script.title, '', ...script.script.map((line, index) => `${index + 1}. ${line}`)].join('\n');
  }
  if (text.includes('piece') || text.includes('manque') || text.includes('manquant')) {
    const script = phoneScripts.find((item) => item.id === 'script_client_piece_manquante');
    return [script.title, '', ...script.script.map((line, index) => `${index + 1}. ${line}`)].join('\n');
  }
  if (text.includes('forme') || text.includes('sasu') || text.includes('micro') || text.includes('sarl')) {
    const script = phoneScripts.find((item) => item.id === 'script_client_choix_forme');
    return [script.title, '', ...script.script.map((line, index) => `${index + 1}. ${line}`)].join('\n');
  }
  return null;
};

const tryLegalFormDocumentsAnswer = (text, legalStructure) => {
  const wantsDocs = text.includes('document')
    || text.includes('piece')
    || text.includes('justificatif')
    || text.includes('checklist')
    || text.includes('fournir')
    || text.includes('manque');
  if (!wantsDocs) return null;

  const formKey = detectLegalFormKey(text, legalStructure);
  if (!formKey) return null;
  return formatLegalFormChecklist(formKey);
};

const tryDossierPersonalAnswer = ({ text, userContext = {} }) => {
  const dossier = userContext?.dossier;
  if (!dossier?.hasDossier) return null;

  const ref = dossier.reference || dossier.dossierId;
  const company = dossier.companyName || 'votre société';
  const form = dossier.legalForm ? ` (${dossier.legalForm})` : '';
  const progress = dossier.progressPercent != null ? `${dossier.progressPercent} %` : '–';
  const statusHint = hintForDossierStatus(dossier.status);

  if (
    text.includes('ou en suis')
    || text.includes('mon dossier')
    || (text.includes('statut') && !text.includes('statuts'))
    || text.includes('avancement')
    || text.includes('progression')
  ) {
    const pendingLine = dossier.pendingCount
      ? `\nPièces encore à traiter : ${formatDocKeys(dossier.pendingDocuments)}.`
      : '\nToutes les pièces attendues semblent déposées – l’équipe peut contrôler.';
    return [
      `Dossier ${ref} – ${company}${form}`,
      `Statut actuel : ${String(dossier.status || 'en cours').replace(/_/g, ' ')} · Avancement ${progress}.`,
      statusHint,
      pendingLine,
      'Détail : tableau de bord, onglet Documents ou Messages.',
    ].join('\n');
  }

  if (
    (text.includes('document') || text.includes('piece') || text.includes('manque'))
    && dossier.pendingCount
  ) {
    return [
      `Pour le dossier ${ref} (${company}), il reste ${dossier.pendingCount} pièce(s) à traiter :`,
      formatDocKeys(dossier.pendingDocuments),
      '',
      'Ouvrez Documents, déposez ou corrigez chaque pièce, puis relancez la génération si nécessaire.',
    ].join('\n');
  }

  if (text.includes('prochaine') || text.includes('etape') || text.includes('suite') || text.includes('faire maintenant')) {
    return [
      `Prochaine action pour ${company} :`,
      statusHint,
      dossier.pendingCount
        ? `Priorité : ${formatDocKeys(dossier.pendingDocuments)}.`
        : 'Aucune pièce bloquante détectée côté Greffio.',
    ].join('\n');
  }

  return null;
};

export const tryLocalRulesAnswer = ({ message = '', userContext = {} } = {}) => {
  const text = normalize(message);
  const legalStructure = userContext?.legalStructure
    || userContext?.company?.legalForm
    || userContext?.dossier?.legalForm
    || '';

  if (!text.trim()) return null;

  const personal = tryDossierPersonalAnswer({ text, userContext });
  if (personal) return personal;

  const faq = tryFaqAnswer(text);
  if (faq) return faq;

  const legalFormDocs = tryLegalFormDocumentsAnswer(text, legalStructure);
  if (legalFormDocs) return legalFormDocs;

  const objection = tryObjectionAnswer(text);
  if (objection) return objection;

  const phoneScript = tryPhoneScriptAnswer(text);
  if (phoneScript) return phoneScript;

  if (text.includes('document') && (text.includes('manque') || text.includes('manquant') || text.includes('fournir'))) {
    return [
      'Checklist documents Greffio (priorité client) :',
      '• Pièce d’identité et justificatif de domicile',
      '• Déclaration de non-condamnation et filiation (si dirigeant)',
      '• Liste des souscripteurs et pouvoirs pour formalités (SAS/SARL)',
      '• Statuts signés, attestation de dépôt de capital et annonce légale selon votre dossier',
      '',
      'Ouvrez l’onglet Documents pour le statut exact de chaque pièce.',
    ].join('\n');
  }

  if (text.includes('prochaine') || text.includes('etape') || text.includes('suite')) {
    return [
      'Prochaines étapes type dans Greffio :',
      '1. Compléter le questionnaire (dénomination, siège, capital).',
      '2. Générer et relire statuts + annexes (souscripteurs, pouvoirs, non-condamnation).',
      '3. Déposer justificatifs et signer les documents requis.',
      '4. Contrôle Greffio puis dépôt guichet unique.',
    ].join('\n');
  }

  if (text.includes('sas') && (text.includes('sarl') || text.includes('>') || text.includes('vs'))) {
    return [
      'SAS vs SARL – repères rapides :',
      '• SAS : souplesse statutaire, président, actions, régime social variable.',
      '• SARL : cadre codifié, parts sociales, gérant, TNS fréquent.',
      '• Greffio : choisissez la forme au questionnaire, puis gouvernance, capital et annexes.',
    ].join('\n');
  }

  if (text.includes('sasu') && !text.includes('sarl')) {
    return [
      'SASU – points clés :',
      '• Un seul associé, président obligatoire, capital libre (min. 1 €).',
      '• Statuts William 27 articles dans Greffio après questionnaire.',
      '• Pièces : identité, domicile, non-condamnation, souscripteurs, pouvoirs, attestation capital.',
    ].join('\n');
  }

  if (text.includes('eurl')) {
    return 'EURL : SARL unipersonnelle. Associé unique = gérant en principe. Capital minimum 1 €. Parcours Greffio similaire à SARL avec questionnaire adapté.';
  }

  if (text.includes('sci')) {
    return 'SCI : société civile immobilière. Objet immobilier, pas d’activité commerciale par défaut. Statuts et gérant à définir au questionnaire Greffio si la forme est proposée.';
  }

  if (text.includes('beneficiaire') || text.includes('ubo') || text.includes('rbe')) {
    return [
      'Bénéficiaires effectifs (RBE) :',
      '• Personnes > 25 % capital/votes ou contrôle effectif.',
      '• Informations collectées dans le questionnaire Greffio.',
      '• Déclaration transmise via le guichet unique lors du dépôt.',
    ].join('\n');
  }

  if (text.includes('capital') || text.includes('depot de capital')) {
    return [
      'Capital social :',
      '• Montant libre (min. 1 € SAS/SARL), répartition entre associés.',
      '• Dépôt bancaire ou attestation selon votre banque.',
      '• Attestation de dépôt de capital à joindre au dossier greffe.',
    ].join('\n');
  }

  if (text.includes('guichet') || text.includes('inpi') || text.includes('greffe') || text.includes('immatriculation')) {
    return 'Greffio prépare votre dossier pour le guichet unique (INPI). L’équipe vérifie la complétude avant dépôt. Greffio est un prestataire privé, pas un service officiel.';
  }

  if (text.includes('relance') || text.includes('relancer')) {
    return [
      'Modèle de relance client :',
      '« Bonjour, votre dossier avance. Il nous manque [pièce ou validation] pour le dépôt. Complétez depuis Greffio ou répondez ici. Cordialement, l’équipe Greffio. »',
    ].join('\n');
  }

  if (text.includes('sasu') && (text.includes('document') || text.includes('manque'))) {
    return [
      'Checklist SASU Greffio : identité, domicile, statuts signés, attestation capital, non-condamnation, souscripteurs, pouvoirs.',
      'Statut de chaque pièce : onglet Documents.',
    ].join('\n');
  }

  if (text.includes('jeune') || text.includes('-26') || text.includes('26 ans')) {
    return 'Offre jeune Greffio : 70 € HT pour les moins de 26 ans (formalités éligibles), au lieu de 149 € HT. Badge « Offre Jeune » sur le simulateur et /tarifs.';
  }

  if (text.includes('frais') || text.includes('cout') || text.includes('tarif') || text.includes('prix') || text.includes('payer')) {
    return [
      'Budget à prévoir :',
      '• Prestation Greffio (0 € / 70 € jeune / 149 € HT formalité)',
      '• Annonce légale (variable)',
      '• Frais greffe / guichet unique',
      'Détail : page Tarifs ou simulateur.',
    ].join('\n');
  }

  if (text.includes('ei') || text.includes('micro')) {
    return 'EI / micro : pas de statuts ni capital. Focus identité, adresse, activité, date de début, pièces justificatives.';
  }

  if (text.includes('signer') || text.includes('signature')) {
    return 'Signature : ouvrir le document, générer l’aperçu PDF, vérifier, puis « Signer maintenant » ou « Envoyer pour signature ». Aperçu obligatoire avant signature.';
  }

  if (text.includes('annonce') || text.includes('publication legale')) {
    return 'Annonce légale : publication obligatoire pour créations/modifications selon cas. Tarif variable. Non incluse dans l’offre Greffio sauf devis explicite.';
  }

  if (text.includes('procuration') || text.includes('mandat greffio')) {
    return 'Procuration Greffio : autorise l’équipe à déposer pour vous. À lire et signer dans Documents (mandate_greffio) après validation du dossier.';
  }

  if (text.includes('delai') || text.includes('combien de temps') || text.includes('duree')) {
    return 'Délais indicatifs : préparation client (jours à semaines selon pièces) ; instruction greffe souvent 3–15 jours ouvrés après dépôt complet. Compléments = délai supplémentaire.';
  }

  if (text.includes('rejet') || text.includes('regularisation') || text.includes('refus')) {
    return 'Rejet ou régularisation : l’équipe Greffio vous indique la cause et les corrections (Documents / Messages). Corrigez puis relancez le dépôt.';
  }

  if (text.includes('avocat') || text.includes('expert-comptable') || text.includes('notaire')) {
    return 'Greffio organise le flux administratif et documentaire. Conseil juridique, fiscal ou acte authentique = professionnels habilités (avocat, EC, notaire).';
  }

  if (text.includes('statuts') || (text.includes('article') && !text.includes('statut'))) {
    return `Statuts${legalStructure ? ` (${legalStructure})` : ''} : modèle William 27 articles pour SAS. Génération après questionnaire via Statuts ou « Générer mes statuts ». Relire avant signature.`;
  }

  return null;
};
