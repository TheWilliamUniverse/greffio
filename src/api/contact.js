import { apiPost } from '@/api/client.js';
import { buildCaptchaPayload } from '@/utils/captchaPayload.js';

export const submitAppointmentRequest = async (payload) => {
  const {
    turnstileToken,
    recaptchaToken,
    provider,
    ...rest
  } = payload || {};
  return apiPost(
    '/api/contact/appointment-request',
    {
      ...rest,
      ...buildCaptchaPayload({ turnstileToken, recaptchaToken, provider }),
    },
    { auth: false },
  );
};
