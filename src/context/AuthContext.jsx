import React, { createContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  appendWorkflowEvent,
  clearAllData,
  getRefreshToken,
  getProjectDraft,
  getUser,
  saveDocuments,
  saveDossiers,
  saveNotifications,
  saveSecuritySettings,
  saveSessions,
  saveRefreshToken,
  saveToken,
  saveUser,
} from '@/utils/localStorage.js';
import { buildWorkflowEmail } from '@/utils/mailTemplates.js';
import { loginWithApi, refreshAccessToken, signupWithApi } from '@/api/auth.js';

export const AuthContext = createContext(null);

const makeSessionToken = () => `greffio_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const makeReference = () => `F${Math.floor(10000000 + (Math.random() * 90000000))}`;

const makeUserFromEmail = (email) => {
  const name = email.split('@')[0].split(/[._-]/)[0] || 'Client';
  const firstName = name.charAt(0).toUpperCase() + name.slice(1);

  return {
    id: `usr_${Date.now()}`,
    firstName,
    lastName: '',
    email,
    role: 'CLIENT',
    company: null,
  };
};

const makeSession = (email, provider = 'email') => ({
  id: `sess_${Date.now()}`,
  provider,
  email,
  label: 'Session actuelle',
  device: 'Navigateur web',
  location: 'Connexion sécurisée',
  createdAt: new Date().toISOString(),
  current: true,
});

const makeInitialDossier = (userData) => {
  const service = userData.service || 'creation-sas';
  const legalForm = userData.legalStructure || userData.legalForm || 'SAS';
  const companyName = userData.companyName || userData.denomination || 'Projet à nommer';
  const owner = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.initiatorName || 'Client Greffio';
  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(now.getDate() + 7);
  const steps = [
    { label: 'Projet créé', done: true },
    { label: 'Questionnaire', done: Boolean(userData.activity || userData.objetSocial) },
    { label: 'Pièces à déposer', done: false },
    { label: 'Relecture Greffio', done: false },
    { label: 'Signature', done: false },
    { label: 'Dépôt', done: false },
  ];
  const done = steps.filter((step) => step.done).length;

  return {
    id: `dos_${Date.now()}`,
    name: `${service.includes('modification') ? 'Modification' : service.includes('dissolution') ? 'Dissolution' : 'Création'} ${legalForm} ${companyName}`,
    legalForm,
    owner,
    status: 'EN_COURS',
    priority: 'Normale',
    phase: 'Qualification du projet',
    nextAction: 'Compléter le questionnaire et déposer les premières pièces.',
    expert: 'Équipe Greffio',
    createdAt: now.toISOString(),
    dueDate: dueDate.toISOString(),
    progress: Math.round((done / steps.length) * 100),
    currentStep: done,
    totalSteps: steps.length,
    blockers: [],
    service,
    project: {
      initiatorType: userData.initiatorType || 'personne_physique',
      initiatorName: userData.initiatorName || owner,
      initiatorLegalForm: userData.initiatorLegalForm || null,
      companyName,
      activity: userData.activity || userData.objetSocial || '',
      location: userData.location || userData.city || 'France',
      email: userData.email,
      savedAt: new Date().toISOString(),
    },
    steps,
  };
};

const createWorkspaceFromSignup = (userData) => {
  const reference = makeReference();
  const dossier = makeInitialDossier(userData);
  const noStatutes = ['Micro-entreprise', 'Auto-entrepreneur', 'Entreprise individuelle (EI)', 'EI'];
  const documents = noStatutes.includes(dossier.legalForm)
    ? []
    : [{
      id: `doc_${Date.now()}`,
      name: `Statuts_${dossier.project.companyName.replace(/[^a-z0-9]+/gi, '_')}_brouillon.pdf`,
      status: 'BROUILLON',
      aiScore: null,
      size: 'À générer',
      date: new Date().toISOString(),
      type: 'Statuts',
      dossierId: dossier.id,
      owner: dossier.owner,
      source: 'Génération Greffio',
      providedBy: 'Greffio',
      requiredFor: 'Création du dossier',
      version: 'brouillon',
      nextAction: 'Compléter les clauses puis générer la version finale',
    }];

  saveDossiers([{ ...dossier, reference }]);
  saveDocuments(documents);
  saveNotifications([{
    id: `not_${Date.now()}`,
    type: 'DOSSIER_CREE',
    message: `Votre dossier ${dossier.legalForm} est ouvert. Complétez les informations et pièces attendues.`,
    date: new Date().toISOString(),
    read: false,
  }]);

  const welcomeEmail = buildWorkflowEmail('DRAFT_STARTED', {
    prenom: userData.firstName || 'Client',
    nom: userData.lastName || '',
    email: userData.email,
    telephone: userData.phone || '',
    reference_dossier: reference,
    lien_espace_client: '/dashboard',
  });

  if (welcomeEmail) {
    appendWorkflowEvent({
      id: `evt_${Date.now()}`,
      type: 'EMAIL_PREPARED',
      status: 'DRAFT_STARTED',
      reference,
      createdAt: new Date().toISOString(),
      payload: welcomeEmail,
    });
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getUser();
    if (user) setCurrentUser(user);
    setLoading(false);
  }, []);

  useEffect(() => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return;
    const renew = async () => {
      try {
        const payload = await refreshAccessToken({ refreshToken });
        if (payload?.accessToken) {
          saveToken(payload.accessToken);
        }
      } catch (_error) {
        // silent renewal failure
      }
    };
    void renew();
  }, []);

  const login = async (email, password, provider = 'email') => {
    if (!email || !password || password.length < 4) {
      return { success: false, error: 'Renseignez un email et un mot de passe valides.' };
    }

    try {
      const apiPayload = await loginWithApi({ email, password });
      const user = apiPayload.user;
      setCurrentUser(user);
      saveUser(user);
      saveToken(apiPayload.accessToken || makeSessionToken());
      saveRefreshToken(apiPayload.refreshToken || '');
      saveSessions([makeSession(email, provider)]);
      toast.success('Bienvenue dans votre espace Greffio');
      return { success: true, user };
    } catch (_error) {
      const storedUser = getUser();
      const user = storedUser?.email === email ? storedUser : makeUserFromEmail(email);
      setCurrentUser(user);
      saveUser(user);
      saveToken(makeSessionToken());
      saveRefreshToken('');
      saveSessions([makeSession(email, provider)]);
      toast.success('Connexion en mode local (fallback).');
      return { success: true, user };
    }
  };

  const signup = async (userData) => {
    const draft = getProjectDraft();
    const mergedData = { ...(draft?.data || {}), ...(draft?.answers || {}), ...userData };
    const newUser = {
      id: `usr_${Date.now()}`,
      firstName: mergedData.firstName,
      lastName: mergedData.lastName,
      email: mergedData.email,
      role: 'CLIENT',
      company: {
        name: mergedData.companyName || 'Projet à nommer',
        legalStructure: mergedData.legalStructure || mergedData.legalForm || 'SAS',
        location: mergedData.location || mergedData.city || 'France',
        activity: mergedData.activity || mergedData.objetSocial || '',
        siren: 'En immatriculation',
        initiatorType: mergedData.initiatorType || 'personne_physique',
        initiatorName: mergedData.initiatorName || `${mergedData.firstName} ${mergedData.lastName}`,
        initiatorLegalForm: mergedData.initiatorLegalForm || null,
      },
    };

    let effectiveUser = newUser;
    let effectiveToken = makeSessionToken();
    try {
      const apiSignup = await signupWithApi({
        email: mergedData.email,
        password: mergedData.password,
        firstName: mergedData.firstName,
        lastName: mergedData.lastName,
        role: 'CLIENT',
        company: newUser.company,
      });
      effectiveUser = apiSignup.user || newUser;
      effectiveToken = apiSignup.accessToken || effectiveToken;
      saveRefreshToken(apiSignup.refreshToken || '');
    } catch (_error) {
      // keep local fallback user
      saveRefreshToken('');
    }

    setCurrentUser(effectiveUser);
    saveUser(effectiveUser);
    saveToken(effectiveToken);
    saveSessions([makeSession(mergedData.email)]);
    saveSecuritySettings({
      mfaEnabled: false,
      totpEnabled: false,
      smsEnabled: false,
      emailCodeEnabled: false,
      phone: mergedData.phone || '',
      recoveryCodesGenerated: false,
      updatedAt: new Date().toISOString(),
    });
    createWorkspaceFromSignup(mergedData);
    return { success: true, user: effectiveUser };
  };

  const logout = () => {
    clearAllData();
    setCurrentUser(null);
    toast.success('Déconnexion effectuée');
  };

  const updateProfile = (data) => {
    const updated = { ...currentUser, ...data };
    setCurrentUser(updated);
    saveUser(updated);
    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        loading,
        login,
        signup,
        logout,
        updateProfile,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
