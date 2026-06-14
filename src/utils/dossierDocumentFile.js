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

const isPdfHeader = async (blob) => {
  try {
    const header = await blob.slice(0, 5).text();
    return header.startsWith('%PDF');
  } catch (_error) {
    return false;
  }
};

/** Force le type MIME PDF et rejette les réponses non-PDF (ex. page HTML d'erreur). */
export const normalizePdfBlob = async (blob) => {
  if (!blob || blob.size === 0) throw new Error('DOCUMENT_DOWNLOAD_FAILED');
  const validPdf = await isPdfHeader(blob);
  if (!validPdf) throw new Error('DOCUMENT_DOWNLOAD_FAILED');
  if (blob.type === 'application/pdf') return blob;
  return new Blob([blob], { type: 'application/pdf' });
};

export const writePdfBlobToCache = async (blob, filename) => {
  const pdfBlob = await normalizePdfBlob(blob);
  const safeName = sanitizeFilename(filename);
  const base64 = await blobToBase64(pdfBlob);
  const path = `greffio/preview/${Date.now()}-${safeName}`;
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
  return {
    path,
    directory: Directory.Cache,
    previewUrl: Capacitor.convertFileSrc(uri),
  };
};

export const removeCachedPdf = async ({ path, directory = Directory.Cache } = {}) => {
  if (!path) return;
  try {
    await Filesystem.deleteFile({ path, directory });
  } catch (_error) {
    // Fichier déjà supprimé ou indisponible.
  }
};

export const openCachedPdfInSystemViewer = async ({ path, directory = Directory.Cache } = {}) => {
  if (!path) throw new Error('DOCUMENT_DOWNLOAD_FAILED');
  const { uri } = await Filesystem.getUri({ path, directory });
  const webPath = Capacitor.convertFileSrc(uri);
  if (CapApp?.openUrl) {
    await CapApp.openUrl({ url: webPath });
    return;
  }
  window.open(webPath, '_blank');
};

/**
 * Source d'aperçu : blob URL (web) ou convertFileSrc (Capacitor WebView).
 * Les blob: dans iframe sont bloqués en WebView native — on écrit en cache.
 */
export const createPdfPreviewSource = async (blob, filename) => {
  const pdfBlob = await normalizePdfBlob(blob);

  if (!isCapacitorNative()) {
    const src = URL.createObjectURL(pdfBlob);
    return {
      src,
      blob: pdfBlob,
      cachePath: null,
      cacheDirectory: null,
      cleanup: () => URL.revokeObjectURL(src),
    };
  }

  const cached = await writePdfBlobToCache(pdfBlob, filename);
  return {
    src: cached.previewUrl,
    blob: pdfBlob,
    cachePath: cached.path,
    cacheDirectory: cached.directory,
    cleanup: () => removeCachedPdf({ path: cached.path, directory: cached.directory }),
  };
};

/** Téléchargement web (anchor) ou enregistrement natif Capacitor + ouverture lecteur PDF. */
export const savePdfBlobToDevice = async (blob, filename, { cachePath, cacheDirectory = Directory.Cache } = {}) => {
  const safeName = sanitizeFilename(filename);
  if (!blob) throw new Error('DOCUMENT_DOWNLOAD_FAILED');

  if (!isCapacitorNative()) {
    const pdfBlob = await normalizePdfBlob(blob);
    const url = URL.createObjectURL(pdfBlob);
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

  if (cachePath) {
    await openCachedPdfInSystemViewer({ path: cachePath, directory: cacheDirectory });
    return;
  }

  const cached = await writePdfBlobToCache(blob, safeName);
  await openCachedPdfInSystemViewer({ path: cached.path, directory: cached.directory });
};

export const fetchDossierDocumentBlob = async ({ dossierId, docKey, inline = true } = {}) => {
  if (!dossierId || !docKey) throw new Error('DOCUMENT_DOWNLOAD_FAILED');
  return downloadDossierDocument({ dossierId, docKey, inline });
};

export const isDocumentPreviewAction = (action) => ['view', 'download'].includes(action);
