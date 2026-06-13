import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, LockKeyhole, Mail, MonitorCheck, ShieldCheck, Smartphone, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar.jsx';
import { MobilePageContainer } from '@/mobile/ui/MobilePageContainer.jsx';
import { useAuth } from '@/hooks/useAuth.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp.jsx';
import { LoginAlertsToggle } from '@/components/security/LoginAlertsToggle.jsx';
import { BiometricUnlockToggle } from '@/components/security/BiometricUnlockToggle.jsx';
import { listDossiers } from '@/api/dossiers.js';
import { fetchUserProfile, updateUserProfileApi } from '@/api/profile.js';
import {
  buildLoginAlertsProfilePatch,
  getLoginAlertsSettings,
  isLoginAlertsConfigured,
  rememberLoginAlertsChoice,
} from '@/utils/userProfile.js';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { cn } from '@/lib/utils.js';
import {
  disableTotp,
  enableTotp,
  fetchMfaStatus,
  regenerateRecoveryCodes,
  setupTotp,
} from '@/api/mfa.js';

const securityMethods = [
  { icon: Smartphone, key: 'totp', label: 'Application TOTP', text: 'Google Authenticator, Microsoft Authenticator, 1Password.', available: true },
  { icon: Mail, key: 'email', label: 'Code email', text: 'Code à usage unique envoyé par email lors de la connexion MFA.', available: true },
  { icon: KeyRound, key: 'sms', label: 'Code SMS', text: 'Code court envoyé sur le téléphone de secours.', available: false },
];

export const SettingsPage = () => {
  const { currentUser, logout, updateProfile } = useAuth();
  const [mfaStatus, setMfaStatus] = useState({
    mfaEnabled: false,
    totpEnabled: false,
    recoveryCodesRemaining: 0,
  });
  const [sessions, setSessions] = useState([]);
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [setupCode, setSetupCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [regenPassword, setRegenPassword] = useState('');
  const [regenCode, setRegenCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginAlertsEnabled, setLoginAlertsEnabled] = useState(true);
  const [loginAlertsUpdatedAt, setLoginAlertsUpdatedAt] = useState(null);
  const [loginAlertsSaving, setLoginAlertsSaving] = useState(false);
  const showLoginAlertsSetupHint = useMemo(
    () => !isLoginAlertsConfigured(currentUser),
    [currentUser],
  );

  const loadMfaStatus = async () => {
    try {
      const payload = await fetchMfaStatus();
      setMfaStatus({
        mfaEnabled: Boolean(payload.mfaEnabled),
        totpEnabled: Boolean(payload.totpEnabled),
        recoveryCodesRemaining: Number(payload.recoveryCodesRemaining || 0),
      });
    } catch (_error) {
      toast.error('Impossible de charger l’état MFA');
    }
  };

  useEffect(() => {
    void loadMfaStatus();
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadLoginAlerts = async () => {
      try {
        const payload = await fetchUserProfile();
        if (!mounted) return;
        const user = payload?.user || currentUser;
        const settings = getLoginAlertsSettings(user);
        setLoginAlertsEnabled(settings.enabled);
        setLoginAlertsUpdatedAt(settings.updatedAt);
        if (user) {
          rememberLoginAlertsChoice(user);
          updateProfile(user);
        }
      } catch (_error) {
        if (!mounted) return;
        const settings = getLoginAlertsSettings(currentUser);
        setLoginAlertsEnabled(settings.enabled);
        setLoginAlertsUpdatedAt(settings.updatedAt);
      }
    };
    void loadLoginAlerts();
    return () => {
      mounted = false;
    };
  }, [currentUser?.id]);

  const handleLoginAlertsChange = async (enabled) => {
    setLoginAlertsEnabled(enabled);
    setLoginAlertsSaving(true);
    try {
      const payload = await updateUserProfileApi({
        profile: buildLoginAlertsProfilePatch(enabled),
      });
      const user = payload?.user;
      if (user) {
        rememberLoginAlertsChoice(user);
        updateProfile(user);
        const settings = getLoginAlertsSettings(user);
        setLoginAlertsUpdatedAt(settings.updatedAt);
      }
      toast.success(enabled ? 'Alertes de connexion activées.' : 'Alertes de connexion désactivées.');
    } catch (_error) {
      const settings = getLoginAlertsSettings(currentUser);
      setLoginAlertsEnabled(settings.enabled);
      toast.error('Impossible de mettre à jour les alertes de connexion.');
    } finally {
      setLoginAlertsSaving(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadSessions = async () => {
      try {
        const payload = await listDossiers();
        if (!mounted) return;
        if (Array.isArray(payload?.dossiers)) {
          setSessions([{
            id: 'session_current',
            label: 'Session actuelle',
            device: 'Navigateur web',
            location: 'Greffio sécurisé',
            createdAt: new Date().toISOString(),
          }]);
        } else {
          setSessions([]);
        }
      } catch (_error) {
        if (!mounted) return;
        setSessions([]);
      }
    };
    void loadSessions();
    return () => {
      mounted = false;
    };
  }, []);

  const startTotpSetup = async () => {
    setLoading(true);
    try {
      const payload = await setupTotp();
      setSetupData(payload);
      setSetupOpen(true);
      setSetupCode('');
      setRecoveryCodes([]);
    } catch (_error) {
      toast.error('Impossible de démarrer la configuration TOTP');
    } finally {
      setLoading(false);
    }
  };

  const confirmTotpSetup = async () => {
    if (setupCode.length !== 6) {
      toast.error('Saisissez le code à 6 chiffres');
      return;
    }
    setLoading(true);
    try {
      const payload = await enableTotp({ code: setupCode });
      setRecoveryCodes(payload.recoveryCodes || []);
      setMfaStatus({
        mfaEnabled: true,
        totpEnabled: true,
        recoveryCodesRemaining: payload.recoveryCodes?.length || 8,
      });
      if (payload.user) updateProfile(payload.user);
      toast.success('Authentification TOTP activée');
    } catch (error) {
      toast.error(error?.message === 'TOTP_CODE_INVALID' ? 'Code incorrect, réessayez.' : 'Activation impossible');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableTotp = async () => {
    if (!disablePassword || disableCode.length !== 6) {
      toast.error('Mot de passe et code TOTP requis');
      return;
    }
    setLoading(true);
    try {
      const payload = await disableTotp({ password: disablePassword, code: disableCode });
      setMfaStatus({ mfaEnabled: false, totpEnabled: false, recoveryCodesRemaining: 0 });
      setRecoveryCodes([]);
      setDisableOpen(false);
      setDisablePassword('');
      setDisableCode('');
      if (payload.user) updateProfile(payload.user);
      toast.success('Authentification TOTP désactivée');
    } catch (error) {
      toast.error(error?.message === 'INVALID_PASSWORD' ? 'Mot de passe incorrect' : 'Désactivation impossible');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateCodes = async () => {
    if (!regenPassword || regenCode.length !== 6) {
      toast.error('Mot de passe et code TOTP requis');
      return;
    }
    setLoading(true);
    try {
      const payload = await regenerateRecoveryCodes({ password: regenPassword, code: regenCode });
      setRecoveryCodes(payload.recoveryCodes || []);
      setMfaStatus((current) => ({
        ...current,
        recoveryCodesRemaining: payload.recoveryCodes?.length || 8,
      }));
      setRegenPassword('');
      setRegenCode('');
      toast.success('Nouveaux codes de secours générés');
    } catch (_error) {
      toast.error('Régénération impossible');
    } finally {
      setLoading(false);
    }
  };

  const handleTotpToggle = () => {
    if (mfaStatus.totpEnabled) {
      setDisableOpen(true);
      return;
    }
    void startTotpSetup();
  };

  const secureSpaces = [
    { label: 'Espace client', text: 'Accès aux dossiers, documents et messages partagés.', active: true },
    { label: 'Espace équipe Greffio', text: 'Back-office de traitement, contrôle et assignation.', active: currentUser?.role === 'TEAM' || currentUser?.role === 'ADMIN' },
    { label: 'Espace professionnel', text: 'Suivi multi-clients pour partenaires et pros autorisés.', active: currentUser?.role === 'PRO' },
  ];
  const mobileShell = isCapacitorNative() || isMobileBrowserViewport();

  const settingsContent = (
    <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <p className="text-sm font-bold uppercase text-primary">Sécurité et compte</p>
            <h1 className="mt-2 text-3xl font-extrabold text-foreground">Paramètres</h1>
            <p className="mt-2 text-sm text-muted-foreground">Gérez le profil, les accès sécurisés et l’authentification multifacteur.</p>
          </div>

          <section className="we-panel p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-extrabold">Profil personnel</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Civilité, coordonnées, adresse, téléphones et préférences sont gérés sur la page dédiée.
                </p>
              </div>
              <Button asChild>
                <Link to="/profil">Ouvrir Mon profil</Link>
              </Button>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
            <div className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <LockKeyhole className="h-6 w-6 text-primary" />
                  <div>
                    <h2 className="text-xl font-extrabold">Authentification multifacteur</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Protège les accès aux dossiers sensibles et au coffre documentaire.</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${mfaStatus.mfaEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {mfaStatus.mfaEnabled ? 'Activée' : 'À activer'}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {securityMethods.map((method) => {
                  const active = method.key === 'totp' && mfaStatus.totpEnabled;
                  return (
                    <button
                      key={method.key}
                      type="button"
                      disabled={!method.available || loading}
                      onClick={() => {
                        if (!method.available) {
                          toast.message('Cette méthode sera disponible prochainement');
                          return;
                        }
                        handleTotpToggle();
                      }}
                      className={`rounded-md border p-4 text-left transition ${active ? 'border-primary bg-secondary' : 'border-border bg-muted hover:border-primary/50'} ${!method.available ? 'opacity-60' : ''}`}
                    >
                      <method.icon className="mb-3 h-5 w-5 text-primary" />
                      <p className="text-sm font-bold">{method.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{method.text}</p>
                      {!method.available && <p className="mt-2 text-xs font-semibold text-primary">Bientôt</p>}
                      {active && <p className="mt-2 text-xs font-semibold text-emerald-700">Active</p>}
                    </button>
                  );
                })}
              </div>

              {setupOpen && setupData && (
                <div className="mt-5 rounded-md border border-primary/30 bg-secondary/40 p-5">
                  <p className="text-sm font-bold">Configurer l’application d’authentification</p>
                  <p className="mt-1 text-xs text-muted-foreground">Scannez le QR code ou saisissez la clé manuelle dans votre application.</p>
                  <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row">
                    <img src={setupData.qrCodeDataUrl} alt="QR code TOTP Greffio" className="rounded-md border border-border bg-white p-2" />
                    <div className="text-sm">
                      <p className="font-semibold">Clé manuelle</p>
                      <code className="mt-2 block break-all rounded bg-white px-3 py-2 text-xs">{setupData.manualSecret}</code>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label>Vérification du code</Label>
                    <InputOTP maxLength={6} value={setupCode} onChange={setSetupCode}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button type="button" onClick={confirmTotpSetup} disabled={loading || setupCode.length !== 6}>
                      Activer TOTP
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setSetupOpen(false)}>Annuler</Button>
                  </div>
                </div>
              )}

              {disableOpen && (
                <div className="mt-5 rounded-md border border-border bg-muted p-5">
                  <p className="text-sm font-bold">Désactiver l’application TOTP</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Mot de passe</Label>
                      <Input type="password" value={disablePassword} onChange={(event) => setDisablePassword(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Code TOTP actuel</Label>
                      <InputOTP maxLength={6} value={disableCode} onChange={setDisableCode}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button type="button" variant="destructive" onClick={handleDisableTotp} disabled={loading}>Désactiver</Button>
                    <Button type="button" variant="outline" onClick={() => setDisableOpen(false)}>Annuler</Button>
                  </div>
                </div>
              )}

              {mfaStatus.totpEnabled && (
                <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
                  <div className="rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
                    Codes de secours restants : <strong>{mfaStatus.recoveryCodesRemaining}</strong>
                  </div>
                  <div className="space-y-2">
                    <Input type="password" value={regenPassword} onChange={(event) => setRegenPassword(event.target.value)} placeholder="Mot de passe" />
                    <InputOTP maxLength={6} value={regenCode} onChange={setRegenCode}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                    <Button type="button" variant="outline" className="w-full bg-white" onClick={handleRegenerateCodes} disabled={loading}>
                      Régénérer les codes
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-md border border-border bg-muted p-4 text-sm leading-6 text-muted-foreground">
                L’application TOTP protège la connexion à Greffio. Conservez vos codes de secours en lieu sûr : chaque code n’est utilisable qu’une seule fois.
              </div>

              {recoveryCodes.length > 0 && (
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
                  <p className="mb-1 text-sm font-bold text-amber-900">Codes de secours – enregistrez-les maintenant</p>
                  <p className="mb-3 text-xs text-amber-800">Ces codes ne seront plus affichés après fermeture de cette page.</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {recoveryCodes.map((code) => (
                      <code key={code} className="rounded bg-white px-3 py-2 text-sm font-bold text-primary">{code}</code>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
              <div className="mb-5 flex items-center gap-3">
                <Bell className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-xl font-extrabold">Alertes de connexion</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Paramètres &gt; Sécurité &gt; Alertes de connexion</p>
                </div>
              </div>
              {showLoginAlertsSetupHint ? (
                <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Souhaitez-vous recevoir des alertes email lors de nouvelles connexions à votre compte ? Par défaut, Greffio les active pour renforcer la sécurité tant qu’aucun choix n’a été enregistré.
                </p>
              ) : null}
              <LoginAlertsToggle
                id="settings-login-alerts"
                enabled={loginAlertsEnabled}
                onEnabledChange={(value) => void handleLoginAlertsChange(value)}
                disabled={loginAlertsSaving}
              />
              {loginAlertsUpdatedAt ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Dernière modification : {new Date(loginAlertsUpdatedAt).toLocaleString('fr-FR')}
                </p>
              ) : null}
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Les tentatives de connexion suspectes bloquées, les changements de mot de passe et les opérations MFA restent notifiés séparément, même si les alertes de connexion sont désactivées.
              </p>
            </div>

            <BiometricUnlockToggle />

            <div className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
              <div className="mb-5 flex items-center gap-3">
                <MonitorCheck className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-extrabold">Sessions actives</h2>
              </div>
              <div className="space-y-3">
                {sessions.length ? sessions.map((session) => (
                  <div key={session.id} className="rounded-md border border-border p-3 text-sm">
                    <p className="font-semibold text-foreground">{session.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {session.device} · {session.location} · {new Date(session.createdAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )) : (
                  <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">Aucune session enregistrée.</div>
                )}
              </div>
              <Button variant="outline" className="mt-5 bg-white" onClick={logout}>Déconnecter les sessions</Button>
            </div>
          </section>

          <section className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-extrabold">Espaces sécurisés</h2>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {secureSpaces.map((space) => (
                <div key={space.label} className="rounded-md border border-border bg-muted p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-bold">{space.label}</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${space.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{space.active ? 'Actif' : 'Sur invitation'}</span>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{space.text}</p>
                </div>
              ))}
            </div>
          </section>
    </div>
  );

  return (
    <div className={cn(
      'flex bg-background',
      mobileShell ? 'min-h-0 flex-1 flex-col' : 'h-[calc(100vh-4rem)] overflow-hidden',
    )}>
      {!mobileShell ? <Sidebar /> : null}
      {mobileShell ? (
        <MobilePageContainer className="pb-8">{settingsContent}</MobilePageContainer>
      ) : (
        <main className="flex-1 overflow-y-auto p-5 md:p-8">{settingsContent}</main>
      )}
    </div>
  );
};
