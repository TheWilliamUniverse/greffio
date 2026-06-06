import crypto from 'node:crypto';
import { hasPostgres, query, sqlite } from '../../dbClient.js';
import {
  computeCompleteness,
  detectDossierInconsistencies,
  validateEmailSyntax,
  validateSiren,
  validateSiret,
} from './verificationRules.js';
import { mergeRiskLevel, scoreIssues } from './scoring/riskScoring.js';
import { getCompanyBySiren as searchPublicCompany } from './providers/enterpriseSearchProvider.js';
import { normalizeAddress } from './providers/addressProvider.js';
import { getCompanyBySiren as getPappersCompany, isPappersAvailable } from './providers/pappersProvider.js';

const makeId = () => crypto.randomUUID();

const insertCheck = async (entry) => {
  const id = makeId();
  const now = new Date().toISOString();
  const payload = {
    id,
    dossier_id: entry.dossierId,
    user_id: entry.userId || null,
    subject_type: entry.subjectType || 'dossier',
    subject_id: entry.subjectId || entry.dossierId,
    check_type: entry.checkType,
    provider: entry.provider,
    status: entry.status,
    score: entry.score ?? null,
    result_json: JSON.stringify(entry.result || {}),
    error_code: entry.errorCode || null,
    error_message: entry.errorMessage || null,
    created_at: now,
  };
  if (hasPostgres) {
    await query(
      `INSERT INTO verification_checks (
        id, dossier_id, user_id, subject_type, subject_id, check_type, provider, status, score, result_json, error_code, error_message, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      Object.values(payload),
    );
  } else {
    sqlite.prepare(`
      INSERT INTO verification_checks (
        id, dossier_id, user_id, subject_type, subject_id, check_type, provider, status, score, result_json, error_code, error_message, created_at
      ) VALUES (@id,@dossier_id,@user_id,@subject_type,@subject_id,@check_type,@provider,@status,@score,@result_json,@error_code,@error_message,@created_at)
    `).run(payload);
  }
  return { id, ...entry, createdAt: now };
};

const upsertProfile = async ({
  dossierId,
  userId,
  riskLevel,
  completenessScore,
  companyStatus,
  manualReviewRequired,
}) => {
  const now = new Date().toISOString();
  const id = makeId();
  if (hasPostgres) {
    await query(
      `INSERT INTO verification_profiles (id, dossier_id, user_id, risk_level, completeness_score, company_status, manual_review_required, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (dossier_id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         risk_level = EXCLUDED.risk_level,
         completeness_score = EXCLUDED.completeness_score,
         company_status = EXCLUDED.company_status,
         manual_review_required = EXCLUDED.manual_review_required,
         updated_at = EXCLUDED.updated_at`,
      [id, dossierId, userId || null, riskLevel, completenessScore, companyStatus, manualReviewRequired ? 1 : 0, now],
    );
  } else {
    sqlite.prepare(`
      INSERT INTO verification_profiles (id, dossier_id, user_id, risk_level, completeness_score, company_status, manual_review_required, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(dossier_id) DO UPDATE SET
        user_id = excluded.user_id,
        risk_level = excluded.risk_level,
        completeness_score = excluded.completeness_score,
        company_status = excluded.company_status,
        manual_review_required = excluded.manual_review_required,
        updated_at = excluded.updated_at
    `).run(id, dossierId, userId || null, riskLevel, completenessScore, companyStatus, manualReviewRequired ? 1 : 0, now);
  }
};

export const listVerificationChecks = async (dossierId) => {
  if (hasPostgres) {
    const result = await query(
      'SELECT * FROM verification_checks WHERE dossier_id = $1 ORDER BY created_at DESC LIMIT 50',
      [dossierId],
    );
    return result.rows.map((row) => ({
      ...row,
      result: JSON.parse(row.result_json || '{}'),
    }));
  }
  return sqlite.prepare(
    'SELECT * FROM verification_checks WHERE dossier_id = ? ORDER BY created_at DESC LIMIT 50',
  ).all(dossierId).map((row) => ({
    ...row,
    result: JSON.parse(row.result_json || '{}'),
  }));
};

export const getVerificationProfile = async (dossierId) => {
  if (hasPostgres) {
    const result = await query('SELECT * FROM verification_profiles WHERE dossier_id = $1 LIMIT 1', [dossierId]);
    return result.rows[0] || null;
  }
  return sqlite.prepare('SELECT * FROM verification_profiles WHERE dossier_id = ? LIMIT 1').get(dossierId) || null;
};

export const runDossierVerification = async ({ dossier, questionnaire = {}, userId } = {}) => {
  const dossierId = dossier?.id;
  if (!dossierId) throw new Error('DOSSIER_REQUIRED');

  const issues = detectDossierInconsistencies({ dossier, questionnaire });
  const checks = [];

  const emailCheck = validateEmailSyntax(questionnaire.email || dossier.email);
  checks.push(await insertCheck({
    dossierId,
    userId,
    checkType: 'email_syntax',
    provider: 'greffio-local',
    status: emailCheck.ok ? 'PASS' : 'FAIL',
    score: emailCheck.ok ? 0 : 10,
    result: emailCheck,
    errorCode: emailCheck.ok ? null : emailCheck.code,
    errorMessage: emailCheck.ok ? null : emailCheck.message,
  }));
  if (!emailCheck.ok) issues.push({ code: emailCheck.code, weight: 10, message: emailCheck.message });

  const sirenRaw = questionnaire.siren || questionnaire.companySiren || dossier.siren;
  if (sirenRaw) {
    const sirenCheck = validateSiren(sirenRaw);
    checks.push(await insertCheck({
      dossierId,
      userId,
      checkType: 'siren_luhn',
      provider: 'greffio-local',
      status: sirenCheck.ok ? 'PASS' : 'FAIL',
      result: sirenCheck,
      errorCode: sirenCheck.ok ? null : sirenCheck.code,
      errorMessage: sirenCheck.ok ? null : sirenCheck.message,
    }));
    if (!sirenCheck.ok) issues.push({ code: sirenCheck.code, weight: 25, message: sirenCheck.message });

    const companyLookup = await searchPublicCompany(sirenCheck.siren || sirenRaw);
    checks.push(await insertCheck({
      dossierId,
      userId,
      checkType: 'company_public_lookup',
      provider: 'api-recherche-entreprises',
      status: companyLookup.ok ? 'PASS' : 'WARN',
      result: companyLookup,
      errorCode: companyLookup.ok ? null : companyLookup.error,
    }));
    if (!companyLookup.ok) issues.push({ code: 'COMPANY_NOT_FOUND', weight: 30, message: 'Entreprise introuvable dans le registre public.' });

    if (isPappersAvailable()) {
      const pappers = await getPappersCompany(sirenCheck.siren || sirenRaw);
      checks.push(await insertCheck({
        dossierId,
        userId,
        checkType: 'company_pappers_lookup',
        provider: 'pappers',
        status: pappers.ok ? 'PASS' : 'WARN',
        result: pappers,
      }));
    }
  }

  const siretRaw = questionnaire.siret || dossier.siret;
  if (siretRaw) {
    const siretCheck = validateSiret(siretRaw);
    checks.push(await insertCheck({
      dossierId,
      userId,
      checkType: 'siret_luhn',
      provider: 'greffio-local',
      status: siretCheck.ok ? 'PASS' : 'FAIL',
      result: siretCheck,
    }));
    if (!siretCheck.ok) issues.push({ code: siretCheck.code, weight: 25, message: siretCheck.message });
  }

  const addressCheck = await normalizeAddress({
    address: questionnaire.adresseSiege || questionnaire.address || dossier.address,
    postcode: questionnaire.codePostal || dossier.postalCode,
    city: questionnaire.city || questionnaire.villeSiege || dossier.city,
  });
  checks.push(await insertCheck({
    dossierId,
    userId,
    checkType: 'address_ban',
    provider: 'ban',
    status: addressCheck.ok ? 'PASS' : 'WARN',
    result: addressCheck,
  }));
  if (!addressCheck.ok) issues.push({ code: 'ADDRESS_MISMATCH', weight: 15, message: 'Adresse non confirmée par la Base Adresse Nationale.' });

  const completeness = computeCompleteness(dossier, questionnaire);
  checks.push(await insertCheck({
    dossierId,
    userId,
    checkType: 'completeness',
    provider: 'greffio-local',
    status: completeness.score >= 70 ? 'PASS' : 'WARN',
    score: completeness.score,
    result: completeness,
  }));

  const risk = scoreIssues(issues);
  await upsertProfile({
    dossierId,
    userId,
    riskLevel: risk.riskLevel,
    completenessScore: completeness.score,
    companyStatus: sirenRaw ? 'CHECKED' : 'NOT_CHECKED',
    manualReviewRequired: risk.riskLevel === 'HIGH' || risk.riskLevel === 'BLOCKING',
  });

  return {
    checks,
    profile: await getVerificationProfile(dossierId),
    risk,
    completeness,
    disclaimer: 'Ces vérifications automatisées ne constituent pas une certification juridique ni une validation officielle.',
  };
};
