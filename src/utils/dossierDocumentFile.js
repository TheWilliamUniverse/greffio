import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capawesome-team/capacitor-file-opener';
import { downloadDossierDocument } from '@/api/documents.js';
import { apiGet } from '@/api/client.js';
import { runtimeConfig } from '@/config/runtime.js';
import { isCapacitorNative } from '@/utils/platform.js';

const sanitizeFilename = (name) => {
  const safe = String(name || 'document.pdf').replace(/[^\w.\-() ]+/g, '_') || 'document.pdf';
  return safe.toLowerCase().endsWith('.pdf') ? safe : `${safe}.pdf`;
};

export const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  if (!blob) {
    reject(new Error('BLOB_READ_FAILED'));
    return;
  }
  void blob.arrayBuffer()
    .then((buffer) => {
      const bytes = new Uint8Array(buffer);
      const chunkSize = 0x8000;
      let binary = '';
      for (let index = 0; index < bytes.length; index += chunkSize) {
        const chunk = bytes.subarray(index, index + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
      }
      resolve(btoa(binary));
    })
    .catch((error) => reject(error instanceof Error ? error : new Error('BLOB_READ_FAILED')));
});

const isPdfHeader = async (blob) => {
  try {
    const header = await blob.slice(0, 5).text();
    return header.startsWith('%PDF');
  } catch (_error) {
    return false;
  }
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
  const path = `greffio/export/${Date.now()}-${safeName}`;
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

const sharePdfBlobWithWebApi = async (blob, filename) => {
  const pdfBlob = await normalizePdfBlob(blob);
  const file = new File([pdfBlob], sanitizeFilename(filename), { type: 'application/pdf' });
  const shareData = { files: [file], title: sanitizeFilename(filename) };
  if (!navigator.share) return false;
  if (navigator.canShare && !navigator.canShare(shareData)) return false;
  await navigator.share(shareData);
  return true;
};

const OPEN_PDF_DIRECTORY = Directory.External;
const OPEN_PDF_FOLDER = 'Greffio/open';

const verifyStoredPdf = async ({ path, directory, expectedSize }) => {
  if (!path || !isPluginAvailable('Filesystem')) return;
  const stat = await Filesystem.stat({ path, directory });
  const size = Number(stat?.size || 0);
  if (!size || (expectedSize && size !== expectedSize)) {
    throw new Error('DOCUMENT_NOT_PDF');
  }
  try {
    const headerBase64 = await Filesystem.readFile({
      path,
      directory,
      offset: 0,
      length: 5,
    });
    const header = atob(String(headerBase64?.data || '').slice(0, 8));
    if (!header.startsWith('%PDF')) {
      throw new Error('DOCUMENT_NOT_PDF');
    }
  } catch (error) {
    if (String(error?.message || '') === 'DOCUMENT_NOT_PDF') throw error;
  }
};

const resolvePdfBlob = async ({ blob, path, directory = Directory.Cache } = {}) => {
  if (blob) return normalizePdfBlob(blob);
  if (!path || !isPluginAvailable('Filesystem')) {
    throw new Error('DOCUMENT_DOWNLOAD_FAILED');
  }
  const { data } = await Filesystem.readFile({ path, directory });
  const base64 = String(data || '');
  if (!base64) throw new Error('DOCUMENT_DOWNLOAD_FAILED');
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return normalizePdfBlob(new Blob([bytes], { type: 'application/pdf' }));
};

const writePdfBlobForExternalOpen = async (blob, filename, {
  sourcePath,
  sourceDirectory = Directory.Cache,
} = {}) => {
  const pdfBlob = blob
    ? await normalizePdfBlob(blob)
    : await resolvePdfBlob({ path: sourcePath, directory: sourceDirectory });
  const safeName = sanitizeFilename(filename);
  const path = `${OPEN_PDF_FOLDER}/${Date.now()}-${safeName}`;
  const base64 = await blobToBase64(pdfBlob);

  await Filesystem.writeFile({
    path,
    data: base64,
    directory: OPEN_PDF_DIRECTORY,
    recursive: true,
  });

  await verifyStoredPdf({
    path,
    directory: OPEN_PDF_DIRECTORY,
    expectedSize: pdfBlob.size,
  });

  const { uri } = await Filesystem.getUri({
    path,
    directory: OPEN_PDF_DIRECTORY,
  });

  return {
    path,
    directory: OPEN_PDF_DIRECTORY,
    fileUri: uri,
    previewUrl: Capacitor.convertFileSrc(uri),
  };
};

const openNativePdfUri = async (uri) => {
  if (!uri) throw new Error('DOCUMENT_OPEN_UNAVAILABLE');

  if (isPluginAvailable('FileOpener')) {
    await FileOpener.openFile({
      path: uri,
      mimeType: 'application/pdf',
    });
    return;
  }

  throw new Error('DOCUMENT_OPEN_UNAVAILABLE');
};

const ensureCachedPdfPath = async ({
  blob,
  filename,
  cachePath,
  cacheDirectory = Directory.Cache,
} = {}) => {
  if (!blob && cachePath && isPluginAvailable('Filesystem')) {
    return { path: cachePath, directory: cacheDirectory };
  }
  if (!blob || !isPluginAvailable('Filesystem')) {
    throw new Error('DOCUMENT_OPEN_UNAVAILABLE');
  }
  return writePdfBlobToCache(blob, filename);
};

const readCachedPdfBase64 = async ({ path, directory = Directory.Cache, blob } = {}) => {
  if (blob) return blobToBase64(await normalizePdfBlob(blob));
  if (!path || !isPluginAvailable('Filesystem')) throw new Error('DOCUMENT_DOWNLOAD_FAILED');
  const { data } = await Filesystem.readFile({ path, directory });
  return data;
};

const saveNativePdfToDocuments = async ({ path, directory = Directory.Cache, filename, blob } = {}) => {
  const safeName = sanitizeFilename(filename);
  const base64 = await readCachedPdfBase64({ path, directory, blob });
  const documentsPath = `Greffio/${Date.now()}-${safeName}`;

  await Filesystem.writeFile({
    path: documentsPath,
    data: base64,
    directory: Directory.Documents,
    recursive: true,
  });

  const { uri } = await Filesystem.getUri({
    path: documentsPath,
    directory: Directory.Documents,
  });

  return {
    path: documentsPath,
    directory: Directory.Documents,
    fileUri: uri,
  };
};

const shareCachedPdfNative = async ({
  path,
  directory = Directory.Cache,
  filename,
  blob,
  mode = 'export',
}) => {
  if (mode === 'open') {
    const openable = await writePdfBlobForExternalOpen(blob, filename, {
      sourcePath: path,
      sourceDirectory: directory,
    });
    await openNativePdfUri(openable.fileUri);
    return openable;
  }

  const cached = await ensureCachedPdfPath({
    blob,
    filename,
    cachePath: path,
    cacheDirectory: directory,
  });

  return saveNativePdfToDocuments({
    path: cached.path,
    directory: cached.directory,
    filename,
    blob,
  });
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
      const shared = await sharePdfBlobWithWebApi(blob, filename);
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
      mode: 'open',
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

/** Téléchargement web (anchor) ou export natif via menu système. */
export const savePdfBlobToDevice = async (blob, filename, {
  cachePath,
  cacheDirectory = Directory.Cache,
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
    mode: 'export',
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
    return 'Impossible d’ouvrir ce PDF dans une autre application. Réessayez ou mettez à jour l’application Greffio.';
  }
  if (code === 'DOCUMENT_SAVE_UNAVAILABLE') {
    return 'Impossible d’enregistrer ce PDF sur votre appareil pour le moment.';
  }
  if (code === 'DOCUMENT_DOWNLOAD_FAILED' || code === 'AUTH_TOKEN_MISSING') {
    return 'Impossible de récupérer ce document pour le moment.';
  }
  if (code === 'DOCUMENT_WORKSPACE_UNAVAILABLE' || code === 'DOCUMENT_WORKSPACE_UNSUPPORTED') {
    return 'Les options d’édition ne sont pas disponibles pour le moment. L’aperçu PDF reste accessible.';
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
