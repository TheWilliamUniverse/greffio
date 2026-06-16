# Mistral OCR / Document AI – évaluation Greffio

**Date :** 17 juin 2026  
**Docs :** [Mistral AI](https://docs.mistral.ai/) – OCR 3 / Document AI

## Besoin Greffio

Vérification documentaire dossier : lisibilité, complétude, cohérence apparente (CNI, justificatifs domicile, K-bis, etc.) avant revue ops.

## Fit Mistral OCR 3

| Critère | Évaluation |
|---------|------------|
| PDF natif + scans | ✅ Fort – OCR 3 orienté documents structurés |
| Français | ✅ Support multilingue |
| Tableaux / formulaires | ✅ Utile pour listes souscripteurs scannées |
| Latence batch | 🟡 Acceptable en async (file ops) |
| Coût vs Tesseract local | 🟡 Mistral = qualité + layout ; Tesseract = gratuit mais faible sur scans |
| Conformité RGPD | ⚠️ Nécessite DPA Mistral + pas de PII inutile dans les prompts |

## Recommandation

**Phase 1 (court terme)** – ne pas remplacer `server/documentAnalysis.js` immédiatement :

- Conserver l’analyse locale actuelle pour le flux temps réel upload.
- Ajouter un **job ops async** « OCR Mistral » derrière feature flag `MISTRAL_OCR_ENABLED=false`.

**Phase 2** – stub d’intégration minimal :

```env
MISTRAL_API_KEY=
MISTRAL_OCR_MODEL=mistral-ocr-latest
MISTRAL_OCR_ENABLED=false
```

Endpoint cible : `POST https://api.mistral.ai/v1/ocr` (ou Document AI équivalent selon doc à jour).

Fichier stub suggéré : `server/integrations/providers/mistral/mistralOcrAdapter.js` implémentant :

- `isConfigured()`, `health()`, `extractText(pdfBuffer)`, `extractStructuredFields(pdfBuffer, schema)`.

**Phase 3** – scoring anti-rejet :

- Comparer champs OCR vs questionnaire (`documentVerificationService`).
- Alimenter cockpit ops avec `confidenceScore` et `manualReviewRequired`.

## Non recommandé pour l’instant

- OCR synchrone bloquant sur upload mobile (latence + coût).
- Envoi systématique de CNI complètes sans minimisation (recto seul, masquage MRZ côté client si possible).

## Conclusion

Mistral OCR 3 est **pertinent** pour renforcer la vérification ops et réduire les rejets greffe, en **complément** de Didit (identité) et de la revue humaine. Intégration complète = P2 ; stub + flag + doc suffisent pour cadrer le sprint suivant.
