import React from 'react';
import { Eye, FileText, Trash2, Upload } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { StatutesWorkflowBadge } from '@/components/documents/StatutesWorkflowBadge.jsx';
import { formatDocumentRejectionHint } from '@/utils/documentWorkflow.js';
import { getStatutesWorkflowLabelClient } from '@/utils/statutesWorkflowClient.js';

export const DocumentsListRow = React.memo(({
  document,
  resolvedDossierId,
  isPreviewLoading = false,
  isUploading = false,
  isDeleting = false,
  onPreview,
  onUpload,
  onDelete,
}) => (
  <div className="grid gap-4 border-b border-border px-5 py-4 last:border-b-0 lg:grid-cols-[1.4fr_140px_160px] lg:items-center [content-visibility:auto] [contain-intrinsic-size:auto_88px]">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
        <FileText className="h-5 w-5" />
      </div>
      <div>
        <p className="font-bold text-foreground">{document.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {document.date ? `Mis à jour le ${new Date(document.date).toLocaleDateString('fr-FR')}` : 'En attente de dépôt'}
        </p>
        {['REJECTED', 'INVALID'].includes(document.status) ? (
          <p className="mt-1 text-xs text-destructive">{formatDocumentRejectionHint(document)}</p>
        ) : null}
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge status={document.status} className="w-fit" />
      {document.docKey === 'signed_statutes' && document.statutesWorkflowStatus ? (
        <StatutesWorkflowBadge
          status={document.statutesWorkflowStatus}
          label={getStatutesWorkflowLabelClient({ metadata: { statutesWorkflowStatus: document.statutesWorkflowStatus } })}
        />
      ) : null}
    </div>
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="icon"
        className="bg-white"
        aria-label="Aperçu"
        onClick={() => onPreview(document.docKey, document.name)}
        disabled={!resolvedDossierId || !document.hasFile || isPreviewLoading}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="bg-white"
        aria-label="Déposer un PDF"
        title="Déposer un PDF"
        onClick={() => onUpload(document.docKey)}
        disabled={!resolvedDossierId || !document.canUpload || isUploading}
      >
        {isUploading
          ? <span className="text-xs">…</span>
          : <Upload className="h-4 w-4" />}
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="bg-white text-destructive hover:bg-destructive/5 hover:text-destructive"
        aria-label="Supprimer la pièce jointe"
        onClick={() => onDelete(document.docKey, document.name)}
        disabled={!resolvedDossierId || !document.hasFile || isDeleting}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  </div>
));

DocumentsListRow.displayName = 'DocumentsListRow';
