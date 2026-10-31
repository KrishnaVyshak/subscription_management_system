import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', 'supabase/.temp/**'] },
  js.configs.recommended,
  {
    files: ['backend/**/*.js', 'shared/**/*.js', 'scripts/**/*.js', '*.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['frontend/**/*.{js,jsx,mjs}'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['**/*.test.{js,jsx}', '**/tests/**/*.js', '**/setupTests.js'],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
  },
  { rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z_]' }] } },
  prettier,
];
