import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { pdfSafeAmountsInText } from '../statuts/shared/numberFormat.js';
import { normalizeStatutesBodyText, classifyStatutesSubheading } from '../statuts/shared/normalizeStatutesParagraphs.js';
import {
  COVER_REFERENCE_FONT_SIZE_PT,
  layoutStatutesCover,
} from '../statuts/shared/statutesCoverLayout.js';

const pdfText = (value) => pdfSafeAmountsInText(normalizeStatutesBodyText(value));

const PAGE = {
  marginTop: 62,
  marginBottom: 58,
  marginLeft: 58,
  marginRight: 58,
};

const FONTS = {
  regular: 'Times-Roman',
  bold: 'Times-Bold',
  italic: 'Times-Italic',
  boldItalic: 'Times-BoldItalic',
};

const contentWidth = (doc) => doc.page.width - PAGE.marginLeft - PAGE.marginRight;

const ensureDir = (directoryPath) => {
  if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath, { recursive: true });
};

const createPageTracker = () => {
  let current = 1;
  return {
    get current() { return current; },
    next() { current += 1; return current; },
  };
};

const drawPageFooter = (doc, companyName, pageNumber) => {
  const footerY = doc.page.height - PAGE.marginBottom - 12;
  doc.save();
  doc.font(FONTS.regular).fontSize(9).fillColor('#444444');
  doc.text(
    `${companyName} – Page ${pageNumber}`,
    PAGE.marginLeft,
    footerY,
    { width: contentWidth(doc), align: 'center', lineBreak: false },
  );
  doc.restore();
  doc.fillColor('#111111');
};

const startNewPage = (doc, companyName, pages) => {
  doc.addPage();
  pages.next();
  drawPageFooter(doc, companyName, pages.current);
  doc.y = PAGE.marginTop;
};

const finishCoverAndStartBody = (doc, companyName, pages) => {
  const pageCount = doc.bufferedPageRange()?.count || 1;
  if (pageCount === 1) {
    startNewPage(doc, companyName, pages);
    return;
  }
  doc.y = PAGE.marginTop;
};

const ensureSpace = (doc, companyName, pages, heightNeeded = 72) => {
  if (doc.y + heightNeeded > doc.page.height - PAGE.marginBottom) {
    startNewPage(doc, companyName, pages);
  }
};

const renderBoldStatutesLine = (doc, companyName, pages, text, { underline = false } = {}) => {
  ensureSpace(doc, companyName, pages, 36);
  const x = PAGE.marginLeft;
  const width = contentWidth(doc);
  const cleanText = pdfText(text);
  doc.font(FONTS.bold).fontSize(14);
  const startY = doc.y;
  doc.text(cleanText, x, startY, { width, align: 'left', lineGap: 4 });
  if (underline) {
    const lineHeight = doc.currentLineHeight(true);
    const underlineY = startY + lineHeight - 3;
    const textWidth = Math.min(doc.widthOfString(cleanText), width);
    doc.save();
    doc.strokeColor('#111111').lineWidth(0.5)
      .moveTo(x, underlineY)
      .lineTo(x + textWidth, underlineY)
      .stroke();
    doc.restore();
  }
  doc.moveDown(0.35);
};

const renderStatutesBodyParagraph = (doc, companyName, pages, paragraph) => {
  const subheadingStyle = classifyStatutesSubheading(paragraph);
  if (subheadingStyle) {
    renderBoldStatutesLine(doc, companyName, pages, paragraph, {
      underline: subheadingStyle === 'underline',
    });
    return;
  }
  ensureSpace(doc, companyName, pages, 36);
  doc.font(FONTS.regular).fontSize(14)
    .text(pdfText(paragraph), PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'justify', lineGap: 4 });
  doc.moveDown(0.5);
};

const renderCover = (doc, cover) => {
  const layout = layoutStatutesCover(cover, {
    pageHeight: doc.page.height,
    marginTop: PAGE.marginTop,
    marginBottom: PAGE.marginBottom,
  });
  const width = contentWidth(doc);
  const x = PAGE.marginLeft;
  let y = PAGE.marginTop + layout.topOffset;

  const drawLine = (text, { bold = false } = {}) => {
    const cleanText = pdfText(text);
    if (!cleanText) return;
    doc.font(bold ? FONTS.bold : FONTS.regular)
      .fontSize(layout.fontSize)
      .fillColor('#111111');
    doc.text(cleanText, x, y, { width, align: 'center', lineGap: layout.lineGap });
    y = doc.y + layout.sectionGap;
  };

  layout.topLines.forEach((line) => drawLine(line.text, { bold: line.bold }));

  y = PAGE.marginTop + layout.topOffset + layout.topHeight + layout.flexGap;
  layout.bottomLines.forEach((line) => drawLine(line.text, { bold: line.bold }));

  if (layout.reference) {
    y += layout.sectionGap * 0.5;
    doc.font(FONTS.italic).fontSize(COVER_REFERENCE_FONT_SIZE_PT).fillColor('#555555')
      .text(pdfText(layout.reference), x, y, { width, align: 'center' });
    doc.fillColor('#111111');
  }

  doc.y = doc.page.height - PAGE.marginBottom;
};

const renderBlock = (doc, companyName, pages, block) => {
  if (block.kind === 'blank') {
    doc.moveDown(0.5);
    return;
  }
  if (block.kind === 'section-title') {
    ensureSpace(doc, companyName, pages, 48);
    doc.moveDown(0.8);
    doc.font(FONTS.bold).fontSize(16).fillColor('#111111')
      .text(pdfText(block.text), PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'left' });
    doc.moveDown(0.55);
    return;
  }
  if (block.kind === 'legal-title') {
    ensureSpace(doc, companyName, pages, 64);
    doc.moveDown(1.1);
    doc.font(FONTS.bold).fontSize(16).fillColor('#111111')
      .text(pdfText(block.text), PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'center' });
    doc.moveDown(0.75);
    return;
  }
  if (block.kind === 'paragraph') {
    ensureSpace(doc, companyName, pages, 36);
    if (block.subheading) doc.moveDown(0.35);
    doc.font(block.subheading ? FONTS.bold : FONTS.regular).fontSize(14)
      .text(pdfText(block.text), PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'justify', lineGap: 4 });
    doc.moveDown(block.subheading ? 0.35 : 0.5);
    return;
  }
  if (block.kind === 'article') {
    ensureSpace(doc, companyName, pages, 88);
    const heading = block.number
      ? `Article ${block.number} - ${block.title}`
      : String(block.title || '').replace(/^Article\s+/i, 'Article ');
    doc.font(FONTS.bold).fontSize(16)
      .text(heading, PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'left' });
    doc.moveDown(0.35);
    const paragraphs = String(block.body || '').split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    paragraphs.forEach((paragraph) => {
      renderStatutesBodyParagraph(doc, companyName, pages, paragraph);
    });
    doc.moveDown(0.75);
  }
};

const renderTable = (doc, companyName, pages, table) => {
  if (!table?.headers?.length) return;
  const colCount = table.headers.length;
  const tableWidth = contentWidth(doc);
  const colWidth = tableWidth / colCount;
  const startX = PAGE.marginLeft;
  const rowHeight = 24;
  const rows = table.rows || [];
  ensureSpace(doc, companyName, pages, rowHeight * (rows.length + 2));

  let y = doc.y;
  table.headers.forEach((header, index) => {
    const x = startX + index * colWidth;
    doc.rect(x, y, colWidth, rowHeight).fillAndStroke('#f3f3f3', '#cccccc');
    doc.fillColor('#111111').font(FONTS.bold).fontSize(9.5)
      .text(header, x + 4, y + 7, { width: colWidth - 8 });
  });
  y += rowHeight;
  rows.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const x = startX + colIndex * colWidth;
      doc.rect(x, y, colWidth, rowHeight).fillAndStroke(rowIndex % 2 ? '#fafafa' : '#ffffff', '#dddddd');
      doc.fillColor('#111111').font(FONTS.regular).fontSize(9.5)
        .text(pdfText(String(cell || '')), x + 4, y + 7, { width: colWidth - 8 });
    });
    y += rowHeight;
  });
  doc.y = y + 12;
};

const renderAnnexes = (doc, companyName, pages, annexes = []) => {
  annexes.forEach((annexe, index) => {
    ensureSpace(doc, companyName, pages, 120);
    if (index > 0 || doc.y > PAGE.marginTop + 40) {
      startNewPage(doc, companyName, pages);
    }
    doc.font(FONTS.bold).fontSize(12)
      .text(annexe.title, PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'left' });
    doc.moveDown(0.7);
    (annexe.paragraphs || []).forEach((paragraph) => {
      ensureSpace(doc, companyName, pages, 36);
      doc.font(FONTS.regular).fontSize(11)
        .text(pdfText(paragraph), PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'justify', lineGap: 3 });
      doc.moveDown(0.45);
    });
    if (annexe.table) renderTable(doc, companyName, pages, annexe.table);
    doc.moveDown(0.6);
  });
};

const renderSignatureBlock = (doc, companyName, pages, block) => {
  if (block.layout === 'grid' && block.columns?.length) {
    ensureSpace(doc, companyName, pages, 160);
    doc.moveDown(0.8);
    const width = contentWidth(doc);
    const colWidth = width / block.columns.length;
    const startY = doc.y;
    block.columns.forEach((col, index) => {
      const x = PAGE.marginLeft + (colWidth * index);
      doc.font(FONTS.regular).fontSize(11).text(col.name, x, startY, { width: colWidth - 8 });
      doc.font(FONTS.regular).fontSize(10.5).text(col.role, x, doc.y + 2, { width: colWidth - 8 });
    });
    doc.y = startY + 36;
    block.columns.forEach((col, index) => {
      const x = PAGE.marginLeft + (colWidth * index);
      doc.font(FONTS.italic).fontSize(10).fillColor('#555555')
        .text(col.mention || 'Lu et approuvé', x, doc.y, { width: colWidth - 8 });
    });
    doc.fillColor('#111111');
    doc.moveDown(2.5);
    return;
  }

  ensureSpace(doc, companyName, pages, 130);
  doc.moveDown(0.8);
  if (block.role) {
    doc.font(FONTS.bold).fontSize(11).text(block.role, PAGE.marginLeft, doc.y, { width: contentWidth(doc) });
    doc.moveDown(0.35);
  }
  (block.names || []).forEach((name, index) => {
    const role = block.roles?.[index];
    const line = role ? `${name} – ${role}` : name;
    doc.font(FONTS.regular).fontSize(11).text(line, PAGE.marginLeft, doc.y, { width: contentWidth(doc) });
    doc.moveDown(0.25);
  });
  if (block.footer) {
    doc.moveDown(0.4);
    doc.font(FONTS.regular).fontSize(10.5)
      .text(block.footer, PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'justify' });
    doc.moveDown(0.5);
  }
  doc.moveDown(1);
  doc.font(FONTS.regular).fontSize(10.5).text('Signature :', PAGE.marginLeft, doc.y, { width: contentWidth(doc) });
  doc.moveDown(2.2);
  doc.font(FONTS.italic).fontSize(10).fillColor('#555555')
    .text(block.mention || 'Lu et approuvé', PAGE.marginLeft, doc.y, { width: contentWidth(doc) });
  doc.fillColor('#111111');
};

const renderSignatures = (doc, companyName, pages, signatures) => {
  ensureSpace(doc, companyName, pages, 180);
  if (doc.y > PAGE.marginTop + 48) {
    startNewPage(doc, companyName, pages);
  }
  doc.font(FONTS.bold).fontSize(12).text(signatures.title || 'SIGNATURES', PAGE.marginLeft, doc.y, { width: contentWidth(doc) });
  doc.moveDown(0.7);
  (signatures.intro || []).forEach((line) => {
    doc.font(FONTS.regular).fontSize(11).text(pdfText(line), PAGE.marginLeft, doc.y, { width: contentWidth(doc) });
    doc.moveDown(0.3);
  });
  [signatures.associateBlock, signatures.directorBlock, signatures.generalDirectorBlock].filter(Boolean).forEach((block) => {
    renderSignatureBlock(doc, companyName, pages, block);
  });
  if (signatures.minorRepresentationNote) {
    doc.moveDown(0.6);
    doc.font(FONTS.regular).fontSize(10.5)
      .text(signatures.minorRepresentationNote, PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'justify' });
  }
};

const generateStatutesPdf = async ({ filename, document: statutesDocument }) => {
  const outputDir = path.resolve(process.cwd(), 'server', 'data', 'generated');
  ensureDir(outputDir);
  const outputPath = path.join(outputDir, filename);
  const companyName = statutesDocument.cover?.denomination || 'Greffio';
  const pages = createPageTracker();

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: PAGE.marginTop, bottom: PAGE.marginBottom, left: PAGE.marginLeft, right: PAGE.marginRight },
    autoFirstPage: true,
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  drawPageFooter(doc, companyName, pages.current);

  renderCover(doc, statutesDocument.cover || {});
  finishCoverAndStartBody(doc, companyName, pages);
  (statutesDocument.blocks || []).forEach((block) => renderBlock(doc, companyName, pages, block));
  renderSignatures(doc, companyName, pages, statutesDocument.signatures || {});
  renderAnnexes(doc, companyName, pages, statutesDocument.annexes || []);

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  return outputPath;
};

export { generateStatutesPdf };
