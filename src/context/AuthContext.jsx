import React, { createContext, useEffect, useState } from 'react';
import { showAuthFeedback } from '@/utils/authFeedback.js';
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
import { mapSecurityApiError } from '@/config/security.js';
import {
  isAuthSessionInvalidError,
  isTransientApiError,
  mapLoginPayloadError,
  withTransientRetry,
} from '@/api/networkResilience.js';
import { fetchUserProfile } from '@/api/profile.js';
import { verifyMfaLogin } from '@/api/mfa.js';
import { clearLoginAlertsConfiguredLocal } from '@/utils/loginAlertsStorage.js';
import { rememberLoginAlertsChoice } from '@/utils/userProfile.js';
import { disableBiometricUnlock, syncBiometricRefreshToken } from '@/utils/biometricAuth.js';
import { isCapacitorNative } from '@/utils/platform.js';
import { markFreshNativePasswordLogin } from '@/utils/nativeAppStorage.js';
import { persistNativeAuthSession } from '@/utils/nativeWebAuth.js';
import { initializeClientDataCache, purgeEphemeralClientData } from '@/utils/clientDataCache.js';
import { setActiveSessionUserId } from '@/utils/sessionStore.js';
import { clearExternalCheckoutFlag, isExternalCheckoutActive } from '@/utils/paymentCheckoutNavigation.js';
import { setApiUnauthorizedHandler } from '@/api/client.js';
import { clearAuthenticatedQueries } from '@/lib/queryClient.js';
import { resolveSessionRole } from '@/utils/roles.js';
export const AuthContext = createContext(null);

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
    setApiUnauthorizedHandler(() => {
      clearAllData();
      purgeEphemeralClientData({ keepConsent: true });
      clearAuthenticatedQueries();
      setActiveSessionUserId(null);
      setCurrentUser(null);
    });
  }, []);

  useEffect(() => {
    initializeClientDataCache(null);
    const bootstrap = async () => {
      const storedUser = getUser();
      const refreshToken = getRefreshToken();
      if (!storedUser && !refreshToken) {
        setActiveSessionUserId(null);
        initializeClientDataCache(null);
        setLoading(false);
        return;
      }
      if (!refreshToken) {
        clearAllData();
        purgeEphemeralClientData({ keepConsent: true });
        setActiveSessionUserId(null);
        initializeClientDataCache(null);
        setCurrentUser(null);
        setLoading(false);
        return;
      }
      let resolvedUser = storedUser;
      try {
        const payload = await withTransientRetry(
          () => refreshAccessToken({ refreshToken }),
          { retries: 1, delays: [600] },
        );
        if (payload?.accessToken) {
          saveToken(payload.accessToken);
        }
        if (payload?.refreshToken) {
          saveRefreshToken(payload.refreshToken);
        }
        const refreshedUser = payload?.user;
        if (refreshedUser) {
          resolvedUser = refreshedUser;
          setActiveSessionUserId(refreshedUser.id || null);
          initializeClientDataCache(refreshedUser.id || null);
          setCurrentUser(refreshedUser);
          saveUser(refreshedUser);
        }
        try {
          const profilePayload = await withTransientRetry(
            () => fetchUserProfile(),
            { retries: 1, delays: [600] },
          );
          const user = profilePayload?.user || refreshedUser || storedUser;
          resolvedUser = user;
          setActiveSessionUserId(user?.id || null);
          initializeClientDataCache(user?.id || null);
          setCurrentUser(user);
          saveUser(user);
        } catch (profileError) {
          if (isTransientApiError(profileError) && (refreshedUser || storedUser)) {
            const fallbackUser = refreshedUser || storedUser;
            setActiveSessionUserId(fallbackUser?.id || null);
            initializeClientDataCache(fallbackUser?.id || null);
            setCurrentUser(fallbackUser);
          } else {
            throw profileError;
          }
        }
      } catch (error) {
        const fallbackUser = resolvedUser || storedUser || getUser();
        if (isAuthSessionInvalidError(error)) {
          clearAllData();
          purgeEphemeralClientData({ keepConsent: true });
          setActiveSessionUserId(null);
          initializeClientDataCache(null);
          setCurrentUser(null);
        } else if (fallbackUser && getRefreshToken()) {
          setActiveSessionUserId(fallbackUser?.id || null);
          initializeClientDataCache(fallbackUser?.id || null);
          setCurrentUser(fallbackUser);
        } else if (isTransientApiError(error) && storedUser) {
          setActiveSessionUserId(storedUser?.id || null);
          initializeClientDataCache(storedUser?.id || null);
          setCurrentUser(storedUser);
        } else {
          clearAllData();
          purgeEphemeralClientData({ keepConsent: true });
          setActiveSessionUserId(null);
          initializeClientDataCache(null);
          setCurrentUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return undefined;

    const healSessionOnReturn = async () => {
      if (document.hidden) return;
      const refreshToken = getRefreshToken();
      if (!refreshToken) return;
      try {
        const payload = await withTransientRetry(
          () => refreshAccessToken({ refreshToken }),
          { retries: 1, delays: [400] },
        );
        if (payload?.accessToken) saveToken(payload.accessToken);
        if (payload?.refreshToken) saveRefreshToken(payload.refreshToken);
        if (payload?.user) {
          setActiveSessionUserId(payload.user.id || null);
          initializeClientDataCache(payload.user.id || null);
          setCurrentUser(payload.user);
          saveUser(payload.user);
        }
        if (isExternalCheckoutActive()) {
          clearExternalCheckoutFlag();
        }
      } catch (error) {
        if (isAuthSessionInvalidError(error)) {
          // La prochaine requête API déclenchera onUnauthorized si la session est réellement expirée.
        }
      }
    };

    const onVisibilityChange = () => {
      void healSessionOnReturn();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [currentUser?.id]);

  const login = async (email, password, provider = 'email', captcha = {}) => {
    if (!email || !password || password.length < 8) {
      return { success: false, error: 'Renseignez un email et un mot de passe valides.' };
    }

    try {
      const apiPayload = await loginWithApi({
        email,
        password,
        ...captcha,
      });
      if (apiPayload?.mfaRequired) {
        return {
          success: true,
          mfaRequired: true,
          mfaToken: apiPayload.mfaToken,
          user: apiPayload.user,
        };
      }
      const payloadError = mapLoginPayloadError(apiPayload);
      if (payloadError) {
        return { success: false, error: payloadError };
      }
      const user = apiPayload.user;
      saveToken(apiPayload.accessToken);
      saveRefreshToken(apiPayload.refreshToken);
      const userWithRole = user?.role ? user : { ...user, role: resolveSessionRole(null) || user?.role };
      setActiveSessionUserId(userWithRole?.id || null);
      initializeClientDataCache(userWithRole?.id || null);
      setCurrentUser(userWithRole);
      saveUser(userWithRole);
      saveSessions([makeSession(email, provider)]);
      try {
        const profilePayload = await fetchUserProfile();
        const enrichedUser = profilePayload?.user || userWithRole;
        rememberLoginAlertsChoice(enrichedUser);
        setCurrentUser(enrichedUser);
        saveUser(enrichedUser);
      } catch (_profileError) {
        // keep login payload user
      }
      showAuthFeedback('welcome', 'Bienvenue dans votre espace Greffio');
      if (isCapacitorNative()) {
        markFreshNativePasswordLogin();
        try {
          await syncBiometricRefreshToken({
            email: user?.email || email,
            refreshToken: apiPayload.refreshToken || getRefreshToken(),
          });
        } catch (_biometricError) {
          // non-blocking
        }
      }
      return { success: true, user: userWithRole };
    } catch (error) {
      const code = error?.payload?.error || error?.message || error?.code;
      if (code === 'TEMP_ACCOUNT_EXPIRED') {
        return { success: false, error: 'TEMP_ACCOUNT_EXPIRED' };
      }
      if (code === 'SECURITY_CHECK_REQUIRED') {
        return { success: false, error: 'SECURITY_CHECK_REQUIRED', message: mapSecurityApiError(error) };
      }
      if (code === 'RATE_LIMITED') {
        return { success: false, error: 'RATE_LIMITED', message: mapSecurityApiError(error) };
      }
      if (isTransientApiError(error)) {
        return { success: false, error: 'Mise à jour serveur en cours. Réessayez dans quelques instants.' };
      }
      if (code === 'INVALID_CREDENTIALS') {
        return { success: false, error: 'Email ou mot de passe incorrect.' };
      }
      if (code === 'INVALID_LOGIN_PAYLOAD') {
        return { success: false, error: 'Renseignez un email et un mot de passe valides.' };
      }
      return { success: false, error: 'Connexion impossible. Vérifiez vos identifiants ou réessayez dans quelques instants.' };
    }
  };

  const completeMfaLogin = async ({ mfaToken, code, recoveryCode, method = 'totp' }) => {
    try {
      const apiPayload = await verifyMfaLogin({ mfaToken, code, recoveryCode, method });
      const payloadError = mapLoginPayloadError(apiPayload);
      if (payloadError) {
        return { success: false, error: payloadError };
      }
      const user = apiPayload.user;
      saveToken(apiPayload.accessToken);
      saveRefreshToken(apiPayload.refreshToken);
      const userWithRole = user?.role ? user : { ...user, role: resolveSessionRole(null) || user?.role };
      setActiveSessionUserId(userWithRole?.id || null);
      initializeClientDataCache(userWithRole?.id || null);
      setCurrentUser(userWithRole);
      saveUser(userWithRole);
      saveSessions([makeSession(userWithRole.email)]);
      try {
        const profilePayload = await fetchUserProfile();
        const enrichedUser = profilePayload?.user || userWithRole;
        rememberLoginAlertsChoice(enrichedUser);
        setCurrentUser(enrichedUser);
        saveUser(enrichedUser);
      } catch (_profileError) {
        // keep MFA login payload user
      }
      showAuthFeedback('mfa', 'Authentification multifacteur validée');
      if (isCapacitorNative()) {
        markFreshNativePasswordLogin();
        try {
          await syncBiometricRefreshToken({
            email: user?.email,
            refreshToken: apiPayload.refreshToken || getRefreshToken(),
          });
        } catch (_biometricError) {
          // non-blocking
        }
      }
      return { success: true, user: userWithRole };
    } catch (error) {
      const code = error?.payload?.error || error?.code || error?.message;
      if (code === 'MFA_CODE_INVALID') {
        return { success: false, error: 'Code incorrect ou expiré. Réessayez ou demandez un nouveau code.' };
      }
      if (code === 'MFA_TOKEN_INVALID' || code === 'MFA_NOT_ENABLED') {
        return { success: false, error: 'Session MFA expirée. Reconnectez-vous.' };
      }
      if (code === 'RATE_LIMITED') {
        return { success: false, error: mapSecurityApiError(error) || 'Pour protéger votre compte, merci de patienter quelques minutes avant de réessayer.' };
      }
      if (code === 'MFA_TOTP_UNAVAILABLE') {
        return {
          success: false,
          error: error?.payload?.message || 'Authenticator illisible. Utilisez un code email ou réactivez la MFA.',
        };
      }
      if (code === 'MFA_VERIFY_FAILED') {
        return { success: false, error: 'Vérification MFA indisponible. Réessayez ou contactez le support.' };
      }
      if (isTransientApiError(error)) {
        return { success: false, error: 'Mise à jour serveur en cours. Réessayez dans quelques instants.' };
      }
      return { success: false, error: 'Code MFA invalide ou expiré.' };
    }
  };

  const signup = async (userData) => {
    let effectiveUser = null;
    let effectiveAccessToken = null;
    let effectiveRefreshToken = null;
    try {
      const apiSignup = await signupWithApi({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'CLIENT',
        loginAlertsEnabled: userData.loginAlertsEnabled !== false,
        ...(userData.turnstileToken ? { turnstileToken: userData.turnstileToken } : {}),
        ...(userData.recaptchaToken ? { recaptchaToken: userData.recaptchaToken } : {}),
        ...(userData.provider ? { provider: userData.provider } : {}),
        company: {
          name: userData.companyName || userData.firstName || 'Mon espace Greffio',
          legalStructure: userData.legalStructure || userData.legalForm || 'SAS',
          location: userData.location || userData.city || 'France',
          activity: userData.activity || userData.objetSocial || '',
          initiatorType: userData.initiatorType || 'personne_physique',
          initiatorName: userData.initiatorName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          initiatorLegalForm: userData.initiatorLegalForm || null,
        },
      });
      effectiveUser = apiSignup.user || null;
      effectiveAccessToken = apiSignup.accessToken || null;
      effectiveRefreshToken = apiSignup.refreshToken || null;
    } catch (error) {
      const securityMessage = mapSecurityApiError(error);
      if (securityMessage) {
        return { success: false, error: error?.payload?.error || error?.message, message: securityMessage };
      }
      if (error?.message === 'EMAIL_ALREADY_EXISTS' || error?.payload?.error === 'EMAIL_ALREADY_EXISTS') {
        return { success: false, error: 'Un compte existe déjà avec cet email. Utilisez Connexion ou réinitialisez votre mot de passe.' };
      }
      return { success: false, error: 'Création du compte impossible. Réessayez ou contactez l’équipe Greffio.' };
    }
    if (!effectiveUser || !effectiveAccessToken || !effectiveRefreshToken) {
      return { success: false, error: 'Création du compte impossible. Réessayez ou contactez l’équipe Greffio.' };
    }

    setActiveSessionUserId(effectiveUser?.id || null);
    initializeClientDataCache(effectiveUser?.id || null);
    setCurrentUser(effectiveUser);
    saveUser(effectiveUser);
    rememberLoginAlertsChoice(effectiveUser);
    saveToken(effectiveAccessToken);
    saveRefreshToken(effectiveRefreshToken);
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

  const logout = async ({ silent = false, reason = null } = {}) => {
    const userId = currentUser?.id;
    if (isCapacitorNative()) {
      await disableBiometricUnlock();
    }
    clearAllData();
    purgeEphemeralClientData({ keepConsent: true });
    clearAuthenticatedQueries();
    setActiveSessionUserId(null);
    initializeClientDataCache(null);
    if (userId) clearLoginAlertsConfiguredLocal(userId);
    setCurrentUser(null);
    if (!silent && reason !== 'idle') {
      showAuthFeedback('logout', 'Déconnexion effectuée');
    }
  };

  const updateProfile = (user) => {
    const updated = typeof user === 'object' && user !== null && user.id
      ? user
      : { ...currentUser, ...user };
    setCurrentUser(updated);
    saveUser(updated);
    return { success: true, user: updated };
  };

  const applyNativeAuthHandoff = async (session) => {
    if (!session?.accessToken || !session?.refreshToken || !session?.user) {
      return { success: false, error: 'Session invalide.' };
    }
    persistNativeAuthSession(session);
    setActiveSessionUserId(session.user?.id || null);
    initializeClientDataCache(session.user?.id || null);
    setCurrentUser(session.user);
    saveSessions([makeSession(session.user.email || session.user.id)]);
    markFreshNativePasswordLogin();
    try {
      await syncBiometricRefreshToken({
        email: session.user?.email,
        refreshToken: session.refreshToken,
      });
    } catch (_biometricError) {
      // non-blocking
    }
    showAuthFeedback('login', 'Connexion réussie');
    return { success: true, user: session.user };
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
        applyNativeAuthHandoff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
