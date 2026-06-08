import { apiPost } from '@/api/client.js';

export const submitAppointmentRequest = async (payload) => {
  const { turnstileToken, ...rest } = payload || {};
  return apiPost(
    '/api/contact/appointment-request',
    {
      ...rest,
      ...(turnstileToken ? { turnstileToken } : {}),
    },
    { auth: false },
  );
};
