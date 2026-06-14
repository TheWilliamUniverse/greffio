import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { downloadDossierDocument } from '@/api/documents.js';
import { apiGet } from '@/api/client.js';
import { runtimeConfig } from '@/config/runtime.js';
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

const isShareCancelled = (error) => {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('cancel') || message.includes('abort') || message.includes('dismiss');
};

const isPluginAvailable = (name) => {
  try {
    return Capacitor.isPluginAvailable(name);
  } catch (_error) {
    return false;
  }
};

/** Force le type MIME PDF et rejette les réponses non-PDF (ex. page HTML d'erreur). */
export const normalizePdfBlob = async (blob) => {
  if (!blob || blob.size === 0) throw new Error('DOCUMENT_DOWNLOAD_FAILED');
  const validPdf = await isPdfHeader(blob);
  if (!validPdf) throw new Error('DOCUMENT_NOT_PDF');
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
    fileUri: uri,
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

const sharePdfBlobWithWebApi = async (blob, filename, dialogTitle) => {
  const pdfBlob = await normalizePdfBlob(blob);
  const file = new File([pdfBlob], sanitizeFilename(filename), { type: 'application/pdf' });
  const shareData = {
    files: [file],
    title: sanitizeFilename(filename),
  };
  if (!navigator.share) return false;
  if (navigator.canShare && !navigator.canShare(shareData)) return false;
  await navigator.share({
    ...shareData,
    text: dialogTitle || undefined,
  });
  return true;
};

const shareCachedPdfNative = async ({
  path,
  directory = Directory.Cache,
  filename,
  blob,
  dialogTitle,
}) => {
  if (!path) throw new Error('DOCUMENT_DOWNLOAD_FAILED');

  const { uri } = await Filesystem.getUri({ path, directory });
  const safeName = sanitizeFilename(filename);

  if (isPluginAvailable('Share')) {
    try {
      await Share.share({
        files: [uri],
        title: safeName,
        dialogTitle: dialogTitle || 'Partager le PDF',
      });
      return;
    } catch (shareError) {
      if (isShareCancelled(shareError)) return;
    }
  }

  if (blob) {
    const shared = await sharePdfBlobWithWebApi(blob, safeName, dialogTitle);
    if (shared) return;
  }

  throw new Error('DOCUMENT_OPEN_UNAVAILABLE');
};

const fetchSignedDownloadUrl = async ({ dossierId, docKey } = {}) => {
  if (!dossierId || !docKey) return null;
  try {
    const payload = await apiGet(
      `/api/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docKey)}/download-url`,
    );
    const rawUrl = String(payload?.url || '').trim();
    if (!rawUrl) return null;
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
    if (payload?.local) return null;
    return `${runtimeConfig.apiBaseUrl}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;
  } catch (_error) {
    return null;
  }
};

export const openExternalPdfUrl = async (url) => {
  const target = String(url || '').trim();
  if (!target) throw new Error('DOCUMENT_OPEN_UNAVAILABLE');
  if (CapApp?.openUrl) {
    await CapApp.openUrl({ url: target });
    return;
  }
  window.open(target, '_blank', 'noopener,noreferrer');
};

export const openCachedPdfInSystemViewer = async ({
  path,
  directory = Directory.Cache,
  filename,
  blob,
  dossierId,
  docKey,
} = {}) => {
  const signedUrl = await fetchSignedDownloadUrl({ dossierId, docKey });
  if (signedUrl) {
    await openExternalPdfUrl(signedUrl);
    return;
  }

  if (!isCapacitorNative()) {
    if (blob) {
      const shared = await sharePdfBlobWithWebApi(blob, filename, 'Ouvrir le PDF');
      if (shared) return;
    }
    throw new Error('DOCUMENT_OPEN_UNAVAILABLE');
  }

  if (blob) {
    const shared = await sharePdfBlobWithWebApi(blob, filename, 'Ouvrir avec…');
    if (shared) return;
  }

  if (path && isPluginAvailable('Filesystem')) {
    await shareCachedPdfNative({
      path,
      directory,
      filename,
      blob,
      dialogTitle: 'Ouvrir avec…',
    });
    return;
  }

  if (blob && isPluginAvailable('Filesystem')) {
    const cached = await writePdfBlobToCache(blob, filename);
    await shareCachedPdfNative({
      path: cached.path,
      directory: cached.directory,
      filename,
      blob,
      dialogTitle: 'Ouvrir avec…',
    });
    return;
  }

  throw new Error('DOCUMENT_OPEN_UNAVAILABLE');
};

/**
 * Source d'aperçu : blob + arrayBuffer pour pdf.js (natif et web).
 */
export const createPdfPreviewSource = async (blob, filename) => {
  const pdfBlob = await normalizePdfBlob(blob);
  const arrayBuffer = await pdfBlob.arrayBuffer();

  if (!isCapacitorNative()) {
    const src = URL.createObjectURL(pdfBlob);
    return {
      src,
      blob: pdfBlob,
      arrayBuffer,
      cachePath: null,
      cacheDirectory: null,
      nativePreview: false,
      cleanup: () => URL.revokeObjectURL(src),
    };
  }

  return {
    src: null,
    blob: pdfBlob,
    arrayBuffer,
    cachePath: null,
    cacheDirectory: null,
    nativePreview: true,
    cleanup: () => {},
  };
};

/** Téléchargement web (anchor) ou partage natif (feuille système « Enregistrer »). */
export const savePdfBlobToDevice = async (blob, filename, {
  cachePath,
  cacheDirectory = Directory.Cache,
  dossierId,
  docKey,
} = {}) => {
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

  const signedUrl = await fetchSignedDownloadUrl({ dossierId, docKey });
  if (signedUrl) {
    await openExternalPdfUrl(signedUrl);
    return;
  }

  const shared = await sharePdfBlobWithWebApi(blob, safeName, 'Enregistrer le PDF');
  if (shared) return;

  let path = cachePath;
  let directory = cacheDirectory;

  if (!path && isPluginAvailable('Filesystem')) {
    const cached = await writePdfBlobToCache(blob, safeName);
    path = cached.path;
    directory = cached.directory;
  }

  if (path) {
    await shareCachedPdfNative({
      path,
      directory,
      filename: safeName,
      blob,
      dialogTitle: 'Enregistrer le PDF',
    });
    return;
  }

  throw new Error('DOCUMENT_OPEN_UNAVAILABLE');
};

export const fetchDossierDocumentBlob = async ({ dossierId, docKey, inline = true } = {}) => {
  if (!dossierId || !docKey) throw new Error('DOCUMENT_DOWNLOAD_FAILED');
  return downloadDossierDocument({ dossierId, docKey, inline });
};

export const mapDocumentPreviewError = (error) => {
  const code = String(error?.code || error?.message || '');
  if (code === 'DOCUMENT_NOT_PDF') {
    return 'Le serveur n’a pas renvoyé un PDF valide. Réessayez ou contactez le support.';
  }
  if (code === 'DOCUMENT_OPEN_UNAVAILABLE') {
    return 'Ouvrez le PDF via le menu de partage de votre téléphone, ou mettez à jour l’application Greffio.';
  }
  if (code === 'DOCUMENT_DOWNLOAD_FAILED' || code === 'AUTH_TOKEN_MISSING') {
    return 'Impossible de récupérer ce document pour le moment.';
  }
  if (code === 'DOSSIER_FORBIDDEN') {
    return 'Accès refusé à ce document.';
  }
  if (code === 'DOCUMENT_FILE_NOT_FOUND') {
    return 'Fichier introuvable. Le document n’a peut-être pas encore été enregistré.';
  }
  return 'Impossible d’afficher ce document pour le moment.';
};

export const isDocumentPreviewAction = (action) => ['view', 'download'].includes(action);
