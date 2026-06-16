# Assistant Greffio – intégrations API recommandées

Ce document indique **ce que vous pouvez fournir en priorité** pour un assistant rapide, fiable et contextualisé.

## Priorité 1 – indispensable pour la qualité

| Variable / service | Rôle | Où l’obtenir |
|--------------------|------|--------------|
| **`OPENAI_API_KEY`** | Réponses complexes (hors règles locales). Modèle par défaut : `gpt-4o-mini`. | [platform.openai.com](https://platform.openai.com) |
| **`AI_PRIMARY_PROVIDER=openai`** | Force OpenAI en premier (recommandé prod). | `.env` VPS `/opt/greffio/.env` |

Sans clé OpenAI, l’assistant retombe sur Ollama local (plus lent) ou règles/RAG uniquement.

## Priorité 2 – données entreprise France

| Variable | Rôle | Déjà câblé |
|----------|------|------------|
| **`PAPPERS_API_TOKEN`** | SIREN/SIRET, dénomination, siège, dirigeants – enrichit vérifications et pourra alimenter l’assistant. | Oui (`companyLookup`, vérification dossier) |
| **`COMPANY_LOOKUP_ENABLE_PAPPERS=true`** | Active Pappers dans la recherche entreprise. | Oui |

Obtenir une clé : [pappers.fr/api](https://www.pappers.fr/api)

## Priorité 3 – fallback local (VPS)

| Variable | Rôle |
|----------|------|
| **`OLLAMA_BASE_URL=http://127.0.0.1:11434`** | LLM local si OpenAI indisponible |
| **`AI_OLLAMA_MODEL=qwen3:8b`** (ou `llama3.2:3b` plus rapide) | Modèle Ollama |
| **`AI_ENABLE_PROVIDER_FALLBACK=true`** | Bascule OpenAI → Ollama |

Installer sur le VPS : `scripts/install-ollama-vps.sh` (si présent) ou `curl -fsSL https://ollama.com/install.sh | sh`.

## Priorité 4 – emails & ops (hors assistant direct)

| Variable | Rôle |
|----------|------|
| **`RESEND_API_KEY`** | Emails transactionnels, relances cron |
| **`APP_URL`** | Liens dans emails et assistant |

## Optionnel – pas requis aujourd’hui

| API | Intérêt | Statut Greffio |
|-----|---------|----------------|
| INPI / Guichet unique API | Statut dépôt temps réel | Non intégré (accès restreint) |
| Stripe | Paiement dossier | Si déjà en prod via `.env` Stripe |
| Sentry `SENTRY_DSN` | Erreurs prod | Endpoint custom + logs VPS |

## Configuration VPS recommandée (`.env`)

```env
# Assistant – prod
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

- **~55 fiches RAG** (`knowledgeChunks.js`) : FAQ métier William (20 Q/R), scripts téléphone, objections, SASU, EURL, SCI, capital, UBO, mandat, délais, etc.
- **Règles locales instantanées** (`localRules.js`) : matching FAQ, checklists pièces par forme (indicatif), réponses dossier personnalisées si connecté
- **Base métier** (`williamBusinessKnowledge.js`) : FAQ, scripts, objections, règles prudence Guichet unique
- **Intent classifier** : routage documents / statut / tarifs / greffe

Les listes de pièces restent **indicatives** : le Guichet unique adapte les justificatifs selon la formalité et les réponses saisies.

---

## Alternatives gratuites à `OPENAI_API_KEY`

Ordre recommandé pour Greffio **sans coût API LLM** :

| Option | Coût | Latence | Qualité | Statut Greffio |
|--------|------|---------|---------|----------------|
| **Règles locales + RAG keyword** | 0 € | Instantané | Bonne sur FAQ / pièces / statut dossier | Actif par défaut |
| **Pack FAQ William** (20 Q/R + scripts + objections) | 0 € | Instantané | Très bonne sur questions clients types | Intégré |
| **Ollama sur VPS** (`OLLAMA_BASE_URL`) | 0 € (RAM VPS) | 2–15 s selon modèle | Correcte hors cas edge | Câblé en fallback |
| **Pappers** (`PAPPERS_API_TOKEN`) | Payant (pas OpenAI) | Rapide | Données entreprise FR, pas de chat | Enrichissement SIREN |
| **Polling messagerie 15 s** | 0 € | ≤ 15 s | N/A | Fallback si WebSocket indisponible |
| **WebSocket messagerie** | 0 € | < 1 s | N/A | Actif (`/api/ws/dossier-messages`) |

### Configuration sans OpenAI (prod)

```env
AI_ENABLE_LOCAL_RULES=true
AI_ENABLE_RAG=true
AI_ENABLE_PROVIDER_FALLBACK=true
OLLAMA_BASE_URL=http://127.0.0.1:11434
AI_OLLAMA_MODEL=llama3.2:3b
# Ne pas définir OPENAI_API_KEY – l’assistant reste sur règles + RAG + Ollama
```

### Modèles Ollama recommandés (VPS 8 Go RAM)

- `llama3.2:3b` – le plus rapide, suffisant avec le RAG Greffio
- `qwen3:8b` – meilleure qualité rédactionnelle, plus lent

### Ce qui ne remplace pas OpenAI gratuitement

- Conseil juridique / fiscal personnalisé complexe → professionnel habilité
- Génération longue hors base RAG → Ollama local ou clé OpenAI
- Statut dépôt Guichet unique temps réel → API INPI restreinte (non intégrée)

### WebSocket messagerie (nginx prod)

Si nginx reverse-proxy devant l’API, ajouter sur le bloc `location` API :

```nginx
location /api/ws/ {
  proxy_pass http://127.0.0.1:8787;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
}
```
