import { getEditableDocumentConfig } from '../documents/editableDocumentRegistry.js';
import {
  buildOnlyOfficeDocumentKey,
  buildOnlyOfficeEditorConfig,
  getOnlyOfficeServerUrl,
  isOnlyOfficeConfigured,
  resolveOnlyOfficeFileType,
} from './onlyofficeService.js';
import {
  getDocumentEditorMobileMode,
  isDocumentFreeEditEnabled,
} from './documentWorkspacePolicy.js';

const GUIDED_EDITOR_PATHS = Object.freeze({
  formality_powers: (dossierId) => `/dossier/${dossierId}/documents/formality_powers/edit`,
  subscribers_list: (dossierId) => `/dossier/${dossierId}/documents/subscribers_list/edit`,
  manager_non_conviction: (dossierId) => `/dossier/${dossierId}/documents/manager_non_conviction/edit`,
});

export class GuidedFormProvider {
  static id = 'guided_form';

  static isAvailable() {
    return true;
  }

  static resolveEditorPath({ dossierId, docKey }) {
    const resolver = GUIDED_EDITOR_PATHS[docKey];
    if (!resolver) return null;
    return resolver(dossierId);
  }

  static buildLaunchPayload({ dossierId, docKey, appUrl }) {
    const editorPath = this.resolveEditorPath({ dossierId, docKey });
    if (!editorPath) {
      return {
        ok: false,
        error: 'GUIDED_EDITOR_NOT_AVAILABLE',
        message: 'Aucun éditeur guidé disponible pour ce document.',
      };
    }
    const baseUrl = String(appUrl || process.env.GREFFIO_APP_URL || process.env.APP_URL || '').replace(/\/$/, '');
    return {
      ok: true,
      provider: this.id,
      mode: 'guided_form',
      editorPath,
      editorUrl: baseUrl ? `${baseUrl}${editorPath}` : editorPath,
      mobilePolicy: getDocumentEditorMobileMode(),
    };
  }
}

export class OnlyOfficeProvider {
  static id = 'onlyoffice';

  static isAvailable() {
    return isOnlyOfficeConfigured() && isDocumentFreeEditEnabled();
  }

  static buildLaunchPayload({
    session,
    accessToken,
    appUrl,
    dossierId,
    docKey,
    document = null,
    currentVersion = null,
  }) {
    if (!this.isAvailable()) {
      return {
        ok: false,
        error: 'ONLYOFFICE_NOT_CONFIGURED',
        message: 'L’éditeur ONLYOFFICE n’est pas configuré. L’aperçu du document reste disponible.',
        fallbackProvider: GuidedFormProvider.id,
      };
    }

    const apiBase = String(process.env.GREFFIO_API_URL || appUrl || '').replace(/\/$/, '');
    const fileType = resolveOnlyOfficeFileType(
      session?.fileFormat === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : document?.mimeType,
      currentVersion?.fileFormat || session?.fileFormat,
    );
    const documentKey = buildOnlyOfficeDocumentKey({
      dossierId,
      docKey,
      versionId: currentVersion?.id || session?.documentVersionId,
      sha256: currentVersion?.sha256 || document?.sha256 || session?.sourceSha256,
      sessionId: session?.id,
    });
    const fileUrl = `${apiBase}/api/onlyoffice/files/${session.id}/download?token=${encodeURIComponent(accessToken)}`;
    const callbackUrl = `${apiBase}/api/onlyoffice/callback/${session.id}`;
    const config = buildOnlyOfficeEditorConfig({
      documentKey,
      title: document?.label || docKey,
      fileUrl,
      callbackUrl,
      fileType,
      user: { id: session.userId, name: session.userEmail || 'Utilisateur Greffio' },
    });

    return {
      ok: true,
      provider: this.id,
      sessionId: session.id,
      documentServerUrl: getOnlyOfficeServerUrl(),
      config,
      configUrl: `${apiBase}/api/dossiers/${dossierId}/documents/${encodeURIComponent(docKey)}/onlyoffice-config?sessionId=${encodeURIComponent(session.id)}&token=${encodeURIComponent(accessToken)}`,
      expiresAt: session.expiresAt,
      mobilePolicy: 'desktop_recommended',
    };
  }
}

export class CollaboraProvider {
  static id = 'collabora';

  static isAvailable() {
    return Boolean(process.env.COLLABORA_URL) && isDocumentFreeEditEnabled();
  }

  static buildLaunchPayload({ session, accessToken, appUrl }) {
    if (!this.isAvailable()) {
      return {
        ok: false,
        error: 'COLLABORA_NOT_CONFIGURED',
        message: 'L’éditeur bureautique en ligne n’est pas encore activé. Utilisez le formulaire Greffio.',
        fallbackProvider: GuidedFormProvider.id,
      };
    }
    const collaboraUrl = String(process.env.COLLABORA_URL).replace(/\/$/, '');
    const apiBase = String(process.env.GREFFIO_API_URL || appUrl || '').replace(/\/$/, '');
    const wopiSrc = encodeURIComponent(`${apiBase}/api/wopi/files/${session.id}`);
    const editorUrl = `${collaboraUrl}/browser/dist/cool.html?WOPISrc=${wopiSrc}&access_token=${encodeURIComponent(accessToken)}`;
    return {
      ok: true,
      provider: this.id,
      sessionId: session.id,
      editorUrl,
      expiresAt: session.expiresAt,
      mobilePolicy: 'desktop_recommended',
      wopiStatus: 'stub',
      message: 'Collabora WOPI skeleton – fallback formulaire guidé recommandé tant que l’infra n’est pas déployée.',
    };
  }
}

export const getConfiguredProvider = () => {
  const preferred = String(process.env.DOCUMENT_EDITOR_PROVIDER || '').trim().toLowerCase();
  if (preferred === 'onlyoffice' && OnlyOfficeProvider.isAvailable()) return OnlyOfficeProvider.id;
  if (preferred === 'collabora' && CollaboraProvider.isAvailable()) return CollaboraProvider.id;
  if (OnlyOfficeProvider.isAvailable()) return OnlyOfficeProvider.id;
  if (CollaboraProvider.isAvailable()) return CollaboraProvider.id;
  return GuidedFormProvider.id;
};

export const assertProviderReady = (providerId) => {
  if (providerId === OnlyOfficeProvider.id) {
    return OnlyOfficeProvider.isAvailable();
  }
  if (providerId === CollaboraProvider.id) {
    return CollaboraProvider.isAvailable();
  }
  if (providerId === GuidedFormProvider.id) {
    return GuidedFormProvider.isAvailable();
  }
  return false;
};

export const createEditorLaunchUrl = ({
  providerId = 'guided_form',
  dossierId,
  docKey,
  session = null,
  accessToken = null,
  appUrl = null,
}) => {
  if (providerId === OnlyOfficeProvider.id) {
    return OnlyOfficeProvider.buildLaunchPayload({
      session,
      accessToken,
      appUrl,
      dossierId,
      docKey,
    });
  }
  if (providerId === CollaboraProvider.id) {
    return CollaboraProvider.buildLaunchPayload({ session, accessToken, appUrl });
  }
  const config = getEditableDocumentConfig(docKey);
  return GuidedFormProvider.buildLaunchPayload({
    dossierId,
    docKey,
    appUrl,
    title: config?.title || docKey,
  });
};

export const resolveDefaultEditorProvider = ({ preferFreeEdit = false, docKey = null } = {}) => {
  if (preferFreeEdit || docKey === 'signed_statutes') {
    if (OnlyOfficeProvider.isAvailable()) return OnlyOfficeProvider.id;
    if (CollaboraProvider.isAvailable()) return CollaboraProvider.id;
  }
  return GuidedFormProvider.id;
};
