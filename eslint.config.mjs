// Minimal ESLint config for migrated surfaces. Full TS-aware linting pending typescript-eslint TS7 support.
export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/dist-worker/**', 'apps/web/src/**', 'apps/api/src/routes.ts', 'apps/api/src/emailService.ts', 'apps/api/src/translationController.ts', 'apps/api/src/dailyPaymentService.ts', 'apps/api/server.ts', 'apps/api/src/index.ts', 'infra/supabase-legacy/**', 'apps/admin/src/components/admin/**'] },
];
