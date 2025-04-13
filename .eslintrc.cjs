module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 2021,
    sourceType: "module"
  },
  plugins: [
    "react",
    "react-hooks"
  ],
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    // "import/no-unresolved": "off",
    // "import/named": "off",
    // "import/order": "off",
    // "import/no-duplicates": "off",
    "no-unsafe-optional-chaining": "warn",
    "no-useless-escape": "warn",
    "no-prototype-builtins": "warn",
    "react-hooks/exhaustive-deps": "warn",
    "react/display-name": "off",
    "no-shadow": "error"
  },
  settings: {
    react: {
      version: "detect"
    }
  },
  ignorePatterns: ["dist", "node_modules", "tailwind.config.cjs"]
};
