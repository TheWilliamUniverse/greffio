import React, { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Button } from '@/components/ui/button.jsx';
import { MobilePermissionPrompt } from '@/mobile/ui/MobilePermissionPrompt.jsx';
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
  const [cameraPromptOpen, setCameraPromptOpen] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);
  const pendingCapture = useRef(null);

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
    } catch (error) {
      toast.error(error?.message || 'Échec de l’envoi. Vérifiez votre connexion et réessayez.');
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

  const capturePhoto = async (source = CameraSource.Camera) => {
    try {
      if (isCapacitorNative()) {
        const photo = await CapCamera.getPhoto({
          quality: 86,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source,
        });
        if (!photo?.dataUrl) return;
        const raw = await dataUrlToFile(photo.dataUrl, `${docKey}.jpg`);
        await processRawFile(raw, `${docKey}.pdf`);
        return;
      }
      fileInputRef.current?.click();
    } catch (error) {
      const message = String(error?.message || '').toLowerCase();
      const denied = message.includes('permission') || message.includes('denied') || message.includes('authorized');
      if (source === CameraSource.Camera && denied) {
        setCameraDenied(true);
        toast.info('Caméra désactivée. Vous pouvez importer un document manuellement.');
        return;
      }
      toast.error(source === CameraSource.Camera
        ? 'Impossible d’ouvrir l’appareil photo.'
        : 'Impossible d’ouvrir la galerie.');
    }
  };

  const requestCameraAccess = (source) => {
    if (isCapacitorNative() && source === CameraSource.Camera) {
      pendingCapture.current = source;
      setCameraPromptOpen(true);
      return;
    }
    void capturePhoto(source);
  };

  const confirmCameraAccess = () => {
    const source = pendingCapture.current || CameraSource.Camera;
    pendingCapture.current = null;
    setCameraPromptOpen(false);
    void capturePhoto(source);
  };

  const pickFromGallery = async () => {
    void capturePhoto(CameraSource.Photos);
  };

  const onFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await processRawFile(file, file.name);
  };

  return (
    <div className="space-y-2">
      <MobilePermissionPrompt
        open={cameraPromptOpen}
        icon={Camera}
        title="Photographier vos pièces"
        description="Greffio utilise l’appareil photo pour numériser vos justificatifs et les convertir en PDF."
        benefit="Vos photos restent dans votre dossier Greffio – elles ne sont pas partagées en dehors du service."
        confirmLabel="Autoriser la caméra"
        onConfirm={confirmCameraAccess}
        onCancel={() => {
          pendingCapture.current = null;
          setCameraPromptOpen(false);
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(event) => void onFileChange(event)}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button type="button" disabled={uploading} onClick={() => requestCameraAccess(CameraSource.Camera)} className="rounded-xl">
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
      {cameraDenied ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
          Caméra désactivée. Vous pouvez importer un document manuellement depuis votre téléphone.
        </p>
      ) : null}
    </div>
  );
};
