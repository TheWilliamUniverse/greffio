import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Apple, BadgeCheck, Download, LockKeyhole, Mail, Monitor, ShieldCheck, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { SeoHead } from '@/components/seo/SeoHead.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { GooglePlayStoreLink } from '@/components/store/GooglePlayStoreLink.jsx';
import { PublicMinimalLegalFooter } from '@/components/layout/PublicMinimalLegalFooter.jsx';
import { MobileFooter } from '@/mobile/MobileFooter.jsx';
import { isMobileBrowserViewport } from '@/utils/platform.js';
import {
  buildAppDownloadApkUrl,
  getAppDownloadInfo,
  requestAppDownloadCode,
  verifyAppDownloadCode,
} from '@/api/appDownloadAccess.js';
import {
  clearAppDownloadAccess,
  readAppDownloadAccess,
  saveAppDownloadAccess,
} from '@/utils/appDownloadAccessStorage.js';
import { runtimeConfig } from '@/config/runtime.js';
import { getAuthInputClass } from '@/lib/authFormStyles.js';
import { maskEmailFirstFour } from '@/utils/maskEmail.js';

const AUTHORIZED_RECIPIENT_MASKED = maskEmailFirstFour(
  import.meta.env.VITE_APP_DOWNLOAD_RECIPIENT || 'ibtissam@willentreprises.com',
);

const IOS_OPTIONS = [
  {
    title: 'Programme Apple Developer requis',
    text: 'TestFlight et l’App Store nécessitent un compte Apple Developer (99 €/an). Sans ce programme, nous ne pouvons pas distribuer une app iOS signée officiellement.',
  },
  {
    title: 'Alternative immédiate : PWA',
    text: 'Sur iPhone, ouvrez greffio.willentreprises.com dans Safari, connectez-vous, puis « Partager → Sur l’écran d’accueil ». Vous obtenez une icône plein écran sans App Store.',
  },
  {
    title: 'Prochaine étape iOS native',
    text: 'Le projet Capacitor est prêt côté configuration. Dès l’inscription Apple Developer, nous pourrons soumettre l’app native sur TestFlight.',
  },
];

const detectDeviceHint = () => {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'desktop';
};

const formatBytes = (bytes = 0) => {
  if (!bytes) return '–';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} Mo`;
};

export const AppDownloadGatePage = () => {
  const [access, setAccess] = useState(() => readAppDownloadAccess());
  const [code, setCode] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [recipientMasked, setRecipientMasked] = useState('');
  const [downloadInfo, setDownloadInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const authInputClass = getAuthInputClass(false);
  const deviceHint = useMemo(() => detectDeviceHint(), []);

  useEffect(() => {
    const stored = readAppDownloadAccess();
    if (!stored?.accessToken) return;
    void verifyAppDownloadCode({ accessToken: stored.accessToken }).then((payload) => {
      if (payload?.ok) {
        setAccess(stored);
      } else {
        clearAppDownloadAccess();
        setAccess(null);
      }
    }).catch(() => {
      clearAppDownloadAccess();
      setAccess(null);
    });
  }, []);

  useEffect(() => {
    if (!access?.accessToken) {
      setDownloadInfo(null);
      return;
    }
    setLoadingInfo(true);
    void getAppDownloadInfo({ accessToken: access.accessToken })
      .then((payload) => {
        if (payload?.ok) setDownloadInfo(payload);
      })
      .catch(() => {
        setDownloadInfo(null);
      })
      .finally(() => setLoadingInfo(false));
  }, [access?.accessToken]);

  const apkDownloadUrl = access?.accessToken
    ? buildAppDownloadApkUrl({ accessToken: access.accessToken, apiBaseUrl: runtimeConfig.apiBaseUrl })
    : null;

  const handleRequestCode = async () => {
    setRequesting(true);
    try {
      const payload = await requestAppDownloadCode();
      if (!payload?.ok) {
        toast.error('Impossible d’envoyer le code pour le moment.');
        return;
      }
      const masked = payload.recipientMasked || AUTHORIZED_RECIPIENT_MASKED;
      setRecipientMasked(masked);
      toast.success(`Code envoyé à ${masked}.`);
    } catch (_error) {
      toast.error('Envoi impossible. Réessayez dans quelques minutes.');
    } finally {
      setRequesting(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error('Saisissez le code à 6 chiffres.');
      return;
    }
    setVerifying(true);
    try {
      const payload = await verifyAppDownloadCode({ code: code.trim() });
      if (!payload?.ok || !payload.accessToken) {
        const message = payload?.error === 'APP_DOWNLOAD_CODE_EXPIRED'
          ? 'Code expiré – demandez un nouveau code.'
          : payload?.error === 'APP_DOWNLOAD_CODE_LOCKED'
            ? 'Trop de tentatives – demandez un nouveau code.'
            : 'Code incorrect.';
        toast.error(message);
        return;
      }
      saveAppDownloadAccess({
        accessToken: payload.accessToken,
        expiresAt: payload.expiresAt,
      });
      setAccess({ accessToken: payload.accessToken, expiresAt: payload.expiresAt });
      toast.success('Accès autorisé.');
    } catch (_error) {
      toast.error('Vérification impossible.');
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = () => {
    clearAppDownloadAccess();
    setAccess(null);
    setCode('');
    setDownloadInfo(null);
  };

  const installHint = (() => {
    if (deviceHint === 'android') {
      return 'Téléchargez l’APK, ouvrez-le depuis vos notifications ou le gestionnaire de fichiers, puis autorisez l’installation si Android le demande.';
    }
    if (deviceHint === 'ios') {
      return 'L’APK ne s’installe pas sur iPhone. Vous pouvez quand même le télécharger pour le transférer vers un téléphone Android (AirDrop vers Mac + USB, email, Drive…). Sur iPhone, utilisez la PWA ci-dessous.';
    }
    return 'Téléchargez l’APK depuis cet appareil (PC, tablette ou téléphone), puis transférez-le sur un Android par câble USB, email ou Google Drive.';
  })();

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <SeoHead
        title="Téléchargement app Greffio"
        description="Page privée de distribution Greffio."
        path="/telechargement-app"
        noIndex
      />

      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex justify-center">
          <GreffioLogo variant="full" to="/" />
        </div>

        {!access ? (
          <div className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold">Accès privé</h1>
                <p className="text-sm text-muted-foreground">Téléchargement application Greffio</p>
              </div>
            </div>

            <p className="text-sm leading-6 text-muted-foreground">
              Bonjour Ibtissam – cette page n’est pas référencée publiquement. Un code à 6 chiffres est envoyé uniquement à
              {' '}
              <strong>{AUTHORIZED_RECIPIENT_MASKED}</strong>.
            </p>

            <Button
              type="button"
              variant="outline"
              className="mt-5 w-full"
              disabled={requesting}
              onClick={() => void handleRequestCode()}
            >
              <Mail className="h-4 w-4" />
              {requesting ? 'Envoi…' : 'Recevoir un code d’accès'}
            </Button>

            {recipientMasked ? (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Dernier envoi vers {recipientMasked}
              </p>
            ) : null}

            <form className="mt-6 space-y-4 border-t border-border/70 pt-6" onSubmit={handleVerify}>
              <div>
                <Label htmlFor="app-download-code">Code d’accès (6 chiffres)</Label>
                <Input
                  id="app-download-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className={`mt-1 text-center text-lg tracking-[0.35em] ${authInputClass}`}
                />
              </div>
              <Button type="submit" className="w-full" disabled={verifying}>
                <ShieldCheck className="h-4 w-4" />
                {verifying ? 'Vérification…' : 'Accéder au téléchargement'}
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
                    <Download className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-extrabold">Bonjour Ibtissam</h1>
                    <p className="text-sm text-muted-foreground">Téléchargez l’APK Greffio depuis n’importe quel appareil</p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={handleLogout}>
                  Quitter
                </Button>
              </div>

              <section className="rounded-md border border-primary/25 bg-secondary/30 p-4">
                <div className="flex items-start gap-3">
                  <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-extrabold text-[hsl(var(--greffio-blue-900))]">APK Android Greffio</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {loadingInfo
                        ? 'Chargement de la dernière version…'
                        : downloadInfo?.available
                          ? `Version ${downloadInfo.versionName} (build ${downloadInfo.versionCode}) – ${formatBytes(downloadInfo.sizeBytes)}`
                          : 'APK en cours de préparation côté serveur. Réessayez dans quelques minutes ou utilisez le Play Store.'}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{installHint}</p>
                    {apkDownloadUrl && downloadInfo?.available ? (
                      <Button asChild className="mt-4 w-full" size="lg">
                        <a href={apkDownloadUrl} download={downloadInfo.filename || 'greffio.apk'}>
                          <Download className="h-5 w-5" />
                          Télécharger l’APK Greffio
                        </a>
                      </Button>
                    ) : (
                      <Button className="mt-4 w-full" size="lg" disabled>
                        <Download className="h-5 w-5" />
                        APK indisponible pour le moment
                      </Button>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      Ce lien fonctionne depuis n’importe quel appareil (Android, iPhone, ordinateur) tant que votre session est active.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mt-4 rounded-md border border-border/70 bg-[#f6f8fc] p-4">
                <div className="flex items-start gap-3">
                  <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <h2 className="font-extrabold text-[hsl(var(--greffio-blue-900))]">Play Store (alternative)</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Si l’installation directe de l’APK est bloquée, utilisez la fiche Google Play (même compte Greffio).
                    </p>
                    <div className="mt-4">
                      <GooglePlayStoreLink size="mdInline" />
                    </div>
                  </div>
                </div>
              </section>

              <section className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <Apple className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
                  <div>
                    <h2 className="font-extrabold text-amber-950">iPhone / iPad</h2>
                    <p className="mt-1 text-sm text-amber-900/90">
                      Pas d’installation APK sur iOS. Utilisez la web app plein écran :
                    </p>
                    <ul className="mt-3 space-y-3">
                      {IOS_OPTIONS.map((item) => (
                        <li key={item.title} className="text-sm">
                          <p className="font-semibold text-amber-950">{item.title}</p>
                          <p className="text-amber-900/85">{item.text}</p>
                        </li>
                      ))}
                    </ul>
                    <Button asChild variant="outline" className="mt-4 w-full bg-white">
                      <Link to="/app">Installer la web app (PWA)</Link>
                    </Button>
                  </div>
                </div>
              </section>

              <div className="mt-4 grid gap-2">
                {[
                  'Ne pas partager cette URL publiquement.',
                  'Même compte Greffio sur web, Android et future app iOS.',
                  'L’app charge le site live – les mises à jour métier passent par le web.',
                ].map((point) => (
                  <div key={point} className="flex items-center gap-2 text-sm">
                    <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                    {point}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Retour à la connexion
          </Link>
        </div>
      </div>

      {isMobileBrowserViewport() ? <MobileFooter /> : <PublicMinimalLegalFooter />}
    </div>
  );
};
