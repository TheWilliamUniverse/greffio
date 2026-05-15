import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';

const ensureDir = (directoryPath) => {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
};

const renderClause = (doc, clause) => {
  doc.font('Helvetica-Bold').fontSize(12).text(clause.title, { align: 'left' });
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(10.5).text(clause.body, {
    align: 'justify',
    lineGap: 2,
  });
  doc.moveDown(0.8);
};

const drawPageFooter = (doc) => {
  const pageText = `Page ${doc.page.number}`;
  doc.font('Helvetica').fontSize(8).fillColor('#6B7280');
  doc.text(pageText, 50, doc.page.height - 40, { align: 'center', width: doc.page.width - 100 });
  doc.fillColor('#000000');
};

const generateStatutesPdf = async ({
  filename,
  company,
  legalForm,
  reference,
  clauses,
}) => {
  const outputDir = path.resolve(process.cwd(), 'server', 'data', 'generated');
  ensureDir(outputDir);
  const outputPath = path.join(outputDir, filename);

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 56, bottom: 56, left: 54, right: 54 },
    autoFirstPage: true,
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  doc.on('pageAdded', () => drawPageFooter(doc));

  doc.font('Helvetica-Bold').fontSize(18).text(`Statuts ${legalForm}`, { align: 'center' });
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(11).text(`${company}`, { align: 'center' });
  doc.font('Helvetica').fontSize(10).text(`Référence dossier: ${reference}`, { align: 'center' });
  doc.moveDown(1);

  doc.font('Helvetica').fontSize(10).text(
    'Document généré automatiquement par Greffio. Ce modèle doit être relu et validé avant signature définitive.',
    { align: 'justify' },
  );
  doc.moveDown(1.2);

  clauses.forEach((item, index) => {
    if (index > 0 && index % 3 === 0) {
      doc.addPage();
    }
    renderClause(doc, item);
    doc.font('Helvetica').fontSize(10.5).text(
      'Pour éviter tout rejet, vérifiez la cohérence entre statuts, formulaire, justificatifs et identité des parties.',
      { align: 'justify', lineGap: 2 },
    );
    doc.moveDown(0.8);
  });

  while (doc.page.number < 10) {
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(12).text('Annexe technique', { align: 'left' });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10.5).text(
      'Cette annexe rappelle les contrôles de conformité Greffio : cohérence des clauses, données d’identité, justificatifs, mandataire, et informations déclarées au guichet unique.',
      { align: 'justify', lineGap: 2 },
    );
    doc.moveDown(0.8);
    doc.font('Helvetica').fontSize(10.5).text(
      'Les informations peuvent être mises à jour en fonction des demandes des autorités compétentes, du greffe, et de la nature exacte de la formalité.',
      { align: 'justify', lineGap: 2 },
    );
  }

  drawPageFooter(doc);
  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return outputPath;
};

export {
  generateStatutesPdf,
};
