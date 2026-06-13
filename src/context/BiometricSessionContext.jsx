import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.js';
import { refreshAccessToken } from '@/api/auth.js';
import { isTransientApiError, withTransientRetry } from '@/api/networkResilience.js';
import { saveRefreshToken, saveToken, saveUser } from '@/utils/localStorage.js';
import {
  disableBiometricUnlock,
  isBiometricUnlockEnabled,
  unlockWithBiometric,
} from '@/utils/biometricAuth.js';
import {
  clearFreshNativePasswordLogin,
  hasFreshNativePasswordLogin,
} from '@/utils/nativeAppStorage.js';
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
        const renewed = await withTransientRetry(
          () => refreshAccessToken({ refreshToken: payload.refreshToken }),
          { retries: 2, delays: [500, 1500] },
        );
        if (renewed?.accessToken) saveToken(renewed.accessToken);
        if (renewed?.refreshToken) saveRefreshToken(renewed.refreshToken);
        if (renewed?.user) saveUser(renewed.user);
      }
      setUnlocked(true);
    } catch (error) {
      if (isTransientApiError(error)) {
        setError('Mise à jour serveur en cours. Réessayez dans quelques instants.');
        return;
      }
      setError('Déverrouillage impossible. Réessayez ou reconnectez-vous avec votre mot de passe.');
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (!isCapacitorNative()) {
        if (mounted) {
          setUnlocked(true);
          setChecking(false);
        }
        return;
      }
      if (loading) {
        if (mounted) setChecking(true);
        return;
      }
      if (!isAuthenticated) {
        if (mounted) {
          setUnlocked(true);
          setChecking(false);
        }
        return;
      }
      if (hasFreshNativePasswordLogin()) {
        clearFreshNativePasswordLogin();
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
      if (mounted) {
        setUnlocked(false);
        setChecking(false);
      }
    };
    void init();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, loading]);

  useEffect(() => {
    if (!isCapacitorNative() || loading || checking || !isAuthenticated || unlocked) return;
    if (hasFreshNativePasswordLogin()) return;
    let cancelled = false;
    void isBiometricUnlockEnabled().then((enabled) => {
      if (!cancelled && enabled) void performUnlock();
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loading, checking, unlocked, performUnlock]);

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
    && !unlocked
    && !hasFreshNativePasswordLogin();

  return (
    <BiometricSessionContext.Provider value={value}>
      {showGate ? (
        <BiometricUnlockScreen
          onUnlock={() => void performUnlock()}
          onUsePassword={async () => {
            await disableBiometricUnlock();
            await logout();
            navigate('/login', { replace: true });
          }}
          error={error}
          user={currentUser}
        />
      ) : (
        children
      )}
    </BiometricSessionContext.Provider>
  );
};

export const useBiometricSession = () => useContext(BiometricSessionContext);
