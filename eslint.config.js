import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'reference',
      'src/**/*.{js,jsx}', // vendored Mantis template files (JS), see NOTICE
      'docs',
      'public/mockServiceWorker.js',
      'src/api/schema.d.ts',
      'playwright-report',
      'test-results',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML is banned: render user data as text.',
        },
      ],
    },
  },
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
);
