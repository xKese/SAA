/**
 * Comprehensive test data and mocking strategies
 * Provides realistic test datasets, mock API responses, test portfolios,
 * German financial standard test cases, and external dependency mocking
 */

import { 
  AssetData, 
  FundHolding, 
  LookThroughValidationResult,
  GermanFinancialComplianceResult,
  ValidationSeverity,
  ValidationIssue 
} from '../../server/utils/portfolio-mathematics';

// =============================================================================
// REALISTIC TEST DATASETS
// =============================================================================

export const realisticPortfolioData = {
  small: {
    name: 'Conservative Small Portfolio',
    totalValue: 250000,
    positions: [
      {
        name: 'iShares Core DAX UCITS ETF',
        isin: 'DE0005933931',
        value: 75000,
        weight: 0.30,
        assetClass: 'Aktien',
        geography: 'Deutschland',
        currency: 'EUR',
        sector: 'Diversified'
      },
      {
        name: 'iShares Core Euro Government Bond UCITS ETF',
        isin: 'IE00B4WXJJ64',
        value: 100000,
        weight: 0.40,
        assetClass: 'Anleihen',
        geography: 'Europa (inkl. UK)',
        currency: 'EUR',
        sector: 'Government'
      },
      {
        name: 'Vanguard FTSE All-World UCITS ETF',
        isin: 'IE00B3RBWM25',
        value: 50000,
        weight: 0.20,
        assetClass: 'Aktien',
        geography: 'Global',
        currency: 'USD',
        sector: 'Diversified'
      },
      {
        name: 'Tagesgeldkonto',
        isin: 'DE0000000000',
        value: 25000,
        weight: 0.10,
        assetClass: 'Liquidität/Cash',
        geography: 'Deutschland',
        currency: 'EUR',
        sector: 'Cash'
      }
    ]
  },

  medium: {
    name: 'Balanced Medium Portfolio',
    totalValue: 1000000,
    positions: [
      {
        name: 'MSCI World UCITS ETF',
        isin: 'IE00B4L5Y983',
        value: 300000,
        weight: 0.30,
        assetClass: 'Aktien',
        geography: 'Global',
        currency: 'USD',
        sector: 'Diversified'
      },
      {
        name: 'FTSE Emerging Markets UCITS ETF',
        isin: 'IE00B0M63177',
        value: 100000,
        weight: 0.10,
        assetClass: 'Aktien',
        geography: 'Emerging Markets',
        currency: 'USD',
        sector: 'Diversified'
      },
      {
        name: 'iShares Core Euro Corporate Bond UCITS ETF',
        isin: 'IE00B3F81409',
        value: 250000,
        weight: 0.25,
        assetClass: 'Anleihen',
        geography: 'Europa (inkl. UK)',
        currency: 'EUR',
        sector: 'Corporate'
      },
      {
        name: 'iShares Core Global Aggregate Bond UCITS ETF',
        isin: 'IE00B3B8Q275',
        value: 150000,
        weight: 0.15,
        assetClass: 'Anleihen',
        geography: 'Global',
        currency: 'USD',
        sector: 'Diversified'
      },
      {
        name: 'iShares European Property Yield UCITS ETF',
        isin: 'IE00B0M63953',
        value: 100000,
        weight: 0.10,
        assetClass: 'Immobilien',
        geography: 'Europa (inkl. UK)',
        currency: 'EUR',
        sector: 'Real Estate'
      },
      {
        name: 'WisdomTree Broad Commodities UCITS ETF',
        isin: 'JE00B24DKC09',
        value: 50000,
        weight: 0.05,
        assetClass: 'Rohstoffe',
        geography: 'Global',
        currency: 'USD',
        sector: 'Commodities'
      },
      {
        name: 'Festgeld',
        isin: 'DE0000000001',
        value: 50000,
        weight: 0.05,
        assetClass: 'Liquidität/Cash',
        geography: 'Deutschland',
        currency: 'EUR',
        sector: 'Cash'
      }
    ]
  },

  large: {
    name: 'Sophisticated Large Portfolio',
    totalValue: 5000000,
    positions: [
      // Equity Positions (60%)
      {
        name: 'iShares Core S&P 500 UCITS ETF',
        isin: 'IE00B5BMR087',
        value: 750000,
        weight: 0.15,
        assetClass: 'Aktien',
        geography: 'USA/Nordamerika',
        currency: 'USD',
        sector: 'Diversified'
      },
      {
        name: 'iShares Core EURO STOXX 50 UCITS ETF',
        isin: 'IE00B53L3W79',
        value: 500000,
        weight: 0.10,
        assetClass: 'Aktien',
        geography: 'Europa (inkl. UK)',
        currency: 'EUR',
        sector: 'Diversified'
      },
      {
        name: 'Xtrackers MSCI Japan UCITS ETF',
        isin: 'LU0274208692',
        value: 300000,
        weight: 0.06,
        assetClass: 'Aktien',
        geography: 'Japan',
        currency: 'JPY',
        sector: 'Diversified'
      },
      {
        name: 'iShares MSCI Emerging Markets UCITS ETF',
        isin: 'IE00B0M63177',
        value: 400000,
        weight: 0.08,
        assetClass: 'Aktien',
        geography: 'Emerging Markets',
        currency: 'USD',
        sector: 'Diversified'
      },
      {
        name: 'Invesco NASDAQ-100 UCITS ETF',
        isin: 'IE00B53SZB19',
        value: 350000,
        weight: 0.07,
        assetClass: 'Aktien',
        geography: 'USA/Nordamerika',
        currency: 'USD',
        sector: 'Technology'
      },
      {
        name: 'iShares Global Clean Energy UCITS ETF',
        isin: 'IE00B1XNHC34',
        value: 200000,
        weight: 0.04,
        assetClass: 'Aktien',
        geography: 'Global',
        currency: 'USD',
        sector: 'Energy'
      },
      {
        name: 'Xtrackers MSCI World Health Care UCITS ETF',
        isin: 'IE00BM67HK77',
        value: 250000,
        weight: 0.05,
        assetClass: 'Aktien',
        geography: 'Global',
        currency: 'USD',
        sector: 'Healthcare'
      },
      {
        name: 'iShares STOXX Europe 600 Technology UCITS ETF',
        isin: 'DE000A0Q4R44',
        value: 250000,
        weight: 0.05,
        assetClass: 'Aktien',
        geography: 'Europa (inkl. UK)',
        currency: 'EUR',
        sector: 'Technology'
      },

      // Bond Positions (25%)
      {
        name: 'iShares Core Global Aggregate Bond UCITS ETF',
        isin: 'IE00B3B8Q275',
        value: 500000,
        weight: 0.10,
        assetClass: 'Anleihen',
        geography: 'Global',
        currency: 'USD',
        sector: 'Diversified'
      },
      {
        name: 'Xtrackers Germany Government Bond UCITS ETF',
        isin: 'LU0290358497',
        value: 300000,
        weight: 0.06,
        assetClass: 'Anleihen',
        geography: 'Deutschland',
        currency: 'EUR',
        sector: 'Government'
      },
      {
        name: 'iShares $ High Yield Corporate Bond UCITS ETF',
        isin: 'IE00B66F4759',
        value: 200000,
        weight: 0.04,
        assetClass: 'Anleihen',
        geography: 'USA/Nordamerika',
        currency: 'USD',
        sector: 'Corporate'
      },
      {
        name: 'Lyxor Green Bond (DR) UCITS ETF',
        isin: 'LU1563454310',
        value: 250000,
        weight: 0.05,
        assetClass: 'Anleihen',
        geography: 'Global',
        currency: 'EUR',
        sector: 'Green Bonds'
      },

      // Alternative Investments (10%)
      {
        name: 'iShares European Property Yield UCITS ETF',
        isin: 'IE00B0M63953',
        value: 200000,
        weight: 0.04,
        assetClass: 'Immobilien',
        geography: 'Europa (inkl. UK)',
        currency: 'EUR',
        sector: 'Real Estate'
      },
      {
        name: 'Invesco Physical Gold ETC',
        isin: 'IE00B579F325',
        value: 150000,
        weight: 0.03,
        assetClass: 'Rohstoffe',
        geography: 'Global',
        currency: 'USD',
        sector: 'Precious Metals'
      },
      {
        name: 'WisdomTree Broad Commodities UCITS ETF',
        isin: 'JE00B24DKC09',
        value: 150000,
        weight: 0.03,
        assetClass: 'Rohstoffe',
        geography: 'Global',
        currency: 'USD',
        sector: 'Commodities'
      },

      // Cash (5%)
      {
        name: 'Tagesgeld Premium',
        isin: 'DE0000000002',
        value: 150000,
        weight: 0.03,
        assetClass: 'Liquidität/Cash',
        geography: 'Deutschland',
        currency: 'EUR',
        sector: 'Cash'
      },
      {
        name: 'USD Money Market',
        isin: 'US0000000001',
        value: 100000,
        weight: 0.02,
        assetClass: 'Liquidität/Cash',
        geography: 'USA/Nordamerika',
        currency: 'USD',
        sector: 'Cash'
      }
    ]
  }
};

// =============================================================================
// MULTI-FUND PORTFOLIOS WITH OVERLAPPING HOLDINGS
// =============================================================================

export const overlappingFundPortfolio = {
  name: 'Complex Overlapping Fund Portfolio',
  totalValue: 2000000,
  positions: [
    {
      name: 'Global Technology ETF',
      isin: 'DE0001111111',
      value: 500000,
      weight: 0.25,
      assetClass: 'Aktien',
      underlyingHoldings: [
        { name: 'Apple Inc', isin: 'US0378331005', weight: 0.15, value: 75000 },
        { name: 'Microsoft Corp', isin: 'US5949181045', weight: 0.12, value: 60000 },
        { name: 'Amazon.com Inc', isin: 'US0231351067', weight: 0.10, value: 50000 },
        { name: 'Alphabet Inc', isin: 'US02079K3059', weight: 0.08, value: 40000 },
        { name: 'Tesla Inc', isin: 'US88160R1014', weight: 0.06, value: 30000 }
      ]
    },
    {
      name: 'US Large Cap Fund',
      isin: 'DE0002222222',
      value: 400000,
      weight: 0.20,
      assetClass: 'Aktien',
      underlyingHoldings: [
        { name: 'Apple Inc', isin: 'US0378331005', weight: 0.20, value: 80000 }, // OVERLAP!
        { name: 'Microsoft Corp', isin: 'US5949181045', weight: 0.18, value: 72000 }, // OVERLAP!
        { name: 'Johnson & Johnson', isin: 'US4781601046', weight: 0.15, value: 60000 },
        { name: 'JPMorgan Chase', isin: 'US46625H1005', weight: 0.12, value: 48000 },
        { name: 'Procter & Gamble', isin: 'US7427181091', weight: 0.10, value: 40000 }
      ]
    },
    {
      name: 'European Equity Fund',
      isin: 'DE0003333333',
      value: 600000,
      weight: 0.30,
      assetClass: 'Aktien',
      underlyingHoldings: [
        { name: 'SAP SE', isin: 'DE0007164600', weight: 0.15, value: 90000 },
        { name: 'ASML Holding', isin: 'NL0010273215', weight: 0.12, value: 72000 },
        { name: 'Nestlé SA', isin: 'CH0038863350', weight: 0.11, value: 66000 },
        { name: 'Siemens AG', isin: 'DE0007236101', weight: 0.10, value: 60000 },
        { name: 'Allianz SE', isin: 'DE0008404005', weight: 0.09, value: 54000 }
      ]
    },
    {
      name: 'Bond Fund EUR',
      isin: 'DE0004444444',
      value: 300000,
      weight: 0.15,
      assetClass: 'Anleihen',
      underlyingHoldings: [
        { name: 'German Government Bond 10Y', isin: 'DE0001102309', weight: 0.25, value: 75000 },
        { name: 'French Government Bond 10Y', isin: 'FR0000188799', weight: 0.20, value: 60000 },
        { name: 'Italian Government Bond 10Y', isin: 'IT0005436693', weight: 0.15, value: 45000 },
        { name: 'Spanish Government Bond 10Y', isin: 'ES0000012A09', weight: 0.12, value: 36000 },
        { name: 'Corporate Bond Portfolio', isin: 'DE0009999999', weight: 0.28, value: 84000 }
      ]
    },
    {
      name: 'Real Estate Fund',
      isin: 'DE0005555555',
      value: 200000,
      weight: 0.10,
      assetClass: 'Immobilien',
      underlyingHoldings: [
        { name: 'Deutsche Wohnen', isin: 'DE000A0HN5C6', weight: 0.20, value: 40000 },
        { name: 'Vonovia SE', isin: 'DE000A1ML7J1', weight: 0.18, value: 36000 },
        { name: 'Unibail-Rodamco-Westfield', isin: 'FR0013326246', weight: 0.15, value: 30000 },
        { name: 'Realty Income Corp', isin: 'US7561091049', weight: 0.12, value: 24000 },
        { name: 'Other REIT Holdings', isin: 'DE0008888888', weight: 0.35, value: 70000 }
      ]
    }
  ]
};

// =============================================================================
// VARIOUS CURRENCY EXPOSURES FOR HEDGING VALIDATION
// =============================================================================

export const currencyExposureTestCases = {
  fullyHedged: {
    name: 'Fully Hedged Portfolio',
    baseCurrency: 'EUR',
    exposures: [
      { currency: 'EUR', exposure: 40, isHedged: false },
      { currency: 'USD', exposure: 35, isHedged: true },
      { currency: 'GBP', exposure: 15, isHedged: true },
      { currency: 'JPY', exposure: 10, isHedged: true }
    ],
    expectedValid: true
  },

  partiallyHedged: {
    name: 'Partially Hedged Portfolio',
    baseCurrency: 'EUR',
    exposures: [
      { currency: 'EUR', exposure: 30, isHedged: false },
      { currency: 'USD', exposure: 40, isHedged: true },
      { currency: 'GBP', exposure: 20, isHedged: false }, // Unhedged
      { currency: 'CHF', exposure: 10, isHedged: true }
    ],
    expectedValid: true // For partially hedged funds
  },

  unhedged: {
    name: 'Unhedged Global Portfolio',
    baseCurrency: 'EUR',
    exposures: [
      { currency: 'EUR', exposure: 25, isHedged: false },
      { currency: 'USD', exposure: 35, isHedged: false },
      { currency: 'GBP', exposure: 15, isHedged: false },
      { currency: 'JPY', exposure: 15, isHedged: false },
      { currency: 'CHF', exposure: 10, isHedged: false }
    ],
    expectedValid: true // For unhedged funds
  },

  invalidTotal: {
    name: 'Invalid Total Exposure',
    baseCurrency: 'EUR',
    exposures: [
      { currency: 'EUR', exposure: 50, isHedged: false },
      { currency: 'USD', exposure: 40, isHedged: true },
      { currency: 'GBP', exposure: 20, isHedged: true } // Total = 110%
    ],
    expectedValid: false
  },

  negativeCurrency: {
    name: 'Negative Currency Exposure',
    baseCurrency: 'EUR',
    exposures: [
      { currency: 'EUR', exposure: 60, isHedged: false },
      { currency: 'USD', exposure: 50, isHedged: true },
      { currency: 'GBP', exposure: -10, isHedged: true } // Negative exposure
    ],
    expectedValid: false
  }
};

// =============================================================================
// DIFFERENT GEOGRAPHIC ALLOCATIONS FOR INTEGRITY TESTING
// =============================================================================

export const geographicAllocationTestCases = {
  complete: {
    name: 'Complete Geographic Coverage',
    allocations: [
      { category: 'Deutschland', value: 200000, percentage: 20 },
      { category: 'Europa (inkl. UK)', value: 250000, percentage: 25 },
      { category: 'USA/Nordamerika', value: 300000, percentage: 30 },
      { category: 'Japan', value: 100000, percentage: 10 },
      { category: 'Asien (ex Japan)', value: 100000, percentage: 10 },
      { category: 'Emerging Markets', value: 50000, percentage: 5 }
    ],
    expectedValid: true
  },

  missingRegions: {
    name: 'Missing Geographic Regions',
    allocations: [
      { category: 'Deutschland', value: 400000, percentage: 40 },
      { category: 'USA/Nordamerika', value: 600000, percentage: 60 }
      // Missing Europa, Asia, Emerging Markets
    ],
    expectedValid: false
  },

  overAllocation: {
    name: 'Over-allocated Geography',
    allocations: [
      { category: 'Deutschland', value: 400000, percentage: 40 },
      { category: 'Europa (inkl. UK)', value: 350000, percentage: 35 },
      { category: 'USA/Nordamerika', value: 300000, percentage: 30 } // Total = 105%
    ],
    expectedValid: false
  },

  granularBreakdown: {
    name: 'Granular Geographic Breakdown',
    allocations: [
      { category: 'Deutschland', value: 150000, percentage: 15 },
      { category: 'Frankreich', value: 120000, percentage: 12 },
      { category: 'Italien', value: 80000, percentage: 8 },
      { category: 'Großbritannien', value: 100000, percentage: 10 },
      { category: 'USA', value: 250000, percentage: 25 },
      { category: 'Kanada', value: 50000, percentage: 5 },
      { category: 'Japan', value: 100000, percentage: 10 },
      { category: 'China', value: 80000, percentage: 8 },
      { category: 'Indien', value: 40000, percentage: 4 },
      { category: 'Brasilien', value: 30000, percentage: 3 }
    ],
    expectedValid: true
  }
};

// =============================================================================
// EDGE CASES WITH MISSING DATA
// =============================================================================

export const edgeCaseTestData = {
  emptyPortfolio: {
    name: 'Empty Portfolio',
    positions: [],
    expectedValid: true // Empty is technically valid
  },

  nullValues: {
    name: 'Portfolio with Null Values',
    positions: [
      { name: null, isin: undefined, value: null, assetClass: undefined },
      { name: 'Valid Position', isin: 'DE0001234567', value: 100000, assetClass: 'Aktien' }
    ]
  },

  extremeValues: {
    name: 'Extreme Value Portfolio',
    positions: [
      { name: 'Tiny Position', isin: 'DE0000000001', value: 0.01, assetClass: 'Liquidität/Cash' },
      { name: 'Huge Position', isin: 'DE0000000002', value: 1e12, assetClass: 'Aktien' },
      { name: 'Zero Position', isin: 'DE0000000003', value: 0, assetClass: 'Anleihen' },
      { name: 'Negative Position', isin: 'DE0000000004', value: -50000, assetClass: 'Derivate' }
    ]
  },

  precisionTest: {
    name: 'High Precision Portfolio',
    positions: [
      { 
        name: 'Precise Position 1', 
        isin: 'DE0001234567', 
        value: 123456.789123456, 
        weight: 0.333333333333333,
        assetClass: 'Aktien' 
      },
      { 
        name: 'Precise Position 2', 
        isin: 'DE0009876543', 
        value: 246913.578246913, 
        weight: 0.666666666666667,
        assetClass: 'Anleihen' 
      }
    ]
  }
};

// =============================================================================
// MOCK API RESPONSES FOR VALIDATION ENDPOINTS
// =============================================================================

export const mockApiResponses = {
  successful: {
    validation: {
      success: true,
      data: {
        validationId: 'val_12345',
        status: 'completed',
        results: {
          isValid: true,
          overallScore: 95,
          issues: [],
          fundDecomposition: { accuracy: 99.2, tolerance: 0.01 },
          doubleCounting: { detected: false, affectedAssets: [], overlapValue: 0 },
          currencyExposure: { isConsistent: true, hedgingEfficiency: 85 },
          geographicIntegrity: { isValid: true, totalAllocation: 100 },
          germanCompliance: { isCompliant: true, complianceScore: 98 }
        }
      }
    },

    factsheet: {
      success: true,
      data: {
        isin: 'DE0001234567',
        name: 'Sample Global Equity Fund',
        fundSize: 2500000000,
        holdings: [
          { name: 'Apple Inc', isin: 'US0378331005', weight: 0.08, currency: 'USD' },
          { name: 'Microsoft Corp', isin: 'US5949181045', weight: 0.07, currency: 'USD' },
          { name: 'Amazon.com Inc', isin: 'US0231351067', weight: 0.05, currency: 'USD' },
          { name: 'Alphabet Inc', isin: 'US02079K3059', weight: 0.04, currency: 'USD' },
          { name: 'Tesla Inc', isin: 'US88160R1014', weight: 0.03, currency: 'USD' }
        ]
      }
    }
  },

  failed: {
    validation: {
      success: false,
      error: 'Validation failed',
      details: 'Multiple critical issues detected'
    },

    networkError: {
      success: false,
      error: 'Network timeout',
      message: 'Request timed out after 30 seconds'
    },

    serverError: {
      success: false,
      error: 'Internal server error',
      message: 'Validation service temporarily unavailable'
    }
  },

  partialFailure: {
    validation: {
      success: true,
      data: {
        validationId: 'val_67890',
        status: 'partially_completed',
        results: {
          isValid: false,
          overallScore: 65,
          issues: [
            {
              severity: ValidationSeverity.Critical,
              code: 'FUND_DECOMP_002',
              message: 'Fund decomposition service failed',
              affectedPositions: ['Global Tech Fund']
            }
          ],
          fundDecomposition: { error: 'Service unavailable' },
          doubleCounting: { detected: true, affectedAssets: ['Apple Inc'], overlapValue: 15000 },
          currencyExposure: { isConsistent: false, issues: ['Currency sum exceeds 100%'] },
          geographicIntegrity: { isValid: true, totalAllocation: 100 },
          germanCompliance: { isCompliant: false, complianceScore: 72 }
        }
      }
    }
  }
};

// =============================================================================
// TEST PORTFOLIOS WITH KNOWN VALIDATION ISSUES
// =============================================================================

export const problemPortfolios = {
  doubleCounting: {
    name: 'Double Counting Portfolio',
    totalValue: 1000000,
    directPositions: [
      { name: 'Apple Inc Direct', isin: 'US0378331005', value: 100000 },
      { name: 'Microsoft Corp Direct', isin: 'US5949181045', value: 80000 }
    ],
    fundPositions: [
      {
        name: 'Tech ETF',
        isin: 'DE0001111111',
        value: 300000,
        holdings: [
          { name: 'Apple Inc via ETF', isin: 'US0378331005', weight: 0.15, value: 45000 },
          { name: 'Microsoft Corp via ETF', isin: 'US5949181045', weight: 0.12, value: 36000 },
          { name: 'Google Inc', isin: 'US02079K3059', weight: 0.73, value: 219000 }
        ]
      }
    ]
  },

  currencyIssues: {
    name: 'Currency Problem Portfolio',
    baseCurrency: 'EUR',
    exposures: [
      { currency: 'EUR', exposure: 45, isHedged: false },
      { currency: 'USD', exposure: 70, isHedged: false }, // Over 100% total
      { currency: 'GBP', exposure: -15, isHedged: true } // Negative exposure
    ]
  },

  germanComplianceIssues: {
    name: 'German Compliance Problems',
    positions: [
      { name: 'Crypto Fund', assetClass: 'Kryptowährung', value: 200000, isin: 'INVALID' },
      { name: 'Derivative Heavy Fund', assetClass: 'Derivate', value: 400000, isin: 'LU0123456789' },
      { name: 'Normal Equity Fund', assetClass: 'Aktien', value: 400000, isin: 'DE0001234567' }
    ]
  },

  fundDecompositionIssues: {
    name: 'Fund Decomposition Problems',
    fundValue: 1000000,
    reportedHoldings: [
      { name: 'Holding 1', weight: 0.4, value: 350000 }, // Weight-value mismatch
      { name: 'Holding 2', weight: 0.3, value: 400000 }, // Weight-value mismatch
      { name: 'Holding 3', weight: 0.2, value: 200000 }, // Correct
      { name: 'Holding 4', weight: 0.2, value: 50000 }   // Weights sum > 1.0
    ]
  }
};

// =============================================================================
// GERMAN FINANCIAL STANDARD TEST CASES
// =============================================================================

export const germanStandardsTestCases = {
  bafin: {
    compliant: {
      name: 'BaFin Compliant Portfolio',
      positions: [
        { name: 'German Equity UCITS', assetClass: 'Aktien', value: 400000, isin: 'DE0001234567' },
        { name: 'Euro Bond UCITS', assetClass: 'Anleihen', value: 300000, isin: 'LU0987654321' },
        { name: 'Money Market Fund', assetClass: 'Liquidität/Cash', value: 200000, isin: 'DE0011223344' },
        { name: 'Real Estate Fund', assetClass: 'Immobilien', value: 100000, isin: 'DE0055667788' }
      ]
    },

    nonCompliant: {
      name: 'BaFin Non-Compliant Portfolio',
      positions: [
        { name: 'Crypto Fund', assetClass: 'Digital Assets', value: 300000, isin: 'INVALID123' },
        { name: 'P2P Lending', assetClass: 'Alternative Lending', value: 200000, isin: 'UNKNOWN' },
        { name: 'Valid Fund', assetClass: 'Aktien', value: 500000, isin: 'DE0001234567' }
      ]
    }
  },

  ucits: {
    compliant: {
      name: 'UCITS Compliant Structure',
      positions: [
        { name: 'UCITS Equity Fund', assetClass: 'Aktien', value: 600000, isin: 'LU0123456789' },
        { name: 'UCITS Bond Fund', assetClass: 'Anleihen', value: 300000, isin: 'IE00B4L5Y983' },
        { name: 'Small Derivative Position', assetClass: 'Derivate', value: 50000, isin: 'FR0010869578' }, // 5% derivatives
        { name: 'Cash Position', assetClass: 'Liquidität/Cash', value: 50000, isin: 'DE0000000000' }
      ]
    },

    nonCompliant: {
      name: 'UCITS Non-Compliant Structure',
      positions: [
        { name: 'Equity Fund', assetClass: 'Aktien', value: 500000, isin: 'LU0123456789' },
        { name: 'Derivative Heavy Fund', assetClass: 'Derivate', value: 300000, isin: 'FR0010869578' }, // 30% derivatives
        { name: 'Alternative Investment', assetClass: 'Private Equity', value: 200000, isin: 'US1234567890' }
      ]
    }
  },

  reporting: {
    correct: {
      name: 'Correct German Reporting',
      positions: [
        { name: 'Fund A', assetClass: 'Aktien', value: 500000, isin: 'DE0001234567' },
        { name: 'Fund B', assetClass: 'Anleihen', value: 500000, isin: 'DE0009876543' }
      ],
      allocations: [
        { category: 'Aktien', percentage: 50.0 },
        { category: 'Anleihen', percentage: 50.0 }
      ]
    },

    incorrect: {
      name: 'Incorrect German Reporting',
      positions: [
        { name: 'Fund A', assetClass: 'Aktien', value: 600000, isin: 'DE0001234567' },
        { name: 'Fund B', assetClass: 'Anleihen', value: 400000, isin: 'DE0009876543' }
      ],
      allocations: [
        { category: 'Aktien', percentage: 55.0 }, // Doesn't match 60%
        { category: 'Anleihen', percentage: 40.0 } // Total only 95%
      ]
    }
  }
};

// =============================================================================
// LARGE PORTFOLIOS FOR PERFORMANCE TESTING
// =============================================================================

export const performanceTestPortfolios = {
  generate100Assets: (): AssetData[] => Array.from({ length: 100 }, (_, i) => ({
    name: `Performance Test Asset ${i + 1}`,
    expectedReturn: 0.05 + (Math.random() * 0.10),
    volatility: 0.10 + (Math.random() * 0.20),
    weight: 1 / 100,
    value: Math.floor(Math.random() * 100000) + 10000
  })),

  generate1000Assets: (): AssetData[] => Array.from({ length: 1000 }, (_, i) => ({
    name: `Large Portfolio Asset ${i + 1}`,
    expectedReturn: 0.04 + (Math.random() * 0.12),
    volatility: 0.08 + (Math.random() * 0.30),
    weight: 1 / 1000,
    value: Math.floor(Math.random() * 50000) + 5000
  })),

  generate500FundHoldings: (): FundHolding[] => {
    const assetClasses = ['Aktien', 'Anleihen', 'Immobilien', 'Rohstoffe', 'Liquidität/Cash'];
    const geographies = ['Deutschland', 'Europa (inkl. UK)', 'USA/Nordamerika', 'Asien', 'Emerging Markets'];
    const currencies = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];

    return Array.from({ length: 500 }, (_, i) => ({
      name: `Performance Fund Holding ${i + 1}`,
      isin: `PERF${String(i + 1).padStart(8, '0')}`,
      weight: 1 / 500,
      value: Math.floor(Math.random() * 20000) + 1000,
      currency: currencies[i % currencies.length],
      assetClass: assetClasses[i % assetClasses.length],
      geography: geographies[i % geographies.length],
      sector: `Sector ${(i % 15) + 1}`
    }));
  }
};

// =============================================================================
// MOCK EXTERNAL DEPENDENCIES
// =============================================================================

export const mockExternalDependencies = {
  anthropicAI: {
    successResponse: {
      choices: [
        {
          message: {
            content: JSON.stringify({
              analysisResult: 'Fund decomposition appears accurate with 98.5% alignment',
              confidence: 0.92,
              suggestedActions: ['No immediate action required']
            })
          }
        }
      ]
    },

    failureResponse: {
      error: {
        message: 'AI service temporarily unavailable',
        type: 'service_unavailable'
      }
    }
  },

  factsheetExtraction: {
    success: {
      extracted: true,
      holdings: [
        { name: 'Apple Inc', isin: 'US0378331005', weight: 0.08 },
        { name: 'Microsoft Corp', isin: 'US5949181045', weight: 0.07 }
      ],
      metadata: {
        fundName: 'Sample Technology Fund',
        extractionDate: new Date().toISOString(),
        confidence: 0.95
      }
    },

    failure: {
      extracted: false,
      error: 'Unable to extract holdings from factsheet',
      fallbackUsed: true
    }
  },

  fileSystemOperations: {
    readFile: {
      success: Buffer.from('mock,csv,data\nposition1,100000,equity'),
      failure: new Error('File not found')
    },

    writeFile: {
      success: true,
      failure: new Error('Permission denied')
    }
  }
};

// =============================================================================
// EXPORT ALL TEST DATA COLLECTIONS
// =============================================================================

export const testDataCollections = {
  portfolios: realisticPortfolioData,
  overlapping: overlappingFundPortfolio,
  currencies: currencyExposureTestCases,
  geography: geographicAllocationTestCases,
  edgeCases: edgeCaseTestData,
  apiResponses: mockApiResponses,
  problems: problemPortfolios,
  germanStandards: germanStandardsTestCases,
  performance: performanceTestPortfolios,
  mocks: mockExternalDependencies
};

export default testDataCollections;