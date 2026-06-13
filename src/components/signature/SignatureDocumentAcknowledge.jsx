import React from 'react';
import { FileCheck2 } from 'lucide-react';

export const SignatureDocumentAcknowledge = ({
  checked,
  onChange,
  className = '',
}) => (
  <label
    className={[
      'group relative mt-4 flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition-all duration-300',
      checked
        ? 'border-emerald-400/55 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(52,211,153,0.15)]'
        : 'border-amber-300/45 bg-amber-400/[0.07] shadow-[0_0_24px_rgba(251,191,36,0.08)] animate-[signature-doc-ack_2.6s_ease-in-out_infinite]',
      className,
    ].filter(Boolean).join(' ')}
  >
    <input
      type="checkbox"
      className="mt-1 size-4 shrink-0 rounded border-white/30 accent-emerald-400"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="flex items-center gap-2 text-sm font-semibold leading-snug text-white">
        <FileCheck2
          className={[
            'size-4 shrink-0 transition-colors duration-300',
            checked ? 'text-emerald-300' : 'text-amber-200',
          ].join(' ')}
          aria-hidden
        />
        J’ai consulté le document et je souhaite le signer.
      </span>
      {!checked ? (
        <span className="text-xs leading-relaxed text-amber-100/80">
          Cochez cette case après lecture du PDF pour débloquer la signature.
        </span>
      ) : (
        <span className="text-xs leading-relaxed text-emerald-100/85">
          Document lu – vous pouvez poursuivre la signature.
        </span>
      )}
    </span>
    <style>{`
      @keyframes signature-doc-ack {
        0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.08); }
        50% { box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.12); }
      }
    `}</style>
  </label>
);
