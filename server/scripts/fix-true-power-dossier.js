/**
 * Maintenance dossier personne morale – audit et régénération optionnelle.
 *
 * Usage :
 *   node server/scripts/fix-true-power-dossier.js "TRUE POWER" --dry-run
 *   node server/scripts/fix-true-power-dossier.js "TRUE POWER" --set-quality "Directeur Général" --regenerate
 *
 * Ne force jamais Président/DG : la qualité du signataire est un choix client explicite.
 */
import dotenv from 'dotenv';
import {
  LEGAL_ENTITY_SIGNATORY_QUALITIES,
  resolveLegalEntitySignatoryQuality,
} from '../shared/partyIdentityFormatter.js';
import {
  getDossier,
  ensureDossierDocuments,
  updateDossierDocument,
  listDossierDocuments,
  syncGeneratedStatutesToDossierChecklist,
  DOCUMENT_STATUSES,
} from '../store.js';
import { getUserById } from '../authStore.js';
import { query } from '../dbClient.js';
import { buildStatutesPdfForDossier } from '../services/statutesPdfService.js';
import { persistEditableDocumentPdf } from '../services/editableDocumentService.js';
import { EDITABLE_DOCUMENT_REGISTRY } from '../documents/editableDocumentRegistry.js';

dotenv.config();

const summarizeAssociate = (associate = {}) => ({
  type: associate.associateType,
  name: associate.companyName || associate.label || [associate.firstName, associate.lastName].filter(Boolean).join(' '),
  roleLabel: associate.roleLabel,
  representativeName: associate.representativeName,
  representativeQuality: associate.representativeQuality,
  signatoryQualityValid: associate.associateType === 'personne_morale'
    ? LEGAL_ENTITY_SIGNATORY_QUALITIES.includes(String(associate.representativeQuality || '').trim())
    : null,
});

const auditAssociates = (associates = []) => {
  const issues = [];
  (associates || []).forEach((associate) => {
    if (associate?.associateType !== 'personne_morale') return;
    const label = associate.companyName || associate.label || 'Personne morale';
    const quality = resolveLegalEntitySignatoryQuality({
      representativeQuality: associate.representativeQuality,
    });
    if (!String(associate.representativeName || '').trim()) {
      issues.push(`${label} : représentant légal manquant`);
    }
    if (!quality) {
      issues.push(`${label} : qualité signataire non choisie (Président ou Directeur Général)`);
    }
  });
  return issues;
};

const regenerateDocuments = async ({ dossier, questionnaire, user }) => {
  const results = [];
  const statutes = await buildStatutesPdfForDossier({ dossier, questionnaire, user });
  await syncGeneratedStatutesToDossierChecklist({
    dossierId: dossier.id,
    fileUrl: statutes.saved.fileUrl,
    fileSizeBytes: statutes.saved.fileSizeBytes,
    filename: statutes.filename,
    contentHash: statutes.contentHash,
    legalForm: statutes.legalForm,
  });
  results.push(`statutes:${statutes.filename}`);

  await ensureDossierDocuments(dossier.id);
  const documents = await listDossierDocuments(dossier.id);

  for (const key of ['subscribers_list', 'formality_powers']) {
    const config = EDITABLE_DOCUMENT_REGISTRY[key];
    if (!config) continue;
    const existing = documents.find((item) => item.docKey === key);
    const savedFields = existing?.metadata?.fields && typeof existing.metadata.fields === 'object'
      ? existing.metadata.fields
      : {};
    const fields = config.buildInitialFields({
      dossier,
      questionnaire,
      user,
      savedFields,
    });
    const validation = config.validateFields(fields);
    if (!validation.ok) {
      results.push(`${key}:SKIP:${validation.error}`);
      continue;
    }
    const { filename } = await persistEditableDocumentPdf({
      docKey: config.docKey,
      schemaVersion: config.schemaVersion,
      dossier,
      fields: validation.normalized || fields,
      generatePdf: config.generatePdf,
      filenamePrefix: config.filenamePrefix,
      ensureDossierDocuments,
      updateDossierDocument,
      listDossierDocuments,
      DOCUMENT_STATUSES,
      metadataExtra: { regeneratedByScript: true },
    });
    results.push(`${key}:${filename}`);
  }

  return results;
};

const parseSetQuality = () => {
  const inline = process.argv.find((arg) => arg.startsWith('--set-quality='));
  if (inline) return inline.slice('--set-quality='.length).trim();
  const index = process.argv.indexOf('--set-quality');
  if (index >= 0) return String(process.argv[index + 1] || '').trim();
  return '';
};

const applySignatoryQuality = (associates = [], qualityToSet = '') => {
  if (!LEGAL_ENTITY_SIGNATORY_QUALITIES.includes(qualityToSet)) {
    return { associates, changed: false };
  }
  let changed = false;
  const next = (associates || []).map((associate) => {
    if (associate?.associateType !== 'personne_morale') return associate;
    if (String(associate.representativeQuality || '').trim() === qualityToSet) return associate;
    changed = true;
    return { ...associate, representativeQuality: qualityToSet };
  });
  return { associates: next, changed };
};

const run = async () => {
  const search = process.argv[2] || 'TRUE POWER';
  const dryRun = process.argv.includes('--dry-run');
  const regenerate = process.argv.includes('--regenerate');
  const setQuality = parseSetQuality();
  const result = await query(`
    SELECT id, reference, status, user_id AS "userId", company_name AS "companyName", data_json AS "dataJson"
    FROM dossiers
    WHERE deleted_at IS NULL
      AND (
        UPPER(COALESCE(denomination, '')) LIKE $1
        OR UPPER(COALESCE(company_name, '')) LIKE $1
      )
    ORDER BY updated_at DESC
  `, [`%${search.toUpperCase()}%`]);

  if (!result.rows.length) {
    console.log(`NO_DOSSIER_FOUND for "${search}"`);
    return;
  }

  for (const row of result.rows) {
    let data = row.dataJson ? JSON.parse(row.dataJson) : {};
    let associates = data.associates || [];
    let dataChanged = false;

    if (setQuality) {
      const applied = applySignatoryQuality(associates, setQuality);
      associates = applied.associates;
      dataChanged = applied.changed;
      if (applied.changed && !dryRun) {
        data = { ...data, associates };
        await query(`
          UPDATE dossiers
          SET data_json = $1, updated_at = $2
          WHERE id = $3
        `, [JSON.stringify(data), new Date().toISOString(), row.id]);
        console.log(`UPDATED ${row.reference || row.id} – representativeQuality=${setQuality}`);
      } else if (applied.changed) {
        console.log(`DRY_RUN ${row.reference || row.id} – would set representativeQuality=${setQuality}`);
      }
    }

    const issues = auditAssociates(associates);

    console.log(JSON.stringify({
      id: row.id,
      reference: row.reference,
      status: row.status,
      companyName: row.companyName,
      associates: associates.map(summarizeAssociate),
      issues,
      regenerate,
      dryRun,
    }, null, 2));

    if (issues.length) {
      console.log(`CHECK ${row.reference || row.id} – ${issues.length} point(s) à traiter côté client`);
    } else {
      console.log(`CHECK ${row.reference || row.id} – associés PM OK`);
    }

    if (!regenerate || dryRun || issues.length) continue;

    const dossier = await getDossier(row.id);
    const user = row.userId ? await getUserById(row.userId) : null;
    const questionnaire = dossier?.dataJson ? JSON.parse(dossier.dataJson) : data;
    try {
      const regen = await regenerateDocuments({ dossier, questionnaire, user });
      console.log(`REGENERATED ${row.reference || row.id}:`, regen.join(', '));
    } catch (error) {
      console.error(`REGENERATE_FAILED ${row.reference || row.id}`, error?.code || error?.message || error);
      process.exitCode = 1;
    }
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
