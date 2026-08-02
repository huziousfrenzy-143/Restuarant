import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@restaurant-saas/shared-schemas': path.resolve(__dirname, '../../packages/shared-schemas/src/index.ts'),
      '@restaurant-saas/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      react: path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
    }
  },
  server: {
    port: 3000
  }
});
