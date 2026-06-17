import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, LayoutDashboard, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.js';
import { IdentityStepUp } from '@/components/auth/IdentityStepUp.jsx';
import { SESAME_PAGE_CLASS, SesamePortalCard } from '@/components/auth/SesamePortalCard.jsx';
import { isOpsStepUpValid } from '@/lib/auth/opsStepUp.js';

const OPS_PORTAL_ROLES = new Set(['ADMIN', 'OPS']);

export const SesameGateway = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const [showStepUp, setShowStepUp] = useState(false);

  const canAccessOpsPortal = OPS_PORTAL_ROLES.has(String(currentUser?.role || '').toUpperCase());
  const stepUpRequired = searchParams.get('stepUp') === 'required';
  const resumePath = searchParams.get('from') || '/ops';

  useEffect(() => {
    if (stepUpRequired && canAccessOpsPortal) {
      setShowStepUp(true);
    }
  }, [stepUpRequired, canAccessOpsPortal]);

  const openClientSpace = () => {
    navigate('/dashboard', { replace: true });
  };

  const openOpsPortal = () => {
    if (!canAccessOpsPortal) return;
    if (isOpsStepUpValid()) {
      navigate('/ops', { replace: true });
      return;
    }
    setShowStepUp(true);
  };

  const handleStepUpSuccess = () => {
    setShowStepUp(false);
    navigate(resumePath.startsWith('/ops') ? resumePath : '/ops', { replace: true });
  };

  return (
    <div className={SESAME_PAGE_CLASS}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(147,197,253,0.16),transparent_40%),radial-gradient(circle_at_center,rgba(59,130,246,0.18),transparent_45%)]" />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-6xl flex-col justify-center px-4 py-10 sm:px-8">
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
        <IdentityStepUp
          user={currentUser}
          onCancel={() => setShowStepUp(false)}
          onSuccess={handleStepUpSuccess}
        />
      ) : null}
    </div>
  );
};
