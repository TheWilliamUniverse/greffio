const PDF_MIME = 'application/pdf';

const loadJsPdf = async () => {
  const { jsPDF } = await import('jspdf');
  return jsPDF;
};

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('FILE_READ_FAILED'));
  reader.readAsDataURL(file);
});

const loadImage = (dataUrl) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('IMAGE_DECODE_FAILED'));
  img.src = dataUrl;
});

const sanitizeBaseName = (name) => String(name || 'document')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')
  .toLowerCase()
  .slice(0, 80) || 'document';

export const ensurePdfFilename = (name) => {
  const base = sanitizeBaseName(String(name || '').replace(/\.[^.]+$/, ''));
  return base.endsWith('.pdf') ? base : `${base}.pdf`;
};

const imageToPdfBlob = async (file, { quality = 0.86, maxEdge = 2000 } = {}) => {
  const dataUrl = await readAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const ratio = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('CANVAS_UNAVAILABLE');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  const jpegData = canvas.toDataURL('image/jpeg', quality);
  const orientation = width >= height ? 'landscape' : 'portrait';
  const jsPDF = await loadJsPdf();
  const pdf = new jsPDF({ orientation, unit: 'pt', format: [width, height] });
  pdf.addImage(jpegData, 'JPEG', 0, 0, width, height);
  return pdf.output('blob');
};

export const normalizeUploadToPdf = async (file, options = {}) => {
  if (!file) throw new Error('FILE_REQUIRED');
  const mime = String(file.type || '').toLowerCase();
  const name = ensurePdfFilename(options.filename || file.name);

  if (mime === PDF_MIME || name.endsWith('.pdf')) {
    return new File([file], name, { type: PDF_MIME, lastModified: file.lastModified });
  }

  if (mime.startsWith('image/')) {
    const blob = await imageToPdfBlob(file, options);
    return new File([blob], name, { type: PDF_MIME, lastModified: Date.now() });
  }

  throw new Error('UNSUPPORTED_FORMAT');
};

export const normalizeUploadToPdfWithMessage = async (file, options = {}) => {
  try {
    const pdfFile = await normalizeUploadToPdf(file, options);
    return { ok: true, file: pdfFile };
  } catch (error) {
    const code = error?.message || 'CONVERSION_FAILED';
    const message = code === 'UNSUPPORTED_FORMAT'
      ? 'Ce format ne peut pas être converti en PDF. Utilisez une photo ou un PDF.'
      : 'Impossible de convertir le fichier en PDF. Réessayez avec une photo plus nette.';
    return { ok: false, error: code, message };
  }
};
