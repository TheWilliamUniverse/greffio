import React, { useRef, useState } from 'react';
import { Camera, FileUp, ImagePlus, Loader2 } from 'lucide-react';
import { Drawer } from 'vaul';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { Label } from '@/components/ui/label.jsx';
import { uploadDossierDocument } from '@/api/documents.js';
import { MobileDocumentScanner } from '@/mobile/MobileDocumentScanner.jsx';
import { normalizeUploadToPdfWithMessage, ensurePdfFilename } from '@/utils/documentPdf.js';

const DOC_OPTIONS = [
  { key: 'identity_proof', label: 'Pièce d’identité' },
  { key: 'address_proof', label: 'Justificatif de domicile' },
  { key: 'kbis', label: 'Extrait Kbis / RNE' },
  { key: 'bank_certificate', label: 'Attestation de dépôt de capital' },
  { key: 'other', label: 'Autre document PDF' },
];

export const MobileDocumentUploadSheet = ({
  open,
  onOpenChange,
  dossierId,
  docKey = 'identity_proof',
  onUploaded,
}) => {
  const fileInputRef = useRef(null);
  const [selectedKey, setSelectedKey] = useState(docKey);
  const [uploading, setUploading] = useState(false);

  React.useEffect(() => {
    if (open) setSelectedKey(docKey);
  }, [open, docKey]);

  const uploadFile = async (rawFile) => {
    if (!dossierId) {
      toast.error('Dossier introuvable.');
      return;
    }
    setUploading(true);
    try {
      const conversion = await normalizeUploadToPdfWithMessage(rawFile, {
        filename: ensurePdfFilename(rawFile.name || `${selectedKey}.pdf`),
      });
      if (!conversion.ok) {
        toast.error(conversion.message);
        return;
      }
      await uploadDossierDocument({
        dossierId,
        docKey: selectedKey,
        file: conversion.file,
      });
      toast.success('Document envoyé avec succès.');
      onUploaded?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error?.message || 'Échec de l’envoi. Vérifiez votre connexion et réessayez.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[92vh] flex-col rounded-t-[1.25rem] border border-border bg-white pb-[env(safe-area-inset-bottom)] outline-none">
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted" />
          <div className="overflow-y-auto px-4 pb-6 pt-4">
            <Drawer.Title className="text-lg font-extrabold text-[hsl(var(--greffio-blue-900))]">
              Envoyer un document
            </Drawer.Title>
            <Drawer.Description className="mt-1 text-sm text-muted-foreground">
              PDF uniquement – conversion automatique depuis photo ou image si nécessaire.
            </Drawer.Description>

            <div className="mt-5 space-y-2">
              <Label className="text-sm font-semibold">Type de pièce</Label>
              <select
                value={selectedKey}
                onChange={(event) => setSelectedKey(event.target.value)}
                className="h-12 w-full rounded-xl border border-input bg-background px-3 text-base md:text-sm"
                disabled={uploading}
              >
                {DOC_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="mt-5 grid gap-2">
              <Button type="button" className="h-12 justify-start gap-3 text-base" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileUp className="h-5 w-5" />}
                Choisir un fichier
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void uploadFile(file);
                }}
              />
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scanner mobile</p>
                <MobileDocumentScanner dossierId={dossierId} docKey={selectedKey} label="Prendre une photo" />
              </div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Camera className="h-3.5 w-3.5" />
                <ImagePlus className="h-3.5 w-3.5" />
                Caméra et galerie disponibles sur l’application native Greffio.
              </p>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
