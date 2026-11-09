import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

const web = path.resolve(import.meta.dirname || '.', '../web/src');
const self = path.resolve(import.meta.dirname || '.', 'src');
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: path.resolve(import.meta.dirname || '.', '../..'),
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-i18next', 'i18next'],
    alias: [
      { find: '@', replacement: web },
      { find: '@web', replacement: web },
      { find: '@admin', replacement: self },
      { find: '@rental-log/database', replacement: path.resolve(import.meta.dirname || '.', '../../packages/database/src') },
      { find: '@rental-log/validation', replacement: path.resolve(import.meta.dirname || '.', '../../packages/validation/src') },
      { find: '@rental-log/auth', replacement: path.resolve(import.meta.dirname || '.', '../../packages/auth/src') },
      { find: '@rental-log/ui', replacement: path.resolve(import.meta.dirname || '.', '../../packages/ui/src') },
    ],
  },
  server: { host: '0.0.0.0', port: 3001 },
  build: { outDir: 'dist', chunkSizeWarningLimit: 8000 },
});
