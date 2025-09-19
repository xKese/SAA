import { beforeAll, afterAll, beforeEach } from 'vitest';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global integration test setup
beforeAll(async () => {
  // Setup test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

  // Disable Claude API calls in tests unless explicitly enabled
  if (!process.env.ENABLE_CLAUDE_IN_TESTS) {
    process.env.CLAUDE_API_KEY = 'test-key-disabled';
  }

  // Integration test specific setup
  process.env.LOG_LEVEL = 'warn'; // Reduce logging noise in tests
  process.env.DISABLE_ANALYTICS = 'true';
  process.env.RATE_LIMIT_DISABLED = 'true';

  console.log('🧪 Integration test environment initialized');
});

afterAll(async () => {
  // Global cleanup
  console.log('🧹 Integration test environment cleaned up');
});

// Increase timeouts for integration tests
beforeEach(() => {
  // Set longer timeout for integration tests
  vi.setConfig({ testTimeout: 30000 });
});