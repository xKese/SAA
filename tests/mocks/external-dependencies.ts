/**
 * Mock setup for external dependencies
 * Provides mocks for Anthropic AI API, factsheet extraction,
 * file system operations, and network requests
 */

import { vi } from 'vitest';
import { mockExternalDependencies } from './validation-test-data';

// =============================================================================
// ANTHROPIC AI API MOCK
// =============================================================================

export const mockAnthropicAI = {
  setup: () => {
    // Mock the Anthropic AI client
    const mockAnthropicClient = {
      messages: {
        create: vi.fn()
      }
    };

    // Default successful response
    mockAnthropicClient.messages.create.mockResolvedValue(
      mockExternalDependencies.anthropicAI.successResponse
    );

    return mockAnthropicClient;
  },

  setupFailure: () => {
    const mockAnthropicClient = {
      messages: {
        create: vi.fn()
      }
    };

    // Mock failure response
    mockAnthropicClient.messages.create.mockRejectedValue(
      new Error(mockExternalDependencies.anthropicAI.failureResponse.error.message)
    );

    return mockAnthropicClient;
  },

  setupTimeout: () => {
    const mockAnthropicClient = {
      messages: {
        create: vi.fn()
      }
    };

    // Mock timeout
    mockAnthropicClient.messages.create.mockImplementation(() => 
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      )
    );

    return mockAnthropicClient;
  },

  scenarios: {
    validationFallback: {
      prompt: 'Analyze fund decomposition accuracy',
      response: {
        content: JSON.stringify({
          analysisResult: 'Fund decomposition shows minor discrepancies but within acceptable tolerance',
          confidence: 0.87,
          issues: ['Minor weight-value mismatch in position 3'],
          suggestedActions: ['Review position 3 weighting']
        })
      }
    },

    doubleCounting: {
      prompt: 'Detect potential double counting in portfolio holdings',
      response: {
        content: JSON.stringify({
          analysisResult: 'Potential double counting detected for Apple Inc across multiple funds',
          confidence: 0.94,
          affectedAssets: ['Apple Inc', 'Apple Inc via Tech ETF'],
          overlapValue: 45000,
          suggestedActions: ['Consolidate Apple positions or adjust allocations']
        })
      }
    },

    currencyAnalysis: {
      prompt: 'Analyze currency exposure and hedging effectiveness',
      response: {
        content: JSON.stringify({
          analysisResult: 'Currency hedging is 85% effective with minor exposure to GBP volatility',
          confidence: 0.91,
          hedgingEfficiency: 85,
          recommendations: ['Consider hedging remaining GBP exposure']
        })
      }
    }
  }
};

// =============================================================================
// FACTSHEET EXTRACTION MOCK
// =============================================================================

export const mockFactsheetExtraction = {
  setup: () => {
    const mockExtractor = {
      extractFromPDF: vi.fn(),
      extractFromXML: vi.fn(),
      extractFromHTML: vi.fn()
    };

    // Default successful extraction
    mockExtractor.extractFromPDF.mockResolvedValue(
      mockExternalDependencies.factsheetExtraction.success
    );

    return mockExtractor;
  },

  setupFailure: () => {
    const mockExtractor = {
      extractFromPDF: vi.fn(),
      extractFromXML: vi.fn(),
      extractFromHTML: vi.fn()
    };

    // Mock extraction failure
    mockExtractor.extractFromPDF.mockResolvedValue(
      mockExternalDependencies.factsheetExtraction.failure
    );

    return mockExtractor;
  },

  factsheetTypes: {
    germanUCITS: {
      extracted: true,
      holdings: [
        { name: 'SAP SE', isin: 'DE0007164600', weight: 0.12, currency: 'EUR' },
        { name: 'Siemens AG', isin: 'DE0007236101', weight: 0.10, currency: 'EUR' },
        { name: 'Allianz SE', isin: 'DE0008404005', weight: 0.08, currency: 'EUR' }
      ],
      metadata: {
        fundName: 'German Blue Chip UCITS ETF',
        isin: 'DE0001234567',
        currency: 'EUR',
        totalExpenseRatio: 0.0015,
        fundSize: 2500000000
      }
    },

    usEquityETF: {
      extracted: true,
      holdings: [
        { name: 'Apple Inc', isin: 'US0378331005', weight: 0.08, currency: 'USD' },
        { name: 'Microsoft Corp', isin: 'US5949181045', weight: 0.07, currency: 'USD' },
        { name: 'Amazon.com Inc', isin: 'US0231351067', weight: 0.05, currency: 'USD' },
        { name: 'Alphabet Inc Class A', isin: 'US02079K3059', weight: 0.04, currency: 'USD' }
      ],
      metadata: {
        fundName: 'S&P 500 UCITS ETF',
        isin: 'IE00B5BMR087',
        currency: 'USD',
        totalExpenseRatio: 0.0007,
        fundSize: 45000000000
      }
    },

    bondFund: {
      extracted: true,
      holdings: [
        { name: 'German Government Bond 10Y', isin: 'DE0001102309', weight: 0.25, currency: 'EUR' },
        { name: 'French Government Bond 10Y', isin: 'FR0000188799', weight: 0.20, currency: 'EUR' },
        { name: 'Italian Government Bond 10Y', isin: 'IT0005436693', weight: 0.15, currency: 'EUR' },
        { name: 'Spanish Government Bond 10Y', isin: 'ES0000012A09', weight: 0.12, currency: 'EUR' }
      ],
      metadata: {
        fundName: 'Euro Government Bond UCITS ETF',
        isin: 'IE00B4WXJJ64',
        currency: 'EUR',
        duration: 8.5,
        yieldToMaturity: 0.025
      }
    },

    complexFund: {
      extracted: true,
      holdings: Array.from({ length: 100 }, (_, i) => ({
        name: `Holding ${i + 1}`,
        isin: `TEST${String(i + 1).padStart(8, '0')}`,
        weight: 0.01,
        currency: i % 3 === 0 ? 'EUR' : i % 3 === 1 ? 'USD' : 'GBP'
      })),
      metadata: {
        fundName: 'Global Diversified Fund',
        isin: 'LU0123456789',
        currency: 'EUR',
        numberOfHoldings: 100,
        turnoverRate: 0.15
      }
    }
  }
};

// =============================================================================
// FILE SYSTEM OPERATIONS MOCK
// =============================================================================

export const mockFileSystem = {
  setup: () => {
    const mockFs = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      existsSync: vi.fn(),
      createReadStream: vi.fn(),
      createWriteStream: vi.fn(),
      mkdirSync: vi.fn(),
      unlinkSync: vi.fn()
    };

    // Default successful operations
    mockFs.readFile.mockResolvedValue(
      mockExternalDependencies.fileSystemOperations.readFile.success
    );
    mockFs.writeFile.mockResolvedValue(true);
    mockFs.existsSync.mockReturnValue(true);

    return mockFs;
  },

  setupFailures: () => {
    const mockFs = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      existsSync: vi.fn(),
      createReadStream: vi.fn(),
      createWriteStream: vi.fn(),
      mkdirSync: vi.fn(),
      unlinkSync: vi.fn()
    };

    // Mock failures
    mockFs.readFile.mockRejectedValue(
      mockExternalDependencies.fileSystemOperations.readFile.failure
    );
    mockFs.writeFile.mockRejectedValue(
      mockExternalDependencies.fileSystemOperations.writeFile.failure
    );
    mockFs.existsSync.mockReturnValue(false);

    return mockFs;
  },

  fileTypes: {
    csv: {
      content: `Name,ISIN,Value,AssetClass,Geography
Apple Inc,US0378331005,100000,Aktien,USA/Nordamerika
Microsoft Corp,US5949181045,80000,Aktien,USA/Nordamerika
German Bond Fund,DE0001102309,120000,Anleihen,Deutschland`,
      encoding: 'utf-8'
    },

    excel: {
      content: Buffer.from('mock excel file content'),
      encoding: 'binary'
    },

    pdf: {
      content: Buffer.from('mock pdf file content'),
      encoding: 'binary'
    },

    xml: {
      content: `<?xml version="1.0" encoding="UTF-8"?>
<portfolio>
  <position>
    <name>Apple Inc</name>
    <isin>US0378331005</isin>
    <value>100000</value>
    <assetClass>Aktien</assetClass>
  </position>
</portfolio>`,
      encoding: 'utf-8'
    }
  }
};

// =============================================================================
// NETWORK REQUESTS MOCK
// =============================================================================

export const mockNetworkRequests = {
  setup: () => {
    const mockFetch = vi.fn();

    // Default successful responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/validation/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockExternalDependencies.factsheetExtraction.success)
        });
      }
      
      if (url.includes('/api/factsheet/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockFactsheetExtraction.factsheetTypes.germanUCITS)
        });
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      });
    });

    global.fetch = mockFetch;
    return mockFetch;
  },

  setupNetworkFailures: () => {
    const mockFetch = vi.fn();

    mockFetch.mockImplementation(() => {
      return Promise.reject(new Error('Network error'));
    });

    global.fetch = mockFetch;
    return mockFetch;
  },

  setupTimeouts: () => {
    const mockFetch = vi.fn();

    mockFetch.mockImplementation(() => {
      return new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000);
      });
    });

    global.fetch = mockFetch;
    return mockFetch;
  },

  setupServerErrors: () => {
    const mockFetch = vi.fn();

    mockFetch.mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          error: 'Internal server error',
          message: 'Validation service temporarily unavailable'
        })
      });
    });

    global.fetch = mockFetch;
    return mockFetch;
  },

  endpoints: {
    validation: '/api/portfolio/:id/validate',
    factsheet: '/api/factsheet/:isin',
    upload: '/api/portfolio/upload',
    analysis: '/api/portfolio/:id/analysis'
  }
};

// =============================================================================
// DATABASE MOCK
// =============================================================================

export const mockDatabase = {
  setup: () => {
    const mockDb = {
      portfolio: {
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      },
      validation: {
        findByPortfolioId: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      factsheet: {
        findByISIN: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      }
    };

    // Default successful database operations
    mockDb.portfolio.findById.mockResolvedValue({
      id: 'portfolio_123',
      name: 'Test Portfolio',
      positions: []
    });

    mockDb.validation.create.mockResolvedValue({
      id: 'validation_456',
      portfolioId: 'portfolio_123',
      status: 'completed'
    });

    return mockDb;
  },

  setupFailures: () => {
    const mockDb = {
      portfolio: {
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      },
      validation: {
        findByPortfolioId: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      factsheet: {
        findByISIN: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      }
    };

    // Mock database failures
    mockDb.portfolio.findById.mockRejectedValue(new Error('Database connection failed'));
    mockDb.validation.create.mockRejectedValue(new Error('Validation table locked'));

    return mockDb;
  }
};

// =============================================================================
// CACHE MOCK
// =============================================================================

export const mockCache = {
  setup: () => {
    const cache = new Map<string, any>();
    
    const mockCacheClient = {
      get: vi.fn((key: string) => cache.get(key)),
      set: vi.fn((key: string, value: any, ttl?: number) => cache.set(key, value)),
      del: vi.fn((key: string) => cache.delete(key)),
      clear: vi.fn(() => cache.clear()),
      size: () => cache.size,
      keys: () => Array.from(cache.keys())
    };

    return mockCacheClient;
  },

  setupFailures: () => {
    const mockCacheClient = {
      get: vi.fn().mockRejectedValue(new Error('Cache service unavailable')),
      set: vi.fn().mockRejectedValue(new Error('Cache service unavailable')),
      del: vi.fn().mockRejectedValue(new Error('Cache service unavailable')),
      clear: vi.fn().mockRejectedValue(new Error('Cache service unavailable'))
    };

    return mockCacheClient;
  }
};

// =============================================================================
// COMPREHENSIVE MOCK SETUP FUNCTION
// =============================================================================

export const setupAllMocks = (scenario: 'success' | 'failure' | 'mixed' = 'success') => {
  const mocks = {
    anthropic: scenario === 'failure' ? mockAnthropicAI.setupFailure() : mockAnthropicAI.setup(),
    factsheet: scenario === 'failure' ? mockFactsheetExtraction.setupFailure() : mockFactsheetExtraction.setup(),
    fs: scenario === 'failure' ? mockFileSystem.setupFailures() : mockFileSystem.setup(),
    network: scenario === 'failure' ? mockNetworkRequests.setupNetworkFailures() : mockNetworkRequests.setup(),
    db: scenario === 'failure' ? mockDatabase.setupFailures() : mockDatabase.setup(),
    cache: scenario === 'failure' ? mockCache.setupFailures() : mockCache.setup()
  };

  // Mixed scenario: some services work, others fail
  if (scenario === 'mixed') {
    mocks.anthropic = mockAnthropicAI.setupFailure(); // AI service fails
    mocks.factsheet = mockFactsheetExtraction.setup(); // Factsheet extraction works
    mocks.fs = mockFileSystem.setup(); // File system works
    mocks.network = mockNetworkRequests.setupServerErrors(); // Network has server errors
    mocks.db = mockDatabase.setup(); // Database works
    mocks.cache = mockCache.setupFailures(); // Cache fails
  }

  return mocks;
};

// =============================================================================
// CLEANUP FUNCTION
// =============================================================================

export const cleanupMocks = () => {
  vi.clearAllMocks();
  vi.resetAllMocks();
  
  // Reset global fetch
  if (global.fetch && vi.isMockFunction(global.fetch)) {
    global.fetch.mockRestore();
  }
  
  // Reset any other global mocks
  if (global.console && vi.isMockFunction(global.console.log)) {
    global.console.log.mockRestore();
  }
};

// =============================================================================
// MOCK SCENARIO PRESETS
// =============================================================================

export const mockScenarios = {
  happyPath: () => setupAllMocks('success'),
  networkIssues: () => {
    const mocks = setupAllMocks('success');
    mocks.network = mockNetworkRequests.setupNetworkFailures();
    return mocks;
  },
  partialOutage: () => setupAllMocks('mixed'),
  totalOutage: () => setupAllMocks('failure'),
  aiServiceDown: () => {
    const mocks = setupAllMocks('success');
    mocks.anthropic = mockAnthropicAI.setupFailure();
    return mocks;
  },
  databaseIssues: () => {
    const mocks = setupAllMocks('success');
    mocks.db = mockDatabase.setupFailures();
    return mocks;
  },
  fileSystemIssues: () => {
    const mocks = setupAllMocks('success');
    mocks.fs = mockFileSystem.setupFailures();
    return mocks;
  }
};

export default {
  mockAnthropicAI,
  mockFactsheetExtraction,
  mockFileSystem,
  mockNetworkRequests,
  mockDatabase,
  mockCache,
  setupAllMocks,
  cleanupMocks,
  mockScenarios
};