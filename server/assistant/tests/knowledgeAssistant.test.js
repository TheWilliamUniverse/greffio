import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseKnowledgeContent, loadKnowledgeFile } from '../knowledgeLoader.js';
import { searchKnowledgeEntries, normalizeText, tokenize } from '../knowledgeSearch.js';
import {
  ASSISTANT_POLICY,
  ASSISTANT_GUARDRAILS,
  containsAvoidAnswer,
  sanitizeAssistantOutput,
  PRUDENT_FALLBACK,
} from '../assistantPolicy.js';
import { isDossierSpecificQuestion } from '../contextBuilder.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_PATH = join(__dirname, '..', 'knowledge', 'greffio_ia_clients.txt');

test('knowledgeLoader – loads file with >=500 valid entries', () => {
  const raw = readFileSync(KNOWLEDGE_PATH, 'utf8');
  const { entries, skipped } = parseKnowledgeContent(raw);
  assert.ok(entries.length >= 500, `Expected >=500 entries, got ${entries.length}`);
  assert.ok(skipped >= 0);

  for (const entry of entries.slice(0, 50)) {
    assert.match(entry.id, /^GREF-QA-/);
    assert.ok(entry.intent.trim(), `Missing intent for ${entry.id}`);
    assert.ok(entry.question.trim(), `Missing question for ${entry.id}`);
    assert.ok(entry.canonicalAnswer.trim(), `Missing canonicalAnswer for ${entry.id}`);
  }
});

test('knowledgeLoader – incomplete blocks do not crash parser', () => {
  const fixture = `
[GREF-QA-TEST-01]
INTENT: test
VISIBILITE: CLIENT
QUESTION_CLIENT: Question valide ?
REPONSE_CANONIQUE: Reponse valide.

[GREF-QA-TEST-02]
INTENT: incomplete
VISIBILITE: CLIENT
QUESTION_CLIENT:

[GREF-QA-TEST-03]
INTENT: partial
`;
  const { entries, skipped } = parseKnowledgeContent(fixture);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, 'GREF-QA-TEST-01');
  assert.equal(skipped, 2);
});

test('knowledgeSearch – payment verification query', () => {
  loadKnowledgeFile(KNOWLEDGE_PATH);
  const results = searchKnowledgeEntries('Mon paiement est en verification, c\'est normal ?', {
    limit: 5,
    minScore: 2,
    visibility: 'CLIENT',
  });
  assert.ok(results.length >= 1);
  const intents = results.map((item) => item.intent);
  assert.ok(
    intents.some((intent) => intent.includes('payment') || intent.includes('paiement')),
    `Expected payment-related intent, got ${intents.join(', ')}`,
  );
});

test('knowledgeSearch – signature query', () => {
  loadKnowledgeFile(KNOWLEDGE_PATH);
  const results = searchKnowledgeEntries('Comment signer mon document sur Greffio ?', {
    limit: 5,
    minScore: 2,
    visibility: 'CLIENT',
  });
  assert.ok(results.length >= 1);
  assert.ok(results.some((item) => item.intent.includes('signature') || item.question.toLowerCase().includes('sign')));
});

test('knowledgeSearch – attestation capital query', () => {
  loadKnowledgeFile(KNOWLEDGE_PATH);
  const results = searchKnowledgeEntries('Pourquoi Greffio me demande un attestation de depot de capital ?', {
    limit: 5,
    minScore: 2,
    visibility: 'CLIENT',
  });
  assert.ok(results.length >= 1);
  assert.ok(
    results.some((item) => (
      item.question.toLowerCase().includes('capital')
      || item.canonicalAnswer.toLowerCase().includes('capital')
    )),
  );
});

test('knowledgeSearch – micro-entreprise statuts query', () => {
  loadKnowledgeFile(KNOWLEDGE_PATH);
  const results = searchKnowledgeEntries('Greffio genere-t-il des statuts pour une micro-entreprise ?', {
    limit: 5,
    minScore: 2,
    visibility: 'CLIENT',
  });
  assert.ok(results.length >= 1);
  const top = results[0];
  assert.ok(
    top.canonicalAnswer.toLowerCase().includes('non')
    || top.canonicalAnswer.toLowerCase().includes('ne doit pas'),
  );
  assert.ok(top.intent.includes('micro') || top.question.toLowerCase().includes('micro'));
});

test('knowledgeSearch – what to do now query', () => {
  loadKnowledgeFile(KNOWLEDGE_PATH);
  const results = searchKnowledgeEntries('Que dois-je faire maintenant sur mon dossier ?', {
    limit: 5,
    minScore: 2,
    visibility: 'CLIENT',
  });
  assert.ok(results.length >= 1);
  assert.ok(
    results.some((item) => (
      item.intent.includes('dossier')
      || item.intent.includes('progress')
      || item.question.toLowerCase().includes('prochaine')
      || item.canonicalAnswer.toLowerCase().includes('dossier')
    )),
  );
});

test('knowledgeSearch – normalize and tokenize', () => {
  assert.equal(normalizeText('Paiement Échoué'), 'paiement echoue');
  assert.deepEqual(tokenize('Mon paiement est en vérification'), ['mon', 'paiement', 'est', 'en', 'verification']);
});

test('assistantPolicy – guardrails documented', () => {
  assert.ok(ASSISTANT_POLICY.includes('Ne jamais inventer'));
  assert.ok(ASSISTANT_POLICY.includes('micro-entreprise'));
  assert.ok(ASSISTANT_GUARDRAILS.includes('backend_wins_over_knowledge'));
  assert.ok(ASSISTANT_GUARDRAILS.includes('no_statuts_for_micro_entreprise'));
});

test('assistantPolicy – blocks avoid answers', () => {
  const forbidden = 'Oui, voici les statuts de votre micro-entreprise.';
  assert.equal(
    sanitizeAssistantOutput(forbidden, [{ avoidAnswer: forbidden }]),
    PRUDENT_FALLBACK,
  );
  assert.equal(containsAvoidAnswer(forbidden, forbidden), true);
});

test('contextBuilder – dossier-specific detection', () => {
  assert.equal(isDossierSpecificQuestion('Où en est mon dossier ?'), true);
  assert.equal(isDossierSpecificQuestion('Mon paiement a échoué'), true);
  assert.equal(isDossierSpecificQuestion('C\'est quoi une SAS ?'), false);
});
