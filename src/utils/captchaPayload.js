export const buildCaptchaPayload = ({
  turnstileToken = '',
  recaptchaToken = '',
  provider = 'turnstile',
} = {}) => {
  if (provider === 'recaptcha' && recaptchaToken) {
    return { recaptchaToken };
  }
  if (turnstileToken) {
    return { turnstileToken };
  }
  if (recaptchaToken) {
    return { recaptchaToken };
  }
  return {};
};
