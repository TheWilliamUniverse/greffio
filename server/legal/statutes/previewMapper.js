const annexToLines = (annex) => {
  const lines = [...(annex.paragraphs || [])];
  if (annex.table?.headers?.length) {
    lines.push(annex.table.headers.join(' | '));
    (annex.table.rows || []).forEach((row) => {
      lines.push(Array.isArray(row) ? row.join(' | ') : String(row));
    });
  }
  return lines;
};

const collectPreambleParagraphs = (blocks = []) => {
  const paragraphs = [];
  for (const block of blocks) {
    if (block.kind === 'legal-title' || block.kind === 'article') break;
    if (block.kind === 'paragraph' && block.text) paragraphs.push(block.text);
    if (block.kind === 'section-title' && block.title) paragraphs.push(block.title);
  }
  return paragraphs;
};

export const documentToFullPreview = (document) => {
  const blocks = document.blocks || [];
  const articles = blocks
    .filter((block) => block.kind === 'article')
    .map((block) => ({
      number: block.number,
      title: block.title,
      heading: `Article ${block.number} – ${block.title}`,
      body: block.body,
    }));

  const allClauses = articles.map((article) => ({
    title: article.heading,
    body: article.body,
  }));

  const annexes = (document.annexes || []).map((annex) => ({
    title: annex.title,
    paragraphs: annex.paragraphs || [],
    table: annex.table || null,
    lines: annexToLines(annex),
  }));

  return {
    cover: document.cover,
    blocks,
    preamble: {
      title: 'Préambule',
      paragraphs: collectPreambleParagraphs(blocks),
    },
    articles,
    allClauses,
    sampleClauses: allClauses,
    annexes,
    signatures: document.signatures,
    structure: {
      sections: blocks.filter((block) => block.kind === 'legal-title').map((block) => block.text),
      annexCount: annexes.length,
      template: document.metadata?.template,
      legalForm: document.metadata?.legalForm,
    },
    clauseCount: articles.length,
    metadata: document.metadata,
  };
};

export const fullPreviewToExportSections = (preview) => {
  const sections = [];
  const cover = preview.cover || {};
  const legalForm = preview.metadata?.legalForm || cover.legalForm || '';
  const denomination = cover.denomination || cover.subtitle || 'Dénomination à compléter';

  sections.push({
    title: 'Page de garde',
    lines: [
      `STATUTS – ${legalForm}`,
      `Société : ${denomination}`,
      cover.subtitle ? String(cover.subtitle) : '',
      cover.reference ? `Référence : ${cover.reference}` : '',
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
      const articleLines = [
        `Article ${block.number} – ${block.title}`,
        block.body,
      ];
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
    sections.push({
      title: annex.title || `Annexe ${index + 1}`,
      lines: annex.lines?.length ? annex.lines : annexToLines(annex),
    });
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

  return sections;
};
