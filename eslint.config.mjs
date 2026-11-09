import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/dist-worker/**', 'apps/web/src/**', 'apps/api/src/routes.ts', 'apps/api/src/emailService.ts', 'apps/api/src/translationController.ts', 'apps/api/src/dailyPaymentService.ts', 'apps/api/server.ts', 'apps/api/src/index.ts', 'infra/supabase-legacy/**', 'apps/admin/src/components/admin/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: { globals: { ...globals.node, ...globals.browser, ...globals.worker } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-useless-escape': 'warn',
    },
  }
);
