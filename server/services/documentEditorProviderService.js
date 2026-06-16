import { getEditableDocumentConfig } from '../documents/editableDocumentRegistry.js';
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
  if (CollaboraProvider.isAvailable()) return CollaboraProvider.id;
  return GuidedFormProvider.id;
};

export const assertProviderReady = (providerId) => {
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

export const resolveDefaultEditorProvider = ({ preferFreeEdit = false } = {}) => {
  if (preferFreeEdit && CollaboraProvider.isAvailable()) {
    return CollaboraProvider.id;
  }
  return GuidedFormProvider.id;
};
