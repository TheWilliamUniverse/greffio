/** Lighthouse CI – desktop + routes publiques clés */
module.exports = {
  ci: {
    collect: {
      url: [
        'http://127.0.0.1:4173/simulateur',
        'http://127.0.0.1:4173/login',
        'http://127.0.0.1:4173/questionnaire',
      ],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.85 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
      },
    },
  },
};
