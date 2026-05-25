import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';

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
  doc.save();
  doc.font(FONTS.regular).fontSize(9).fillColor('#444444');
  doc.text(
    `${companyName} — Page ${pageNumber}`,
    PAGE.marginLeft,
    doc.page.height - 42,
    { width: contentWidth(doc), align: 'center', lineBreak: false },
  );
  doc.restore();
  doc.fillColor('#111111');
};

const startNewPage = (doc, companyName, pages) => {
  doc.addPage();
  const pageNumber = pages.next();
  drawPageFooter(doc, companyName, pageNumber);
  doc.y = PAGE.marginTop;
};

const ensureSpace = (doc, companyName, pages, heightNeeded = 72) => {
  if (doc.y + heightNeeded > doc.page.height - PAGE.marginBottom) {
    startNewPage(doc, companyName, pages);
  }
};

const renderCover = (doc, cover, companyName) => {
  doc.y = PAGE.marginTop + 28;
  doc.font(FONTS.bold).fontSize(26).fillColor('#111111')
    .text(cover.title || 'STATUTS', PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'center' });
  doc.moveDown(0.9);
  doc.font(FONTS.bold).fontSize(13)
    .text(cover.legalFormLabel || '', PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'center' });
  doc.moveDown(1.4);
  doc.font(FONTS.bold).fontSize(15)
    .text(cover.denomination || '', PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'center' });
  if (cover.sigle) {
    doc.moveDown(0.35);
    doc.font(FONTS.regular).fontSize(12)
      .text(`(${cover.sigle})`, PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'center' });
  }
  doc.moveDown(1.2);
  doc.font(FONTS.regular).fontSize(12).fillColor('#222222');
  [
    cover.capitalLine,
    '',
    cover.seatBlock,
    '',
    cover.registryLine,
  ].forEach((line) => {
    if (!line) { doc.moveDown(0.5); return; }
    doc.text(line, PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'center' });
    doc.moveDown(0.35);
  });
  doc.moveDown(1);
  doc.font(FONTS.italic).fontSize(10).fillColor('#555555')
    .text(`Référence dossier : ${cover.reference || ''}`, PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'center' });
  doc.fillColor('#111111');
};

const renderBlock = (doc, companyName, pages, block) => {
  if (block.kind === 'blank') {
    doc.moveDown(0.5);
    return;
  }
  if (block.kind === 'section-title') {
    ensureSpace(doc, companyName, pages, 48);
    doc.moveDown(0.8);
    doc.font(FONTS.bold).fontSize(12).fillColor('#111111')
      .text(block.text, PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'left' });
    doc.moveDown(0.55);
    return;
  }
  if (block.kind === 'legal-title') {
    ensureSpace(doc, companyName, pages, 52);
    doc.moveDown(0.9);
    doc.font(FONTS.bold).fontSize(11.5).fillColor('#111111')
      .text(block.text, PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'center' });
    doc.moveDown(0.65);
    return;
  }
  if (block.kind === 'paragraph') {
    ensureSpace(doc, companyName, pages, 36);
    doc.font(FONTS.regular).fontSize(11)
      .text(block.text, PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'justify', lineGap: 3 });
    doc.moveDown(0.45);
    return;
  }
  if (block.kind === 'article') {
    ensureSpace(doc, companyName, pages, 88);
    const heading = block.number
      ? `Article ${block.number} - ${block.title}`
      : String(block.title || '').replace(/^Article\s+/i, 'Article ');
    doc.font(FONTS.bold).fontSize(11)
      .text(heading, PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'left' });
    doc.moveDown(0.35);
    doc.font(FONTS.regular).fontSize(11)
      .text(block.body, PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'justify', lineGap: 3 });
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
        .text(String(cell || ''), x + 4, y + 7, { width: colWidth - 8 });
    });
    y += rowHeight;
  });
  doc.y = y + 12;
};

const renderAnnexes = (doc, companyName, pages, annexes = []) => {
  annexes.forEach((annexe) => {
    startNewPage(doc, companyName, pages);
    doc.font(FONTS.bold).fontSize(12)
      .text(annexe.title, PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'left' });
    doc.moveDown(0.7);
    (annexe.paragraphs || []).forEach((paragraph) => {
      ensureSpace(doc, companyName, pages, 36);
      doc.font(FONTS.regular).fontSize(11)
        .text(paragraph, PAGE.marginLeft, doc.y, { width: contentWidth(doc), align: 'justify', lineGap: 3 });
      doc.moveDown(0.45);
    });
    if (annexe.table) renderTable(doc, companyName, pages, annexe.table);
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
    const line = role ? `${name} — ${role}` : name;
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
  startNewPage(doc, companyName, pages);
  doc.font(FONTS.bold).fontSize(12).text(signatures.title || 'SIGNATURES', PAGE.marginLeft, doc.y, { width: contentWidth(doc) });
  doc.moveDown(0.7);
  (signatures.intro || []).forEach((line) => {
    doc.font(FONTS.regular).fontSize(11).text(line, PAGE.marginLeft, doc.y, { width: contentWidth(doc) });
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

  renderCover(doc, statutesDocument.cover || {}, companyName);
  startNewPage(doc, companyName, pages);
  (statutesDocument.blocks || []).forEach((block) => renderBlock(doc, companyName, pages, block));
  renderAnnexes(doc, companyName, pages, statutesDocument.annexes || []);
  renderSignatures(doc, companyName, pages, statutesDocument.signatures || {});

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  return outputPath;
};

export { generateStatutesPdf };
