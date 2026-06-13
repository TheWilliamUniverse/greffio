import { sendWithProvider } from '../../emails/provider.js';
import { maskEmailFirstFour } from '../../utils/maskEmail.js';
import {
  generateAccessCode,
  getCodeRecipientEmail,
  isAccessTokenValid,
  verifyAccessCode,
} from './appDownloadAccessStore.js';

const buildCodeEmail = ({ code, appUrl }) => ({
  subject: 'Code d’accès – téléchargement app Greffio',
  html: `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0f2750">
      <p>Bonjour,</p>
      <p>Voici votre code d’accès à la page privée de téléchargement Greffio&nbsp;:</p>
      <p style="font-size:28px;font-weight:800;letter-spacing:0.35em">${code}</p>
      <p>Ce code expire dans <strong>15 minutes</strong>.</p>
      <p>Page&nbsp;: <a href="${appUrl}/telechargement-app">${appUrl}/telechargement-app</a></p>
      <p style="color:#64748b;font-size:13px">Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.</p>
    </div>
  `.trim(),
  text: `Code d'accès Greffio: ${code}\nPage: ${appUrl}/telechargement-app\nExpire dans 15 minutes.`,
});

export const requestAppDownloadAccessCode = async ({ appUrl }) => {
  const recipient = getCodeRecipientEmail();
  const code = generateAccessCode();
  const emailPayload = buildCodeEmail({ code, appUrl });

  const result = await sendWithProvider({
    to: recipient,
    subject: emailPayload.subject,
    html: emailPayload.html,
    text: emailPayload.text,
    tags: ['app-download-access'],
  });

  if (!result.ok && process.env.NODE_ENV !== 'production') {
    console.info('APP_DOWNLOAD_ACCESS_CODE_DEV', { recipient, code });
    return {
      ok: true,
      recipientMasked: maskEmailFirstFour(recipient),
      devCodeLogged: true,
    };
  }

  if (!result.ok) {
    return { ok: false, error: 'APP_DOWNLOAD_CODE_SEND_FAILED' };
  }

  return {
    ok: true,
    recipientMasked: maskEmailFirstFour(recipient),
  };
};

export const verifyAppDownloadAccess = ({ code, accessToken }) => {
  if (accessToken && isAccessTokenValid(accessToken)) {
    return { ok: true, accessToken, revalidated: true };
  }
  return verifyAccessCode(code);
};
