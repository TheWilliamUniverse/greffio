/**
 * Envoi ponctuel du runbook migration greffio.app par e-mail.
 * Usage (sur VPS avec .env prod) :
 *   node server/scripts/send-runbook-email-once.js william@willentreprises.com
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { sendWithProvider } from '../emails/provider.js';

dotenv.config({ quiet: true });

const to = process.argv[2] || 'william@willentreprises.com';
const runbookPath = path.resolve(
  process.cwd(),
  'docs/runbooks/GREFFIO_APP_MIGRATION_RUNBOOK.md',
);

if (!fs.existsSync(runbookPath)) {
  console.error('RUNBOOK_NOT_FOUND', runbookPath);
  process.exit(1);
}

const markdown = fs.readFileSync(runbookPath, 'utf8');
const text = [
  'Bonjour William,',
  '',
  'Veuillez trouver ci-dessous le runbook complet « Duplication miroir puis migration vers greffio.app ».',
  'Aucune action infra n\'a été appliquée — document prêt à l\'emploi uniquement.',
  '',
  'Fichier source dans le dépôt : docs/runbooks/GREFFIO_APP_MIGRATION_RUNBOOK.md',
  '',
  '—',
  '',
  markdown,
].join('\n');

const html = `
<div style="font-family:Georgia,serif;max-width:720px;color:#1e293b;line-height:1.55">
  <p>Bonjour William,</p>
  <p>Le runbook <strong>Greffio → greffio.app</strong> est prêt (stratégie <strong>miroir d'abord</strong>, migration intégrale ensuite).</p>
  <p style="background:#f1f5f9;padding:12px 16px;border-radius:8px;font-size:14px">
    <strong>Statut :</strong> aucune modification infra appliquée.<br>
    <strong>Fichier dépôt :</strong> <code>docs/runbooks/GREFFIO_APP_MIGRATION_RUNBOOK.md</code>
  </p>
  <h2 style="font-size:18px;margin-top:24px">Synthèse</h2>
  <ul style="font-size:14px">
    <li><strong>Phase A (miroir)</strong> : DNS greffio.app + api.greffio.app, domaine Hostinger en alias, CORS élargi, même build/dist, canon SEO sur willentreprises.</li>
    <li><strong>Phase B (migration)</strong> : APP_URL / VITE_* vers greffio.app, Mollie, 301, Search Console, release mobile.</li>
    <li><strong>Phase C</strong> : redirections 12 mois puis retrait ancien domaine.</li>
  </ul>
  <p style="font-size:13px;color:#64748b">Le contenu intégral du runbook est en pièce jointe texte ci-dessous (format markdown).</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
  <pre style="white-space:pre-wrap;font-size:11px;line-height:1.45;background:#f8fafc;padding:16px;border-radius:8px;overflow-x:auto">${markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')}</pre>
  <p style="font-size:12px;color:#94a3b8">Greffio — runbook généré le ${new Date().toISOString().slice(0, 10)}</p>
</div>
`;

const result = await sendWithProvider({
  to,
  toName: 'William ABDOU',
  subject: '[Greffio] Runbook migration greffio.app — miroir puis bascule (prêt à l\'emploi)',
  html,
  text,
  tags: ['runbook', 'greffio-app', 'migration'],
});

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
