import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, './apps/teacher-board/src/__tests__/setup.ts')],
  },
  resolve: {
    alias: {
      '@socratic/types': path.resolve(__dirname, './packages/types/src'),
      '@socratic/ui': path.resolve(__dirname, './packages/ui/src'),
    },
  },
});
