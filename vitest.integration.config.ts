/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Node environment for integration tests
    setupFiles: ['./tests/integration-setup.ts'],
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['tests/unit/**/*', 'tests/e2e/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.d.ts',
        'vite.config.ts',
        'tailwind.config.js',
        'postcss.config.js'
      ],
      thresholds: {
        global: {
          branches: 70,  // Lower thresholds for integration tests
          functions: 70,
          lines: 75,
          statements: 75
        }
      }
    },
    testTimeout: 30000,   // Longer timeout for integration tests
    hookTimeout: 10000,
    // Run integration tests sequentially to avoid database conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    // Retry flaky integration tests
    retry: 2,
    // Reporter configuration
    reporter: ['verbose', 'html'],
    outputFile: {
      html: './coverage/integration-test-report.html'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './client/src'),
      '@shared': resolve(__dirname, './shared'),
      '@server': resolve(__dirname, './server'),
      '@tests': resolve(__dirname, './tests')
    }
  }
});