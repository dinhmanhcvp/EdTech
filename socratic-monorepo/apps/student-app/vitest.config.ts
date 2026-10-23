import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  oxc: {
    jsx: {
      runtime: 'automatic',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@socratic/types': path.resolve(__dirname, '../../packages/types/src'),
      '@socratic/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
});
