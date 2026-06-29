import React, { useEffect, useMemo, useState } from 'react';
import { Banknote, Percent } from 'lucide-react';
import { Slider } from '@/components/ui/slider.jsx';
import { SegmentedChoice } from '@/components/questionnaire/SegmentedChoice.jsx';
import { MobileChoiceTile } from '@/components/questionnaire/MobileChoiceStep.jsx';
import { MobileCompositeStep } from '@/components/questionnaire/MobileCompositeStep.jsx';
import { cn } from '@/lib/utils.js';
import { lightQuestionnaireHaptic } from '@/utils/questionnaireHaptics.js';

const PARTIAL_MIN = 50;
const PARTIAL_MAX = 95;
const PARTIAL_STEP = 5;

export const parseLiberationPercentValue = (value) => {
  if (value == null || value === '') return null;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toLowerCase() === 'autre') return null;
  const normalized = trimmed.replace('%', '').replace(',', '.').trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < PARTIAL_MIN || parsed > 100) return null;
  return Math.round(parsed);
};

const formatEuro = (amount) => (
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
);

const formatPercentLabel = (percent) => `${percent} %`;

const parseCapitalAmount = (capital) => {
  const normalized = String(capital || '').replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const clampPartialPercent = (percent) => {
  const rounded = Math.round(Number(percent) / PARTIAL_STEP) * PARTIAL_STEP;
  return Math.min(PARTIAL_MAX, Math.max(PARTIAL_MIN, rounded || PARTIAL_MIN));
};

const resolveMode = (value) => {
  const parsed = parseLiberationPercentValue(value);
  if (parsed === 100) return 'full';
  if (parsed != null && parsed < 100) return 'partial';
  return '';
};

export const CapitalLiberationPicker = ({
  value = '',
  capitalAmount = '',
  onChange,
  onAdvance,
  mobilePresentation = false,
  kicker = '',
  label = 'Libération du capital',
  required = true,
  progressPercent,
  stepCurrent,
  stepTotal,
  className,
}) => {
  const capitalNum = parseCapitalAmount(capitalAmount);
  const parsed = parseLiberationPercentValue(value);
  const initialMode = resolveMode(value);
  const [mode, setMode] = useState(initialMode);
  const [partialPercent, setPartialPercent] = useState(
    parsed != null && parsed < 100 ? clampPartialPercent(parsed) : PARTIAL_MIN,
  );

  useEffect(() => {
    const nextParsed = parseLiberationPercentValue(value);
    const nextMode = resolveMode(value);
    setMode(nextMode);
    if (nextParsed != null && nextParsed < 100) {
      setPartialPercent(clampPartialPercent(nextParsed));
    }
  }, [value]);

  const releasedAmount = useMemo(() => {
    if (!capitalNum) return null;
    const percent = mode === 'full' ? 100 : partialPercent;
    return Math.round((capitalNum * percent) / 100);
  }, [capitalNum, mode, partialPercent]);

  const applyFull = () => {
    void lightQuestionnaireHaptic();
    setMode('full');
    onChange?.('100 %');
    if (mobilePresentation) onAdvance?.();
  };

  const applyPartial = (nextPercent = partialPercent) => {
    void lightQuestionnaireHaptic();
    const clamped = clampPartialPercent(nextPercent);
    setMode('partial');
    setPartialPercent(clamped);
    onChange?.(formatPercentLabel(clamped));
  };

  const summaryLine = capitalNum && releasedAmount != null
    ? `Sur ${formatEuro(capitalNum)} de capital → ${formatEuro(releasedAmount)} libérés à la constitution.`
    : 'Indiquez d’abord le montant du capital pour visualiser le montant libéré.';

  const sliderBlock = mode === 'partial' ? (
    <div className="mt-4 space-y-4 rounded-2xl border border-[#d4e2f5] bg-[#f7faff] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">Taux de libération</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-extrabold text-primary">
          <Percent className="h-3.5 w-3.5" aria-hidden />
          {partialPercent} %
        </span>
      </div>
      <Slider
        min={PARTIAL_MIN}
        max={PARTIAL_MAX}
        step={PARTIAL_STEP}
        value={[partialPercent]}
        onValueChange={([next]) => applyPartial(next)}
        aria-label="Pourcentage de libération du capital"
      />
      <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>{PARTIAL_MIN} % min.</span>
        <span>100 % = intégral</span>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{summaryLine}</p>
    </div>
  ) : null;

  if (mobilePresentation) {
    return (
      <MobileCompositeStep
        kicker={kicker}
        title={`${label}${required ? ' *' : ''}`}
        subtitle="À la constitution, quelle part du capital en numéraire est libérée ?"
        hint={mode === 'full' ? 'Libération intégrale sélectionnée.' : 'Ajustez le curseur puis appuyez sur Continuer.'}
        progressPercent={progressPercent}
        stepCurrent={stepCurrent}
        stepTotal={stepTotal}
        className={className}
      >
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <MobileChoiceTile
            title="Libération intégrale"
            description="100 % du capital libéré dès la constitution"
            icon={Banknote}
            selected={mode === 'full'}
            onSelect={applyFull}
            compact
          />
          <MobileChoiceTile
            title="Libération partielle"
            description={`Entre ${PARTIAL_MIN} % et ${PARTIAL_MAX} % (minimum légal)`}
            icon={Percent}
            selected={mode === 'partial'}
            onSelect={() => applyPartial(PARTIAL_MIN)}
            compact
          />
        </div>
        {sliderBlock}
        {mode === 'partial' ? (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
              onClick={() => {
                void lightQuestionnaireHaptic();
                onAdvance?.();
              }}
            >
              Continuer
            </button>
          </div>
        ) : null}
      </MobileCompositeStep>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <p className="text-base font-semibold text-foreground">
          {label}{required ? ' *' : ''}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          À la constitution, quelle part du capital en numéraire est libérée ?
        </p>
      </div>
      <SegmentedChoice
        options={[
          { key: 'full', label: 'Libération intégrale (100 %)' },
          { key: 'partial', label: 'Libération partielle (50 % à 95 %)' },
        ]}
        value={mode}
        onChange={(nextMode) => {
          if (nextMode === 'full') applyFull();
          else applyPartial(PARTIAL_MIN);
        }}
      />
      {sliderBlock}
      {mode === 'full' ? (
        <p className="rounded-xl border border-[#d4e2f5] bg-[#f7faff] px-4 py-3 text-sm text-muted-foreground">
          {summaryLine}
        </p>
      ) : null}
    </div>
  );
};
