import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, LockKeyhole, Mail, MonitorCheck, ShieldCheck, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar.jsx';
import { useAuth } from '@/hooks/useAuth.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { getSecuritySettings, saveSecuritySettings } from '@/utils/localStorage.js';
import { listDossiers } from '@/api/dossiers.js';
import { useEffect } from 'react';

const securityMethods = [
  { icon: Smartphone, key: 'totpEnabled', label: 'Application TOTP', text: 'Google Authenticator, Microsoft Authenticator, 1Password.' },
  { icon: Mail, key: 'emailCodeEnabled', label: 'Code email', text: 'Code à usage unique lié à l’adresse du compte.' },
  { icon: KeyRound, key: 'smsEnabled', label: 'Code SMS', text: 'Code court envoyé sur le téléphone de secours.' },
];

export const SettingsPage = () => {
  const { currentUser, logout } = useAuth();
  const [security, setSecurity] = useState(getSecuritySettings());
  const [recoveryCodes, setRecoveryCodes] = useState(security.recoveryCodes || []);
  const [sessions, setSessions] = useState([]);
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

  const updateSecurity = (updates) => {
    const next = {
      ...security,
      ...updates,
      mfaEnabled: Boolean(updates.totpEnabled ?? security.totpEnabled)
        || Boolean(updates.smsEnabled ?? security.smsEnabled)
        || Boolean(updates.emailCodeEnabled ?? security.emailCodeEnabled),
      updatedAt: new Date().toISOString(),
    };
    setSecurity(next);
    saveSecuritySettings(next);
    toast.success('Paramètres de sécurité enregistrés');
  };

  const generateRecoveryCodes = () => {
    const codes = Array.from({ length: 8 }, () => (
      `GRF-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    ));
    const next = {
      ...security,
      recoveryCodes: codes,
      recoveryCodesGenerated: true,
      updatedAt: new Date().toISOString(),
    };
    setSecurity(next);
    setRecoveryCodes(codes);
    saveSecuritySettings(next);
    toast.success('Codes de secours générés');
  };

  const secureSpaces = [
    { label: 'Espace client', text: 'Accès aux dossiers, documents et messages partagés.', active: true },
    { label: 'Espace équipe Greffio', text: 'Back-office de traitement, contrôle et assignation.', active: currentUser?.role === 'TEAM' },
    { label: 'Espace professionnel', text: 'Suivi multi-clients pour partenaires et pros autorisés.', active: currentUser?.role === 'PRO' },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-5 md:p-8">
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
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${security.mfaEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {security.mfaEnabled ? 'Activée' : 'À activer'}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {securityMethods.map((method) => (
                  <button
                    key={method.key}
                    type="button"
                    onClick={() => updateSecurity({ [method.key]: !security[method.key] })}
                    className={`rounded-md border p-4 text-left transition ${security[method.key] ? 'border-primary bg-secondary' : 'border-border bg-muted hover:border-primary/50'}`}
                  >
                    <method.icon className="mb-3 h-5 w-5 text-primary" />
                    <p className="text-sm font-bold">{method.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{method.text}</p>
                  </button>
                ))}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label>Téléphone de secours</Label>
                  <Input value={security.phone || ''} onChange={(event) => updateSecurity({ phone: event.target.value })} placeholder="+33 6 00 00 00 00" />
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="outline" className="w-full bg-white" onClick={generateRecoveryCodes}>
                    Générer les codes
                  </Button>
                </div>
              </div>

              <div className="mt-5 rounded-md border border-border bg-muted p-4 text-sm leading-6 text-muted-foreground">
                Les méthodes activées protègent les dossiers sensibles, le coffre documentaire et l’espace équipe. Les codes de secours permettent de récupérer l’accès en cas de perte de téléphone.
              </div>

              {recoveryCodes.length > 0 && (
                <div className="mt-4 rounded-md border border-border bg-white p-4">
                  <p className="mb-3 text-sm font-bold">Codes de secours</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {recoveryCodes.map((code) => (
                      <code key={code} className="rounded bg-muted px-3 py-2 text-sm font-bold text-primary">{code}</code>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
      </main>
    </div>
  );
};
