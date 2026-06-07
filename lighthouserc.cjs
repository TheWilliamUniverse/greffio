/** @type {import('lighthouse').Config} */
export default {
  ci: {
    collect: {
      url: [
        'http://127.0.0.1:4173/simulateur',
        'http://127.0.0.1:4173/login',
      ],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
      },
    },
  },
};
