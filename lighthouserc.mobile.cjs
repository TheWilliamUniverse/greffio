/** Lighthouse CI – mobile / tablette (mesures 9–12) */
module.exports = {
  ci: {
    collect: {
      url: [
        'http://127.0.0.1:4173/simulateur',
        'http://127.0.0.1:4173/questionnaire',
      ],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
        },
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
      },
    },
  },
};
