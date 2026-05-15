const renderString = (content, variables) => String(content || '').replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, key) => {
  const value = variables?.[key.trim()];
  return value == null ? '' : String(value);
});

const renderTemplate = (template, variables = {}) => ({
  subject: renderString(template.subject, variables),
  text: renderString(template.text, variables),
  html: renderString(template.html, variables),
});

const validateTemplateVariables = (template, variables = {}) => {
  const missing = (template.requiredVariables || []).filter((key) => {
    const value = variables[key];
    return value == null || String(value).trim() === '';
  });
  return {
    ok: missing.length === 0,
    missing,
  };
};

export {
  renderTemplate,
  validateTemplateVariables,
};
