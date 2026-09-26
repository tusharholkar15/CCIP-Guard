import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['node_modules', 'dist', '.next', '.turbo'],
    passWithNoTests: true,
    testTimeout: 10000,
  },
});
