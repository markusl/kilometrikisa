module.exports = {
    "extends": [
        "eslint:recommended",
        "google"
    ],
    "parserOptions": {
      "ecmaVersion": 2017,
      "sourceType": "module",
      "ecmaFeatures": {
          "jsx": true,
      }
  },
  "env": {
      "browser": true,
      "node": true,
      "amd": true,
      "mocha": true,
      "es6": true
  },
  "rules": {
    'max-len': [2, { code: 150, ignoreComments: true, ignoreUrls: true }],
    'object-curly-spacing': [1, 'always'],
    "no-console": 0,
    "no-invalid-this": 0,
    "linebreak-style": 0
  }

};
