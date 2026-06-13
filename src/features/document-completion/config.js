export const documentCompletionConfig = {
  maxFileSizeMb: 25,
  maxFileSizeBytes: 25 * 1024 * 1024,
  pollIntervalMs: 1500,
};

export const TERMINAL_STATUSES = new Set(['analyzed', 'needs_review', 'exported', 'failed']);

export const PROCESSING_STATUSES = new Set(['uploaded', 'queued', 'processing', 'exporting']);

export const STATUS_LABELS = {
  uploaded: 'Importé',
  queued: 'En file d’attente',
  processing: 'Analyse en cours',
  analyzed: 'Analyse terminée',
  needs_review: 'Analyse terminée – relecture conseillée',
  exporting: 'Génération du PDF',
  exported: 'PDF prêt',
  failed: 'Échec',
};
