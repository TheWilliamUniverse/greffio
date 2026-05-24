import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.js';
import { refreshAccessToken } from '@/api/auth.js';
import { saveRefreshToken, saveToken, saveUser } from '@/utils/localStorage.js';
import {
  disableBiometricUnlock,
  isBiometricUnlockEnabled,
  unlockWithBiometric,
} from '@/utils/biometricAuth.js';
import { isCapacitorNative } from '@/utils/platform.js';
import { BiometricUnlockScreen } from '@/mobile/BiometricUnlockScreen.jsx';

const BiometricSessionContext = createContext(null);

export const BiometricSessionProvider = ({ children }) => {
  const { isAuthenticated, loading, logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');

  const resetLock = useCallback(() => {
    setUnlocked(false);
    setError('');
  }, []);

  const performUnlock = useCallback(async () => {
    setError('');
    try {
      const enabled = await isBiometricUnlockEnabled();
      if (!enabled) {
        setUnlocked(true);
        return;
      }
      const payload = await unlockWithBiometric();
      if (payload?.skipped) {
        setUnlocked(true);
        return;
      }
      if (payload?.refreshToken) {
        const renewed = await refreshAccessToken({ refreshToken: payload.refreshToken });
        if (renewed?.accessToken) saveToken(renewed.accessToken);
        if (renewed?.refreshToken) saveRefreshToken(renewed.refreshToken);
        if (renewed?.user) saveUser(renewed.user);
      }
      setUnlocked(true);
    } catch (_error) {
      setError('Déverrouillage impossible. Connectez-vous avec votre mot de passe.');
      await disableBiometricUnlock();
      logout();
      navigate('/login', { replace: true });
    }
  }, [logout, navigate]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (!isCapacitorNative() || loading) {
        if (mounted) {
          setUnlocked(true);
          setChecking(false);
        }
        return;
      }
      if (!isAuthenticated) {
        if (mounted) {
          setUnlocked(true);
          setChecking(false);
        }
        return;
      }
      const enabled = await isBiometricUnlockEnabled();
      if (!enabled) {
        if (mounted) {
          setUnlocked(true);
          setChecking(false);
        }
        return;
      }
      if (mounted) setChecking(false);
    };
    void init();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, loading]);

  useEffect(() => {
    if (!CapApp?.addListener || !isCapacitorNative()) return undefined;
    const sub = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive || !isAuthenticated) return;
      void isBiometricUnlockEnabled().then((enabled) => {
        if (enabled) resetLock();
      });
    });
    return () => {
      void sub.then((handle) => handle.remove());
    };
  }, [isAuthenticated, resetLock]);

  const value = useMemo(() => ({
    unlocked,
    checking,
    error,
    performUnlock,
    resetLock,
    setUnlocked,
  }), [unlocked, checking, error, performUnlock, resetLock]);

  const showGate = isCapacitorNative()
    && isAuthenticated
    && !checking
    && !unlocked;

  useEffect(() => {
    if (!showGate) return;
    void performUnlock();
  }, [showGate, performUnlock]);

  return (
    <BiometricSessionContext.Provider value={value}>
      {showGate ? (
        <BiometricUnlockScreen onUnlock={() => void performUnlock()} error={error} user={currentUser} />
      ) : (
        children
      )}
    </BiometricSessionContext.Provider>
  );
};

export const useBiometricSession = () => useContext(BiometricSessionContext);
