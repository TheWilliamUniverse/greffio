import React from 'react';
import { QuestionnaireNotice } from '@/components/questionnaire/QuestionnaireNotice.jsx';

export const SecurityNotice = () => (
  <QuestionnaireNotice variant="security" title="Vos données sont en sécurité">
    Elles sont utilisées uniquement pour préparer, déposer, suivre et régulariser votre formalité auprès des organismes compétents.
  </QuestionnaireNotice>
);
