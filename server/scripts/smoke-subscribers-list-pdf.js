import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { generateSubscribersListPdf } from '../pdf/subscribersListPdf.js';

const fields = {
  legalFormHeader: 'Société par actions simplifiée en formation',
  companyName: 'TRUE POWER',
  companyLegalFormLabel: 'Société par Actions Simplifiée',
  companyCapital: '10 000 €',
  companyRegisteredOffice: '06200 Nice',
  companyFormationStatus: 'Société en cours de constitution',
  presidentDesignated: 'William ABDOU',
  introParagraph: "Le présent état récapitule les souscriptions d'actions effectuées dans le cadre de la constitution de la société désignée ci-dessus.",
  securitiesUnit: 'Actions',
  singleSubscriber: true,
  subscribers: [{
    qualityLabel: 'Président désigné / Souscripteur',
    fullName: 'William ABDOU',
    birthDatePlace: '28 juillet 2009 à Nice',
    nationality: 'Française',
    address: '29 Boulevard de Magnan, Appartement 22',
    titlesCount: '1 000',
    sharePercent: '100 %',
    contributionCash: '10 000 €',
    contributionInKind: 'Néant',
    liberationAmount: '5 000 €',
    observations: 'Mineur émancipé',
  }],
  recap: {
    totalShares: '1 000',
    totalCash: '10 000 €',
    totalInKind: 'Néant',
    totalLiberated: '5 000 €',
    totalPercent: '100 %',
  },
  certificationParagraph: "Le présent état constate la souscription de l'intégralité du capital social de la société en formation et le versement de la fraction libérée des apports en numéraire indiqués ci-dessus. Le Président certifie que les informations qui y figurent sont exactes, sincères et complètes.",
  depositParagraph: "La somme de 5 000 €, correspondant aux apports en numéraire libérés à la constitution, a été déposée sur un compte ouvert au nom de la société en formation, conformément à l'attestation du dépositaire des fonds.",
  statementCity: 'Nice',
  statementDate: '2026-06-16',
  signatureFullName: 'William ABDOU',
  presidentSignatureLabel: 'Président désigné',
  signatureReminder: 'Le président désigné est tenu de conserver les justificatifs des apports et de leur libération pendant la durée légale.',
};

const targetPath = await generateSubscribersListPdf({ filename: 'test-single-subscriber.pdf', fields });
const doc = await PDFDocument.load(fs.readFileSync(targetPath));
console.log(JSON.stringify({ pages: doc.getPageCount(), path: targetPath }));
