# Checklist release pre-prod Greffio

## Mobile & UX

- [ ] Grilles 2×2 (&lt;768px)
- [ ] Header mobile blanc + logo texte bleu
- [ ] Tablette 768–1024 : layout desktop
- [ ] Pas de scroll horizontal global
- [ ] Paysage mobile testé sur éditeurs documents

## Données client

- [ ] Zero leak technique (statuts, clés doc, UUID)
- [ ] Glossaire statuts (tooltip badge)

## Questionnaire & signature

- [ ] Reprise brouillon étape + catégorie
- [ ] Récap avant validation
- [ ] Preview obligatoire avant signature
- [ ] PDF mobile OK

## Emails

- [ ] Throttle anti-doublon
- [ ] Préférences profil respectées

## Qualité

- [ ] `npm run build`
- [ ] `npm run test:e2e`
- [ ] Lighthouse mobile ≥90 (simulateur, dashboard, questionnaire)
- [ ] Migrations VPS
- [ ] Monitoring erreurs signature / questionnaire
