import { strToU8, zipSync } from 'fflate';
import {
  COVER_FONT_SIZE_PT,
  COVER_REFERENCE_FONT_SIZE_PT,
} from '../../server/statuts/shared/statutesCoverLayout.js';
import {
  buildStatutesExportElements,
  buildStatutesDocxBuffer,
} from '../../server/statuts/shared/statutesOfficeExportCore.js';

const escapeXml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const odtParagraph = (text, { bold = false, size = '13pt', align = 'left' } = {}) => {
  const styleName = bold
    ? (align === 'center' ? 'BoldCenter' : 'Bold')
    : (align === 'center' ? 'Center' : 'Body');
  return `<text:p text:style-name="${styleName}"><text:span text:style-name="${bold ? 'BoldSpan' : 'BodySpan'}" fo:font-size="${size}">${escapeXml(text)}</text:span></text:p>`;
};

export { buildStatutesExportElements };

export const buildStatutesDocxBlob = (preview) => (
  new Blob([buildStatutesDocxBuffer(preview)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
);

export const buildStatutesOdtBlob = (preview) => {
  const elements = buildStatutesExportElements(preview);
  const body = elements.map((item) => {
    if (item.type === 'page-break') return '<text:p text:style-name="PageBreak"/>';
    if (item.type === 'cover-spacer') return odtParagraph('', { size: `${COVER_FONT_SIZE_PT}pt` });
    if (item.type === 'cover-title') return odtParagraph(item.text, { bold: true, size: `${COVER_FONT_SIZE_PT}pt`, align: 'center' });
    if (item.type === 'cover-line') return odtParagraph(item.text, { bold: Boolean(item.bold), size: `${COVER_FONT_SIZE_PT}pt`, align: 'center' });
    if (item.type === 'cover-reference') return odtParagraph(item.text, { size: `${COVER_REFERENCE_FONT_SIZE_PT}pt`, align: 'center' });
    if (item.type === 'section-title') {
      return `${odtParagraph('', { size: '8pt' })}${odtParagraph(item.text, { bold: true, size: '16pt', align: item.align || 'center' })}`;
    }
    if (item.type === 'article') {
      const paragraphs = String(item.body || '').split(/\n\n+/).map((part) => part.trim()).filter(Boolean);
      const bodyOdt = paragraphs.map((paragraph) => odtParagraph(paragraph, { size: '14pt' })).join('');
      return `${odtParagraph(item.heading, { bold: true, size: '16pt' })}${bodyOdt}${odtParagraph('', { size: '8pt' })}`;
    }
    if (item.type === 'body') return odtParagraph(item.text, { bold: Boolean(item.subheading), size: '14pt' });
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
    <style:style style:name="Center" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.18cm" fo:line-height="140%" fo:text-align="center"/></style:style>
    <style:style style:name="Bold" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.18cm" fo:line-height="140%"/></style:style>
    <style:style style:name="BoldCenter" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.18cm" fo:line-height="140%" fo:text-align="center"/></style:style>
    <style:style style:name="BodySpan" style:family="text"><style:text-properties fo:font-size="14pt"/></style:style>
    <style:style style:name="BoldSpan" style:family="text"><style:text-properties fo:font-weight="bold" fo:font-size="14pt"/></style:style>
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
