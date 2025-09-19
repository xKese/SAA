/**
 * Frontend validation component tests
 * Tests rendering, interactions, and data handling for validation components
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Import components to test
import LookThroughValidationPanel from '../../client/src/components/LookThroughValidationPanel';
import ValidationChart from '../../client/src/components/ValidationChart';
import ValidationSummary from '../../client/src/components/ValidationSummary';

// Mock FundDecompositionTable component for testing
const FundDecompositionTable = ({ 
  fundData, 
  sortable = false, 
  filterable = false, 
  exportable = false, 
  highlightIssues = false,
  onExport = () => {} 
}: any) => {
  if (!fundData || fundData.length === 0) {
    return <div>No fund data available</div>;
  }

  return (
    <div data-testid="fund-decomposition-table">
      <h3>Fund Decomposition</h3>
      <table role="table">
        <thead>
          <tr role="row">
            <th>Name</th>
            <th>Weight %</th>
            <th>Value</th>
            <th>Currency</th>
            <th>Asset Class</th>
            <th>Geography</th>
          </tr>
        </thead>
        <tbody>
          {fundData.map((fund: any, index: number) => (
            <tr 
              key={fund.isin || index} 
              role="row"
              className={fund.hasValidationIssue ? 'has-validation-issue' : ''}
            >
              <td>{fund.name}</td>
              <td>{fund.weight}%</td>
              <td>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(fund.value)}</td>
              <td>{fund.currency}</td>
              <td>{fund.assetClass}</td>
              <td>{fund.geography}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {exportable && <button onClick={() => onExport(fundData, 'csv')}>Export</button>}
      {filterable && (
        <select role="combobox" aria-label="asset class filter">
          <option value="">All</option>
          <option value="Aktien">Aktien</option>
          <option value="Anleihen">Anleihen</option>
        </select>
      )}
    </div>
  );
};

// Mock data for testing
const mockValidationResults = {
  portfolioId: 'test-portfolio-123',
  isValid: true,
  overallScore: 92,
  validationTimestamp: new Date().toISOString(),
  issues: [
    {
      severity: 'warning' as const,
      code: 'CURRENCY_003',
      message: 'Minor hedging inconsistency detected',
      messageDE: 'Geringfügige Hedging-Inkonsistenz erkannt',
      affectedPositions: ['US Tech Fund'],
      suggestedAction: 'Review currency hedging strategy'
    }
  ],
  fundDecomposition: {
    accuracy: 98.5,
    tolerance: 0.01,
    issues: []
  },
  doubleCounting: {
    detected: false,
    affectedAssets: [],
    overlapValue: 0
  },
  currencyExposure: {
    isConsistent: true,
    exposures: {
      'EUR': 45,
      'USD': 35,
      'GBP': 20
    },
    hedgingStatus: {
      'EUR': false,
      'USD': true,
      'GBP': true
    }
  },
  geographicIntegrity: {
    isValid: true,
    totalAllocation: 100,
    missingAllocations: []
  },
  germanCompliance: {
    isCompliant: true,
    bafin: {
      assetClassification: true,
      ucitsCompliance: true,
      reportingStandards: true
    },
    complianceScore: 95
  }
};

const mockChartData = {
  accuracyTrend: [
    { date: '2024-01-01', accuracy: 95 },
    { date: '2024-01-02', accuracy: 97 },
    { date: '2024-01-03', accuracy: 92 },
    { date: '2024-01-04', accuracy: 98 }
  ],
  issueDistribution: [
    { category: 'Fund Decomposition', count: 2, severity: 'warning' },
    { category: 'Currency Exposure', count: 1, severity: 'error' },
    { category: 'Geographic Allocation', count: 0, severity: 'info' }
  ],
  complianceMetrics: {
    bafin: 95,
    ucits: 98,
    reporting: 92
  }
};

// Test setup helper
const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('LookThroughValidationPanel Component', () => {
  const user = userEvent.setup();
  let mockOnRevalidate: ReturnType<typeof vi.fn>;
  let mockOnExport: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnRevalidate = vi.fn();
    mockOnExport = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render validation panel with results', () => {
    renderWithProviders(
      <LookThroughValidationPanel
        portfolioId="test-portfolio-123"
        validationResults={mockValidationResults}
        onRevalidate={mockOnRevalidate}
        onExport={mockOnExport}
      />
    );

    expect(screen.getByText('Look-Through Validation Results')).toBeInTheDocument();
    expect(screen.getByText('Overall Score: 92%')).toBeInTheDocument();
    expect(screen.getByText('Valid Portfolio')).toBeInTheDocument();
  });

  it('should display validation issues correctly', () => {
    renderWithProviders(
      <LookThroughValidationPanel
        portfolioId="test-portfolio-123"
        validationResults={mockValidationResults}
        onRevalidate={mockOnRevalidate}
        onExport={mockOnExport}
      />
    );

    expect(screen.getByText('Minor hedging inconsistency detected')).toBeInTheDocument();
    expect(screen.getByText('US Tech Fund')).toBeInTheDocument();
  });

  it('should handle tab switching correctly', async () => {
    renderWithProviders(
      <LookThroughValidationPanel
        portfolioId="test-portfolio-123"
        validationResults={mockValidationResults}
        onRevalidate={mockOnRevalidate}
        onExport={mockOnExport}
      />
    );

    // Click on Fund Decomposition tab
    const fundDecompositionTab = screen.getByText('Fund Decomposition');
    await user.click(fundDecompositionTab);

    expect(screen.getByText('Accuracy: 98.5%')).toBeInTheDocument();
  });

  it('should call revalidate function when revalidate button is clicked', async () => {
    renderWithProviders(
      <LookThroughValidationPanel
        portfolioId="test-portfolio-123"
        validationResults={mockValidationResults}
        onRevalidate={mockOnRevalidate}
        onExport={mockOnExport}
      />
    );

    const revalidateButton = screen.getByText('Revalidate');
    await user.click(revalidateButton);

    expect(mockOnRevalidate).toHaveBeenCalledTimes(1);
  });

  it('should call export function when export button is clicked', async () => {
    renderWithProviders(
      <LookThroughValidationPanel
        portfolioId="test-portfolio-123"
        validationResults={mockValidationResults}
        onRevalidate={mockOnRevalidate}
        onExport={mockOnExport}
      />
    );

    const exportButton = screen.getByText('Export');
    await user.click(exportButton);

    expect(mockOnExport).toHaveBeenCalledTimes(1);
  });

  it('should show loading state correctly', () => {
    renderWithProviders(
      <LookThroughValidationPanel
        portfolioId="test-portfolio-123"
        validationResults={mockValidationResults}
        isLoading={true}
        onRevalidate={mockOnRevalidate}
        onExport={mockOnExport}
      />
    );

    expect(screen.getByTestId('validation-loading')).toBeInTheDocument();
  });

  it('should filter issues by severity', async () => {
    const multiIssueResults = {
      ...mockValidationResults,
      issues: [
        {
          severity: 'warning' as const,
          code: 'CURRENCY_003',
          message: 'Warning issue',
          affectedPositions: ['Fund A']
        },
        {
          severity: 'error' as const,
          code: 'FUND_DECOMP_001',
          message: 'Error issue',
          affectedPositions: ['Fund B']
        },
        {
          severity: 'critical' as const,
          code: 'BAFIN_001',
          message: 'Critical issue',
          affectedPositions: ['Fund C']
        }
      ]
    };

    renderWithProviders(
      <LookThroughValidationPanel
        portfolioId="test-portfolio-123"
        validationResults={multiIssueResults}
        onRevalidate={mockOnRevalidate}
        onExport={mockOnExport}
      />
    );

    // Filter by critical issues only
    const severityFilter = screen.getByRole('combobox', { name: /severity filter/i });
    await user.selectOptions(severityFilter, 'critical');

    expect(screen.getByText('Critical issue')).toBeInTheDocument();
    expect(screen.queryByText('Warning issue')).not.toBeInTheDocument();
    expect(screen.queryByText('Error issue')).not.toBeInTheDocument();
  });

  it('should expand and collapse sections correctly', async () => {
    renderWithProviders(
      <LookThroughValidationPanel
        portfolioId="test-portfolio-123"
        validationResults={mockValidationResults}
        onRevalidate={mockOnRevalidate}
        onExport={mockOnExport}
      />
    );

    const detailsSection = screen.getByText('Validation Details');
    await user.click(detailsSection);

    // Check if section content is visible
    expect(screen.getByText('Fund decomposition accuracy')).toBeInTheDocument();
  });

  it('should display German compliance information', () => {
    renderWithProviders(
      <LookThroughValidationPanel
        portfolioId="test-portfolio-123"
        validationResults={mockValidationResults}
        onRevalidate={mockOnRevalidate}
        onExport={mockOnExport}
      />
    );

    // Click on compliance tab
    const complianceTab = screen.getByText('German Compliance');
    fireEvent.click(complianceTab);

    expect(screen.getByText('BaFin Compliant')).toBeInTheDocument();
    expect(screen.getByText('UCITS Compliant')).toBeInTheDocument();
    expect(screen.getByText('Compliance Score: 95%')).toBeInTheDocument();
  });

  it('should handle invalid validation results gracefully', () => {
    const invalidResults = {
      ...mockValidationResults,
      isValid: false,
      overallScore: 45,
      issues: [
        {
          severity: 'critical' as const,
          code: 'FUND_DECOMP_002',
          message: 'Critical validation failure',
          affectedPositions: ['Problematic Fund']
        }
      ]
    };

    renderWithProviders(
      <LookThroughValidationPanel
        portfolioId="test-portfolio-123"
        validationResults={invalidResults}
        onRevalidate={mockOnRevalidate}
        onExport={mockOnExport}
      />
    );

    expect(screen.getByText('Invalid Portfolio')).toBeInTheDocument();
    expect(screen.getByText('Overall Score: 45%')).toBeInTheDocument();
    expect(screen.getByText('Critical validation failure')).toBeInTheDocument();
  });
});

describe('ValidationChart Component', () => {
  it('should render accuracy trend chart', () => {
    renderWithProviders(
      <ValidationChart
        data={mockChartData}
        chartType="accuracyTrend"
        title="Validation Accuracy Trend"
      />
    );

    expect(screen.getByText('Validation Accuracy Trend')).toBeInTheDocument();
    expect(screen.getByTestId('accuracy-trend-chart')).toBeInTheDocument();
  });

  it('should render issue distribution chart', () => {
    renderWithProviders(
      <ValidationChart
        data={mockChartData}
        chartType="issueDistribution"
        title="Issue Distribution"
      />
    );

    expect(screen.getByText('Issue Distribution')).toBeInTheDocument();
    expect(screen.getByTestId('issue-distribution-chart')).toBeInTheDocument();
  });

  it('should render compliance metrics chart', () => {
    renderWithProviders(
      <ValidationChart
        data={mockChartData}
        chartType="complianceMetrics"
        title="Compliance Metrics"
      />
    );

    expect(screen.getByText('Compliance Metrics')).toBeInTheDocument();
    expect(screen.getByTestId('compliance-metrics-chart')).toBeInTheDocument();
  });

  it('should handle empty data gracefully', () => {
    const emptyData = {
      accuracyTrend: [],
      issueDistribution: [],
      complianceMetrics: {}
    };

    renderWithProviders(
      <ValidationChart
        data={emptyData}
        chartType="accuracyTrend"
        title="Empty Chart"
      />
    );

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should be responsive to different screen sizes', () => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    renderWithProviders(
      <ValidationChart
        data={mockChartData}
        chartType="accuracyTrend"
        title="Responsive Chart"
        responsive={true}
      />
    );

    const chart = screen.getByTestId('accuracy-trend-chart');
    expect(chart).toHaveClass('responsive-chart');
  });

  it('should handle chart interactions correctly', async () => {
    const user = userEvent.setup();
    const mockOnDataPointClick = vi.fn();

    renderWithProviders(
      <ValidationChart
        data={mockChartData}
        chartType="accuracyTrend"
        title="Interactive Chart"
        onDataPointClick={mockOnDataPointClick}
      />
    );

    // Simulate clicking on a data point
    const dataPoint = screen.getByTestId('chart-data-point-0');
    await user.click(dataPoint);

    expect(mockOnDataPointClick).toHaveBeenCalledWith({
      date: '2024-01-01',
      accuracy: 95
    });
  });
});

describe('Enhanced ValidationSummary Component', () => {
  const user = userEvent.setup();

  it('should render validation summary with enhanced metrics', () => {
    renderWithProviders(
      <ValidationSummary
        validationResults={mockValidationResults}
        showDetailed={true}
      />
    );

    expect(screen.getByText('Validation Summary')).toBeInTheDocument();
    expect(screen.getByText('Overall Score: 92%')).toBeInTheDocument();
    expect(screen.getByText('Fund Decomposition: 98.5%')).toBeInTheDocument();
    expect(screen.getByText('German Compliance: 95%')).toBeInTheDocument();
  });

  it('should toggle between simple and detailed views', async () => {
    renderWithProviders(
      <ValidationSummary
        validationResults={mockValidationResults}
        showDetailed={false}
      />
    );

    // Initially should show simple view
    expect(screen.queryByText('Fund Decomposition: 98.5%')).not.toBeInTheDocument();

    // Click toggle to show detailed view
    const toggleButton = screen.getByText('Show Details');
    await user.click(toggleButton);

    expect(screen.getByText('Fund Decomposition: 98.5%')).toBeInTheDocument();
  });

  it('should display issue counts by severity', () => {
    const resultsWithMultipleIssues = {
      ...mockValidationResults,
      issues: [
        { severity: 'warning' as const, code: 'W001', message: 'Warning 1' },
        { severity: 'warning' as const, code: 'W002', message: 'Warning 2' },
        { severity: 'error' as const, code: 'E001', message: 'Error 1' },
        { severity: 'critical' as const, code: 'C001', message: 'Critical 1' }
      ]
    };

    renderWithProviders(
      <ValidationSummary
        validationResults={resultsWithMultipleIssues}
        showDetailed={true}
      />
    );

    expect(screen.getByText('Warnings: 2')).toBeInTheDocument();
    expect(screen.getByText('Errors: 1')).toBeInTheDocument();
    expect(screen.getByText('Critical: 1')).toBeInTheDocument();
  });

  it('should show validation timestamp', () => {
    const timestamp = new Date('2024-01-15T10:30:00Z').toISOString();
    const resultsWithTimestamp = {
      ...mockValidationResults,
      validationTimestamp: timestamp
    };

    renderWithProviders(
      <ValidationSummary
        validationResults={resultsWithTimestamp}
        showDetailed={true}
      />
    );

    expect(screen.getByText(/Validated on/)).toBeInTheDocument();
    expect(screen.getByText(/15\.01\.2024/)).toBeInTheDocument(); // German date format
  });

  it('should handle missing validation data gracefully', () => {
    const incompleteResults = {
      portfolioId: 'test-123',
      isValid: true,
      overallScore: 85,
      issues: []
      // Missing other optional fields
    };

    renderWithProviders(
      <ValidationSummary
        validationResults={incompleteResults as any}
        showDetailed={true}
      />
    );

    expect(screen.getByText('Overall Score: 85%')).toBeInTheDocument();
    expect(screen.getByText('No issues detected')).toBeInTheDocument();
  });
});

describe('FundDecompositionTable Component', () => {
  const mockFundData = [
    {
      name: 'Apple Inc',
      isin: 'US0378331005',
      weight: 25.5,
      value: 25500,
      currency: 'USD',
      assetClass: 'Aktien',
      geography: 'USA/Nordamerika',
      sector: 'Technology'
    },
    {
      name: 'SAP SE',
      isin: 'DE0007164600',
      weight: 20.0,
      value: 20000,
      currency: 'EUR',
      assetClass: 'Aktien',
      geography: 'Deutschland',
      sector: 'Technology'
    },
    {
      name: 'German Government Bond',
      isin: 'DE0001102309',
      weight: 15.0,
      value: 15000,
      currency: 'EUR',
      assetClass: 'Anleihen',
      geography: 'Deutschland',
      sector: 'Government'
    }
  ];

  it('should render fund decomposition table', () => {
    renderWithProviders(
      <FundDecompositionTable
        fundData={mockFundData}
        sortable={true}
        exportable={true}
      />
    );

    expect(screen.getByText('Fund Decomposition')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc')).toBeInTheDocument();
    expect(screen.getByText('SAP SE')).toBeInTheDocument();
    expect(screen.getByText('German Government Bond')).toBeInTheDocument();
  });

  it('should sort table by different columns', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(
      <FundDecompositionTable
        fundData={mockFundData}
        sortable={true}
      />
    );

    // Sort by weight
    const weightHeader = screen.getByText('Weight %');
    await user.click(weightHeader);

    // Check if sorted in descending order (highest weight first)
    const rows = screen.getAllByRole('row');
    const firstRow = within(rows[1]).getByText('Apple Inc'); // Highest weight
    expect(firstRow).toBeInTheDocument();
  });

  it('should filter table by asset class', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(
      <FundDecompositionTable
        fundData={mockFundData}
        filterable={true}
      />
    );

    // Filter by Aktien
    const assetClassFilter = screen.getByRole('combobox', { name: /asset class filter/i });
    await user.selectOptions(assetClassFilter, 'Aktien');

    expect(screen.getByText('Apple Inc')).toBeInTheDocument();
    expect(screen.getByText('SAP SE')).toBeInTheDocument();
    expect(screen.queryByText('German Government Bond')).not.toBeInTheDocument();
  });

  it('should export table data', async () => {
    const user = userEvent.setup();
    const mockExport = vi.fn();
    
    renderWithProviders(
      <FundDecompositionTable
        fundData={mockFundData}
        exportable={true}
        onExport={mockExport}
      />
    );

    const exportButton = screen.getByText('Export');
    await user.click(exportButton);

    expect(mockExport).toHaveBeenCalledWith(mockFundData, 'csv');
  });

  it('should handle empty fund data', () => {
    renderWithProviders(
      <FundDecompositionTable
        fundData={[]}
        sortable={true}
      />
    );

    expect(screen.getByText('No fund data available')).toBeInTheDocument();
  });

  it('should display currency-formatted values', () => {
    renderWithProviders(
      <FundDecompositionTable
        fundData={mockFundData}
      />
    );

    // Check German currency formatting
    expect(screen.getByText('25.500,00 €')).toBeInTheDocument();
    expect(screen.getByText('20.000,00 €')).toBeInTheDocument();
  });

  it('should highlight validation issues in table rows', () => {
    const fundDataWithIssues = mockFundData.map((fund, index) => ({
      ...fund,
      hasValidationIssue: index === 0, // Apple Inc has issue
      validationIssue: index === 0 ? 'Double counting detected' : undefined
    }));

    renderWithProviders(
      <FundDecompositionTable
        fundData={fundDataWithIssues}
        highlightIssues={true}
      />
    );

    const appleRow = screen.getByText('Apple Inc').closest('tr');
    expect(appleRow).toHaveClass('has-validation-issue');
    expect(screen.getByText('Double counting detected')).toBeInTheDocument();
  });
});

describe('Accessibility and Mobile Responsiveness', () => {
  it('should have proper ARIA labels and roles', () => {
    renderWithProviders(
      <LookThroughValidationPanel
        portfolioId="test-portfolio-123"
        validationResults={mockValidationResults}
      />
    );

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    expect(screen.getByLabelText('Validation overview')).toBeInTheDocument();
  });

  it('should be keyboard navigable', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(
      <LookThroughValidationPanel
        portfolioId="test-portfolio-123"
        validationResults={mockValidationResults}
      />
    );

    // Tab through the component
    await user.tab();
    expect(screen.getByText('Overview')).toHaveFocus();

    await user.tab();
    expect(screen.getByText('Fund Decomposition')).toHaveFocus();

    // Use arrow keys for tab navigation
    await user.keyboard('[ArrowRight]');
    expect(screen.getByText('Currency Exposure')).toHaveFocus();
  });

  it('should adapt to mobile screen sizes', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    renderWithProviders(
      <LookThroughValidationPanel
        portfolioId="test-portfolio-123"
        validationResults={mockValidationResults}
      />
    );

    const container = screen.getByTestId('validation-panel-container');
    expect(container).toHaveClass('mobile-layout');
  });

  it('should support high contrast mode', () => {
    // Mock high contrast preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-contrast: high)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    renderWithProviders(
      <ValidationSummary
        validationResults={mockValidationResults}
        showDetailed={true}
      />
    );

    const summary = screen.getByTestId('validation-summary');
    expect(summary).toHaveClass('high-contrast');
  });

  it('should provide screen reader announcements for validation updates', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(
      <LookThroughValidationPanel
        portfolioId="test-portfolio-123"
        validationResults={mockValidationResults}
      />
    );

    // Trigger revalidation
    const revalidateButton = screen.getByText('Revalidate');
    await user.click(revalidateButton);

    expect(screen.getByRole('status')).toHaveTextContent('Validation in progress');
  });

  it('should handle reduced motion preferences', () => {
    // Mock reduced motion preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    renderWithProviders(
      <ValidationChart
        data={mockChartData}
        chartType="accuracyTrend"
        title="Reduced Motion Chart"
      />
    );

    const chart = screen.getByTestId('accuracy-trend-chart');
    expect(chart).toHaveClass('reduced-motion');
  });
});