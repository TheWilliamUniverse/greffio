# Assistant Greffio — intégrations API recommandées

Ce document indique **ce que vous pouvez fournir en priorité** pour un assistant rapide, fiable et contextualisé.

## Priorité 1 — indispensable pour la qualité

| Variable / service | Rôle | Où l’obtenir |
|--------------------|------|--------------|
| **`OPENAI_API_KEY`** | Réponses complexes (hors règles locales). Modèle par défaut : `gpt-4o-mini`. | [platform.openai.com](https://platform.openai.com) |
| **`AI_PRIMARY_PROVIDER=openai`** | Force OpenAI en premier (recommandé prod). | `.env` VPS `/opt/greffio/.env` |

Sans clé OpenAI, l’assistant retombe sur Ollama local (plus lent) ou règles/RAG uniquement.

## Priorité 2 — données entreprise France

| Variable | Rôle | Déjà câblé |
|----------|------|------------|
| **`PAPPERS_API_TOKEN`** | SIREN/SIRET, dénomination, siège, dirigeants — enrichit vérifications et pourra alimenter l’assistant. | Oui (`companyLookup`, vérification dossier) |
| **`COMPANY_LOOKUP_ENABLE_PAPPERS=true`** | Active Pappers dans la recherche entreprise. | Oui |

Obtenir une clé : [pappers.fr/api](https://www.pappers.fr/api)

## Priorité 3 — fallback local (VPS)

| Variable | Rôle |
|----------|------|
| **`OLLAMA_BASE_URL=http://127.0.0.1:11434`** | LLM local si OpenAI indisponible |
| **`AI_OLLAMA_MODEL=qwen3:8b`** (ou `llama3.2:3b` plus rapide) | Modèle Ollama |
| **`AI_ENABLE_PROVIDER_FALLBACK=true`** | Bascule OpenAI → Ollama |

Installer sur le VPS : `scripts/install-ollama-vps.sh` (si présent) ou `curl -fsSL https://ollama.com/install.sh | sh`.

## Priorité 4 — emails & ops (hors assistant direct)

| Variable | Rôle |
|----------|------|
| **`RESEND_API_KEY`** | Emails transactionnels, relances cron |
| **`APP_URL`** | Liens dans emails et assistant |

## Optionnel — pas requis aujourd’hui

| API | Intérêt | Statut Greffio |
|-----|---------|----------------|
| INPI / Guichet unique API | Statut dépôt temps réel | Non intégré (accès restreint) |
| Stripe | Paiement dossier | Si déjà en prod via `.env` Stripe |
| Sentry `SENTRY_DSN` | Erreurs prod | Endpoint custom + logs VPS |

## Configuration VPS recommandée (`.env`)

```env
# Assistant — prod
OPENAI_API_KEY=sk-...
AI_PRIMARY_PROVIDER=openai
AI_PRIMARY_MODEL=gpt-4o-mini
AI_MAX_TOKENS=450
AI_ENABLE_RAG=true
AI_RAG_TOP_K=3
AI_ENABLE_LOCAL_RULES=true

# Entreprise FR
PAPPERS_API_TOKEN=...
COMPANY_LOOKUP_ENABLE_PAPPERS=true

# Fallback local (optionnel)
OLLAMA_BASE_URL=http://127.0.0.1:11434
AI_OLLAMA_MODEL=qwen3:8b
AI_ENABLE_PROVIDER_FALLBACK=true
```

Après modification : `pm2 restart greffio-api --update-env`

## Test rapide

```bash
cd /opt/greffio
node server/scripts/test-assistant.js "Où en est mon dossier ?"
```

## Ce qui est entraîné côté Greffio (sans API externe)

- **25 fiches RAG** (`knowledgeChunks.js`) : SASU, EURL, SCI, capital, UBO, mandat, délais, etc.
- **Règles locales instantanées** (`localRules.js`) : réponses dossier personnalisées si connecté
- **Intent classifier** : routage documents / statut / tarifs / greffe

Pour aller plus loin sans nouvelle API : envoyer des **FAQ métier** ou **scripts téléphone greffe** à intégrer dans `knowledgeChunks.js`.
