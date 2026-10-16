import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react()],
  optimizeDeps: { exclude: ['replicad-opencascadejs'] },
  worker: { format: 'es' },
  server: { host: true, port: 5173 },
  build: { chunkSizeWarningLimit: 4000, target: 'es2022' },
});
