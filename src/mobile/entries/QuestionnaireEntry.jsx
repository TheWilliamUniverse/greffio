import {
  LazyMobilePaymentPage,
  LazyPaymentPage,
  LazyQuestionnairePage,
  withSuspense,
} from '@/routes/lazyPages.jsx';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { useMobileSafeBottomPadding } from '@/hooks/useMobileSafeBottomPadding.js';

const MobileQuestionnaireShell = ({ children }) => {
  const bottomPad = useMobileSafeBottomPadding({ hasBottomNav: true });
  return <div className={bottomPad || 'pb-[env(safe-area-inset-bottom)]'}>{children}</div>;
};

export const QuestionnaireEntry = () => {
  if (isCapacitorNative() || isMobileBrowserViewport()) {
    return (
      <MobileQuestionnaireShell>
        {withSuspense(LazyQuestionnairePage, 'Chargement du questionnaire…')}
      </MobileQuestionnaireShell>
    );
  }
  return withSuspense(LazyQuestionnairePage, 'Chargement du questionnaire…');
};
