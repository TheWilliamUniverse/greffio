import fs from 'node:fs';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { StandardFonts } from 'pdf-lib';

const FONT_DIR = path.resolve(process.cwd(), 'server', 'fonts');

const readFontBytes = (filename) => {
  const filePath = path.join(FONT_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
};

export const loadPdfFonts = async (pdfDoc) => {
  try {
    pdfDoc.registerFontkit(fontkit);
    const regularBytes = readFontBytes('Inter-Regular.ttf');
    const boldBytes = readFontBytes('Inter-Bold.ttf');
    const italicBytes = readFontBytes('Inter-Italic.ttf');
    if (regularBytes && boldBytes && italicBytes) {
      const [font, fontBold, fontItalic] = await Promise.all([
        pdfDoc.embedFont(regularBytes, { subset: true }),
        pdfDoc.embedFont(boldBytes, { subset: true }),
        pdfDoc.embedFont(italicBytes, { subset: true }),
      ]);
      return { font, fontBold, fontItalic, fontFamily: 'Inter' };
    }
  } catch (error) {
    console.warn('PDF_INTER_FONT_EMBED_FAILED', error?.message || error);
  }

  const [font, fontBold, fontItalic] = await Promise.all([
    pdfDoc.embedFont(StandardFonts.Helvetica),
    pdfDoc.embedFont(StandardFonts.HelveticaBold),
    pdfDoc.embedFont(StandardFonts.HelveticaOblique),
  ]);
  return { font, fontBold, fontItalic, fontFamily: 'Helvetica' };
};
