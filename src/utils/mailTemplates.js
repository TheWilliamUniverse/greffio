import { EMAIL_TEMPLATES, GREFFIO_CONTACT, SHORT_NOTIFICATIONS, WORKFLOW_STATUSES } from '@/config/legalFlow.js';

const PLACEHOLDER_REGEX = /\{\{([a-zA-Z0-9_]+)\}\}/g;

export const formatTemplate = (template = '', payload = {}) => (
  template.replace(PLACEHOLDER_REGEX, (_, key) => {
    const value = payload[key];
    return value === undefined || value === null || value === '' ? '-' : String(value);
  })
);

export const buildWorkflowEmail = (status, payload = {}) => {
  const selected = EMAIL_TEMPLATES[status];
  if (!selected) return null;

  return {
    status,
    subject: formatTemplate(selected.subject, payload),
    body: formatTemplate(selected.body, {
      contact_greffio: `${GREFFIO_CONTACT.supportEmail} / ${GREFFIO_CONTACT.supportPhone}`,
      ...payload,
    }),
  };
};

export const getSupportedWorkflowStatuses = () => WORKFLOW_STATUSES.filter((status) => Boolean(EMAIL_TEMPLATES[status]));

export const buildShortNotification = (kind, payload = {}) => {
  const template = SHORT_NOTIFICATIONS[kind];
  if (!template) return null;
  return formatTemplate(template, {
    contact_greffio: `${GREFFIO_CONTACT.supportEmail} / ${GREFFIO_CONTACT.supportPhone}`,
    ...payload,
  });
};
