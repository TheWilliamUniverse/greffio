import { strToU8, zipSync } from 'fflate';
import {
  COVER_FONT_SIZE_PT,
  COVER_REFERENCE_FONT_SIZE_PT,
  buildStatutesCoverExportElements,
} from './statutesCoverLayout.js';

const PT = {
  coverTitle: COVER_FONT_SIZE_PT * 2,
  coverMeta: COVER_FONT_SIZE_PT * 2,
  coverReference: COVER_REFERENCE_FONT_SIZE_PT * 2,
  sectionTitle: 32,
  articleTitle: 32,
  body: 28,
  subheading: 28,
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

const docxParagraph = (text, options = {}) => {
  const align = options.align || 'left';
  const jc = align === 'center'
    ? '<w:jc w:val="center"/>'
    : align === 'both'
      ? '<w:jc w:val="both"/>'
      : align === 'right'
        ? '<w:jc w:val="right"/>'
        : '';
  const pStyle = align === 'center' ? '<w:pStyle w:val="Center"/>' : '';
  const { align: _align, ...runOptions } = options;
  return `<w:p><w:pPr>${pStyle}${jc}<w:spacing w:after="160" w:line="360" w:lineRule="auto"/></w:pPr>${docxRun(text, runOptions)}</w:p>`;
};

const docxEmptyParagraph = () => '<w:p><w:pPr><w:spacing w:after="160"/></w:pPr></w:p>';

const PRELIMINARY_MARKERS = /^(Définitions|Objet du présent acte|IL A ÉTÉ CONVENU|L'ASSOCIÉ UNIQUE|LES SOUSSIGNÉS|Ci-après dénommés)/i;

export const buildStatutesExportElements = (preview) => {
  if (!preview) return [];
  const elements = [...buildStatutesCoverExportElements(preview.cover || {})];

  let inPreliminary = false;
  let preliminaryOpened = false;

  (preview.blocks || []).forEach((block) => {
    if (block.kind === 'section-title') {
      const text = String(block.text || block.title || '').trim();
      if (!text) return;
      elements.push({ type: 'section-title', text, align: 'center' });
      return;
    }
    if (block.kind === 'legal-title') {
      inPreliminary = /^DISPOSITIONS PRÉLIMINAIRES/i.test(String(block.text || ''));
      preliminaryOpened = inPreliminary;
      elements.push({ type: 'section-title', text: block.text, align: 'center' });
      return;
    }
    if (block.kind === 'article') {
      inPreliminary = false;
      elements.push({
        type: 'article',
        heading: block.number ? `Article ${block.number} – ${block.title}` : block.title,
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
        elements.push({ type: 'section-title', text: 'DISPOSITIONS PRÉLIMINAIRES', align: 'center' });
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

  if (preview.signatures) {
    elements.push({ type: 'section-title', text: preview.signatures.title || 'SIGNATURES', align: 'center' });
    (preview.signatures.intro || []).forEach((line) => elements.push({ type: 'body', text: line }));
  }

  (preview.annexes || []).forEach((annex) => {
    elements.push({ type: 'section-title', text: annex.title, align: 'center' });
    (annex.paragraphs || annex.lines || []).forEach((line) => {
      elements.push({ type: 'body', text: line });
    });
  });

  return elements;
};

export const buildStatutesDocxBuffer = (preview) => {
  const elements = buildStatutesExportElements(preview);
  const paragraphs = elements.map((item) => {
    if (item.type === 'page-break') return docxParagraph('', { breakBefore: true });
    if (item.type === 'cover-spacer') return docxEmptyParagraph();
    if (item.type === 'cover-title') return docxParagraph(item.text, { bold: true, size: PT.coverTitle, align: 'center' });
    if (item.type === 'cover-line') return docxParagraph(item.text, { bold: Boolean(item.bold), size: PT.coverTitle, align: 'center' });
    if (item.type === 'cover-reference') return docxParagraph(item.text, { size: PT.coverReference, align: 'center' });
    if (item.type === 'section-title') {
      return `${docxEmptyParagraph()}${docxParagraph(item.text, {
        bold: true,
        size: PT.sectionTitle,
        align: item.align || 'center',
      })}`;
    }
    if (item.type === 'article') {
      const bodyParts = String(item.body || '').split(/\n\n+/).map((part) => part.trim()).filter(Boolean);
      const bodyXml = bodyParts.map((paragraph) => docxParagraph(paragraph, { size: PT.body })).join('');
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
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
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
    'word/_rels/document.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
    'word/styles.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Center">
    <w:name w:val="Center"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:jc w:val="center"/></w:pPr>
  </w:style>
</w:styles>`),
    'docProps/core.xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(title)}</dc:title><dc:creator>Greffio</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created></cp:coreProperties>`),
  };

  return Buffer.from(zipSync(files));
};
