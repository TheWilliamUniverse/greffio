const USER_KEY = 'greffio_user';
const TOKEN_KEY = 'greffio_token';
const REFRESH_TOKEN_KEY = 'greffio_refresh_token';
const DOSSIERS_KEY = 'dossiers';
const DOCUMENTS_KEY = 'documents';
const CHAT_HISTORY_KEY = 'chatHistory';
const NOTIFICATIONS_KEY = 'notifications';
const SESSIONS_KEY = 'greffio_sessions';
const SECURITY_KEY = 'greffio_security';
const PROJECT_DRAFT_KEY = 'greffio_project_draft';
const WORKFLOW_EVENTS_KEY = 'greffio_workflow_events';

export const saveUser = (user) => {
  try {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user', error);
  }
};

export const getUser = () => {
  try {
    const item = window.localStorage.getItem(USER_KEY);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error('Error getting user', error);
    return null;
  }
};

export const saveToken = (token) => {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving token', error);
  }
};

export const saveRefreshToken = (token) => {
  try {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving refresh token', error);
  }
};

export const getToken = () => {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token', error);
    return null;
  }
};

export const getRefreshToken = () => {
  try {
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting refresh token', error);
    return null;
  }
};

export const clearAllData = () => {
  try {
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(SESSIONS_KEY);
    window.localStorage.removeItem(SECURITY_KEY);
    window.localStorage.removeItem(DOSSIERS_KEY);
    window.localStorage.removeItem(DOCUMENTS_KEY);
    window.localStorage.removeItem(CHAT_HISTORY_KEY);
    window.localStorage.removeItem(NOTIFICATIONS_KEY);
    window.localStorage.removeItem(WORKFLOW_EVENTS_KEY);
    window.localStorage.removeItem(PROJECT_DRAFT_KEY);
    window.localStorage.removeItem('greffio_mfa_device_token');
    window.localStorage.removeItem('greffio_mfa_device_expires');
    window.localStorage.removeItem('greffio_current_dossier_id');
    const scopedKeys = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith('greffio_current_dossier_')) scopedKeys.push(key);
    }
    scopedKeys.forEach((key) => window.localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing data', error);
  }
};

export const saveDossiers = (dossiers) => {
  try {
    window.localStorage.setItem(DOSSIERS_KEY, JSON.stringify(dossiers));
    return true;
  } catch (error) {
    console.error('Error saving dossiers', error);
    return false;
  }
};

export const getDossiers = () => {
  try {
    const item = window.localStorage.getItem(DOSSIERS_KEY);
    return item ? JSON.parse(item) : [];
  } catch (error) {
    console.error('Error getting dossiers', error);
    return [];
  }
};

export const saveDocuments = (documents) => {
  try {
    window.localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
    return true;
  } catch (error) {
    console.error('Error saving documents', error);
    return false;
  }
};

export const getDocuments = () => {
  try {
    const item = window.localStorage.getItem(DOCUMENTS_KEY);
    return item ? JSON.parse(item) : [];
  } catch (error) {
    console.error('Error getting documents', error);
    return [];
  }
};

export const saveChatHistory = (messages) => {
  try {
    window.localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    return true;
  } catch (error) {
    console.error('Error saving chat history', error);
    return false;
  }
};

export const getChatHistory = () => {
  try {
    const item = window.localStorage.getItem(CHAT_HISTORY_KEY);
    return item ? JSON.parse(item) : [];
  } catch (error) {
    console.error('Error getting chat history', error);
    return [];
  }
};

export const saveNotifications = (notifications) => {
  try {
    window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    return true;
  } catch (error) {
    console.error('Error saving notifications', error);
    return false;
  }
};

export const getNotifications = () => {
  try {
    const item = window.localStorage.getItem(NOTIFICATIONS_KEY);
    return item ? JSON.parse(item) : [];
  } catch (error) {
    console.error('Error getting notifications', error);
    return [];
  }
};

export const saveSessions = (sessions) => {
  try {
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    return true;
  } catch (error) {
    console.error('Error saving sessions', error);
    return false;
  }
};

export const getSessions = () => {
  try {
    const item = window.localStorage.getItem(SESSIONS_KEY);
    return item ? JSON.parse(item) : [];
  } catch (error) {
    console.error('Error getting sessions', error);
    return [];
  }
};

export const saveSecuritySettings = (settings) => {
  try {
    window.localStorage.setItem(SECURITY_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving security settings', error);
    return false;
  }
};

export const getSecuritySettings = () => {
  try {
    const item = window.localStorage.getItem(SECURITY_KEY);
    return item ? JSON.parse(item) : {
      mfaEnabled: false,
      totpEnabled: false,
      smsEnabled: false,
      emailCodeEnabled: false,
      phone: '',
      recoveryCodesGenerated: false,
      updatedAt: null,
    };
  } catch (error) {
    console.error('Error getting security settings', error);
    return {
      mfaEnabled: false,
      totpEnabled: false,
      smsEnabled: false,
      emailCodeEnabled: false,
      phone: '',
      recoveryCodesGenerated: false,
      updatedAt: null,
    };
  }
};

export const saveProjectDraft = (draft) => {
  try {
    window.localStorage.setItem(PROJECT_DRAFT_KEY, JSON.stringify({
      ...draft,
      savedAt: new Date().toISOString(),
    }));
    return true;
  } catch (error) {
    console.error('Error saving project draft', error);
    return false;
  }
};

export const getProjectDraft = () => {
  try {
    const item = window.localStorage.getItem(PROJECT_DRAFT_KEY);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error('Error getting project draft', error);
    return null;
  }
};

export const saveWorkflowEvents = (events) => {
  try {
    window.localStorage.setItem(WORKFLOW_EVENTS_KEY, JSON.stringify(events));
    return true;
  } catch (error) {
    console.error('Error saving workflow events', error);
    return false;
  }
};

export const getWorkflowEvents = () => {
  try {
    const item = window.localStorage.getItem(WORKFLOW_EVENTS_KEY);
    return item ? JSON.parse(item) : [];
  } catch (error) {
    console.error('Error getting workflow events', error);
    return [];
  }
};

export const appendWorkflowEvent = (event) => {
  const events = getWorkflowEvents();
  const next = [...events, event];
  saveWorkflowEvents(next);
  return next;
};
