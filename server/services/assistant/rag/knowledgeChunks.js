import {
  commonObjections,
  phoneScripts,
  williamBusinessFaq,
} from '../williamBusinessKnowledge.js';

const faqChunks = williamBusinessFaq.map((faq) => ({
  id: faq.id,
  topics: faq.id.replace(/^faq_/, '').split('_'),
  text: `Q: ${faq.question}\nR: ${faq.answer}`,
}));

const phoneScriptChunks = phoneScripts.map((item) => ({
  id: item.id,
  topics: ['script', 'appel', 'telephone', 'greffe', 'client'],
  text: `${item.title}. ${item.context} ${item.script.join(' ')}`,
}));

const objectionChunks = commonObjections.map((item) => ({
  id: item.id,
  topics: ['objection', 'commercial', 'tarif', 'prix'],
  text: `Objection : « ${item.objection} » – Réponse : ${item.response}`,
}));

/** Base de connaissances Greffio (RAG local, sans secrets). */
export const GREFFIO_KNOWLEDGE_CHUNKS = [
  {
    id: 'docs-checklist',
    topics: ['documents', 'pieces', 'justificatifs'],
    text: 'Pièces fréquentes Greffio : pièce d’identité, justificatif de domicile, déclaration de non-condamnation et filiation, liste des souscripteurs, pouvoirs pour formalités, statuts signés, attestation de dépôt de capital, annonce légale selon le dossier. Le statut exact de chaque pièce est visible dans l’onglet Documents.',
  },
  {
    id: 'workflow-steps',
    topics: ['etapes', 'prochaine', 'suite', 'dossier_status'],
    text: 'Parcours type Greffio : 1) questionnaire et vérification dénomination/siège/capital ; 2) génération et relecture des statuts et annexes ; 3) dépôt des justificatifs et signatures ; 4) contrôle par l’équipe Greffio ; 5) dépôt guichet unique et instruction.',
  },
  {
    id: 'ei-micro',
    topics: ['ei', 'micro', 'auto_entrepreneur'],
    text: 'EI et micro-entreprise : pas de statuts ni de capital social. Le parcours porte sur identité, adresse, activité, date de début et pièces justificatives adaptées.',
  },
  {
    id: 'sas-sarl',
    topics: ['sas', 'sarl', 'forme_juridique', 'legal_form'],
    text: 'SAS : souplesse statutaire, président, actions. SARL : cadre codifié, parts sociales, gérant. Dans Greffio, la forme est choisie au questionnaire ; compléter ensuite gouvernance, capital et documents annexes.',
  },
  {
    id: 'sasu-eurl',
    topics: ['sasu', 'eurl', 'forme_juridique', 'legal_form'],
    text: 'SASU : SAS unipersonnelle, un associé unique, président obligatoire. EURL : SARL unipersonnelle, associé unique, gérant. Capital minimum 1 € symbolique possible mais crédibilité bancaire à anticiper.',
  },
  {
    id: 'sci',
    topics: ['sci', 'forme_juridique'],
    text: 'SCI : société civile immobilière, objet immobilier, statuts adaptés, gérant, pas d’activité commerciale par défaut. Greffio génère les statuts après questionnaire si la forme est supportée.',
  },
  {
    id: 'statuts-william',
    topics: ['statuts', 'articles'],
    text: 'Statuts SAS Greffio : modèle William 2026, 27 articles complets. Génération après validation du questionnaire via l’éditeur statuts ou « Générer mes statuts ». Relire avant signature.',
  },
  {
    id: 'signature',
    topics: ['signature', 'signer'],
    text: 'Signature Greffio : ouvrir le document (non-condamnation, souscripteurs, pouvoirs), générer l’aperçu PDF, vérifier les informations, puis « Signer maintenant » ou « Envoyer pour signature ». Consentement simple enregistré dans Greffio.',
  },
  {
    id: 'pricing',
    topics: ['frais', 'tarif', 'prix', 'cout', 'pricing'],
    text: 'Budget : offre Greffio selon parcours (Starter 0 €, Formalité 149 € HT ou 70 € HT jeune -26 ans), annonce légale (variable par département), frais d’immatriculation greffe/guichet unique. Estimation via page Tarifs ou simulateur.',
  },
  {
    id: 'young-entrepreneur',
    topics: ['pricing', 'jeune', 'tarif'],
    text: 'Offre jeune entrepreneur Greffio : 70 € HT pour les moins de 26 ans sur les formalités éligibles, au lieu de 149 € HT. Badge « Offre Jeune » sur la landing et le simulateur.',
  },
  {
    id: 'dossier-status',
    topics: ['dossier_status', 'statut', 'avancement'],
    text: 'Statuts dossier Greffio : intake, questionnaire, documents, mandat, statuts, paiement, préparation, validation client, dépôt, instruction, complément, acceptation ou rejet, clôture. Le dashboard indique l’étape en cours.',
  },
  {
    id: 'document-status',
    topics: ['documents', 'validation', 'rejet'],
    text: 'Statuts pièce jointe : requested (à fournir), uploaded (déposé), under_review (en vérification), valid (accepté), invalid (rejeté). En cas de rejet, corriger et redéposer depuis Documents.',
  },
  {
    id: 'guichet-unique',
    topics: ['depot', 'greffe', 'inpi', 'deposit'],
    text: 'Greffio prépare le dossier pour dépôt au guichet unique (INPI). L’équipe ops contrôle la complétude avant envoi. Le client suit l’avancement dans son espace. Greffio n’est pas un service officiel de l’État.',
  },
  {
    id: 'capital',
    topics: ['capital', 'depot_capital'],
    text: 'Capital social : montant libre (minimum 1 € pour SAS/SARL), répartition entre associés, dépôt sur compte bloqué ou attestation selon forme. Attestation de dépôt de capital à joindre au dossier greffe.',
  },
  {
    id: 'ubo',
    topics: ['beneficiaire', 'ubo', 'rbe'],
    text: 'Bénéficiaires effectifs : personnes détenant plus de 25 % du capital ou des droits de vote, ou contrôle effectif. Déclaration RBE via guichet unique. Le questionnaire Greffio collecte les informations nécessaires.',
  },
  {
    id: 'mandate',
    topics: ['mandat', 'procuration', 'mandate'],
    text: 'Procuration Greffio : document autorisant l’équipe Greffio à agir pour le dépôt administratif. À signer après relecture. Visible dans Documents sous mandate_greffio.',
  },
  {
    id: 'legal-announcement',
    topics: ['annonce', 'publication', 'depot'],
    text: 'Annonce légale : publication obligatoire pour créations et certaines modifications, tarif variable selon journal et département. Non incluse dans l’offre Greffio sauf mention explicite au devis.',
  },
  {
    id: 'modification',
    topics: ['modification', 'transfert', 'changement'],
    text: 'Modifications de société (siège, dirigeant, capital, objet) : acte ou décision, statuts mis à jour, annonce légale si requis, dépôt guichet unique. Greffio propose des parcours modification dans le simulateur.',
  },
  {
    id: 'dissolution',
    topics: ['dissolution', 'fermeture', 'radiation'],
    text: 'Dissolution et radiation : décision des associés, liquidation le cas échéant, annonce légale, dépôt au greffe. Parcours dédié dans Greffio pour cadrer les pièces.',
  },
  {
    id: 'rejection',
    topics: ['rejet', 'regularisation', 'dossier_status'],
    text: 'Rejet ou demande de régularisation greffe : l’équipe Greffio analyse le retour, indique les pièces ou mentions à corriger, puis relance le dépôt. Suivre Messages et Notifications.',
  },
  {
    id: 'payment',
    topics: ['pricing', 'paiement', 'payment'],
    text: 'Paiement Greffio : règlement de la prestation Greffio distinct des frais légaux (greffe, annonce). Statut payment_pending tant que non réglé. Facture disponible après confirmation.',
  },
  {
    id: 'messages-team',
    topics: ['message', 'equipe', 'support'],
    text: 'Fil partagé Greffio : échange client ↔ équipe sur chaque dossier (onglet Messages ou Équipe & clients). Réponses sous 24–48 h ouvrées ; notifications email selon préférences profil.',
  },
  {
    id: 'security',
    topics: ['securite', 'donnees', 'rgpd'],
    text: 'Sécurité Greffio : hébergement cloud privé (AWS S3), accès authentifié, MFA disponible, URLs de téléchargement limitées dans le temps. Greffio ne remplace pas avocat, expert-comptable ou notaire.',
  },
  {
    id: 'siren-lookup',
    topics: ['siren', 'siret', 'entreprise'],
    text: 'Recherche entreprise : saisie SIREN/SIRET dans le questionnaire ou simulateur pour préremplir dénomination, siège et forme. Vérification Luhn et cohérence lors du contrôle dossier.',
  },
  {
    id: 'timeline-delays',
    topics: ['delai', 'duree', 'combien de temps'],
    text: 'Délais indicatifs : préparation dossier Greffio quelques jours à semaines selon complétude client ; instruction greffe variable (souvent 3 à 15 jours ouvrés après dépôt complet). Les compléments administratifs rallongent le délai.',
  },
  {
    id: 'audit-priorities-2026-06',
    topics: ['audit', 'priorite', 'p0', 'critique', 'remote', 'app'],
    text: 'Priorités Greffio (juin 2026) : P0 = questionnaire/dossier, documents PDF & signature, auth/biométrie, paiement Mollie, app remote & version. P1 = statuts, ops, sécurité CI, push/offline. L’app Android charge le site remote ; la plupart des correctifs UI passent par déploiement web sans nouvel AAB. API : GET /api/app-context pour l’audit à jour.',
  },
  ...faqChunks,
  ...phoneScriptChunks,
  ...objectionChunks,
];
