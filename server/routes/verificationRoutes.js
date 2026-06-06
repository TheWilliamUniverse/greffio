import { Router } from 'express';
import { requireAuth } from '../authMiddleware.js';
import { resolveDossierAccess } from '../utils/dossierAccess.js';
import {
  getVerificationProfile,
  listVerificationChecks,
  runDossierVerification,
} from '../services/verification/verificationEngine.js';
import { getCompanyBySiren as searchPublicCompany, searchEnterprise } from '../services/verification/providers/enterpriseSearchProvider.js';
import { normalizeAddress } from '../services/verification/providers/addressProvider.js';
import { validateSiren, validateSiret } from '../services/verification/verificationRules.js';

const router = Router();

router.post('/company/search', requireAuth, async (req, res) => {
  const { query, siren } = req.body || {};
  const result = await searchEnterprise({ query, siren });
  return res.json({ ok: result.ok, ...result });
});

router.post('/company/check', requireAuth, async (req, res) => {
  const { siren, siret } = req.body || {};
  if (siret) {
    const siretCheck = validateSiret(siret);
    if (!siretCheck.ok) return res.status(400).json({ ok: false, ...siretCheck });
  }
  const sirenValue = siren || (siret ? String(siret).replace(/\D/g, '').slice(0, 9) : null);
  const sirenCheck = validateSiren(sirenValue);
  if (!sirenCheck.ok) return res.status(400).json({ ok: false, ...sirenCheck });
  const company = await searchPublicCompany(sirenCheck.siren);
  return res.json({ ok: company.ok, company: company.company, error: company.error });
});

router.post('/address/check', requireAuth, async (req, res) => {
  const result = await normalizeAddress(req.body || {});
  return res.json({ ok: result.ok, ...result });
});

router.post('/dossier/:dossierId/run', requireAuth, async (req, res) => {
  const access = await resolveDossierAccess(req, req.params.dossierId);
  if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });
  const questionnaire = access.dossier.dataJson ? JSON.parse(access.dossier.dataJson) : {};
  const result = await runDossierVerification({
    dossier: access.dossier,
    questionnaire,
    userId: req.auth.sub,
  });
  return res.json({ ok: true, ...result });
});

router.get('/dossier/:dossierId/profile', requireAuth, async (req, res) => {
  const access = await resolveDossierAccess(req, req.params.dossierId);
  if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });
  const profile = await getVerificationProfile(access.dossier.id);
  return res.json({ ok: true, profile });
});

router.get('/dossier/:dossierId/checks', requireAuth, async (req, res) => {
  const access = await resolveDossierAccess(req, req.params.dossierId);
  if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });
  const checks = await listVerificationChecks(access.dossier.id);
  return res.json({ ok: true, checks });
});

export default router;
