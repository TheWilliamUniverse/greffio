const responses = {
  creation: [
    {
      keywords: ['créer', 'création', 'sas', 'sarl', 'entreprise', 'société'],
      response: (context) => `Pour créer une ${context.userStructure || 'société'}, voici les étapes principales :\n\n1. Rédaction des statuts juridiques\n2. Dépôt du capital social\n3. Publication d'une annonce légale\n4. Constitution du dossier d'immatriculation\n5. Dépôt au greffe du tribunal de commerce\n\nLe délai moyen est de 2 à 4 semaines. ${context.userLocation ? `À ${context.userLocation}, vous devrez vous adresser au greffe du tribunal de commerce local.` : ''}`
    },
    {
      keywords: ['capital', 'minimum', 'apport'],
      response: (context) => {
        const capitals = {
          'SAS': 'Le capital minimum pour une SAS est de 1€ symbolique. Cependant, il est recommandé de prévoir un capital adapté à votre activité (entre 1 000€ et 15 000€ selon le secteur).',
          'SARL': 'Le capital minimum pour une SARL est de 1€. Un capital de 5 000€ à 10 000€ est généralement conseillé pour démarrer sereinement.',
          'EI': 'L\'entreprise individuelle ne nécessite pas de capital minimum. Depuis 2022, la protection patrimoniale est automatique (l\'ancien statut EIRL a été fusionné dans l\'EI).',
          'Micro-entreprise': 'La micro-entreprise ne nécessite aucun capital social. Vous démarrez avec vos propres moyens.',
          'Auto-entrepreneur': 'Le statut auto-entrepreneur ne nécessite aucun capital. Vous pouvez commencer votre activité immédiatement.'
        };
        return capitals[context.userStructure] || 'Le capital minimum dépend de la forme juridique choisie. Pour une SAS ou SARL, il est de 1€ symbolique.';
      }
    },
    {
      keywords: ['statuts', 'rédaction', 'modèle'],
      response: () => 'Les statuts sont le document fondateur de votre société. Ils doivent contenir :\n\n- Dénomination sociale\n- Forme juridique\n- Siège social\n- Objet social\n- Durée de la société\n- Capital social\n- Répartition des parts/actions\n- Modalités de fonctionnement\n\nJe peux vous aider à préparer un modèle adapté à votre activité.'
    }
  ],
  
  structures: [
    {
      keywords: ['différence', 'sas', 'sarl', 'choisir', 'comparaison'],
      response: () => 'Voici les principales différences entre SAS et SARL :\n\n**SAS (Société par Actions Simplifiée)**\n- Grande flexibilité statutaire\n- Président affilié au régime général\n- Cession d\'actions libre\n- Idéale pour levées de fonds\n\n**SARL (Société à Responsabilité Limitée)**\n- Cadre juridique plus strict\n- Gérant majoritaire au régime TNS\n- Cession de parts encadrée\n- Idéale pour PME familiales\n\nLe choix dépend de votre projet et de vos objectifs.'
    },
    {
      keywords: ['micro-entreprise', 'auto-entrepreneur', 'avantages'],
      response: () => 'La micro-entreprise (ex auto-entrepreneur) offre plusieurs avantages :\n\n✓ Création simplifiée et gratuite\n✓ Comptabilité allégée\n✓ Charges sociales proportionnelles au CA\n✓ Franchise de TVA possible\n\nLimites :\n- Plafonds de CA (77 700€ services / 188 700€ commerce)\n- Pas de déduction des charges\n- Protection sociale limitée\n\nIdéal pour tester une activité ou complément de revenus.'
    },
    {
      keywords: ['eirl', 'patrimoine', 'protection'],
      response: () => 'L\'entreprise individuelle (EI) permet de :\n\n- Exercer une activité en votre nom\n- Bénéficier d\'une protection patrimoniale automatique depuis 2022\n- Choisir entre micro-entreprise ou EI classique\n\nNote : le statut EIRL n\'existe plus en tant que forme distincte sur Greffio ; utilisez l\'EI ou la micro-entreprise.'
    }
  ],
  
  procedures: [
    {
      keywords: ['annonce', 'légale', 'publication', 'journal'],
      response: (context) => `L'annonce légale est obligatoire pour la création d'entreprise. Elle doit être publiée dans un journal d'annonces légales (JAL) ${context.userLocation ? `du département ${context.userLocation}` : 'de votre département'}.\n\nContenu requis :\n- Dénomination sociale\n- Forme juridique\n- Capital social\n- Adresse du siège\n- Objet social\n- Durée\n- Identité des dirigeants\n\nCoût moyen : 150€ à 250€ selon le département.`
    },
    {
      keywords: ['greffe', 'immatriculation', 'kbis', 'extrait'],
      response: () => 'L\'immatriculation au greffe du tribunal de commerce comprend :\n\n1. Dépôt du dossier complet\n2. Vérification par le greffier\n3. Inscription au RCS (Registre du Commerce et des Sociétés)\n4. Obtention du Kbis (3 à 7 jours)\n\nDocuments requis :\n- Statuts signés\n- Attestation de dépôt de capital\n- Attestation de parution JAL\n- Justificatifs d\'identité\n- Déclaration de non-condamnation\n\nCoût : environ 40€ de frais de greffe.'
    },
    {
      keywords: ['siège', 'social', 'domiciliation', 'adresse'],
      response: () => 'Le siège social est l\'adresse administrative de votre société. Options possibles :\n\n1. **Domicile personnel** (gratuit, limité dans le temps)\n2. **Local commercial** (bail commercial requis)\n3. **Société de domiciliation** (50€ à 100€/mois)\n4. **Pépinière d\'entreprises** (tarifs avantageux)\n5. **Coworking** (flexibilité)\n\nLe choix impacte votre image et vos coûts fixes.'
    }
  ],
  
  fiscal: [
    {
      keywords: ['tva', 'franchise', 'déclaration'],
      response: () => 'La TVA (Taxe sur la Valeur Ajoutée) fonctionne ainsi :\n\n**Franchise en base de TVA**\n- CA < 36 800€ (services) ou 91 900€ (commerce)\n- Pas de TVA facturée ni récupérée\n- Mention obligatoire sur factures\n\n**Régime réel**\n- TVA collectée - TVA déductible = TVA à payer\n- Déclarations mensuelles ou trimestrielles\n- Permet de récupérer la TVA sur achats\n\nLe choix dépend de votre activité et de vos clients (B2B/B2C).'
    },
    {
      keywords: ['impôt', 'société', 'is', 'ir', 'fiscal'],
      response: () => 'Deux régimes fiscaux principaux :\n\n**Impôt sur les Sociétés (IS)**\n- Taux réduit 15% jusqu\'à 42 500€ de bénéfices\n- Taux normal 25% au-delà\n- Société imposée séparément\n\n**Impôt sur le Revenu (IR)**\n- Bénéfices imposés au nom des associés\n- Barème progressif (0% à 45%)\n- Option possible pour SARL et SAS (5 ans max)\n\nL\'IS est généralement plus avantageux au-delà de 40 000€ de bénéfices.'
    },
    {
      keywords: ['charges', 'sociales', 'cotisations', 'urssaf'],
      response: () => 'Les charges sociales varient selon votre statut :\n\n**Président SAS (assimilé salarié)**\n- Environ 65% du salaire net\n- Régime général de la Sécurité sociale\n- Meilleure protection sociale\n\n**Gérant majoritaire SARL (TNS)**\n- Environ 45% du revenu net\n- Régime des travailleurs indépendants\n- Charges moins élevées\n\n**Micro-entrepreneur**\n- 12,3% à 21,2% du CA selon l\'activité\n- Calcul simplifié\n- Pas de charges si pas de CA'
    }
  ],
  
  documents: [
    {
      keywords: ['document', 'pièce', 'justificatif', 'fournir'],
      response: () => 'Documents requis pour créer votre société :\n\n**Obligatoires**\n- Statuts signés (original)\n- Attestation de dépôt de capital\n- Attestation de parution JAL\n- Pièce d\'identité du/des dirigeant(s)\n- Justificatif de domicile du siège\n- Déclaration de non-condamnation\n- Formulaire M0\n\n**Selon les cas**\n- Bail commercial ou contrat de domiciliation\n- Autorisation du conjoint (si domicile)\n- Diplômes (activités réglementées)\n\nJe peux vous aider à préparer ces documents.'
    },
    {
      keywords: ['kbis', 'extrait', 'obtenir'],
      response: () => 'Le Kbis est la carte d\'identité de votre entreprise. Il atteste de l\'existence juridique de votre société.\n\n**Obtention**\n- Délivré automatiquement après immatriculation\n- Délai : 3 à 7 jours ouvrés\n- Envoyé par courrier au siège social\n\n**Utilité**\n- Ouvrir un compte bancaire professionnel\n- Signer des contrats commerciaux\n- Répondre à des appels d\'offres\n- Demander des aides\n\n**Validité**\n- Moins de 3 mois pour la plupart des démarches\n- Gratuit sur infogreffe.fr (version numérique)'
    }
  ],
  
  general: [
    {
      keywords: ['aide', 'accompagnement', 'conseil'],
      response: (context) => `Je suis là pour vous accompagner dans toutes vos démarches administratives et juridiques.\n\n${context.activeDossiers > 0 ? `Vous avez actuellement ${context.activeDossiers} dossier(s) en cours.` : 'Vous pouvez créer un nouveau dossier pour démarrer.'}\n\nN'hésitez pas à me poser vos questions sur :\n- La création d'entreprise\n- Les formalités administratives\n- Les aspects fiscaux et sociaux\n- La gestion de vos dossiers\n\nComment puis-je vous aider aujourd'hui `
    },
    {
      keywords: ['délai', 'durée', 'temps', 'combien'],
      response: () => 'Délais moyens des principales démarches :\n\n**Création d\'entreprise**\n- Micro-entreprise : 24-48h\n- SAS/SARL : 2 à 4 semaines\n\n**Modification**\n- Changement d\'adresse : 1 à 2 semaines\n- Modification statuts : 2 à 3 semaines\n\n**Autres**\n- Obtention Kbis : 3 à 7 jours\n- Publication JAL : immédiat à 48h\n- Ouverture compte pro : 1 à 2 semaines\n\nCes délais peuvent varier selon les greffes et la période.'
    },
    {
      keywords: ['coût', 'prix', 'tarif', 'combien'],
      response: () => 'Coûts moyens de création d\'entreprise :\n\n**Micro-entreprise**\n- Gratuit (inscription en ligne)\n\n**SAS/SARL**\n- Annonce légale : 150€ à 250€\n- Frais de greffe : 40€\n- Dépôt de capital : gratuit à 50€\n- Statuts (avocat) : 500€ à 2 000€ (optionnel)\n\n**Total SAS/SARL**\n- En autonomie : 200€ à 300€\n- Avec accompagnement : 700€ à 2 500€\n\nGreffio vous aide à optimiser ces coûts.'
    }
  ]
};

export const generateAIResponse = (userMessage, userContext = {}) => {
  const messageLower = String(userMessage || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/>/g, ' ')
    .replace(/\?/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const allResponses = [
    ...responses.creation,
    ...responses.structures,
    ...responses.procedures,
    ...responses.fiscal,
    ...responses.documents,
    ...responses.general
  ];
  
  for (const responseObj of allResponses) {
    const hasKeyword = responseObj.keywords.some(keyword => 
      messageLower.includes(keyword)
    );
    
    if (hasKeyword) {
      return typeof responseObj.response === 'function'
        ? responseObj.response(userContext)
        : responseObj.response;
    }
  }
  
  return `Je comprends votre question sur "${userMessage}". ${userContext.userStructure ? `En tant que ${userContext.userStructure}` : 'Pour votre situation'}, je vous recommande de préciser votre demande.\n\nVous pouvez me poser des questions sur :\n- La création d'entreprise (SAS, SARL, micro-entreprise)\n- Les démarches administratives\n- Les aspects fiscaux et sociaux\n- La gestion de vos documents\n\nComment puis-je vous aider plus précisément `;
};

export const getQuickSuggestions = (userStructure) => {
  const suggestions = [
    'Quelles sont les étapes pour créer une SAS ',
    'Quel est le capital minimum requis ',
    'Comment publier une annonce légale ',
    'Quels documents dois-je fournir '
  ];
  
  if (userStructure === 'Micro-entreprise' || userStructure === 'Auto-entrepreneur') {
    suggestions[0] = 'Comment créer ma micro-entreprise ';
    suggestions[1] = 'Quels sont les plafonds de CA ';
  }
  
  return suggestions;
};