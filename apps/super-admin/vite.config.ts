import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@restaurant-saas/shared-schemas': path.resolve(__dirname, '../../packages/shared-schemas/src/index.ts'),
      '@restaurant-saas/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts')
    }
  },
  server: {
    port: 3001
  }
});
