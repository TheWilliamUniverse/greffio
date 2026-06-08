import { apiPost } from '@/api/client.js';

export const submitAppointmentRequest = async (payload) => apiPost(
  '/api/contact/appointment-request',
  payload,
  { auth: false },
);
