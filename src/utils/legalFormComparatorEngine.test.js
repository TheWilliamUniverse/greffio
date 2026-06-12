import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computeRecommendations } from './legalFormComparatorEngine.js';

const soloTechAnswers = {
  founders_count: 'solo',
  activity_type: 'saas_startup',
  revenue_12m: 'under_203100',
  expenses_level: 'medium',
  fundraising: 'maybe_later',
  risk_level: 'medium',
  image_priority: 'premium',
  admin_tolerance: 'advanced',
  social_preference: 'better_protection',
  profit_distribution: 'maybe',
  timeline: 'this_month',
};

const multiStartupAnswers = {
  founders_count: 'two',
  activity_type: 'saas_startup',
  revenue_12m: 'under_203100',
  expenses_level: 'medium',
  fundraising: 'yes_short_term',
  risk_level: 'medium',
  image_priority: 'premium',
  admin_tolerance: 'advanced',
  social_preference: 'better_protection',
  profit_distribution: 'maybe',
  timeline: 'now',
};

const soloSimpleAnswers = {
  founders_count: 'solo',
  activity_type: 'freelance_services',
  revenue_12m: 'under_15000',
  expenses_level: 'low',
  fundraising: 'no',
  risk_level: 'low',
  image_priority: 'basic',
  admin_tolerance: 'minimal',
  social_preference: 'low_contributions',
  profit_distribution: 'no',
  timeline: 'exploring',
};

const soloClassicAnswers = {
  founders_count: 'solo',
  activity_type: 'craft',
  revenue_12m: 'under_83600',
  expenses_level: 'medium',
  fundraising: 'no',
  risk_level: 'medium',
  image_priority: 'professional',
  admin_tolerance: 'moderate',
  social_preference: 'low_contributions',
  profit_distribution: 'no',
  timeline: 'this_month',
};

const familyCommerceAnswers = {
  founders_count: 'two',
  activity_type: 'commerce',
  revenue_12m: 'under_203100',
  expenses_level: 'medium',
  fundraising: 'no',
  risk_level: 'medium',
  image_priority: 'professional',
  admin_tolerance: 'moderate',
  social_preference: 'low_contributions',
  profit_distribution: 'no',
  timeline: 'this_month',
};

const realEstateAnswers = {
  founders_count: 'two',
  activity_type: 'real_estate',
  revenue_12m: 'unknown',
  expenses_level: 'low',
  fundraising: 'no',
  risk_level: 'medium',
  image_priority: 'professional',
  admin_tolerance: 'moderate',
  social_preference: 'no_preference',
  profit_distribution: 'no',
  timeline: 'exploring',
};

const nonProfitAnswers = {
  founders_count: 'three_plus',
  activity_type: 'non_profit',
  revenue_12m: 'under_50000',
  expenses_level: 'low',
  fundraising: 'no',
  risk_level: 'low',
  image_priority: 'basic',
  admin_tolerance: 'minimal',
  social_preference: 'no_preference',
  profit_distribution: 'no',
  timeline: 'exploring',
};

test('solo tech startup → SASU', () => {
  const { primary } = computeRecommendations(soloTechAnswers);
  assert.equal(primary.formKey, 'sasu');
});

test('multi startup with fundraising → SAS', () => {
  const { primary } = computeRecommendations(multiStartupAnswers);
  assert.equal(primary.formKey, 'sas');
});

test('solo simple low charges → micro', () => {
  const { primary } = computeRecommendations(soloSimpleAnswers);
  assert.equal(primary.formKey, 'micro');
});

test('solo classic activity TNS → EURL or EI', () => {
  const { primary } = computeRecommendations(soloClassicAnswers);
  assert.ok(['eurl', 'ei'].includes(primary.formKey));
});

test('family commerce multi-associates → SARL', () => {
  const { primary } = computeRecommendations(familyCommerceAnswers);
  assert.equal(primary.formKey, 'sarl');
});

test('real estate with partners → SCI', () => {
  const { primary } = computeRecommendations(realEstateAnswers);
  assert.equal(primary.formKey, 'sci');
});

test('non profit → association', () => {
  const { primary } = computeRecommendations(nonProfitAnswers);
  assert.equal(primary.formKey, 'association_1901');
});

test('short-term fundraising solo → SASU', () => {
  const { primary } = computeRecommendations({
    ...soloTechAnswers,
    fundraising: 'yes_short_term',
  });
  assert.ok(['sasu', 'sas'].includes(primary.formKey));
});

test('regulated liberal → special case alert', () => {
  const { specialCases } = computeRecommendations({
    ...soloClassicAnswers,
    activity_type: 'regulated_liberal',
  });
  assert.ok(specialCases.some((item) => /SEL|SCP|SCM/i.test(item)));
});

test('agricultural → GAEC/EARL/SCEA alert', () => {
  const { specialCases } = computeRecommendations({
    ...soloClassicAnswers,
    activity_type: 'agricultural',
  });
  assert.ok(specialCases.some((item) => /GAEC|EARL|SCEA/i.test(item)));
});
