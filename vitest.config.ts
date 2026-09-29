import { configDefaults, defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // handover/ is the entry-funnel reference package, kept for comparison. Its
    // tests use node:test and run with `node --test` from inside that folder.
    exclude: [...configDefaults.exclude, 'handover/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
