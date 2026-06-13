export const sanitizePdfFieldName = (input, fallback = 'greffio_field') => {
  const cleaned = String(input || fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return cleaned || fallback;
};

export const uniquePdfFieldNames = (fields = []) => {
  const used = new Set();
  return fields.map((field, index) => {
    const base = sanitizePdfFieldName(field.name || field.label || `greffio_${field.type}_${index + 1}`);
    let name = base;
    let counter = 2;
    while (used.has(name)) {
      name = `${base}_${counter}`;
      counter += 1;
    }
    used.add(name);
    return { ...field, name };
  });
};
