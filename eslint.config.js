const { defineConfig, globalIgnores } = require("eslint/config");

const globals = require("globals");
const js = require("@eslint/js");

module.exports = defineConfig([
  js.configs.recommended, // Recommended config applied to all files
  // js.configs.all, // Lots of rules that might show bugs and complexity
  {
    languageOptions: {
      globals: {
        ...Object.fromEntries(
          Object.entries(globals.browser).map(([key]) => [key, "off"]),
        ),
        ...globals.mocha,
        ...globals.node,
      },

      ecmaVersion: 12,
      parserOptions: {},
    },

    rules: {
      "global-require": "error",
      "indent": ["error", 2],
      "no-console": "error",
      "no-param-reassign": ["error", { "props": true, "ignorePropertyModificationsFor": ["acc"] }],
      "no-plusplus": "error",
      "no-underscore-dangle": "error",
      "no-unused-vars": "error",
      "max-len": [
        "error",
        120,
        2,
        {
          ignoreUrls: true,
          ignoreComments: false,
          ignoreRegExpLiterals: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
        },
      ],
      "no-trailing-spaces": "error",
      "semi": ["error", "always"],
    },
  },
  globalIgnores(["**/public", "lib/About.js", "lib/FieldDB.js", "FieldDB"]),
]);
