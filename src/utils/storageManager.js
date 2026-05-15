import { saveUser, getUser, saveDossiers, getDossiers, saveDocuments, getDocuments, saveChatHistory, getChatHistory, saveNotifications, getNotifications } from '@/utils/localStorage.js';

export const saveUserProfile = (user) => {
  return saveUser(user);
};

export const loadUserProfile = () => {
  return getUser();
};

export const updateUserProfile = (updates) => {
  const currentUser = getUser();
  if (!currentUser) return false;
  
  const updatedUser = { ...currentUser, ...updates };
  return saveUser(updatedUser);
};

export const addDossier = (dossier) => {
  const dossiers = getDossiers();
  const newDossier = {
    ...dossier,
    id: dossier.id || `dossier-${Date.now()}`,
    createdAt: dossier.createdAt || new Date().toISOString(),
    documents: dossier.documents || []
  };
  dossiers.push(newDossier);
  return saveDossiers(dossiers);
};

export const updateDossier = (dossierId, updates) => {
  const dossiers = getDossiers();
  const index = dossiers.findIndex(d => d.id === dossierId);
  if (index === -1) return false;
  
  dossiers[index] = { ...dossiers[index], ...updates };
  return saveDossiers(dossiers);
};

export const deleteDossier = (dossierId) => {
  const dossiers = getDossiers();
  const filtered = dossiers.filter(d => d.id !== dossierId);
  
  const documents = getDocuments();
  const filteredDocs = documents.filter(doc => doc.dossierID !== dossierId);
  saveDocuments(filteredDocs);
  
  return saveDossiers(filtered);
};

export const loadDossiers = () => {
  return getDossiers();
};

export const getDossierById = (dossierId) => {
  const dossiers = getDossiers();
  return dossiers.find(d => d.id === dossierId);
};

export const addDocument = (document) => {
  const documents = getDocuments();
  const newDocument = {
    ...document,
    id: document.id || `doc-${Date.now()}`,
    uploadedAt: document.uploadedAt || new Date().toISOString(),
    progress: document.progress || 100
  };
  documents.push(newDocument);
  
  if (document.dossierID) {
    const dossiers = getDossiers();
    const dossierIndex = dossiers.findIndex(d => d.id === document.dossierID);
    if (dossierIndex !== -1) {
      if (!dossiers[dossierIndex].documents) {
        dossiers[dossierIndex].documents = [];
      }
      if (!dossiers[dossierIndex].documents.includes(newDocument.id)) {
        dossiers[dossierIndex].documents.push(newDocument.id);
      }
      saveDossiers(dossiers);
    }
  }
  
  return saveDocuments(documents);
};

export const updateDocument = (documentId, updates) => {
  const documents = getDocuments();
  const index = documents.findIndex(d => d.id === documentId);
  if (index === -1) return false;
  
  documents[index] = { ...documents[index], ...updates };
  return saveDocuments(documents);
};

export const loadDocuments = () => {
  return getDocuments();
};

export const getDocumentsByDossier = (dossierId) => {
  const documents = getDocuments();
  return documents.filter(doc => doc.dossierID === dossierId);
};

export const addChatMessage = (message) => {
  const history = getChatHistory();
  const newMessage = {
    ...message,
    id: message.id || `msg-${Date.now()}`,
    timestamp: message.timestamp || new Date().toISOString()
  };
  history.push(newMessage);
  return saveChatHistory(history);
};

export const loadChatHistory = () => {
  return getChatHistory();
};

export const clearChatHistory = () => {
  return saveChatHistory([]);
};

export const addNotification = (notification) => {
  const notifications = getNotifications();
  const newNotification = {
    ...notification,
    id: notification.id || `notif-${Date.now()}`,
    createdAt: notification.createdAt || new Date().toISOString(),
    read: notification.read || false
  };
  notifications.unshift(newNotification);
  return saveNotifications(notifications);
};

export const markNotificationAsRead = (notificationId) => {
  const notifications = getNotifications();
  const index = notifications.findIndex(n => n.id === notificationId);
  if (index === -1) return false;
  
  notifications[index].read = true;
  return saveNotifications(notifications);
};

export const loadNotifications = () => {
  return getNotifications();
};

export const getUnreadNotificationsCount = () => {
  const notifications = getNotifications();
  return notifications.filter(n => !n.read).length;
};