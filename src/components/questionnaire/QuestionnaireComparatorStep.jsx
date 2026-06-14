import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { LegalFormComparatorPromoCard } from '@/components/comparator/LegalFormComparatorPromoCard.jsx';
import { MobileChoiceStep } from '@/components/questionnaire/MobileChoiceStep.jsx';

export const QuestionnaireComparatorStep = ({
  progressPercent,
  stepCurrent,
  stepTotal,
  onIgnore,
  mobilePresentation = false,
}) => {
  const ignoreButton = (
    <button
      type="button"
      onClick={onIgnore}
      className="mt-4 w-full text-center text-xs font-semibold text-muted-foreground underline underline-offset-2"
    >
      Ignorer pour l&apos;instant
    </button>
  );

  if (mobilePresentation) {
    return (
      <div className="flex min-h-[min(58vh,520px)] w-full flex-col">
        <MobileChoiceStep
          kicker="Structure"
          title="Comparez les formes avant de choisir"
          subtitle="Le comparateur Greffio vous guide pas à pas, comme sur le simulateur."
          progressPercent={progressPercent}
          stepCurrent={stepCurrent}
          stepTotal={stepTotal}
          gridClassName="grid grid-cols-1 gap-3"
        >
          <LegalFormComparatorPromoCard variant="gridTile" className="min-h-[112px]" />
          <Link
            to="/simulateur?type=creation"
            className="group flex min-h-[88px] flex-col justify-between rounded-2xl border border-[#d4e2f5] bg-white p-4 text-left shadow-[0_2px_12px_rgba(15,31,61,0.05)] transition hover:border-primary/30 hover:shadow-[0_12px_32px_rgba(15,31,61,0.1)]"
          >
            <div>
              <p className="text-sm font-extrabold text-[hsl(var(--greffio-blue-900))]">Simulateur Greffio</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Estimez charges, parcours et prochaines étapes avant de constituer le dossier.
              </p>
            </div>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">
              Ouvrir le simulateur
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </MobileChoiceStep>
        {ignoreButton}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-muted-foreground">
        Vous pouvez comparer les formes juridiques ou ouvrir le simulateur avant de poursuivre le dossier.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <LegalFormComparatorPromoCard variant="gridTile" className="min-h-[112px]" />
        <Link
          to="/simulateur?type=creation"
          className="group flex min-h-[112px] flex-col justify-between rounded-2xl border border-[#d4e2f5] bg-white p-4 text-left shadow-[0_2px_12px_rgba(15,31,61,0.05)] transition hover:border-primary/30"
        >
          <div>
            <p className="text-sm font-extrabold text-[hsl(var(--greffio-blue-900))]">Simulateur Greffio</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Estimez charges et parcours avant de finaliser votre choix.
            </p>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">
            Ouvrir le simulateur
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>
      {ignoreButton}
    </div>
  );
};
