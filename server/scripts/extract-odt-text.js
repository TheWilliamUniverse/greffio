/**
 * One-off: extract plain text paragraphs from ODT for diff vs generator.
 * Usage: node server/scripts/extract-odt-text.js "path/to/file.odt"
 */
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';

function decodeXmlEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

function stripXmlTags(s) {
  return decodeXmlEntities(
    s
      .replace(/<text:s\/>/g, ' ')
      .replace(/<text:line-break\/>/g, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractOdtParagraphs(odtPath) {
  const buf = fs.readFileSync(odtPath);
  const files = unzipSync(new Uint8Array(buf));
  const xml = new TextDecoder().decode(files['content.xml']);
  const paragraphs = [];
  const re = /<text:p[^>]*>([\s\S]*?)<\/text:p>/g;
  let m;
  while ((m = re.exec(xml))) {
    const inner = stripXmlTags(m[1]);
    if (inner) paragraphs.push(inner);
  }
  return paragraphs;
}

const paths = process.argv.slice(2);
if (!paths.length) {
  console.error('Usage: node extract-odt-text.js file.odt [file2.odt ...]');
  process.exit(1);
}

for (const p of paths) {
  const paragraphs = extractOdtParagraphs(p);
  console.log(`=== ${path.basename(p)} (${paragraphs.length} paragraphs) ===`);
  paragraphs.forEach((line, i) => {
    console.log(`${String(i + 1).padStart(4)} | ${line.slice(0, 200)}`);
  });
  console.log();
}
