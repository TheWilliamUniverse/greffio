import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { runtimeConfig } from '@/config/runtime.js';
import { isCapacitorNative } from '@/utils/platform.js';

const fetchRemoteVersion = async () => {
  try {
    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/app-version`, { cache: 'no-store' });
    if (!response.ok) return null;
    return response.json();
  } catch (_error) {
    return null;
  }
};

export const GreffioVersionCard = ({ compact = false }) => {
  const [remote, setRemote] = useState(null);
  const [nativeInfo, setNativeInfo] = useState(null);

  useEffect(() => {
    void fetchRemoteVersion().then(setRemote);
    if (!isCapacitorNative()) return;
    void import('@capacitor/app').then(({ App }) => App.getInfo()).then((info) => {
      setNativeInfo(info);
    }).catch(() => {});
  }, []);

  const versionLabel = nativeInfo?.version || remote?.latestVersionName || import.meta.env.VITE_APP_VERSION || 'Web';
  const buildLabel = nativeInfo?.build || remote?.latestVersionCode || '–';
  const changelogUrl = runtimeConfig.playStoreUrl;

  if (compact) {
    return (
      <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm">
        <p className="font-semibold text-foreground">Greffio {versionLabel}</p>
        <p className="text-xs text-muted-foreground">Build {buildLabel}</p>
        <a
          href={changelogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary"
        >
          Quoi de neuf
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-white p-5 shadow-elevation-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">À propos de Greffio</p>
      <h2 className="mt-1 text-lg font-extrabold text-foreground">Version {versionLabel}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Build {buildLabel}
        {isCapacitorNative() ? ' · Application native' : ' · Espace web'}
      </p>
      {remote?.changelog?.length ? (
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {remote.changelog.slice(0, 3).map((line) => (
            <li key={line}>• {line}</li>
          ))}
        </ul>
      ) : null}
      <a
        href={changelogUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
      >
        Voir les nouveautés
        <ExternalLink className="h-4 w-4" />
      </a>
    </section>
  );
};
