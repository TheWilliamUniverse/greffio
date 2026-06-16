const PDF_MAGIC = Buffer.from('%PDF');
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const ZIP_MAGIC_EMPTY = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
const ZIP_MAGIC_SPANNED = Buffer.from([0x50, 0x4b, 0x07, 0x08]);

const hasPrefix = (buffer, prefix) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < prefix.length) return false;
  return buffer.subarray(0, prefix.length).equals(prefix);
};

export const isPdfBuffer = (buffer) => hasPrefix(buffer, PDF_MAGIC);

export const isZipBuffer = (buffer) => (
  hasPrefix(buffer, ZIP_MAGIC)
  || hasPrefix(buffer, ZIP_MAGIC_EMPTY)
  || hasPrefix(buffer, ZIP_MAGIC_SPANNED)
);

export const isDocxBuffer = (buffer) => {
  if (!isZipBuffer(buffer)) return false;
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096)).toString('binary');
  return sample.includes('word/document.xml') || sample.includes('word\\document.xml');
};

export const detectBufferFileFormat = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return 'unknown';
  if (isPdfBuffer(buffer)) return 'pdf';
  if (isDocxBuffer(buffer)) return 'docx';
  if (isZipBuffer(buffer)) return 'zip';
  return 'unknown';
};

export const assertDocxBuffer = (buffer) => {
  if (!isDocxBuffer(buffer)) {
    const detected = detectBufferFileFormat(buffer);
    const error = new Error(`Expected DOCX buffer but detected ${detected}`);
    error.code = 'INVALID_DOCX_BUFFER';
    error.detectedFormat = detected;
    throw error;
  }
  return buffer;
};
