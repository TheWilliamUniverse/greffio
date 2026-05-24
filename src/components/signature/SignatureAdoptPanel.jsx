import React, { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';

const SIGNATURE_FONT = '"Segoe Script", "Brush Script MT", cursive';

export const SignatureAdoptPanel = ({
  defaultName = '',
  defaultEmail = '',
  onCancel,
  onConfirm,
  loading = false,
}) => {
  const [fullName, setFullName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [mode, setMode] = useState('generated');
  const [consent, setConsent] = useState(false);
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  const previewName = useMemo(() => fullName.trim() || 'Votre signature', [fullName]);

  const startDraw = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawing.current = true;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX || event.touches?.[0]?.clientX) - rect.left;
    const y = (event.clientY || event.touches?.[0]?.clientY) - rect.top;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (event) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX || event.touches?.[0]?.clientX) - rect.left;
    const y = (event.clientY || event.touches?.[0]?.clientY) - rect.top;
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

  return (
    <div className="rounded-2xl border border-[#d4e2f5] bg-[#0f172a] p-6 text-white shadow-xl">
      <p className="text-lg font-bold">Adopter votre signature</p>
      <p className="mt-1 text-sm text-white/70">Confirmez votre nom et votre signature électronique.</p>

      <div className="mt-5 space-y-3">
        <div>
          <Label className="text-white/80">Votre nom complet *</Label>
          <Input
            className="mt-1 h-11 border-white/20 bg-white/10 text-white"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-white/80">Email du signataire *</Label>
          <Input
            type="email"
            className="mt-1 h-11 border-white/20 bg-white/10 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {[
          { key: 'generated', label: 'Généré automatiquement' },
          { key: 'drawn', label: 'Dessiner' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`rounded-lg px-3 py-2 text-sm ${mode === tab.key ? 'bg-white text-[#0f172a] font-semibold' : 'bg-white/10 text-white/80'}`}
            onClick={() => setMode(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 min-h-[100px] rounded-xl border border-white/20 bg-black/40 p-4">
        <p className="text-xs uppercase tracking-wide text-white/50">Aperçu de la signature</p>
        {mode === 'generated' ? (
          <p className="mt-3 text-3xl text-white" style={{ fontFamily: SIGNATURE_FONT }}>{previewName}</p>
        ) : (
          <canvas
            ref={canvasRef}
            width={420}
            height={90}
            className="mt-2 w-full cursor-crosshair rounded-lg bg-white"
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

      <label className="mt-4 flex items-start gap-2 text-sm text-white/80">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
        <span>
          En cliquant sur « Signer », je reconnais avoir vérifié les informations du document et j&apos;accepte que ma signature électronique soit apposée sur cette déclaration.
        </span>
      </label>

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="outline" className="border-white/30 bg-transparent text-white" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          type="button"
          disabled={loading || !consent || !fullName.trim() || !email.includes('@')}
          onClick={() => onConfirm({
            signerFullName: fullName.trim(),
            signerEmail: email.trim(),
            consent: true,
            signatureImagePngBase64: getSignatureImage(),
          })}
        >
          {loading ? 'Signature…' : 'Adopter et signer'}
        </Button>
      </div>
    </div>
  );
};
