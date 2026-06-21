import OpenAI from 'openai';
import { z } from 'zod';
import { readOpenAiKey } from '../../../services/assistant/config.js';
import { documentCompletionConfig } from '../config.js';
import { DOCUMENT_COMPLETION_SECURITIES_RULES } from '../securitiesTerminology.js';

const aiFieldSchema = z.object({
  fields: z.array(z.object({
    pageIndex: z.number().int().nonnegative(),
    type: z.string(),
    label: z.string(),
    placeholder: z.string().optional(),
    bbox: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number().positive(),
      height: z.number().positive(),
      coordinateSystem: z.literal('pdf_points').optional(),
    }),
    confidence: z.number().min(0).max(1),
    reason: z.string(),
    matchedText: z.string().optional(),
    nearbyLabel: z.string().optional(),
    semanticCategory: z.string().optional(),
  })).default([]),
  documentTypeGuess: z.object({
    type: z.string(),
    confidence: z.number(),
    reason: z.string(),
  }).optional(),
  warnings: z.array(z.object({
    code: z.string(),
    message: z.string(),
    severity: z.enum(['info', 'warning', 'critical']).optional(),
  })).optional(),
});

const buildPromptPayload = ({
  fileName,
  pageCount,
  textLayerBlocks,
  existingCandidates,
}) => {
  const compactBlocks = textLayerBlocks.slice(0, 180).map((block) => ({
    pageIndex: block.pageIndex,
    text: block.text?.slice(0, 120),
    bbox: block.bbox,
  }));
  const compactCandidates = existingCandidates.slice(0, 80).map((candidate) => ({
    pageIndex: candidate.pageIndex,
    type: candidate.type,
    label: candidate.label,
    bbox: candidate.bbox,
    confidence: candidate.detection?.confidence,
    source: candidate.detection?.source,
  }));
  return JSON.stringify({
    fileName,
    pageCount,
    textBlocks: compactBlocks,
    existingCandidates: compactCandidates,
  });
};

export const runAiFieldDetection = async ({
  documentId,
  fileName,
  pageCount,
  textLayerBlocks = [],
  ocrBlocks = [],
  existingCandidates = [],
  language = 'fr',
}) => {
  const warnings = [];
  if (!documentCompletionConfig.enableAi) {
    return { fields: [], warnings, provider: 'none' };
  }

  const apiKey = readOpenAiKey();
  if (!apiKey) {
    warnings.push({
      code: 'AI_LOW_CONFIDENCE',
      message: 'Analyse IA indisponible (clé OpenAI absente). Détection par règles uniquement.',
      severity: 'info',
    });
    return { fields: [], warnings, provider: 'none' };
  }

  const mergedBlocks = [
    ...textLayerBlocks,
    ...ocrBlocks.map((block) => ({
      pageIndex: block.pageIndex,
      text: block.text,
      bbox: block.bbox,
    })),
  ];

  const client = new OpenAI({ apiKey });
  const systemPrompt = `
Tu analyses un document administratif français afin d'identifier les zones à compléter par un utilisateur.
Tu reçois du JSON avec des blocs texte, leurs positions approximatives et des candidats déjà détectés.
Retourne UNIQUEMENT du JSON valide avec la forme:
{
  "fields": [
    {
      "pageIndex": 0,
      "type": "text|date|checkbox|signature|siren|siret|email|phone|address|legal_name|unknown",
      "label": "Nom",
      "placeholder": "Nom",
      "bbox": { "x": 100, "y": 200, "width": 180, "height": 18, "coordinateSystem": "pdf_points" },
      "confidence": 0.72,
      "reason": "...",
      "matchedText": "...",
      "nearbyLabel": "...",
      "semanticCategory": "identity|company|address|contact|signature|date|unknown"
    }
  ],
  "documentTypeGuess": { "type": "cerfa|contract|attestation|declaration|unknown", "confidence": 0.7, "reason": "..." },
  "warnings": []
}
Contraintes:
- Ne crée pas de champ sur du texte déjà imprimé non destiné à être rempli.
- Privilégie les champs administratifs français (Cerfa, SIREN, SIRET, RCS, signature, dates).
- Évite les doublons proches des candidats existants.
- Coordonnées en points PDF, origine bas-gauche.
${DOCUMENT_COMPLETION_SECURITIES_RULES}
`.trim();

  try {
    const response = await client.chat.completions.create({
      model: process.env.DOCUMENT_COMPLETION_AI_MODEL || 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: buildPromptPayload({
            fileName,
            pageCount,
            textLayerBlocks: mergedBlocks,
            existingCandidates,
          }),
        },
      ],
      max_tokens: 2500,
    });

    const raw = response.choices?.[0]?.message?.content || '{}';
    const parsed = aiFieldSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      warnings.push({
        code: 'AI_LOW_CONFIDENCE',
        message: 'Réponse IA invalide. Analyse par règles conservée.',
        severity: 'warning',
      });
      return { fields: [], warnings, provider: 'openai' };
    }

    const fields = parsed.data.fields
      .filter((field) => field.confidence >= 0.45)
      .filter((field) => field.pageIndex >= 0 && field.pageIndex < pageCount)
      .map((field) => ({
        pageIndex: field.pageIndex,
        pageNumber: field.pageIndex + 1,
        type: field.type || 'unknown',
        label: field.label,
        placeholder: field.placeholder || field.label,
        bbox: {
          x: Math.max(0, field.bbox.x),
          y: Math.max(0, field.bbox.y),
          width: field.bbox.width,
          height: field.bbox.height,
          coordinateSystem: 'pdf_points',
        },
        detection: {
          source: 'ai_structured_detection',
          confidence: field.confidence,
          reason: field.reason,
          matchedText: field.matchedText,
          nearbyLabel: field.nearbyLabel,
          aiConfidence: field.confidence,
        },
        semantic: {
          category: field.semanticCategory || 'unknown',
        },
      }));

    return {
      fields,
      documentTypeGuess: parsed.data.documentTypeGuess,
      warnings: parsed.data.warnings || warnings,
      provider: 'openai',
    };
  } catch (error) {
    warnings.push({
      code: 'AI_DETECTION_FAILED',
      message: 'Analyse IA indisponible. Détection par règles et OCR conservée.',
      severity: 'warning',
    });
    return { fields: [], warnings, provider: 'openai', error: String(error?.message || error) };
  }
};
