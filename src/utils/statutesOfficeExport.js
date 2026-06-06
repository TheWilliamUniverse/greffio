import { strToU8, zipSync } from 'fflate';
import {
  COVER_FONT_SIZE_PT,
  COVER_REFERENCE_FONT_SIZE_PT,
  buildStatutesCoverExportElements,
} from '../../server/statuts/shared/statutesCoverLayout.js';

const PT = {
  coverTitle: COVER_FONT_SIZE_PT * 2,
  coverMeta: COVER_FONT_SIZE_PT * 2,
  coverReference: COVER_REFERENCE_FONT_SIZE_PT * 2,
  sectionTitle: 32,
  articleTitle: 32,
  body: 26,
  subheading: 26,
};

const escapeXml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const docxRun = (text, { bold = false, size = PT.body, breakBefore = false } = {}) => {
  const props = [
    bold ? '<w:b/>' : '',
    `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`,
  ].join('');
  return `<w:r>${breakBefore ? '<w:br w:type="page"/>' : ''}<w:rPr>${props}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
};

const docxParagraph = (text, options = {}) => `<w:p><w:pPr><w:spacing w:after="160" w:line="360" w:lineRule="auto"/></w:pPr>${docxRun(text, options)}</w:p>`;

const docxEmptyParagraph = () => '<w:p><w:pPr><w:spacing w:after="160"/></w:pPr></w:p>';

const odtParagraph = (text, { bold = false, size = '13pt' } = {}) => (
  `<text:p text:style-name="${bold ? 'Bold' : 'Body'}"><text:span text:style-name="${bold ? 'BoldSpan' : 'BodySpan'}" fo:font-size="${size}">${escapeXml(text)}</text:span></text:p>`
);

const PRELIMINARY_MARKERS = /^(Définitions|Objet du présent acte|IL A ÉTÉ CONVENU|L'ASSOCIÉ UNIQUE|LES SOUSSIGNÉS|Ci-après dénommés)/i;

export const buildStatutesExportElements = (preview) => {
  if (!preview) return [];
  const elements = [...buildStatutesCoverExportElements(preview.cover || {})];

  let inPreliminary = false;
  let preliminaryOpened = false;

  (preview.blocks || []).forEach((block) => {
    if (block.kind === 'legal-title') {
      inPreliminary = false;
      preliminaryOpened = false;
      elements.push({ type: 'section-title', text: block.text });
      return;
    }
    if (block.kind === 'article') {
      inPreliminary = false;
      elements.push({
        type: 'article',
        heading: block.number ? `Article ${block.number} — ${block.title}` : block.title,
        body: block.body,
      });
      return;
    }
    if (block.kind === 'paragraph' || block.kind === 'preamble') {
      const text = String(block.text || block.title || '').trim();
      if (!text) return;
      const isAssociateBlock = /^(L'ASSOCIÉ UNIQUE|LES SOUSSIGNÉS|ET |Ci-après)/i.test(text);
      const isPreliminaryMarker = PRELIMINARY_MARKERS.test(text) && !isAssociateBlock;
      if (isPreliminaryMarker && !preliminaryOpened) {
        elements.push({ type: 'section-title', text: 'DISPOSITIONS PRÉLIMINAIRES' });
        preliminaryOpened = true;
        inPreliminary = true;
      }
      if (!isPreliminaryMarker && !inPreliminary && !isAssociateBlock && !preliminaryOpened) {
        elements.push({ type: 'body', text });
        return;
      }
      elements.push({
        type: 'body',
        text,
        subheading: isPreliminaryMarker || block.subheading,
      });
    }
  });

  (preview.annexes || []).forEach((annex) => {
    elements.push({ type: 'section-title', text: annex.title });
    (annex.paragraphs || annex.lines || []).forEach((line) => {
      elements.push({ type: 'body', text: line });
    });
  });

  if (preview.signatures) {
    elements.push({ type: 'section-title', text: preview.signatures.title || 'SIGNATURES' });
    (preview.signatures.intro || []).forEach((line) => elements.push({ type: 'body', text: line }));
  }

  return elements;
};

export const buildStatutesDocxBlob = (preview) => {
  const elements = buildStatutesExportElements(preview);
  const paragraphs = elements.map((item) => {
    if (item.type === 'page-break') return docxParagraph('', { breakBefore: true });
    if (item.type === 'cover-spacer') return docxEmptyParagraph();
    if (item.type === 'cover-title') return docxParagraph(item.text, { bold: true, size: PT.coverTitle });
    if (item.type === 'cover-line') return docxParagraph(item.text, { bold: Boolean(item.bold), size: PT.coverTitle });
    if (item.type === 'cover-reference') return docxParagraph(item.text, { size: PT.coverReference });
    if (item.type === 'section-title') return `${docxEmptyParagraph()}${docxParagraph(item.text, { bold: true, size: PT.sectionTitle })}`;
    if (item.type === 'article') {
      const paragraphs = String(item.body || '').split(/\n\n+/).map((part) => part.trim()).filter(Boolean);
      const bodyXml = paragraphs.map((paragraph) => docxParagraph(paragraph, { size: PT.body })).join('');
      return `${docxParagraph(item.heading, { bold: true, size: PT.articleTitle })}${bodyXml}${docxEmptyParagraph()}`;
    }
    if (item.type === 'body') return docxParagraph(item.text, { bold: Boolean(item.subheading), size: item.subheading ? PT.subheading : PT.body });
    return '';
  }).join('');

  const createdAt = new Date().toISOString();
  const title = preview.cover?.denomination || 'Statuts Greffio';
  const files = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`),
    'word/document.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${paragraphs}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1134" w:bottom="1417" w:left="1134"/></w:sectPr></w:body>
</w:document>`),
    'word/_rels/document.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>'),
    'docProps/core.xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(title)}</dc:title><dc:creator>Greffio</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created></cp:coreProperties>`),
  };

  return new Blob([zipSync(files)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
};

export const buildStatutesOdtBlob = (preview) => {
  const elements = buildStatutesExportElements(preview);
  const body = elements.map((item) => {
    if (item.type === 'page-break') return '<text:p text:style-name="PageBreak"/>';
    if (item.type === 'cover-spacer') return odtParagraph('', { size: `${COVER_FONT_SIZE_PT}pt` });
    if (item.type === 'cover-title') return odtParagraph(item.text, { bold: true, size: `${COVER_FONT_SIZE_PT}pt` });
    if (item.type === 'cover-line') return odtParagraph(item.text, { bold: Boolean(item.bold), size: `${COVER_FONT_SIZE_PT}pt` });
    if (item.type === 'cover-reference') return odtParagraph(item.text, { size: `${COVER_REFERENCE_FONT_SIZE_PT}pt` });
    if (item.type === 'section-title') return `${odtParagraph('', { size: '8pt' })}${odtParagraph(item.text, { bold: true, size: '16pt' })}`;
    if (item.type === 'article') {
      const paragraphs = String(item.body || '').split(/\n\n+/).map((part) => part.trim()).filter(Boolean);
      const bodyOdt = paragraphs.map((paragraph) => odtParagraph(paragraph, { size: '13pt' })).join('');
      return `${odtParagraph(item.heading, { bold: true, size: '16pt' })}${bodyOdt}${odtParagraph('', { size: '8pt' })}`;
    }
    if (item.type === 'body') return odtParagraph(item.text, { bold: Boolean(item.subheading), size: '13pt' });
    return '';
  }).join('');

  const files = {
    mimetype: strToU8('application/vnd.oasis.opendocument.text'),
    'META-INF/manifest.xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`),
    'styles.xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.2">
  <office:styles>
    <style:style style:name="Body" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.18cm" fo:line-height="140%"/></style:style>
    <style:style style:name="Bold" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.18cm" fo:line-height="140%"/></style:style>
    <style:style style:name="BodySpan" style:family="text"><style:text-properties fo:font-size="13pt"/></style:style>
    <style:style style:name="BoldSpan" style:family="text"><style:text-properties fo:font-weight="bold" fo:font-size="13pt"/></style:style>
  </office:styles>
</office:document-styles>`),
    'content.xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.2">
  <office:body><office:text>${body}</office:text></office:body>
</office:document-content>`),
  };

  return new Blob([zipSync(files, { level: 0 })], { type: 'application/vnd.oasis.opendocument.text' });
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
};

export const downloadStatutesOfficeExport = async (preview, format) => {
  const base = String(preview?.cover?.denomination || 'statuts-greffio')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'statuts-greffio';

  if (format === 'docx') {
    downloadBlob(buildStatutesDocxBlob(preview), `${base}.docx`);
    return;
  }
  if (format === 'odt') {
    downloadBlob(buildStatutesOdtBlob(preview), `${base}.odt`);
  }
};
