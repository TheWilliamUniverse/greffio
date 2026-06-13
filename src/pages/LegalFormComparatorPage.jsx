import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react';
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
import { LegalFormEducationCards } from '@/components/comparator/LegalFormEducationCards.jsx';
import { LEGAL_FORM_COMPARATOR_QUESTIONS, LEGAL_FORM_FAQ } from '@/config/legalFormComparator.js';
import { computeRecommendations } from '@/utils/legalFormComparatorEngine.js';
import { isMobileBrowserViewport } from '@/utils/platform.js';
import { runtimeConfig } from '@/config/runtime.js';
import { SEO_PAGE_META } from '@/config/seoContent.js';
import { cn } from '@/lib/utils';

const PAGE_PATH = '/ressources/comparateur-forme-juridique';
const COMPUTING_DELAY_MS = 650;

export const LegalFormComparatorPage = () => {
  const [phase, setPhase] = useState('intro');
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const tableRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const isMobile = isMobileBrowserViewport();

  const questions = LEGAL_FORM_COMPARATOR_QUESTIONS;
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

  const stepTransition = reduceMotion
    ? {}
    : {
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -8 },
      transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
    };

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
    setPhase('computing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => {
      setResult(computeRecommendations(finalAnswers));
      setPhase('result');
    }, COMPUTING_DELAY_MS);
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

  const handleEditAnswers = useCallback(() => {
    setPhase('questions');
    setCurrentStep(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className={cn(
      'min-h-screen bg-[hsl(var(--we-bg))]',
      isMobile && 'simulator-mobile overflow-x-hidden',
    )}
    >
      <SeoHead
        title={SEO_PAGE_META.comparateur.title}
        description={SEO_PAGE_META.comparateur.description}
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
        isMobile ? 'max-w-3xl pb-32' : 'max-w-7xl px-6 py-10 pb-14',
      )}
      >
        <div className={cn(
          'grid min-w-0 gap-8',
          !isMobile && phase === 'questions' && 'lg:grid-cols-[minmax(0,1fr)_320px]',
        )}
        >
          <div className="min-w-0">
            {phase === 'intro' ? (
              <>
                <LegalFormComparatorIntro
                  onStart={handleStart}
                  onScrollToTable={handleScrollToTable}
                  isMobile={isMobile}
                />
                <LegalFormEducationCards className="mt-8" />
              </>
            ) : null}

            {phase === 'questions' && currentQuestion ? (
              <div className="min-w-0">
                <LegalFormProgressHeader
                  currentStep={currentStep}
                  totalSteps={questions.length}
                  isMobile={isMobile}
                />
                <AnimatePresence mode="wait">
                  <motion.div key={currentQuestion.id} {...stepTransition} className="min-w-0">
                    <LegalFormQuestionStep
                      question={currentQuestion}
                      value={answers[currentQuestion.id]}
                      onChange={handleAnswer}
                      isMobile={isMobile}
                    />
                  </motion.div>
                </AnimatePresence>
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

            {phase === 'computing' ? (
              <div
                role="status"
                aria-live="polite"
                className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-white p-8 shadow-elevation-sm"
              >
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" aria-hidden />
                <p className="text-sm font-bold text-[hsl(var(--greffio-blue-900))]">
                  Analyse de vos réponses…
                </p>
                <p className="text-xs text-muted-foreground">
                  Comparaison des formes juridiques selon votre profil.
                </p>
              </div>
            ) : null}

            {phase === 'result' ? (
              <LegalFormResultPanel
                result={result}
                onRestart={handleRestart}
                onEditAnswers={handleEditAnswers}
              />
            ) : null}
          </div>

          {!isMobile && phase === 'questions' ? (
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
