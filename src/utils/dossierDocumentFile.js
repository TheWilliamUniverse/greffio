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

const ensureCachedPdfPath = async ({
  blob,
  filename,
  cachePath,
  cacheDirectory = Directory.Cache,
} = {}) => {
  if (cachePath && isPluginAvailable('Filesystem')) {
    return { path: cachePath, directory: cacheDirectory };
  }
  if (!blob || !isPluginAvailable('Filesystem')) {
    throw new Error('DOCUMENT_OPEN_UNAVAILABLE');
  }
  return writePdfBlobToCache(blob, filename);
};

const shareCachedPdfNative = async ({
  path,
  directory = Directory.Cache,
  filename,
  blob,
  dialogTitle,
}) => {
  const cached = await ensureCachedPdfPath({
    blob,
    filename,
    cachePath: path,
    cacheDirectory: directory,
  });
  const { uri } = await Filesystem.getUri({
    path: cached.path,
    directory: cached.directory,
  });
  const safeName = sanitizeFilename(filename);
  const shareTitle = dialogTitle || 'Partager le PDF';

  if (isPluginAvailable('Share')) {
    try {
      await Share.share({
        files: [uri],
        url: uri,
        title: safeName,
        dialogTitle: shareTitle,
      });
      return cached;
    } catch (shareError) {
      if (isShareCancelled(shareError)) return cached;
    }
  }

  if (blob) {
    const shared = await sharePdfBlobWithWebApi(blob, safeName, shareTitle);
    if (shared) return cached;
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
  if (!isCapacitorNative()) {
    if (blob) {
      const shared = await sharePdfBlobWithWebApi(blob, filename, 'Ouvrir le PDF');
      if (shared) return null;
    }
    const signedUrl = await fetchSignedDownloadUrl({ dossierId, docKey });
    if (signedUrl) {
      await openExternalPdfUrl(signedUrl);
      return null;
    }
    throw new Error('DOCUMENT_OPEN_UNAVAILABLE');
  }

  if (blob || path) {
    return shareCachedPdfNative({
      path,
      directory,
      filename,
      blob,
      dialogTitle: 'Ouvrir avec…',
    });
  }

  const signedUrl = await fetchSignedDownloadUrl({ dossierId, docKey });
  if (signedUrl) {
    await openExternalPdfUrl(signedUrl);
    return null;
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

  if (isPluginAvailable('Filesystem')) {
    const cached = await writePdfBlobToCache(pdfBlob, filename);
    return {
      src: null,
      blob: pdfBlob,
      arrayBuffer,
      cachePath: cached.path,
      cacheDirectory: cached.directory,
      nativePreview: true,
      cleanup: () => {
        void removeCachedPdf({ path: cached.path, directory: cached.directory });
      },
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
    return null;
  }

  return shareCachedPdfNative({
    path: cachePath,
    directory: cacheDirectory,
    filename: safeName,
    blob,
    dialogTitle: 'Enregistrer le PDF',
  });
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
    return 'Utilisez le menu « Partager » de votre téléphone pour ouvrir ou enregistrer le PDF (ex. Drive, Fichiers, Adobe).';
  }
  if (code === 'DOCUMENT_DOWNLOAD_FAILED' || code === 'AUTH_TOKEN_MISSING') {
    return 'Impossible de récupérer ce document pour le moment.';
  }
  if (code === 'API_TRANSIENT_UNAVAILABLE' || code === 'Failed to fetch') {
    return 'Connexion instable. Réessayez dans quelques secondes.';
  }
  if (code === 'AUTH_SESSION_EXPIRED') {
    return 'Session expirée. Reconnectez-vous puis réessayez.';
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
