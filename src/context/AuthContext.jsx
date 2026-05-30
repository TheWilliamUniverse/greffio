import React, { createContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  clearAllData,
  getRefreshToken,
  getUser,
  saveSecuritySettings,
  saveSessions,
  saveRefreshToken,
  saveToken,
  saveUser,
} from '@/utils/localStorage.js';
import { loginWithApi, refreshAccessToken, signupWithApi } from '@/api/auth.js';
import { fetchUserProfile } from '@/api/profile.js';
import { verifyMfaLogin } from '@/api/mfa.js';
import { clearLoginAlertsConfiguredLocal } from '@/utils/loginAlertsStorage.js';
import { rememberLoginAlertsChoice } from '@/utils/userProfile.js';
import { disableBiometricUnlock, syncBiometricRefreshToken } from '@/utils/biometricAuth.js';
import { isCapacitorNative } from '@/utils/platform.js';

export const AuthContext = createContext(null);

const makeSessionToken = () => `greffio_${Date.now()}_${Math.random().toString(16).slice(2)}`;
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

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const storedUser = getUser();
      const refreshToken = getRefreshToken();
      if (!storedUser && !refreshToken) {
        setLoading(false);
        return;
      }
      if (!refreshToken) {
        clearAllData();
        setCurrentUser(null);
        setLoading(false);
        return;
      }
      try {
        const payload = await refreshAccessToken({ refreshToken });
        if (payload?.accessToken) {
          saveToken(payload.accessToken);
        }
        if (payload?.refreshToken) {
          saveRefreshToken(payload.refreshToken);
        }
        const profilePayload = await fetchUserProfile();
        const user = profilePayload?.user || storedUser;
        setCurrentUser(user);
        saveUser(user);
      } catch (_error) {
        clearAllData();
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, []);

  const login = async (email, password, provider = 'email') => {
    if (!email || !password || password.length < 8) {
      return { success: false, error: 'Renseignez un email et un mot de passe valides.' };
    }

    try {
      const apiPayload = await loginWithApi({ email, password });
      if (apiPayload?.mfaRequired) {
        return {
          success: true,
          mfaRequired: true,
          mfaToken: apiPayload.mfaToken,
          user: apiPayload.user,
        };
      }
      const user = apiPayload.user;
      setCurrentUser(user);
      saveUser(user);
      saveToken(apiPayload.accessToken || makeSessionToken());
      saveRefreshToken(apiPayload.refreshToken || '');
      saveSessions([makeSession(email, provider)]);
      try {
        const profilePayload = await fetchUserProfile();
        const enrichedUser = profilePayload?.user || user;
        rememberLoginAlertsChoice(enrichedUser);
        setCurrentUser(enrichedUser);
        saveUser(enrichedUser);
      } catch (_profileError) {
        // keep login payload user
      }
      toast.success('Bienvenue dans votre espace Greffio');
      if (isCapacitorNative()) {
        await syncBiometricRefreshToken({
          email: user?.email || email,
          refreshToken: apiPayload.refreshToken || getRefreshToken(),
        });
      }
      return { success: true, user };
    } catch (error) {
      const code = error?.payload?.error || error?.message;
      if (code === 'TEMP_ACCOUNT_EXPIRED') {
        return { success: false, error: 'TEMP_ACCOUNT_EXPIRED' };
      }
      return { success: false, error: 'Connexion impossible. Vérifiez vos identifiants ou réessayez dans quelques instants.' };
    }
  };

  const completeMfaLogin = async ({ mfaToken, code, recoveryCode, method = 'totp' }) => {
    try {
      const apiPayload = await verifyMfaLogin({ mfaToken, code, recoveryCode, method });
      const user = apiPayload.user;
      setCurrentUser(user);
      saveUser(user);
      saveToken(apiPayload.accessToken || makeSessionToken());
      saveRefreshToken(apiPayload.refreshToken || '');
      saveSessions([makeSession(user.email)]);
      try {
        const profilePayload = await fetchUserProfile();
        const enrichedUser = profilePayload?.user || user;
        rememberLoginAlertsChoice(enrichedUser);
        setCurrentUser(enrichedUser);
        saveUser(enrichedUser);
      } catch (_profileError) {
        // keep MFA login payload user
      }
      toast.success('Authentification multifacteur validée');
      if (isCapacitorNative()) {
        await syncBiometricRefreshToken({
          email: user?.email,
          refreshToken: apiPayload.refreshToken || getRefreshToken(),
        });
      }
      return { success: true, user };
    } catch (_error) {
      return { success: false, error: 'Code MFA invalide ou expiré.' };
    }
  };

  const signup = async (userData) => {
    let effectiveUser = null;
    let effectiveToken = makeSessionToken();
    try {
      const apiSignup = await signupWithApi({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'CLIENT',
        loginAlertsEnabled: userData.loginAlertsEnabled !== false,
        company: {
          name: userData.companyName || 'Projet Greffio',
          legalStructure: userData.legalStructure || userData.legalForm || 'SAS',
          location: userData.location || userData.city || 'France',
          activity: userData.activity || userData.objetSocial || '',
          initiatorType: userData.initiatorType || 'personne_physique',
          initiatorName: userData.initiatorName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          initiatorLegalForm: userData.initiatorLegalForm || null,
        },
      });
      effectiveUser = apiSignup.user || null;
      effectiveToken = apiSignup.accessToken || effectiveToken;
      saveRefreshToken(apiSignup.refreshToken || '');
    } catch (error) {
      if (error?.message === 'EMAIL_ALREADY_EXISTS' || error?.payload?.error === 'EMAIL_ALREADY_EXISTS') {
        return { success: false, error: 'Un compte existe déjà avec cet email. Utilisez Connexion ou réinitialisez votre mot de passe.' };
      }
      return { success: false, error: 'Création du compte impossible. Réessayez ou contactez l’équipe Greffio.' };
    }
    if (!effectiveUser) {
      return { success: false, error: 'Création du compte impossible. Réessayez ou contactez l’équipe Greffio.' };
    }

    setCurrentUser(effectiveUser);
    saveUser(effectiveUser);
    rememberLoginAlertsChoice(effectiveUser);
    saveToken(effectiveToken);
    saveSessions([makeSession(userData.email)]);
    saveSecuritySettings({
      mfaEnabled: false,
      totpEnabled: false,
      smsEnabled: false,
      emailCodeEnabled: false,
      phone: userData.phone || '',
      recoveryCodesGenerated: false,
      updatedAt: new Date().toISOString(),
    });
    return { success: true, user: effectiveUser };
  };

  const logout = async () => {
    const userId = currentUser?.id;
    if (isCapacitorNative()) {
      await disableBiometricUnlock();
    }
    clearAllData();
    if (userId) clearLoginAlertsConfiguredLocal(userId);
    setCurrentUser(null);
    toast.success('Déconnexion effectuée');
  };

  const updateProfile = (user) => {
    const updated = typeof user === 'object' && user !== null && user.id
      ? user
      : { ...currentUser, ...user };
    setCurrentUser(updated);
    saveUser(updated);
    return { success: true, user: updated };
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        loading,
        login,
        completeMfaLogin,
        signup,
        logout,
        updateProfile,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
