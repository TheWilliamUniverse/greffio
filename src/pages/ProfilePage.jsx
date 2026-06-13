import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Bell,
  Globe,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar.jsx';
import { BirthDateMinorEncouragement } from '@/components/BirthDateMinorEncouragement.jsx';
import { ProfileSection } from '@/components/profile/ProfileSection.jsx';
import { AddressAutocomplete } from '@/components/profile/AddressAutocomplete.jsx';
import { PhoneNumbersField } from '@/components/profile/PhoneNumbersField.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { useAuth } from '@/hooks/useAuth.js';
import { GreffioVersionCard } from '@/components/system/GreffioVersionCard.jsx';
import { MobilePageContainer } from '@/mobile/ui/MobilePageContainer.jsx';
import { fetchUserProfile, updateUserProfileApi } from '@/api/profile.js';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { cn } from '@/lib/utils.js';
import {
  CIVILITY_OPTIONS,
  CONTACT_CHANNEL_OPTIONS,
  LANGUAGE_OPTIONS,
  createPhoneEntry,
  getCivilityAvatar,
  mergeUserProfile,
  profileFromUser,
  sanitizePhones,
  validateProfileForm,
} from '@/utils/userProfile.js';

const fieldClass = 'rounded-xl';

export const ProfilePage = () => {
  const { currentUser, updateProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    profile: mergeUserProfile(null, {}),
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const payload = await fetchUserProfile();
        if (!mounted) return;
        const user = payload?.user || currentUser;
        setForm({
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          email: user?.email || '',
          profile: profileFromUser(user),
        });
      } catch (_error) {
        if (!mounted) return;
        setForm({
          firstName: currentUser?.firstName || '',
          lastName: currentUser?.lastName || '',
          email: currentUser?.email || '',
          profile: profileFromUser(currentUser),
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [currentUser]);

  const avatar = useMemo(
    () => getCivilityAvatar(form.profile.civility),
    [form.profile.civility],
  );
  const mobileShell = isCapacitorNative() || isMobileBrowserViewport();
  const stickySaveBottomClass = isCapacitorNative()
    ? 'bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))]'
    : 'bottom-[calc(var(--bottom-nav-height-web)+env(safe-area-inset-bottom))]';

  const patchProfile = (patch) => {
    setForm((current) => ({
      ...current,
      profile: mergeUserProfile(current.profile, patch),
    }));
  };

  const handleSave = async () => {
    const validation = validateProfileForm({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phones: form.profile.phones,
      address: form.profile.address,
    });
    setErrors(validation);
    if (Object.keys(validation).length) {
      toast.error('Corrigez les champs signalés avant enregistrement.');
      return;
    }

    const phones = sanitizePhones(
      form.profile.phones?.length ? form.profile.phones : [createPhoneEntry({ isPrimary: true })],
    );

    try {
      setSaving(true);
      const payload = await updateUserProfileApi({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        profile: { ...form.profile, phones },
      });
      const user = payload?.user;
      if (user) {
        updateProfile(user);
        setForm({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          profile: profileFromUser(user),
        });
      }
      toast.success('Profil enregistré avec succès.');
    } catch (error) {
      const details = error?.payload?.details || {};
      if (Object.keys(details).length) setErrors(details);
      toast.error('Enregistrement impossible. Vérifiez vos informations.');
    } finally {
      setSaving(false);
    }
  };

  const pageBody = (
    <>
      <div className={cn(
        'mx-auto max-w-4xl space-y-6',
        mobileShell ? '' : 'px-4 py-6 md:px-8 md:py-8',
      )}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-primary">Compte</p>
              <h1 className="mt-1 text-3xl font-extrabold text-foreground">Mon profil</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Personnalisez vos informations personnelles. Elles alimentent vos dossiers, vos échanges avec l&apos;équipe Greffio et vos notifications.
              </p>
            </div>
            <Button
              type="button"
              size="lg"
              className="hidden sm:inline-flex"
              onClick={() => void handleSave()}
              disabled={loading || saving}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </Button>
          </div>

          {loading ? (
            <div className="we-panel p-8 text-sm text-muted-foreground">Chargement de votre profil…</div>
          ) : (
            <>
              <ProfileSection
                id="identite"
                icon={UserRound}
                title="Identité"
                description="Vos informations d’identification pour vos démarches."
              >
                <div className="flex flex-col gap-6 md:flex-row md:items-start">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-extrabold shadow-elevation-sm ${avatar.className}`} aria-hidden="true">
                      {form.firstName?.charAt(0) || avatar.label}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{avatar.caption}</p>
                      <p className="text-xs text-muted-foreground">Badge visuel – pas de photo de profil.</p>
                    </div>
                  </div>
                  <div className="grid flex-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="civility">Civilité</Label>
                      <select
                        id="civility"
                        className={`${fieldClass} flex h-10 w-full border border-input bg-white px-3 text-sm font-medium`}
                        value={form.profile.civility}
                        onChange={(event) => patchProfile({ civility: event.target.value })}
                      >
                        <option value="">Sélectionner</option>
                        {CIVILITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom <span className="text-destructive">*</span></Label>
                      <Input id="firstName" className={fieldClass} value={form.firstName} onChange={(e) => setForm((c) => ({ ...c, firstName: e.target.value }))} />
                      {errors.firstName ? <p className="text-xs text-destructive">{errors.firstName}</p> : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom <span className="text-destructive">*</span></Label>
                      <Input id="lastName" className={fieldClass} value={form.lastName} onChange={(e) => setForm((c) => ({ ...c, lastName: e.target.value }))} />
                      {errors.lastName ? <p className="text-xs text-destructive">{errors.lastName}</p> : null}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="birthDate">Date de naissance</Label>
                      <Input
                        id="birthDate"
                        type="date"
                        className={fieldClass}
                        value={form.profile.birthDate || ''}
                        onChange={(event) => patchProfile({ birthDate: event.target.value })}
                      />
                      <BirthDateMinorEncouragement birthDate={form.profile.birthDate || ''} />
                    </div>
                  </div>
                </div>
              </ProfileSection>

              <ProfileSection
                id="coordonnees"
                icon={Mail}
                title="Coordonnées"
                description="Comment l’équipe Greffio vous contacte."
              >
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" className={fieldClass} value={form.email} disabled />
                  <p className="text-xs text-muted-foreground">L’email de connexion est géré par le support Greffio.</p>
                </div>
                <div className="pt-2">
                  <div className="mb-3 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
                    <p className="text-sm font-semibold">Téléphones</p>
                  </div>
                  <PhoneNumbersField
                    phones={form.profile.phones}
                    onChange={(phones) => patchProfile({ phones })}
                    errors={errors}
                  />
                </div>
              </ProfileSection>

              <ProfileSection
                id="adresse"
                icon={MapPin}
                title="Adresse personnelle"
                description="Recherche assistée puis complétion manuelle si besoin."
              >
                <AddressAutocomplete
                  address={form.profile.address}
                  onChange={(address) => patchProfile({ address })}
                  errors={errors}
                />
              </ProfileSection>

              <ProfileSection
                id="preferences"
                icon={Bell}
                title="Préférences"
                description="Langue, canal de contact et notifications."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="language"><Globe className="mr-1 inline h-4 w-4" />Langue</Label>
                    <select
                      id="language"
                      className={`${fieldClass} flex h-10 w-full border border-input bg-white px-3 text-sm font-medium`}
                      value={form.profile.preferences.language}
                      onChange={(event) => patchProfile({ preferences: { ...form.profile.preferences, language: event.target.value } })}
                    >
                      {LANGUAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactChannel">Préférence de contact</Label>
                    <select
                      id="contactChannel"
                      className={`${fieldClass} flex h-10 w-full border border-input bg-white px-3 text-sm font-medium`}
                      value={form.profile.preferences.contactChannel}
                      onChange={(event) => patchProfile({ preferences: { ...form.profile.preferences, contactChannel: event.target.value } })}
                    >
                      {CONTACT_CHANNEL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { key: 'email', label: 'Notifications par email' },
                    { key: 'sms', label: 'Notifications par SMS' },
                    { key: 'dossierUpdates', label: 'Mises à jour de dossier' },
                    { key: 'emailReminders', label: 'Relances si action requise' },
                    { key: 'marketing', label: 'Actualités Greffio' },
                  ].map((item) => (
                    <label key={item.key} className="interactive-hover flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--we-border)] bg-white p-4">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-border"
                        checked={Boolean(form.profile.preferences.notifications[item.key])}
                        onChange={(event) => patchProfile({
                          preferences: {
                            ...form.profile.preferences,
                            notifications: {
                              ...form.profile.preferences.notifications,
                              [item.key]: event.target.checked,
                            },
                          },
                        })}
                      />
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4">
                  <Label htmlFor="emailDigest">Fréquence des emails dossier</Label>
                  <select
                    id="emailDigest"
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--we-border)] bg-white px-3 text-sm"
                    value={form.profile.preferences.notifications.emailDigest || 'immediate'}
                    onChange={(event) => patchProfile({
                      preferences: {
                        ...form.profile.preferences,
                        notifications: {
                          ...form.profile.preferences.notifications,
                          emailDigest: event.target.value,
                        },
                      },
                    })}
                  >
                    <option value="immediate">À chaque étape importante</option>
                    <option value="weekly">Résumé hebdomadaire uniquement</option>
                  </select>
                </div>
              </ProfileSection>

              <ProfileSection
                id="securite"
                icon={ShieldCheck}
                title="Sécurité du compte"
                description="Mot de passe, authentification renforcée et sessions."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="interactive-hover rounded-xl border border-[var(--we-border)] bg-white p-4">
                    <div className="flex items-center gap-2">
                      <LockKeyhole className="h-4 w-4 text-primary" />
                      <p className="font-semibold">Mot de passe</p>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Réinitialisez votre mot de passe par email sécurisé.</p>
                    <Button asChild variant="outline" className="mt-4 bg-white">
                      <Link to="/settings">Changer mon mot de passe</Link>
                    </Button>
                  </div>
                  <div className="interactive-hover rounded-xl border border-[var(--we-border)] bg-white p-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <p className="font-semibold">Authentification & sessions</p>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Double authentification et sessions connectées – bientôt disponibles.</p>
                    <Button asChild variant="outline" className="mt-4 bg-white">
                      <Link to="/settings">Paramètres de sécurité</Link>
                    </Button>
                  </div>
                </div>
              </ProfileSection>

              <GreffioVersionCard />
            </>
          )}
        </div>

      {mobileShell ? (
        <div className={cn(
          'fixed inset-x-0 z-40 border-t border-[var(--we-border)] bg-white/95 p-4 shadow-[0_-8px_30px_rgba(10,18,32,0.08)]',
          stickySaveBottomClass,
        )}>
          <Button type="button" size="lg" className="w-full" onClick={() => void handleSave()} disabled={loading || saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </Button>
        </div>
      ) : (
        <div className={cn(
          'fixed inset-x-0 z-40 border-t border-[var(--we-border)] bg-white/95 p-4 shadow-[0_-8px_30px_rgba(10,18,32,0.08)] sm:hidden',
          stickySaveBottomClass,
        )}>
          <Button type="button" size="lg" className="w-full" onClick={() => void handleSave()} disabled={loading || saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </Button>
        </div>
      )}
    </>
  );

  return (
    <div className={cn(
      'flex overflow-x-hidden bg-[var(--we-bg)]',
      mobileShell ? 'min-h-0 flex-1 flex-col' : 'min-h-[calc(100vh-4rem)]',
    )}>
      {!mobileShell ? <Sidebar /> : null}
      {mobileShell ? (
        <MobilePageContainer className="pb-36">{pageBody}</MobilePageContainer>
      ) : (
        <main className="flex-1 overflow-y-auto pb-28 md:pb-10">{pageBody}</main>
      )}
    </div>
  );
};
