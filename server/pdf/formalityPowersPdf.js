import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatFrenchDate } from './nonConvictionPdf.js';
import {
  FORMALITY_POWERS_IDENTITY_BELOW_LINE,
  FORMALITY_POWERS_SIGNATURE_FAIT_ABOVE_LINE,
  FORMALITY_POWERS_SIGNATURE_HEADING_ABOVE_LINE,
  FORMALITY_POWERS_SIGNATURE_LABEL_ABOVE_LINE,
  FORMALITY_POWERS_SIGNATURE_LINE_Y,
  LEGAL_RAPPEL_BOTTOM_Y,
} from './pdfLegalConstants.js';

const outputDir = path.resolve(process.cwd(), 'server', 'data', 'generated', 'formality-powers');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_TOP = 71;
const MARGIN_BOTTOM = 57;
const MARGIN_H = 71;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_H * 2;
const FOOTER_Y = 28;

const COLOR_TEXT = rgb(0, 0, 0);
const COLOR_MUTED = rgb(0.2, 0.2, 0.2);

const SIZE_OVERLINE = 11;
const SIZE_TITLE = 14.5;
const SIZE_BODY = 11.5;
const SIZE_FOOTER = 8.8;

const LINE_BODY = SIZE_BODY * 1.55;
const GAP_SECTION = 28;
const GAP_AFTER_HEADER = 44;
const GAP_AFTER_H2 = 12;
const GAP_PARAGRAPH = 10;
const GAP_BULLET = 7;

/** Zone signature (dernière page) – alignée avec stampSignatureOnPdf */
export { FORMALITY_POWERS_SIGNATURE_LINE_Y } from './pdfLegalConstants.js';

const LEGAL_FORM_LABELS = {
  SAS: 'société par actions simplifiée',
  SASU: 'société par actions simplifiée unipersonnelle',
  SARL: 'société à responsabilité limitée',
  EURL: 'entreprise unipersonnelle à responsabilité limitée',
  SA: 'société anonyme',
  SCI: 'société civile immobilière',
};

const POUVOIRS_CONFERES_BULLETS = [
  'préparer, compléter, vérifier, organiser et transmettre le dossier de formalités ;',
  'renseigner, valider et déposer les formulaires, déclarations et pièces justificatives requis ;',
  'effectuer les dépôts et transmissions auprès du guichet unique, de l\'INPI, du greffe compétent, du registre du commerce et des sociétés, de l\'INSEE, des services fiscaux, des organismes sociaux et de tout organisme administratif concerné ;',
  'demander l\'immatriculation, l\'inscription, la modification, la régularisation ou le suivi administratif de la société ;',
  'signer électroniquement les pièces, formulaires, déclarations, attestations ou documents lorsque la loi, les plateformes utilisées ou les organismes compétents l\'autorisent ;',
  'transmettre les documents par voie électronique, téléverser les pièces utiles et valider les étapes techniques nécessaires à la progression du dossier.',
];

const SUIVI_BULLETS = [
  'répondre aux observations, notifications, rejets, demandes de précisions, demandes de pièces complémentaires ou demandes de régularisation émises par les organismes compétents ;',
  'corriger toute erreur matérielle, compléter les informations manquantes, reformuler les champs déclaratifs et transmettre toute pièce complémentaire nécessaire à la recevabilité ou à l\'aboutissement du dossier ;',
  'recevoir, télécharger, conserver et transmettre au Mandant les récépissés, accusés de réception, notifications, justificatifs, extraits, avis, certificats et documents issus de la formalité ;',
  'procéder à tout échange raisonnablement nécessaire avec les organismes compétents afin de défendre la cohérence, la complétude et la recevabilité du dossier transmis ;',
  'adapter la présentation matérielle du dossier, sans modifier la substance des déclarations du Mandant, lorsque cette adaptation est requise pour des raisons techniques, administratives ou de lisibilité.',
];

const pdfSafe = (value) => String(value ?? '')
  .normalize('NFC')
  .replace(/\u202f/g, ' ')
  .replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, (char) => {
    const ascii = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return ascii || '?';
  });

const resolveLegalFormLabel = (code) => {
  const key = String(code || '').trim().toUpperCase();
  return LEGAL_FORM_LABELS[key] || key || 'forme sociale';
};

const wrapText = (text, maxChars = 82) => {
  const words = pdfSafe(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

const drawCentered = (page, font, y, text, size) => {
  const safe = pdfSafe(text);
  const textWidth = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, {
    x: (PAGE_WIDTH - textWidth) / 2,
    y,
    size,
    font,
    color: COLOR_TEXT,
  });
  return y;
};

const drawLeftLines = (page, font, y, text, { size = SIZE_BODY, lineHeight = LINE_BODY, indent = 0 } = {}) => {
  wrapText(text).forEach((line) => {
    page.drawText(line, {
      x: MARGIN_H + indent,
      y,
      size,
      font,
      color: COLOR_TEXT,
      maxWidth: CONTENT_WIDTH - indent,
    });
    y -= lineHeight;
  });
  return y;
};

const drawSectionHeading = (page, fontBold, y, title) => {
  page.drawText(pdfSafe(title.toUpperCase()), {
    x: MARGIN_H,
    y,
    size: SIZE_BODY,
    font: fontBold,
    color: COLOR_TEXT,
  });
  return y - GAP_AFTER_H2;
};

const drawBulletList = (page, font, y, items) => {
  const bulletIndent = 22;
  items.forEach((item) => {
    page.drawText('-', {
      x: MARGIN_H + 4,
      y,
      size: SIZE_BODY,
      font,
      color: COLOR_TEXT,
    });
    y = drawLeftLines(page, font, y, item, { indent: bulletIndent });
    y -= GAP_BULLET;
  });
  return y;
};

const estimateBlockHeight = (text, lineHeight = LINE_BODY) => wrapText(text).length * lineHeight + GAP_PARAGRAPH;

const estimateBulletsHeight = (items) => items.reduce(
  (sum, item) => sum + wrapText(item).length * LINE_BODY + GAP_BULLET,
  0,
);

const drawPinnedRappel = (targetPage, font, fontBold, text) => {
  const lines = wrapText(text);
  const headingHeight = SIZE_BODY + GAP_AFTER_H2;
  const bodyHeight = lines.length * LINE_BODY;
  let blockY = LEGAL_RAPPEL_BOTTOM_Y + bodyHeight + headingHeight;
  blockY = drawSectionHeading(targetPage, fontBold, blockY, 'Rappel');
  lines.forEach((line) => {
    targetPage.drawText(line, {
      x: MARGIN_H,
      y: blockY,
      size: SIZE_BODY,
      font,
      color: COLOR_TEXT,
      maxWidth: CONTENT_WIDTH,
    });
    blockY -= LINE_BODY;
  });
};

export const generateFormalityPowersPdf = async ({
  filename,
  fields = {},
  documentId: _documentId = null,
  verifyToken: _verifyToken = null,
  appUrl: _appUrl = null,
}) => {
  const targetPath = path.join(outputDir, filename);
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const companyName = pdfSafe(fields.companyName || '______________________________');
  const legalFormLabel = resolveLegalFormLabel(fields.legalForm);
  const greffe = pdfSafe(fields.greffe || '______________________');
  const mandataire = pdfSafe(fields.mandataire || 'WILLIAM ESTABLISHMENTS');
  const city = pdfSafe(fields.statementCity || '______________________');
  const dateFr = formatFrenchDate(fields.statementDate) || '____ / ____ / ______';
  const signatoryName = pdfSafe(fields.signatoryName || fields.signatureFullName || 'Le signataire');
  const signatoryCapacity = pdfSafe(fields.signatoryTitle || fields.signatoryCapacity || 'Personne habilitée');
  const clientFullName = pdfSafe(fields.clientFullName || signatoryName);
  const clientBirthDate = formatFrenchDate(fields.clientBirthDate) || '____ / ____ / ______';
  const clientBirthPlace = pdfSafe(fields.clientBirthPlace || '______________________');
  const clientAddress = pdfSafe(fields.clientAddress || 'Adresse complète à compléter');
  const registeredOffice = pdfSafe(fields.companyRegisteredOffice || fields.registeredOffice || 'siège social à compléter');
  const sirenRaw = String(fields.companySirenOrSiret || fields.companySiren || '').trim();
  const companyIdPhrase = sirenRaw
    ? `immatriculée sous le numéro ${pdfSafe(sirenRaw)}`
    : 'en cours de constitution';

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let pageNumber = 1;
  let totalPages = 1;
  let y = PAGE_HEIGHT - MARGIN_TOP;

  const drawFooter = (targetPage, num) => {
    const label = `Page ${num}`;
    targetPage.drawText('Pouvoirs pour formalités et procuration du client', {
      x: MARGIN_H,
      y: FOOTER_Y,
      size: SIZE_FOOTER,
      font,
      color: COLOR_MUTED,
    });
    targetPage.drawText(label, {
      x: PAGE_WIDTH - MARGIN_H - font.widthOfTextAtSize(label, SIZE_FOOTER),
      y: FOOTER_Y,
      size: SIZE_FOOTER,
      font,
      color: COLOR_MUTED,
    });
  };

  const startNewPage = () => {
    drawFooter(page, pageNumber);
    pageNumber += 1;
    totalPages += 1;
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN_TOP;
  };

  const ensureSpace = (needed) => {
    if (y - needed < MARGIN_BOTTOM) startNewPage();
  };

  const drawParagraph = (text) => {
    ensureSpace(estimateBlockHeight(text));
    y = drawLeftLines(page, font, y, text);
    y -= GAP_PARAGRAPH;
  };

  const drawSection = (heading, paragraphs = [], bullets = []) => {
    ensureSpace(GAP_AFTER_H2 + 20);
    y = drawSectionHeading(page, fontBold, y, heading);
    paragraphs.forEach((paragraph) => {
      drawParagraph(paragraph);
    });
    if (bullets.length) {
      ensureSpace(estimateBulletsHeight(bullets));
      y = drawBulletList(page, font, y, bullets);
      y -= 4;
    }
    y -= GAP_SECTION - GAP_PARAGRAPH;
  };

  y = drawCentered(page, fontBold, y, 'POUVOIRS POUR FORMALITÉS', SIZE_OVERLINE);
  y -= SIZE_TITLE * 1.2;
  y = drawCentered(page, fontBold, y, 'ET PROCURATION DU CLIENT', SIZE_TITLE);
  y -= GAP_AFTER_HEADER;

  drawSection('Identité du mandant', [
    `Je soussigné(e), ${clientFullName},`,
    `né(e) le ${clientBirthDate} à ${clientBirthPlace},`,
    `demeurant ${clientAddress},`,
    `agissant en qualité de ${signatoryCapacity} de la société ${companyName}, ${legalFormLabel}, dont le siège social est fixé au ${registeredOffice}, ${companyIdPhrase}, relevant du greffe compétent de ${greffe}.`,
  ]);

  drawSection('Identité du mandataire', [
    `Donne par les présentes pouvoir spécial à ${mandataire}, société par actions simplifiée immatriculée au registre du commerce et des sociétés de Nice sous le numéro 102 230 414, ci-après le Mandataire, représentée par toute personne dûment habilitée à cet effet.`,
    'Le Mandataire pourra se substituer toute personne physique ou morale strictement nécessaire à l\'accomplissement des formalités confiées, notamment un collaborateur, un prestataire technique, une plateforme administrative, un service habilité ou tout organisme compétent intervenant dans le traitement du dossier.',
  ]);

  drawSection('Objet de la procuration', [
    'La présente procuration a pour objet d\'autoriser expressément le Mandataire à accomplir, au nom et pour le compte du Mandant, les démarches administratives, déclaratives, documentaires, électroniques et de suivi nécessaires ou utiles aux formalités d\'entreprise relatives à la société désignée ci-dessus.',
    'Elle couvre notamment les formalités de constitution, d\'immatriculation, de modification, de régularisation, de correction, de suivi et de transmission du dossier auprès des administrations, plateformes et organismes compétents.',
  ]);

  drawSection('Pouvoirs conférés', [
    'À ce titre, le Mandant autorise expressément le Mandataire à accomplir, dans la limite du dossier confié, les actes suivants :',
  ], POUVOIRS_CONFERES_BULLETS);

  drawSection('Suivi, corrections et régularisations', [
    'Le Mandataire est également autorisé à assurer le suivi administratif et technique de la formalité jusqu\'à son aboutissement ou jusqu\'à la réception d\'une décision, notification ou demande de complément émanant de l\'organisme compétent.',
    'À ce titre, le Mandant autorise expressément le Mandataire à :',
  ], SUIVI_BULLETS);

  drawSection('Exclusion des annonces légales', [
    `La présente procuration n'autorise pas ${mandataire} à publier, commander, valider, modifier, renouveler, payer ou faire publier une annonce légale au nom et pour le compte du Mandant.`,
    'Toute intervention relative à une annonce légale devra faire l\'objet d\'un mandat écrit distinct, exprès et spécifique, ou être accomplie directement par le Mandant ou par le professionnel qu\'il aura choisi.',
    'Aucune mention du présent document ne doit être interprétée comme conférant au Mandataire un pouvoir général de publicité légale. Les formalités visées par la présente procuration sont exclusivement les formalités administratives, déclaratives, documentaires, électroniques, de dépôt, de suivi, de correction et de régularisation du dossier confié.',
  ]);

  drawSection('Déclarations et responsabilité du mandant', [
    'Le Mandant déclare que les informations, documents, justificatifs, décisions, autorisations et pièces transmis au Mandataire sont exacts, complets, sincères et à jour.',
    'Le Mandant reconnaît demeurer seul responsable de l\'exactitude des informations communiquées, de la conformité des pièces fournies, de la capacité juridique des personnes désignées, de la régularité des décisions sociales transmises et de l\'existence des autorisations nécessaires à la formalité.',
    'Le Mandant s\'engage à informer sans délai le Mandataire de toute erreur, omission, modification, changement de situation ou information nouvelle susceptible d\'avoir une incidence sur la formalité confiée.',
  ]);

  drawSection('Limites du mandat', [
    'La présente procuration est limitée aux actes strictement nécessaires ou utiles à l\'accomplissement des formalités confiées. Elle ne permet pas au Mandataire, sauf instruction écrite distincte du Mandant, d\'ouvrir un compte bancaire, de contracter un emprunt, de céder des titres sociaux, de prendre une décision sociale relevant des associés ou dirigeants, ni d\'engager la société dans une opération étrangère au dossier de formalités.',
    'Le Mandataire agit sur la base des informations et documents communiqués par le Mandant. Il ne se substitue ni aux administrations, ni aux greffes, ni aux autorités compétentes, ni aux professionnels réglementés lorsque leur intervention est légalement requise.',
  ]);

  const lineY = FORMALITY_POWERS_SIGNATURE_LINE_Y;
  const signatureBlockTopY = lineY + FORMALITY_POWERS_SIGNATURE_HEADING_ABOVE_LINE + 12;
  const dureeHeightEstimate = (
    GAP_AFTER_H2
    + wrapText('La présente procuration prend effet à compter de sa signature par le Mandant. Elle demeure valable jusqu\'à l\'accomplissement complet de la formalité confiée, incluant, le cas échéant, les corrections, compléments, échanges avec les organismes compétents et réception des justificatifs définitifs.').length * LINE_BODY
    + wrapText('Elle pourra être révoquée à tout moment par notification écrite adressée au Mandataire, sans remettre en cause les actes régulièrement accomplis avant la réception effective de cette révocation.').length * LINE_BODY
    + wrapText('Le Mandant reconnaît avoir été informé que toute indication inexacte, incomplète ou trompeuse transmise dans le cadre d\'une formalité d\'entreprise peut entraîner le rejet du dossier, une demande de régularisation, un retard de traitement ou, le cas échéant, l\'engagement de sa responsabilité.').length * LINE_BODY
    + GAP_PARAGRAPH * 3
    + GAP_SECTION
  );
  if (y - dureeHeightEstimate < signatureBlockTopY) {
    startNewPage();
  }

  drawSection('Durée et révocation', [
    'La présente procuration prend effet à compter de sa signature par le Mandant. Elle demeure valable jusqu\'à l\'accomplissement complet de la formalité confiée, incluant, le cas échéant, les corrections, compléments, échanges avec les organismes compétents et réception des justificatifs définitifs.',
    'Elle pourra être révoquée à tout moment par notification écrite adressée au Mandataire, sans remettre en cause les actes régulièrement accomplis avant la réception effective de cette révocation.',
    'Le Mandant reconnaît avoir été informé que toute indication inexacte, incomplète ou trompeuse transmise dans le cadre d\'une formalité d\'entreprise peut entraîner le rejet du dossier, une demande de régularisation, un retard de traitement ou, le cas échéant, l\'engagement de sa responsabilité.',
  ]);

  const lineX = MARGIN_H + 52;

  page.drawText(pdfSafe('Signature du mandant').toUpperCase(), {
    x: MARGIN_H,
    y: lineY + FORMALITY_POWERS_SIGNATURE_HEADING_ABOVE_LINE,
    size: SIZE_BODY,
    font: fontBold,
    color: COLOR_TEXT,
  });
  page.drawText(pdfSafe(`Fait à ${city}, le ${dateFr}.`), {
    x: MARGIN_H,
    y: lineY + FORMALITY_POWERS_SIGNATURE_FAIT_ABOVE_LINE,
    size: SIZE_BODY,
    font,
    color: COLOR_TEXT,
  });
  page.drawText(pdfSafe('Signature du Mandant :'), {
    x: MARGIN_H,
    y: lineY + FORMALITY_POWERS_SIGNATURE_LABEL_ABOVE_LINE,
    size: SIZE_BODY,
    font,
    color: COLOR_TEXT,
  });
  page.drawLine({
    start: { x: lineX, y: lineY },
    end: { x: lineX + 220, y: lineY },
    thickness: 0.7,
    color: COLOR_TEXT,
  });
  let belowLineY = lineY - FORMALITY_POWERS_IDENTITY_BELOW_LINE;
  belowLineY = drawLeftLines(page, font, belowLineY, signatoryName);
  belowLineY = drawLeftLines(page, font, belowLineY, signatoryCapacity);
  belowLineY = drawLeftLines(page, font, belowLineY, 'Bon pour pouvoir');

  drawPinnedRappel(
    page,
    font,
    fontBold,
    `La présente procuration autorise ${mandataire} à accomplir les formalités administratives, déclaratives, documentaires et électroniques expressément nécessaires ou utiles au dossier confié, à l'exclusion des annonces légales, sauf mandat écrit distinct. Le Mandant demeure responsable de l'exactitude, de la sincérité et de l'exhaustivité des informations et documents transmis.`,
  );

  const pages = pdfDoc.getPages();
  totalPages = pages.length;
  pages.forEach((targetPage, index) => {
    const label = `Page ${index + 1} sur ${totalPages}`;
    targetPage.drawText('Pouvoirs pour formalités et procuration du client', {
      x: MARGIN_H,
      y: FOOTER_Y,
      size: SIZE_FOOTER,
      font,
      color: COLOR_MUTED,
    });
    targetPage.drawText(label, {
      x: PAGE_WIDTH - MARGIN_H - font.widthOfTextAtSize(label, SIZE_FOOTER),
      y: FOOTER_Y,
      size: SIZE_FOOTER,
      font,
      color: COLOR_MUTED,
    });
  });

  fs.writeFileSync(targetPath, await pdfDoc.save());
  return targetPath;
};

export { validateFormalityPowersFields } from '../documents/formalityPowers/buildFields.js';
