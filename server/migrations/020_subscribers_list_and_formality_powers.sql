-- Ajout des emplacements documents Liste des souscripteurs et Pouvoirs pour formalités.

INSERT INTO documents (
  id, dossier_id, doc_key, label, required, status, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  d.id,
  slots.doc_key,
  slots.label,
  slots.required,
  'requested',
  NOW(),
  NOW()
FROM dossiers d
CROSS JOIN (
  VALUES
    ('subscribers_list', 'Liste des souscripteurs', TRUE),
    ('formality_powers', 'Pouvoirs pour formalités', TRUE)
) AS slots(doc_key, label, required)
WHERE d.deleted_at IS NULL
ON CONFLICT (dossier_id, doc_key) DO NOTHING;
