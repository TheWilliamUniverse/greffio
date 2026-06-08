import fs from 'node:fs';
import PDFParser from 'pdf2json';

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

const extractIdentityFields = (text) => {
  const lines = String(text || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const firstNameLine = lines.find((line) => /prenom|prénom/i.test(line));
  const lastNameLine = lines.find((line) => /\bnom\b/i.test(line));
  const dobLine = lines.find((line) => /date de naissance/i.test(line));
  const idNumberMatch = String(text || '').match(/\b([A-Z0-9]{8,14})\b/);
  return {
    firstName: firstNameLine ? firstNameLine.split(':').slice(1).join(':').trim() : null,
    lastName: lastNameLine ? lastNameLine.split(':').slice(1).join(':').trim() : null,
    birthDate: dobLine ? (dobLine.match(/\d{2}[\/.-]\d{2}[\/.-]\d{4}/)?.[0] || null) : null,
    idNumber: idNumberMatch?.[1] || null,
  };
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

const safeDecodePdfRun = (value) => {
  const raw = String(value || '');
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch (_error) {
    try {
      return decodeURIComponent(raw.replace(/%(?![0-9A-Fa-f]{2})/g, '%25'));
    } catch (_fallbackError) {
      return raw;
    }
  }
};

const extractPdfText = async (pdfBuffer) => new Promise((resolve, reject) => {
  const parser = new PDFParser(null, 1);
  parser.on('pdfParser_dataError', (errorData) => {
    reject(new Error(errorData?.parserError || 'PDF_PARSE_FAILED'));
  });
  parser.on('pdfParser_dataReady', (pdfData) => {
    try {
      const pages = Array.isArray(pdfData?.Pages) ? pdfData.Pages : [];
      const text = pages
        .flatMap((page) => (Array.isArray(page.Texts) ? page.Texts : []))
        .flatMap((item) => (Array.isArray(item.R) ? item.R : []))
        .map((run) => safeDecodePdfRun(run.T))
        .join(' ');
      resolve({
        text,
        numpages: pages.length,
      });
    } catch (error) {
      reject(error);
    }
  });
  parser.parseBuffer(pdfBuffer);
});

const analyzeDocument = async ({
  filePath,
  pdfBuffer,
  docKey,
  dossierId = null,
}) => {
  try {
    let buffer = pdfBuffer;
    if (!buffer) {
      if (!filePath || !fs.existsSync(filePath)) {
        return {
          ok: false,
          error: 'FILE_NOT_FOUND_FOR_ANALYSIS',
          requiresManualReview: true,
        };
      }
      buffer = fs.readFileSync(filePath);
    }
    const parsed = await extractPdfText(buffer);
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
        extractedText: text.slice(0, 3500),
        extractedIdentity: extractIdentityFields(text),
        ...signals,
      };
    }
    return {
      ok: true,
      analysisType: 'generic_readability',
      ...base,
      extractedText: text.slice(0, 3500),
      docCategory: 'general_document',
      confidence: text.length > 200 ? 70 : 40,
      requiresManualReview: text.length <= 200,
    };
  } catch (error) {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      event: 'PDF_ANALYSIS_FAILED',
      dossierId,
      docKey,
      message: error?.message || String(error),
    }));
    return {
      ok: false,
      error: error?.message || 'PDF_ANALYSIS_FAILED',
      analysisType: 'generic_readability',
      requiresManualReview: true,
    };
  }
};

export {
  analyzeDocument,
};
