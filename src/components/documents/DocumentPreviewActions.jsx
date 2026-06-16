import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Loader2, PencilLine } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import {
  canShowDocumentModifyAction,
  resolveDocumentWorkspaceEditPath,
  resolveDocumentViewerPath,
} from '@/utils/documentWorkspace.js';

export const DocumentPreviewActions = ({
  dossierId,
  docKey,
  document = null,
  downloading = false,
  downloadDisabled = false,
  onDownload,
  onModify,
  variant = 'default',
  className = '',
}) => {
  const navigate = useNavigate();
  const showModify = canShowDocumentModifyAction({ docKey, document });

  const handleModify = () => {
    if (onModify) {
      onModify();
      return;
    }
    if (!dossierId || !docKey) return;
    if (docKey === 'signed_statutes') {
      window.open(resolveDocumentViewerPath(dossierId, docKey, { mode: 'edit' }), '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(resolveDocumentWorkspaceEditPath(dossierId, docKey));
  };

  if (variant === 'mobile') {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {showModify ? (
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-2xl bg-primary px-4 text-primary-foreground hover:bg-primary/90"
            onClick={handleModify}
          >
            <PencilLine className="h-4 w-4" />
            Modifier
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-9 rounded-2xl bg-white/10 text-white hover:bg-white/20"
          onClick={onDownload}
          disabled={downloading || downloadDisabled}
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Télécharger
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {showModify ? (
        <Button type="button" size="sm" onClick={handleModify}>
          <PencilLine className="h-4 w-4" />
          Modifier
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="bg-white"
        onClick={onDownload}
        disabled={downloading || downloadDisabled}
      >
        {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Télécharger
      </Button>
    </div>
  );
};
