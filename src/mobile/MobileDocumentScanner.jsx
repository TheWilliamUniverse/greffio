import React, { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Button } from '@/components/ui/button.jsx';
import { uploadDossierDocument } from '@/api/documents.js';
import { normalizeUploadToPdfWithMessage, ensurePdfFilename } from '@/utils/documentPdf.js';
import { isCapacitorNative } from '@/utils/platform.js';

const dataUrlToFile = async (dataUrl, filename) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
};

export const MobileDocumentScanner = ({
  dossierId,
  docKey = 'identity_proof',
  label = 'Scanner un document',
}) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const uploadPdfFile = async (pdfFile) => {
    if (!dossierId) {
      toast.error('Ouvrez ou créez un dossier avant d’envoyer une pièce.');
      return;
    }
    setUploading(true);
    try {
      await uploadDossierDocument({
        dossierId,
        docKey,
        file: pdfFile,
      });
      toast.success(`PDF envoyé : ${pdfFile.name}`);
    } catch (_error) {
      toast.error('Échec de l’envoi. Vérifiez votre connexion et réessayez.');
    } finally {
      setUploading(false);
    }
  };

  const processRawFile = async (rawFile, suggestedName) => {
    const conversion = await normalizeUploadToPdfWithMessage(rawFile, {
      filename: ensurePdfFilename(suggestedName || rawFile.name || docKey),
    });
    if (!conversion.ok) {
      toast.error(conversion.message);
      return;
    }
    await uploadPdfFile(conversion.file);
  };

  const capturePhoto = async () => {
    try {
      if (isCapacitorNative()) {
        const photo = await CapCamera.getPhoto({
          quality: 86,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
        });
        if (!photo?.dataUrl) return;
        const raw = await dataUrlToFile(photo.dataUrl, `${docKey}.jpg`);
        await processRawFile(raw, `${docKey}.pdf`);
        return;
      }
      fileInputRef.current?.click();
    } catch (_error) {
      toast.error('Impossible d’ouvrir l’appareil photo.');
    }
  };

  const pickFromGallery = async () => {
    try {
      if (isCapacitorNative()) {
        const photo = await CapCamera.getPhoto({
          quality: 86,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
        });
        if (!photo?.dataUrl) return;
        const raw = await dataUrlToFile(photo.dataUrl, `${docKey}.jpg`);
        await processRawFile(raw, `${docKey}.pdf`);
        return;
      }
      fileInputRef.current?.click();
    } catch (_error) {
      toast.error('Impossible d’ouvrir la galerie.');
    }
  };

  const onFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await processRawFile(file, file.name);
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(event) => void onFileChange(event)}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button type="button" disabled={uploading} onClick={() => void capturePhoto()} className="rounded-xl">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {label}
        </Button>
        <Button type="button" variant="outline" disabled={uploading} className="rounded-xl bg-white" onClick={() => void pickFromGallery()}>
          <ImagePlus className="h-4 w-4" />
          Galerie
        </Button>
        <Button type="button" variant="outline" disabled={uploading} className="rounded-xl bg-white" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          Fichier
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Conversion automatique en PDF avant envoi au backend Greffio.</p>
    </div>
  );
};
