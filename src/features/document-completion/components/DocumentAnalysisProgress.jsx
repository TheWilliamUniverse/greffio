import React from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress.jsx';

const STEPS = [
  'Import du document',
  'Lecture du PDF',
  'Recherche de champs existants',
  'Extraction du texte',
  'OCR si nécessaire',
  'Analyse IA',
  'Fusion des champs détectés',
  'Génération du PDF remplissable',
];

const statusToStep = (status) => {
  switch (status) {
    case 'uploaded':
    case 'queued':
      return 1;
    case 'processing':
      return 4;
    case 'analyzed':
    case 'needs_review':
      return 7;
    case 'exporting':
      return 8;
    case 'exported':
      return 8;
    default:
      return 0;
  }
};

export const DocumentAnalysisProgress = ({ status = 'processing' }) => {
  const activeStep = statusToStep(status);
  const progressValue = Math.min(100, Math.round((activeStep / STEPS.length) * 100));

  return (
    <div className="rounded-xl border border-border bg-white p-6 shadow-elevation-sm">
      <div className="mb-4">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">Analyse du document</p>
        <h3 className="mt-1 text-xl font-bold text-foreground">
          Greffio recherche automatiquement les zones à compléter
        </h3>
      </div>
      <Progress value={progressValue} className="mb-5 h-2" />
      <ul className="space-y-3">
        {STEPS.map((label, index) => {
          const stepNumber = index + 1;
          const done = stepNumber < activeStep;
          const current = stepNumber === activeStep && status !== 'exported' && status !== 'failed';
          return (
            <li key={label} className="flex items-center gap-3 text-sm">
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : current ? (
                <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--greffio-blue))]" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/50" />
              )}
              <span className={done || current ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export const DocumentProcessingTimeline = DocumentAnalysisProgress;
