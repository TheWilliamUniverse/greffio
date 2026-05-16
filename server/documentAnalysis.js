import fs from 'node:fs';
import pdfParse from 'pdf-parse';

const normalize = (text) => String(text || '').toLowerCase();

const classifyIdentityDocument = (text) => {
  const normalized = normalize(text);
  const identityHits = [
    'carte nationale',
    "carte d'identite",
    'republique francaise',
    'passeport',
    'passport',
    'nationalite',
    'date de naissance',
  ].filter((needle) => normalized.includes(needle)).length;
  return identityHits >= 2;
};

const extractIdentitySignals = (text) => {
  const normalized = normalize(text);
  const scoreBase = [
    normalized.includes('carte nationale') ? 25 : 0,
    normalized.includes("carte d'identite") ? 25 : 0,
    normalized.includes('passport') || normalized.includes('passeport') ? 25 : 0,
    normalized.includes('date de naissance') ? 15 : 0,
    normalized.includes('nationalite') ? 10 : 0,
  ].reduce((sum, value) => sum + value, 0);
  const confidence = Math.max(0, Math.min(100, scoreBase));
  return {
    docCategory: classifyIdentityDocument(text) ? 'identity_document' : 'unclassified',
    confidence,
    requiresManualReview: confidence < 60,
  };
};

const analyzeDocument = async ({
  filePath,
  docKey,
}) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return {
      ok: false,
      error: 'FILE_NOT_FOUND_FOR_ANALYSIS',
    };
  }
  const pdfBuffer = fs.readFileSync(filePath);
  const parsed = await pdfParse(pdfBuffer);
  const text = String(parsed?.text || '').slice(0, 40000);
  const base = {
    charsAnalyzed: text.length,
    pages: Number(parsed?.numpages || 0),
  };
  if (docKey === 'identity_proof') {
    const signals = extractIdentitySignals(text);
    return {
      ok: true,
      analysisType: 'identity_check',
      ...base,
      ...signals,
    };
  }
  return {
    ok: true,
    analysisType: 'generic_readability',
    ...base,
    docCategory: 'general_document',
    confidence: text.length > 200 ? 70 : 40,
    requiresManualReview: text.length <= 200,
  };
};

export {
  analyzeDocument,
};
