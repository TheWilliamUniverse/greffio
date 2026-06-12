import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { WizardNavButtons } from '@/components/WizardNavButtons.jsx';
import { SeoHead, buildFaqJsonLd } from '@/components/seo/SeoHead.jsx';
import { LegalFormComparatorIntro } from '@/components/comparator/LegalFormComparatorIntro.jsx';
import { LegalFormDisclaimer } from '@/components/comparator/LegalFormDisclaimer.jsx';
import { LegalFormProgressHeader } from '@/components/comparator/LegalFormProgressHeader.jsx';
import { LegalFormQuestionStep } from '@/components/comparator/LegalFormQuestionStep.jsx';
import { LegalFormResultPanel } from '@/components/comparator/LegalFormResultPanel.jsx';
import { LegalFormComparisonTable } from '@/components/comparator/LegalFormComparisonTable.jsx';
import { LegalFormGlossary } from '@/components/comparator/LegalFormGlossary.jsx';
import { LegalFormFaq } from '@/components/comparator/LegalFormFaq.jsx';
import { LegalFormComparatorSidebar } from '@/components/comparator/LegalFormComparatorSidebar.jsx';
import { LEGAL_FORM_COMPARATOR_QUESTIONS, LEGAL_FORM_FAQ } from '@/config/legalFormComparator.js';
import { computeRecommendations } from '@/utils/legalFormComparatorEngine.js';
import { isMobileBrowserViewport } from '@/utils/platform.js';
import { runtimeConfig } from '@/config/runtime.js';
import { cn } from '@/lib/utils';

const PAGE_PATH = '/ressources/comparateur-forme-juridique';

export const LegalFormComparatorPage = () => {
  const [phase, setPhase] = useState('intro');
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const tableRef = useRef(null);
  const isMobile = isMobileBrowserViewport();

  const questions = LEGAL_FORM_COMPARATOR_QUESTIONS;
  const stepLabels = useMemo(
    () => questions.map((q, index) => `Étape ${index + 1}`),
    [questions],
  );

  const currentQuestion = questions[currentStep];
  const canContinue = Boolean(currentQuestion && answers[currentQuestion.id]);
  const showReferenceSections = phase === 'intro' || phase === 'result';

  const faqJsonLd = useMemo(
    () => buildFaqJsonLd(
      LEGAL_FORM_FAQ.map(({ question, answer }) => ({ question, answer })),
      `${runtimeConfig.appUrl}${PAGE_PATH}`,
    ),
    [],
  );

  const handleStart = useCallback(() => {
    setPhase('questions');
    setCurrentStep(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleScrollToTable = useCallback(() => {
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleAnswer = useCallback((value) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  }, [currentQuestion]);

  const finishQuestionnaire = useCallback((finalAnswers) => {
    const computed = computeRecommendations(finalAnswers);
    setResult(computed);
    setPhase('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleContinue = useCallback(() => {
    if (!canContinue) return;
    if (currentStep >= questions.length - 1) {
      finishQuestionnaire(answers);
      return;
    }
    setCurrentStep((step) => step + 1);
  }, [answers, canContinue, currentStep, finishQuestionnaire, questions.length]);

  const handleBack = useCallback(() => {
    if (currentStep <= 0) {
      setPhase('intro');
      return;
    }
    setCurrentStep((step) => step - 1);
  }, [currentStep]);

  const handleRestart = useCallback(() => {
    setPhase('intro');
    setCurrentStep(0);
    setAnswers({});
    setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className={cn(
      'min-h-screen bg-[hsl(var(--we-bg))]',
      isMobile ? 'simulator-mobile overflow-x-hidden' : 'bg-background',
    )}
    >
      <SeoHead
        title="Comparateur de forme juridique — SAS, SARL, EI, SCI | Greffio"
        description="Comparez SASU, SAS, SARL, EURL, micro-entreprise, EI et SCI selon votre projet. Questionnaire guidé, recommandation indicative et parcours Greffio adapté."
        path={PAGE_PATH}
        jsonLd={faqJsonLd}
        jsonLdId="comparator-faq"
      />

      {!isMobile ? (
        <header className="border-b border-border bg-white px-6 py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <GreffioLogo variant="full" to="/" />
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="rounded-full font-bold">
                <Link to="/ressources">
                  <ArrowLeft className="h-4 w-4" />
                  Ressources
                </Link>
              </Button>
              <Button asChild size="sm" className="rounded-full font-extrabold">
                <Link to="/simulateur">
                  Démarrer
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </header>
      ) : null}

      <main className={cn(
        'mx-auto min-w-0 px-4 py-6',
        isMobile ? 'max-w-3xl pb-28' : 'max-w-7xl px-6 py-10 pb-12',
      )}
      >
        <div className={cn(
          'grid min-w-0 gap-8',
          !isMobile && (phase === 'intro' || phase === 'questions') && 'lg:grid-cols-[minmax(0,1fr)_320px]',
        )}
        >
          <div className={cn('min-w-0', !isMobile && phase === 'questions' && 'lg:max-w-3xl')}>
            {phase === 'intro' ? (
              <LegalFormComparatorIntro
                onStart={handleStart}
                onScrollToTable={handleScrollToTable}
                isMobile={isMobile}
              />
            ) : null}

            {phase === 'questions' && currentQuestion ? (
              <div className="min-w-0">
                <LegalFormProgressHeader
                  currentStep={currentStep}
                  totalSteps={questions.length}
                  stepLabels={stepLabels}
                  isMobile={isMobile}
                />
                {!isMobile ? <LegalFormDisclaimer className="mb-4" compact /> : null}
                <LegalFormQuestionStep
                  question={currentQuestion}
                  value={answers[currentQuestion.id]}
                  onChange={handleAnswer}
                  isMobile={isMobile}
                />
                <div
                  className={
                    isMobile
                      ? 'fixed inset-x-0 bottom-[var(--bottom-nav-height-web,4.75rem)] z-30 border-t border-border bg-white/95 px-4 py-3 backdrop-blur-sm'
                      : 'mt-6'
                  }
                >
                  <WizardNavButtons
                    variant={isMobile ? 'mobile' : 'default'}
                    onBack={handleBack}
                    onContinue={handleContinue}
                    continueDisabled={!canContinue}
                    continueLabel={currentStep >= questions.length - 1 ? 'Voir mon résultat' : 'Continuer'}
                    backLabel={currentStep === 0 ? 'Introduction' : 'Retour'}
                  />
                </div>
              </div>
            ) : null}

            {phase === 'result' ? (
              <LegalFormResultPanel result={result} onRestart={handleRestart} />
            ) : null}
          </div>

          {!isMobile && (phase === 'intro' || phase === 'questions') ? (
            <LegalFormComparatorSidebar onScrollToTable={handleScrollToTable} />
          ) : null}
        </div>

        {showReferenceSections ? (
          <div ref={tableRef} className={cn('min-w-0', phase === 'intro' ? 'mt-14' : 'mt-16')}>
            <LegalFormComparisonTable />
            <LegalFormGlossary />
            <LegalFormFaq />
            <LegalFormDisclaimer className="mt-10" />
          </div>
        ) : null}
      </main>
    </div>
  );
};
