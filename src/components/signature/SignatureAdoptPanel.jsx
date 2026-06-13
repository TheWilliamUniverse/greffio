import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileSignature, PenLine, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { MobileStickyFormActions } from '@/mobile/ui/MobileStickyFormActions.jsx';
import { triggerMobileHaptic } from '@/utils/mobileHaptics.js';

const SIGNATURE_FONT = '"Segoe Script", "Brush Script MT", cursive';

const setupCanvas = (canvas) => {
  if (!canvas) return;
  const ratio = Math.max(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth || 420;
  const height = 90;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0f172a';
};

export const SignatureAdoptPanel = ({
  defaultName = '',
  defaultEmail = '',
  consentText = '',
  subtitle = 'Signature électronique simple Greffio (SES)',
  onCancel,
  onConfirm,
  loading = false,
  errorMessage = '',
}) => {
  const [fullName, setFullName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [mode, setMode] = useState('generated');
  const [consent, setConsent] = useState(false);
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  const previewName = useMemo(() => fullName.trim() || 'Votre signature', [fullName]);

  useEffect(() => {
    if (mode !== 'drawn') return undefined;
    setupCanvas(canvasRef.current);
    const onResize = () => setupCanvas(canvasRef.current);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [mode]);

  const getPoint = (event, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = event.clientX ?? event.touches?.[0]?.clientX ?? 0;
    const clientY = event.clientY ?? event.touches?.[0]?.clientY ?? 0;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (event) => {
    event.preventDefault?.();
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawing.current = true;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPoint(event, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (event) => {
    if (!drawing.current) return;
    event.preventDefault?.();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPoint(event, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    drawing.current = false;
  };

  const getSignatureImage = () => {
    if (mode !== 'drawn') return null;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  };

  const handleConfirm = () => {
    void triggerMobileHaptic('medium');
    onConfirm({
      signerFullName: fullName.trim(),
      signerEmail: email.trim(),
      consent: true,
      signatureImagePngBase64: getSignatureImage(),
    });
  };

  return (
    <div className="flex max-h-[min(92dvh,760px)] flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-elevation-md">
      <div className="border-b border-border bg-[#f6f8fc] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white">
            <FileSignature className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base font-extrabold text-foreground">Signer ce document</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 pt-5">
        <div className="space-y-3">
          <div>
            <Label htmlFor="sig-name">Nom complet *</Label>
            <Input
              id="sig-name"
              className="mt-1 h-11 rounded-xl text-base"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="sig-email">Email *</Label>
            <Input
              id="sig-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              className="mt-1 h-11 rounded-xl text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {[
            { key: 'generated', label: 'Automatique', icon: Sparkles },
            { key: 'drawn', label: 'Dessiner', icon: PenLine },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${
                mode === key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-white text-muted-foreground'
              }`}
              onClick={() => setMode(key)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-dashed border-primary/30 bg-[#f6f8fc] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Aperçu</p>
          {mode === 'generated' ? (
            <p className="mt-3 text-3xl text-[hsl(var(--greffio-blue-900))]" style={{ fontFamily: SIGNATURE_FONT }}>
              {previewName}
            </p>
          ) : (
            <canvas
              ref={canvasRef}
              height={90}
              className="mt-2 h-[90px] w-full cursor-crosshair touch-none rounded-xl border border-border bg-white"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
          )}
        </div>

        <label className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-white p-3 text-sm leading-6 text-muted-foreground">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
          <span>
            {consentText || 'J\'ai lu le document, mes informations sont exactes et j\'accepte que ma signature simple soit enregistrée dans Greffio avec horodatage et preuve d\'intégrité.'}
          </span>
        </label>

        {errorMessage ? (
          <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{errorMessage}</p>
        ) : null}
      </div>

      <MobileStickyFormActions
        fixed={false}
        className="border-t border-border bg-white"
        innerClassName="[&_button]:h-12 [&_button]:flex-1 [&_button]:rounded-2xl sm:[&_button]:flex-none"
      >
        <Button type="button" variant="outline" className="bg-white" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          type="button"
          className="font-bold"
          disabled={loading || !consent || !fullName.trim() || !email.includes('@')}
          onClick={handleConfirm}
        >
          {loading ? 'Signature…' : 'Signer le document'}
        </Button>
      </MobileStickyFormActions>
    </div>
  );
};
