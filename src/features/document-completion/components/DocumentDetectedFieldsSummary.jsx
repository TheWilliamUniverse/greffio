import React from 'react';

const SOURCE_LABELS = {
  existing_pdf_form_field: 'PDF',
  text_underscore_line: 'Texte',
  text_label_after_colon: 'Texte',
  text_keyword_near_empty_space: 'Règles FR',
  text_date_pattern: 'Date',
  text_checkbox_symbol: 'Case',
  text_signature_keyword: 'Signature',
  ocr_text_block: 'OCR',
  ai_structured_detection: 'IA',
};

const confidenceBadge = (label) => {
  if (label === 'high') return 'bg-emerald-100 text-emerald-800';
  if (label === 'medium') return 'bg-amber-100 text-amber-900';
  return 'bg-slate-100 text-slate-700';
};

export const DocumentDetectedFieldsSummary = ({ fields = [] }) => {
  if (!fields.length) {
    return (
      <div className="rounded-xl border border-border bg-white p-5 text-sm text-muted-foreground shadow-elevation-sm">
        Aucun champ détecté pour le moment.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white shadow-elevation-sm">
      <div className="border-b border-border px-5 py-4">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">Champs détectés</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {fields.length} champ{fields.length > 1 ? 's' : ''} repéré{fields.length > 1 ? 's' : ''}
        </p>
      </div>
      <div className="max-h-[360px] overflow-y-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Label</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Page</th>
              <th className="px-3 py-3">Confiance</th>
              <th className="px-5 py-3">Origine</th>
            </tr>
          </thead>
          <tbody>
            {fields.slice(0, 120).map((field) => (
              <tr key={field.id} className="border-t border-border/70">
                <td className="px-5 py-3 font-medium text-foreground">{field.label || field.name}</td>
                <td className="px-3 py-3 text-muted-foreground">{field.type}</td>
                <td className="px-3 py-3 text-muted-foreground">{field.pageNumber}</td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${confidenceBadge(field.detection?.confidenceLabel)}`}>
                    {Math.round((field.detection?.confidence || 0) * 100)}%
                  </span>
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {(field.detection?.sources || []).map((source) => SOURCE_LABELS[source] || source).join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
