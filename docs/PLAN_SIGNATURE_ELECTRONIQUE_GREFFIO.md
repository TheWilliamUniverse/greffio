# Plan signature électronique Greffio – référence ChatGPT

Ce document résume le plan d'optimisation maximal fourni par ChatGPT (juin 2026).

## Objectif

Transformer le module signature en système professionnel : preuve traçable, mobile-first, SES renforcée, extensible Yousign/Signaturit.

## Implémenté (v1 renforcée)

- [x] Provider interne `greffio_internal` par défaut
- [x] Token hashé (pas en clair)
- [x] Hash SHA-256 brouillon + signé
- [x] Consentement versionné `greffio-ses-fr-v1.0`
- [x] Audit events (`signature_audit_events`)
- [x] Certificat de preuve PDF
- [x] OTP email optionnel (`GREFFIO_SIGNATURE_REQUIRE_OTP`)
- [x] Timeline dossier « Document signé électroniquement »
- [x] UX succès + téléchargements
- [x] Routes OTP + preuve publiques

## Roadmap

- [ ] Abstraction provider Yousign (AES/QES)
- [ ] QR code vérification `/signature/verify/:proofId`
- [ ] Unification `SignatureFlowRoot` mobile/web
- [ ] Tests automatisés intégration signature
- [ ] Métriques abandon / conversion

## Priorités restantes (plan ChatGPT)

1. Idempotence POST `/sign` (lock `signing`)
2. Expiration automatique demandes
3. Revocation ops
4. Webhook Yousign sandbox

Voir aussi `docs/CONTEXTE_SIGNATURE_ET_MOBILE_GREFFIO.md` pour le contexte produit complet.
