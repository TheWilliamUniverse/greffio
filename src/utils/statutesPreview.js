const STATUTES_SUPPORTED_FORMS = ['SAS', 'SASU', 'SARL', 'EURL', 'SCI'];

export const isWilliamStatutesForm = (label = '') => {
  const normalized = String(label).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('SASU')) return 'SASU';
  if (normalized === 'SAS' || normalized.includes('SAS ')) return 'SAS';
  if (normalized.includes('EURL')) return 'EURL';
  if (normalized.includes('SARL')) return 'SARL';
  if (normalized.includes('SCI')) return 'SCI';
  return STATUTES_SUPPORTED_FORMS.includes(normalized) ? normalized : null;
};

export const fullPreviewToDocumentPreview = (preview) => {
  if (!preview) return null;

  const cover = preview.cover || {};
  const legalForm = preview.metadata?.legalForm || cover.legalForm || '';
  const denomination = cover.denomination || cover.subtitle || 'Dénomination à compléter';
  const sections = [];

  sections.push({
    title: 'Page de garde',
    lines: [
      `STATUTS – ${legalForm}`,
      `Société : ${denomination}`,
      cover.subtitle ? String(cover.subtitle) : '',
    ].filter(Boolean),
  });

  if (preview.preamble?.paragraphs?.length) {
    sections.push({
      title: preview.preamble.title || 'Préambule',
      lines: preview.preamble.paragraphs,
    });
  }

  let currentTitleSection = null;
  for (const block of preview.blocks || []) {
    if (block.kind === 'legal-title') {
      if (currentTitleSection) sections.push(currentTitleSection);
      currentTitleSection = { title: block.text, lines: [] };
      continue;
    }
    if (block.kind === 'article') {
      const articleLines = [`Article ${block.number} – ${block.title}`, block.body];
      if (currentTitleSection) {
        currentTitleSection.lines.push(...articleLines, '');
      } else {
        sections.push({ title: `Article ${block.number} – ${block.title}`, lines: [block.body] });
      }
      continue;
    }
    if (block.kind === 'paragraph' && block.text) {
      if (currentTitleSection) currentTitleSection.lines.push(block.text);
      else sections.push({ title: 'Dispositions préliminaires', lines: [block.text] });
      continue;
    }
    if (block.kind === 'section-title' && block.title) {
      if (currentTitleSection) currentTitleSection.lines.push(block.title);
      else sections.push({ title: block.title, lines: [] });
    }
  }
  if (currentTitleSection) sections.push(currentTitleSection);

  (preview.annexes || []).forEach((annex, index) => {
    const lines = annex.lines?.length
      ? annex.lines
      : [
        ...(annex.paragraphs || []),
        ...(annex.table?.headers ? [annex.table.headers.join(' | ')] : []),
        ...((annex.table?.rows || []).map((row) => (Array.isArray(row) ? row.join(' | ') : String(row)))),
      ];
    sections.push({ title: annex.title || `Annexe ${index + 1}`, lines });
  });

  if (preview.signatures) {
    const signatureLines = [];
    if (preview.signatures.place) signatureLines.push(`Fait à ${preview.signatures.place}`);
    if (preview.signatures.date) signatureLines.push(`Le ${preview.signatures.date}`);
    if (preview.signatures.blocks?.length) {
      preview.signatures.blocks.forEach((block) => {
        signatureLines.push(block.label || block.role || 'Signataire');
        if (block.name) signatureLines.push(block.name);
      });
    }
    sections.push({
      title: 'Signatures',
      lines: signatureLines.length
        ? signatureLines
        : ['Chaque signataire fait précéder sa signature de la mention « Lu et approuvé » lorsque cette mention est requise ou utile.'],
    });
  }

  const meta = preview.metadata || {};
  const articleLabel = meta.articleCount || preview.clauseCount || preview.allClauses?.length || 0;
  const pageLabel = meta.pageCount ? ` · ${meta.pageCount} pages` : '';

  return {
    title: `Statuts - ${legalForm || 'Société'}`,
    subtitle: `${denomination} · Document préparé par Greffio`,
    sections,
    watermarkText: 'Greffio',
    isFullStatutes: true,
    clauseCount: articleLabel,
    pageCount: meta.pageCount,
    templateId: meta.templateId || meta.template,
    previewMetaLine: `${articleLabel} articles rédigés${pageLabel} – document prêt à relire et exporter.`,
    williamPreview: preview,
  };
};
