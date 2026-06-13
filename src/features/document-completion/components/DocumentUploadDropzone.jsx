import React, { useRef, useState } from 'react';
import { FileUp, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { documentCompletionConfig } from '../config.js';

export const DocumentUploadDropzone = ({
  onFileSelected,
  uploading = false,
  error = '',
}) => {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedName, setSelectedName] = useState('');

  const handleFile = (file) => {
    if (!file) return;
    setSelectedName(file.name);
    onFileSelected?.(file);
  };

  return (
    <div className="rounded-xl border border-border bg-white p-6 shadow-elevation-sm">
      <div
        className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center transition-colors ${
          dragOver ? 'border-[hsl(var(--greffio-blue))] bg-[hsl(var(--greffio-blue)/0.04)]' : 'border-border bg-muted/20'
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          handleFile(event.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
        }}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--greffio-blue)/0.1)] text-[hsl(var(--greffio-blue))]">
          <FileUp className="h-6 w-6" />
        </div>
        <p className="text-base font-semibold text-foreground">
          Déposez un formulaire ou document administratif
        </p>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Greffio détecte les zones à compléter et génère une version PDF plus simple à remplir.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          PDF uniquement · max {documentCompletionConfig.maxFileSizeMb} Mo
        </p>
        {selectedName ? (
          <p className="mt-4 rounded-md bg-muted px-3 py-2 text-sm text-foreground">{selectedName}</p>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {uploading ? 'Import en cours…' : 'Importer un document'}
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      ) : null}
    </div>
  );
};
