import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, LayoutDashboard, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.js';
import { IdentityStepUp } from '@/components/auth/IdentityStepUp.jsx';
import { SesamePortalCard } from '@/components/auth/SesamePortalCard.jsx';
import { clearOpsStepUp, isOpsStepUpValid } from '@/lib/auth/opsStepUp.js';
import { canAccessSesameGateway } from '@/lib/auth/postLoginRedirect.js';

const SESAME_SCROLL_CLASS = 'relative min-h-[100dvh] bg-[#021428] text-white';

const decodeResumePath = (raw) => {
  if (!raw) return '/ops';
  try {
    const decoded = decodeURIComponent(raw);
    return decoded.startsWith('/') ? decoded : '/ops';
  } catch (_error) {
    return '/ops';
  }
};

export const SesameGateway = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const [showStepUp, setShowStepUp] = useState(false);
  const [stepUpKey, setStepUpKey] = useState(0);
  const stepUpRef = useRef(null);

  const canAccessOpsPortal = canAccessSesameGateway(currentUser);
  const stepUpRequired = searchParams.get('stepUp') === 'required';
  const resumePath = decodeResumePath(searchParams.get('from'));

  const scrollToStepUp = useCallback(() => {
    window.requestAnimationFrame(() => {
      stepUpRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const revealStepUp = useCallback(() => {
    setStepUpKey((key) => key + 1);
    setShowStepUp(true);
  }, []);

  useEffect(() => {
    if (!showStepUp) return undefined;
    const timer = window.setTimeout(scrollToStepUp, 80);
    return () => window.clearTimeout(timer);
  }, [showStepUp, stepUpKey, scrollToStepUp]);

  useEffect(() => {
    if (stepUpRequired && canAccessOpsPortal) {
      if (isOpsStepUpValid()) {
        clearOpsStepUp();
      }
      revealStepUp();
    }
  }, [stepUpRequired, canAccessOpsPortal, revealStepUp]);

  const openClientSpace = () => {
    navigate('/dashboard', { replace: true });
  };

  const openOpsPortal = () => {
    if (!canAccessOpsPortal) return;
    if (isOpsStepUpValid()) {
      navigate('/ops', { replace: true });
      return;
    }
    revealStepUp();
  };

  const handleStepUpSuccess = () => {
    setShowStepUp(false);
    navigate(resumePath.startsWith('/ops') ? resumePath : '/ops', { replace: true });
  };

  if (currentUser && !canAccessOpsPortal) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className={SESAME_SCROLL_CLASS}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(147,197,253,0.16),transparent_40%),radial-gradient(circle_at_center,rgba(59,130,246,0.18),transparent_45%)]" />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-6xl flex-col justify-center px-4 py-10 sm:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
            <Sparkles className="h-7 w-7" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">Greffio</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Sésame</h1>
          <p className="mt-3 text-lg text-white/75">Choisis ton espace</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <SesamePortalCard
            title="Espace Client"
            subtitle="Sandbox"
            description="Explorer, tester, simuler."
            icon={LayoutDashboard}
            onClick={openClientSpace}
          />
          <SesamePortalCard
            title="Cockpit Ops"
            subtitle="Accès protégé"
            description="Piloter, superviser, intervenir."
            icon={Building2}
            onClick={openOpsPortal}
            locked={!canAccessOpsPortal}
            disabled={!canAccessOpsPortal}
          />
        </div>
      </div>

      {showStepUp ? (
        <div
          id="sesame-step-up"
          ref={stepUpRef}
          className="relative z-10 scroll-mt-4 border-t border-white/10 bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.12),transparent_65%)]"
        >
          <IdentityStepUp
            key={stepUpKey}
            layout="inline"
            user={currentUser}
            onCancel={() => setShowStepUp(false)}
            onSuccess={handleStepUpSuccess}
          />
        </div>
      ) : null}
    </div>
  );
};
