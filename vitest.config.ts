import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@invoice/db': resolve(__dirname, '../packages/db/src'),
      '@invoice/ui': resolve(__dirname, '../packages/ui/src'),
      '@invoice/utils': resolve(__dirname, '../packages/utils/src'),
    },
  },
});