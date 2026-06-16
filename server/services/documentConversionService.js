import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  convertDocumentViaOnlyOffice,
  isOnlyOfficeConfigured,
} from './onlyofficeService.js';

const runLibreOfficeConvert = (sofficeBin, workDir, inputPath) => new Promise((resolve, reject) => {
  const args = [
    '--headless',
    '--nologo',
    '--nofirststartwizard',
    '--convert-to',
    'pdf',
    '--outdir',
    workDir,
    inputPath,
  ];
  const child = spawn(sofficeBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });
  child.on('error', (error) => {
    reject(error);
  });
  child.on('close', (code) => {
    if (code === 0) {
      resolve();
      return;
    }
    const error = new Error(`LIBREOFFICE_CONVERT_EXIT_${code}`);
    error.code = 'LIBREOFFICE_CONVERT_FAILED';
    error.stderr = stderr.trim();
    reject(error);
  });
});

export const convertDocxBufferToPdfViaLibreOffice = async (docxBuffer) => {
  if (!Buffer.isBuffer(docxBuffer) || docxBuffer.length === 0) {
    const error = new Error('DOCX_BUFFER_EMPTY');
    error.code = 'DOCX_BUFFER_EMPTY';
    throw error;
  }

  const sofficeBin = String(process.env.LIBREOFFICE_BIN || 'soffice').trim();
  const workDir = join(tmpdir(), `greffio-convert-${randomUUID()}`);
  const inputPath = join(workDir, 'input.docx');
  const outputPath = join(workDir, 'input.pdf');

  await mkdir(workDir, { recursive: true });
  try {
    await writeFile(inputPath, docxBuffer);
    await runLibreOfficeConvert(sofficeBin, workDir, inputPath);
    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
};

/**
 * Convert DOCX → PDF using ONLYOFFICE ConvertService when available,
 * falling back to LibreOffice headless on the local buffer.
 */
export const convertDocxBufferToPdf = async ({
  docxBuffer,
  fileUrl = null,
  conversionKey = null,
}) => {
  if (isOnlyOfficeConfigured() && fileUrl) {
    try {
      return await convertDocumentViaOnlyOffice({
        fileUrl,
        fileType: 'docx',
        outputType: 'pdf',
        key: conversionKey,
      });
    } catch (error) {
      console.warn('[document-conversion] ONLYOFFICE convert failed, trying LibreOffice', {
        message: error?.message || error,
      });
    }
  }

  return convertDocxBufferToPdfViaLibreOffice(docxBuffer);
};
