/**
 * Génère un PDF de test complet pour l'assistant de complétion documentaire Greffio.
 * Couvre : underscores, libellés administratifs FR, dates, cases à cocher, signatures, AcroForm.
 *
 * Usage : node server/features/documentCompletion/fixtures/generate-test-document.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import { PDFDocument as PDFLibDocument, StandardFonts } from 'pdf-lib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, 'greffio-document-completion-test.pdf');

const line = (doc, label, underscoreLength = 42) => {
  doc.fontSize(11).fillColor('#111111').text(`${label} : ${'_'.repeat(underscoreLength)}`, {
    lineGap: 6,
  });
};

const checkboxLine = (doc, items) => {
  doc.fontSize(11).fillColor('#111111').text(items.map((item) => `[ ] ${item}`).join('    '), {
    lineGap: 6,
  });
};

const squareCheckboxLine = (doc, items) => {
  doc.fontSize(11).fillColor('#111111').text(items.map((item) => `□ ${item}`).join('    '), {
    lineGap: 6,
  });
};

const generateTextPages = () => new Promise((resolve, reject) => {
  const chunks = [];
  const doc = new PDFDocument({ size: 'A4', margin: 50, autoFirstPage: true });

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  doc.fontSize(16).fillColor('#0b3d91').text('Formulaire de test – Complétion documentaire Greffio', {
    align: 'center',
  });
  doc.moveDown(0.4);
  doc.fontSize(9).fillColor('#555555').text(
    'Document fictif à usage de test interne. Importez ce PDF dans /assistant-documents pour valider la détection des champs.',
    { align: 'center' },
  );
  doc.moveDown(1);

  doc.fontSize(13).fillColor('#111111').text('Page 1 – Identité et coordonnées du demandeur', { underline: true });
  doc.moveDown(0.6);

  doc.fontSize(12).fillColor('#333333').text('Section A – État civil');
  doc.moveDown(0.4);
  line(doc, 'Nom');
  line(doc, 'Prénom');
  line(doc, "Nom d'usage");
  line(doc, 'Date de naissance', 28);
  doc.text('Format attendu : __ / __ / ______', { lineGap: 6 });
  line(doc, 'Lieu de naissance');
  line(doc, 'Commune de naissance');
  line(doc, 'Nationalité');
  doc.moveDown(0.4);

  doc.fontSize(12).fillColor('#333333').text('Section B – Civilité et forme juridique');
  doc.moveDown(0.4);
  checkboxLine(doc, ['Monsieur', 'Madame', 'Autre']);
  squareCheckboxLine(doc, ['SAS', 'SARL', 'SASU', 'EURL']);
  doc.moveDown(0.4);

  doc.fontSize(12).fillColor('#333333').text('Section C – Adresse et contact');
  doc.moveDown(0.4);
  line(doc, 'Domicile');
  line(doc, 'Adresse');
  line(doc, 'Code postal', 12);
  doc.text('Ville : _________________________________', { lineGap: 6 });
  line(doc, 'Commune');
  line(doc, 'Pays');
  line(doc, 'Email');
  line(doc, 'Courriel');
  line(doc, 'Téléphone');
  line(doc, 'Portable');
  doc.moveDown(0.6);

  doc.text('Fait à _________________________________ le __ / __ / ______', { lineGap: 6 });
  doc.moveDown(0.8);
  doc.text('Signature du demandeur', { lineGap: 4 });
  doc.text('_________________________________________', { lineGap: 6 });
  doc.text('Cachet et signature', { lineGap: 4 });
  doc.text('_________________________________________', { lineGap: 6 });

  doc.addPage();

  doc.fontSize(13).fillColor('#111111').text('Page 2 – Société et informations registrales', { underline: true });
  doc.moveDown(0.6);

  doc.fontSize(12).fillColor('#333333').text('Section D – Identification de la société');
  doc.moveDown(0.4);
  line(doc, 'Dénomination sociale');
  line(doc, 'Raison sociale');
  line(doc, 'Nom commercial');
  line(doc, 'Forme juridique');
  line(doc, 'Statut juridique');
  line(doc, 'Capital social', 24);
  doc.text('Montant du capital : _________________________________ EUR', { lineGap: 6 });
  doc.moveDown(0.4);

  doc.fontSize(12).fillColor('#333333').text('Section E – Registre du commerce');
  doc.moveDown(0.4);
  line(doc, 'Numéro SIREN', 20);
  line(doc, 'SIREN', 20);
  line(doc, 'Numéro SIRET', 20);
  line(doc, 'SIRET', 20);
  line(doc, 'Immatriculé au RCS de');
  line(doc, 'Greffe de');
  line(doc, 'Code APE', 16);
  line(doc, 'Code NAF', 16);
  doc.moveDown(0.4);

  doc.fontSize(12).fillColor('#333333').text('Section F – Siège et compte bancaire');
  doc.moveDown(0.4);
  line(doc, 'Siège social');
  line(doc, "Adresse de l'établissement");
  line(doc, 'Adresse du siège');
  line(doc, 'IBAN');
  line(doc, 'Compte bancaire');
  doc.moveDown(0.4);

  doc.fontSize(12).fillColor('#333333').text('Section G – Objet social (zone longue)');
  doc.moveDown(0.4);
  doc.text('Activité principale exercée : _________________________________', { lineGap: 6 });
  doc.text('Objet social :', { lineGap: 4 });
  doc.text('_________________________________________', { lineGap: 4 });
  doc.text('_________________________________________', { lineGap: 4 });
  doc.text('_________________________________________', { lineGap: 6 });
  doc.moveDown(0.4);

  doc.text('Je certifie l\'exactitude des renseignements : ☐ Oui    ☐ Non', { lineGap: 6 });
  doc.text('Date du document : jj / mm / aaaa', { lineGap: 6 });
  doc.moveDown(0.8);
  doc.text('Signature du représentant légal', { lineGap: 4 });
  doc.text('_________________________________________', { lineGap: 6 });

  doc.addPage();

  doc.fontSize(13).fillColor('#111111').text('Page 3 – Champs AcroForm natifs (PDF interactif)', { underline: true });
  doc.moveDown(0.6);
  doc.fontSize(10).fillColor('#555555').text(
    'Cette page contient des champs de formulaire PDF préexistants (AcroForm). '
    + 'Greffio doit les détecter via la méthode existing_pdf_form_field.',
    { lineGap: 4 },
  );
  doc.moveDown(0.8);
  doc.fontSize(11).fillColor('#111111');
  doc.text('Nom (AcroForm) :', 50, doc.y);
  doc.text('Prénom (AcroForm) :', 50, doc.y + 36);
  doc.text('Date de naissance (AcroForm) :', 50, doc.y + 36);
  doc.text('SIREN (AcroForm) :', 50, doc.y + 36);
  doc.text('Email (AcroForm) :', 50, doc.y + 36);
  doc.text('Signature (AcroForm) :', 50, doc.y + 48);
  doc.text('[ ] J\'accepte les conditions (AcroForm)', 50, doc.y + 60);

  doc.end();
});

const ACRO_FIELDS = [
  { name: 'acro_nom', pageIndex: 2, x: 220, y: 680, width: 280, height: 18, type: 'text' },
  { name: 'acro_prenom', pageIndex: 2, x: 220, y: 644, width: 280, height: 18, type: 'text' },
  { name: 'acro_date_naissance', pageIndex: 2, x: 260, y: 608, width: 120, height: 18, type: 'text' },
  { name: 'acro_siren', pageIndex: 2, x: 220, y: 572, width: 160, height: 18, type: 'text' },
  { name: 'acro_email', pageIndex: 2, x: 220, y: 536, width: 280, height: 18, type: 'text' },
  { name: 'acro_signature', pageIndex: 2, x: 220, y: 488, width: 220, height: 48, type: 'text' },
  { name: 'acro_accept_conditions', pageIndex: 2, x: 50, y: 430, width: 16, height: 16, type: 'checkbox' },
];

const addAcroFormFields = async (pdfBytes) => {
  const pdfDoc = await PDFLibDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);

  for (const spec of ACRO_FIELDS) {
    const page = pdfDoc.getPages()[spec.pageIndex];
    if (!page) continue;
    if (spec.type === 'checkbox') {
      const checkbox = form.createCheckBox(spec.name);
      checkbox.addToPage(page, {
        x: spec.x,
        y: spec.y,
        width: spec.width,
        height: spec.height,
      });
    } else {
      const textField = form.createTextField(spec.name);
      textField.setText('');
      textField.addToPage(page, {
        x: spec.x,
        y: spec.y,
        width: spec.width,
        height: spec.height,
      });
    }
  }

  return pdfDoc.save();
};

const main = async () => {
  const textPdf = await generateTextPages();
  const finalPdf = await addAcroFormFields(textPdf);
  fs.writeFileSync(OUTPUT, finalPdf);
  console.log(`PDF de test généré : ${OUTPUT}`);
  console.log(`Taille : ${(finalPdf.length / 1024).toFixed(1)} Ko`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
