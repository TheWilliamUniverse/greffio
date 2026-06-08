const counters = Object.create(null);

export const recordSecurityMetric = (name, amount = 1) => {
  if (!name) return;
  counters[name] = (counters[name] || 0) + amount;
};

export const getSecurityMetricsSnapshot = () => ({ ...counters });

export const resetSecurityMetrics = () => {
  Object.keys(counters).forEach((key) => {
    delete counters[key];
  });
};
