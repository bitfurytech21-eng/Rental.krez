import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    resolve: {
      dedupe: ['react', 'react-dom', 'react-is'],
      alias: {
        '@': path.resolve(import.meta.dirname || '.', 'src'),
        '@rental-log/database': path.resolve(import.meta.dirname || '.', '../../packages/database/src'),
        '@rental-log/validation': path.resolve(import.meta.dirname || '.', '../../packages/validation/src'),
        '@rental-log/auth': path.resolve(import.meta.dirname || '.', '../../packages/auth/src'),
        '@rental-log/ui': path.resolve(import.meta.dirname || '.', '../../packages/ui/src'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-is', 'recharts', 'lucide-react'],
    },
    build: {
      chunkSizeWarningLimit: 8000,
      outDir: 'dist',
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      hmr: false,
      ws: false as const,
      watch: null,
      proxy: {
        '/api/v1': {
          target: 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },
  };
});
