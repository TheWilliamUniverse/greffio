import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { downloadDossierDocument } from '@/api/documents.js';
import { isCapacitorNative } from '@/utils/platform.js';

const sanitizeFilename = (name) => (
  String(name || 'document.pdf').replace(/[^\w.\-() ]+/g, '_') || 'document.pdf'
);

export const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    const dataUrl = String(reader.result || '');
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    resolve(base64);
  };
  reader.onerror = () => reject(reader.error || new Error('BLOB_READ_FAILED'));
  reader.readAsDataURL(blob);
});

/** Téléchargement web (anchor) ou enregistrement natif Capacitor + ouverture lecteur PDF. */
export const savePdfBlobToDevice = async (blob, filename) => {
  const safeName = sanitizeFilename(filename);
  if (!blob) throw new Error('DOCUMENT_DOWNLOAD_FAILED');

  if (!isCapacitorNative()) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = safeName;
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }

  const base64 = await blobToBase64(blob);
  const path = `greffio/${Date.now()}-${safeName}`;
  await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });
  const { uri } = await Filesystem.getUri({
    path,
    directory: Directory.Cache,
  });
  const webPath = Capacitor.convertFileSrc(uri);
  if (CapApp?.openUrl) {
    await CapApp.openUrl({ url: webPath });
    return;
  }
  window.open(webPath, '_blank');
};

export const fetchDossierDocumentBlob = async ({ dossierId, docKey, inline = true } = {}) => {
  if (!dossierId || !docKey) throw new Error('DOCUMENT_DOWNLOAD_FAILED');
  return downloadDossierDocument({ dossierId, docKey, inline });
};

export const isDocumentPreviewAction = (action) => ['view', 'download'].includes(action);
