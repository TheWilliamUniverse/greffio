import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';

const mandateDir = path.resolve(process.cwd(), 'server', 'data', 'generated', 'mandates');
if (!fs.existsSync(mandateDir)) {
  fs.mkdirSync(mandateDir, { recursive: true });
}

const generateMandatePdf = async ({
  filename,
  title = 'Procuration Greffio',
  bodyText,
  signatureSummary,
  evidence,
}) => {
  const targetPath = path.join(mandateDir, filename);
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(targetPath);
  doc.pipe(stream);

  doc.fontSize(18).text(title, { align: 'left' });
  doc.moveDown(1);
  doc.fontSize(11).text(bodyText, { align: 'left' });
  doc.moveDown(1.5);
  doc.fontSize(12).text('Preuve de signature', { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(10).text(signatureSummary, { align: 'left' });
  doc.moveDown(0.6);
  doc.fontSize(8).fillColor('gray').text(`Hash: ${evidence?.documentHash || 'N/A'}`);
  doc.text(`IP: ${evidence?.ipAddress || 'N/A'}`);
  doc.text(`User-Agent: ${evidence?.userAgent || 'N/A'}`);
  doc.text(`Version document: ${evidence?.documentVersion || 'v1'}`);
  doc.moveDown(1.2);
  doc.fontSize(8).fillColor('#999999').text('Document preparé via Greffio', { align: 'right' });

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return targetPath;
};

export {
  generateMandatePdf,
};
