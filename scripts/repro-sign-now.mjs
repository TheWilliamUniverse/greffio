/* Repro local du bug signature DNC : signup → dossier → sign-now. */
const API = 'http://localhost:8787';

const post = async (path, body, token) => {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-json */ }
  return { status: res.status, json, text: json ? null : text.slice(0, 400) };
};

const main = async () => {
  const email = `repro${Date.now()}@test.local`;
  const signup = await post('/api/auth/signup', {
    email,
    password: 'Repro-Test-2026!',
    firstName: 'Martin',
    lastName: 'Luther',
    role: 'CLIENT',
  });
  console.log('signup', signup.status, signup.json?.error || 'ok', signup.text || '');
  const token = signup.json?.accessToken || signup.json?.token;
  if (!token) { console.log(JSON.stringify(signup.json).slice(0, 600)); return; }

  const dossier = await post('/api/dossiers', {
    companyName: 'WILLIAM ESTABLISHMENTS (WX)',
    legalForm: 'SAS',
    service: 'creation',
  }, token);
  console.log('dossier', dossier.status, dossier.json?.error || 'ok');
  const dossierId = dossier.json?.dossier?.id || dossier.json?.id;
  if (!dossierId) { console.log(JSON.stringify(dossier.json).slice(0, 600)); return; }

  const fields = {
    declarantFirstName: 'Martin',
    declarantBirthName: 'Luther',
    declarantLastName: 'Luther',
    declarantBirthDate: '1990-01-15',
    declarantBirthCity: 'Nice',
    addressLine1: '1 rue de la République',
    postalCode: '06200',
    city: 'Nice',
    fatherFullName: 'Martin John Luther',
    parent2FirstNames: 'Martha',
    parent2BirthName: 'Luther',
    statementCity: 'Nice',
    statementDate: '2026-06-12',
    signatureFullName: 'Martin Luther',
    declarationNonCondamnation: true,
    declarationFiliation: true,
  };

  const signNow = await post(`/api/dossiers/${dossierId}/documents/manager_non_conviction/sign-now`, {
    fields,
    signerFullName: 'Martin Luther',
    signerEmail: email,
    consent: true,
    previewAcknowledged: true,
    signatureImagePngBase64: null,
  }, token);
  console.log('sign-now', signNow.status, JSON.stringify(signNow.json || signNow.text).slice(0, 800));

  const sendSig = await post(`/api/dossiers/${dossierId}/documents/manager_non_conviction/send-signature`, {
    fields,
    signerEmail: email,
    signerFullName: 'Martin Luther',
  }, token);
  console.log('send-signature', sendSig.status, JSON.stringify(sendSig.json || sendSig.text).slice(0, 800));
};

main().catch((e) => { console.error('REPRO_FAILED', e); process.exit(1); });
