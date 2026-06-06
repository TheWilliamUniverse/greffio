const RISK_RULES = [
  { code: 'COMPANY_NOT_FOUND', weight: 30 },
  { code: 'SIRET_CLOSED', weight: 25 },
  { code: 'ADDRESS_MISMATCH', weight: 15 },
  { code: 'IDENTITY_NAME_MISMATCH', weight: 35 },
  { code: 'SANCTIONS_POSSIBLE_MATCH', weight: 80 },
  { code: 'PEP_POSSIBLE_MATCH', weight: 40 },
  { code: 'MULTIPLE_ACCOUNTS_SAME_COMPANY', weight: 20 },
  { code: 'PAYMENT_FAILED_RETRY', weight: 10 },
  { code: 'DOCUMENT_TAMPER_SUSPECTED', weight: 50 },
  { code: 'FORMALITY_FORM_MISMATCH', weight: 20 },
  { code: 'EMAIL_MISSING', weight: 10 },
  { code: 'SIREN_LUHN_FAILED', weight: 25 },
  { code: 'SIRET_LUHN_FAILED', weight: 25 },
];

const ruleMap = new Map(RISK_RULES.map((rule) => [rule.code, rule.weight]));

export const scoreIssues = (issues = []) => {
  const score = issues.reduce((total, issue) => total + (ruleMap.get(issue.code) || issue.weight || 5), 0);
  const capped = Math.max(0, Math.min(100, score));
  let riskLevel = 'LOW';
  if (capped >= 80) riskLevel = 'BLOCKING';
  else if (capped >= 51) riskLevel = 'HIGH';
  else if (capped >= 21) riskLevel = 'MEDIUM';
  return { score: capped, riskLevel };
};

export const mergeRiskLevel = (current = 'LOW', next = 'LOW') => {
  const order = ['LOW', 'MEDIUM', 'HIGH', 'BLOCKING'];
  return order[Math.max(order.indexOf(current), order.indexOf(next))] || 'LOW';
};
