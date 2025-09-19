/**
 * End-to-end validation workflow tests
 * Tests complete portfolio upload → analysis → validation → results display
 * User interaction testing, error handling, mobile/desktop responsive behavior,
 * and accessibility testing for validation components
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test data
const mockPortfolioData = {
  name: 'Test Portfolio E2E',
  totalValue: 1000000,
  positions: [
    {
      name: 'Global Technology Fund',
      isin: 'DE0001234567',
      value: 400000,
      assetClass: 'Aktien',
      geography: 'Global'
    },
    {
      name: 'European Bond Fund',
      isin: 'LU0987654321',
      value: 300000,
      assetClass: 'Anleihen',
      geography: 'Europa (inkl. UK)'
    },
    {
      name: 'German Real Estate Fund',
      isin: 'DE0011223344',
      value: 200000,
      assetClass: 'Immobilien',
      geography: 'Deutschland'
    },
    {
      name: 'Money Market Fund',
      isin: 'DE0055667788',
      value: 100000,
      assetClass: 'Liquidität/Cash',
      geography: 'Deutschland'
    }
  ]
};

const problemPortfolioData = {
  name: 'Problem Portfolio E2E',
  totalValue: 1000000,
  positions: [
    {
      name: 'Overlapping Tech Fund',
      isin: 'DE0001234567',
      value: 500000,
      assetClass: 'Aktien',
      geography: 'Global'
    },
    {
      name: 'Invalid Asset Class Fund',
      isin: 'INVALID123',
      value: 300000,
      assetClass: 'Cryptocurrency',
      geography: 'Global'
    },
    {
      name: 'Excessive Derivative Fund',
      isin: 'LU0999888777',
      value: 200000,
      assetClass: 'Derivate',
      geography: 'Europa (inkl. UK)'
    }
  ]
};

// Helper functions
async function uploadPortfolio(page: Page, portfolioData: any) {
  // Navigate to upload page
  await page.goto('/portfolio/upload');
  
  // Fill portfolio name
  await page.fill('[data-testid="portfolio-name-input"]', portfolioData.name);
  
  // Upload portfolio data (simulate file upload)
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'portfolio.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(convertToCSV(portfolioData))
  });
  
  // Submit upload
  await page.click('[data-testid="upload-submit-button"]');
  
  // Wait for upload confirmation
  await expect(page.locator('[data-testid="upload-success-message"]')).toBeVisible();
}

function convertToCSV(portfolioData: any): string {
  const header = 'Name,ISIN,Value,AssetClass,Geography\n';
  const rows = portfolioData.positions.map((pos: any) => 
    `${pos.name},${pos.isin},${pos.value},${pos.assetClass},${pos.geography}`
  ).join('\n');
  return header + rows;
}

async function waitForValidationCompletion(page: Page, timeout = 30000) {
  await page.waitForSelector('[data-testid="validation-completed"]', { timeout });
}

test.describe('Complete Validation Workflow E2E Tests', () => {
  test('should complete full portfolio upload → analysis → validation → results workflow', async ({ page }) => {
    // Step 1: Upload portfolio
    await uploadPortfolio(page, mockPortfolioData);
    
    // Step 2: Navigate to analysis
    await page.click('[data-testid="analyze-portfolio-button"]');
    await expect(page.locator('[data-testid="analysis-page"]')).toBeVisible();
    
    // Step 3: Trigger validation
    await page.click('[data-testid="start-validation-button"]');
    await expect(page.locator('[data-testid="validation-progress"]')).toBeVisible();
    
    // Step 4: Wait for validation completion
    await waitForValidationCompletion(page);
    
    // Step 5: Verify results display
    await expect(page.locator('[data-testid="validation-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="overall-score"]')).toContainText(/\d+%/);
    await expect(page.locator('[data-testid="validation-status"]')).toContainText(/Valid|Invalid/);
    
    // Step 6: Check detailed validation sections
    await page.click('[data-testid="fund-decomposition-tab"]');
    await expect(page.locator('[data-testid="fund-decomposition-results"]')).toBeVisible();
    
    await page.click('[data-testid="currency-exposure-tab"]');
    await expect(page.locator('[data-testid="currency-exposure-results"]')).toBeVisible();
    
    await page.click('[data-testid="geographic-integrity-tab"]');
    await expect(page.locator('[data-testid="geographic-integrity-results"]')).toBeVisible();
    
    await page.click('[data-testid="german-compliance-tab"]');
    await expect(page.locator('[data-testid="german-compliance-results"]')).toBeVisible();
  });

  test('should handle validation errors and display appropriate messages', async ({ page }) => {
    // Upload problematic portfolio
    await uploadPortfolio(page, problemPortfolioData);
    
    // Navigate to analysis and trigger validation
    await page.click('[data-testid="analyze-portfolio-button"]');
    await page.click('[data-testid="start-validation-button"]');
    await waitForValidationCompletion(page);
    
    // Should show validation failed status
    await expect(page.locator('[data-testid="validation-status"]')).toContainText('Invalid');
    await expect(page.locator('[data-testid="overall-score"]')).toBeVisible();
    
    // Check for specific error messages
    await expect(page.locator('[data-testid="validation-issues"]')).toBeVisible();
    
    // Should show ISIN validation error
    await expect(page.locator('text=Invalid ISIN format')).toBeVisible();
    
    // Should show asset class validation error
    await expect(page.locator('text=Invalid asset class')).toBeVisible();
    
    // Should show derivative limit warning
    await expect(page.locator('text=Derivative exposure')).toBeVisible();
  });

  test('should display validation progress and real-time updates', async ({ page }) => {
    await uploadPortfolio(page, mockPortfolioData);
    await page.click('[data-testid="analyze-portfolio-button"]');
    
    // Start validation and monitor progress
    await page.click('[data-testid="start-validation-button"]');
    
    // Check initial progress state
    await expect(page.locator('[data-testid="validation-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    
    // Check progress stages
    await expect(page.locator('text=Analyzing fund decomposition')).toBeVisible();
    await expect(page.locator('text=Validating currency exposure')).toBeVisible();
    await expect(page.locator('text=Checking German compliance')).toBeVisible();
    
    // Wait for completion
    await waitForValidationCompletion(page);
    
    // Progress should be hidden, results visible
    await expect(page.locator('[data-testid="validation-progress"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="validation-results"]')).toBeVisible();
  });

  test('should allow revalidation after portfolio changes', async ({ page }) => {
    await uploadPortfolio(page, mockPortfolioData);
    await page.click('[data-testid="analyze-portfolio-button"]');
    await page.click('[data-testid="start-validation-button"]');
    await waitForValidationCompletion(page);
    
    // Modify portfolio
    await page.click('[data-testid="edit-portfolio-button"]');
    await page.fill('[data-testid="position-value-input-0"]', '450000'); // Change first position value
    await page.click('[data-testid="save-changes-button"]');
    
    // Trigger revalidation
    await page.click('[data-testid="revalidate-button"]');
    await expect(page.locator('[data-testid="validation-progress"]')).toBeVisible();
    await waitForValidationCompletion(page);
    
    // Should show updated results
    await expect(page.locator('[data-testid="validation-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="last-validated"]')).toContainText(/just now|seconds ago/);
  });

  test('should export validation results in multiple formats', async ({ page }) => {
    await uploadPortfolio(page, mockPortfolioData);
    await page.click('[data-testid="analyze-portfolio-button"]');
    await page.click('[data-testid="start-validation-button"]');
    await waitForValidationCompletion(page);
    
    // Test PDF export
    const [pdfDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-pdf-button"]')
    ]);
    expect(pdfDownload.suggestedFilename()).toContain('.pdf');
    
    // Test Excel export
    const [excelDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-excel-button"]')
    ]);
    expect(excelDownload.suggestedFilename()).toContain('.xlsx');
    
    // Test CSV export
    const [csvDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-csv-button"]')
    ]);
    expect(csvDownload.suggestedFilename()).toContain('.csv');
  });
});

test.describe('User Interaction Testing with Validation Components', () => {
  test('should handle fund decomposition table interactions', async ({ page }) => {
    await uploadPortfolio(page, mockPortfolioData);
    await page.click('[data-testid="analyze-portfolio-button"]');
    await page.click('[data-testid="start-validation-button"]');
    await waitForValidationCompletion(page);
    
    // Navigate to fund decomposition tab
    await page.click('[data-testid="fund-decomposition-tab"]');
    
    // Test table sorting
    await page.click('[data-testid="sort-by-value-header"]');
    const firstRowValue = await page.locator('[data-testid="fund-table-row-0"] [data-testid="value-cell"]').textContent();
    
    await page.click('[data-testid="sort-by-value-header"]'); // Sort descending
    const firstRowValueDesc = await page.locator('[data-testid="fund-table-row-0"] [data-testid="value-cell"]').textContent();
    
    expect(firstRowValue).not.toBe(firstRowValueDesc);
    
    // Test filtering
    await page.selectOption('[data-testid="asset-class-filter"]', 'Aktien');
    await expect(page.locator('[data-testid="fund-table-row"]')).toHaveCount(1); // Only equity positions
    
    await page.selectOption('[data-testid="asset-class-filter"]', ''); // Clear filter
    await expect(page.locator('[data-testid="fund-table-row"]')).toHaveCount(4); // All positions
  });

  test('should handle validation chart interactions', async ({ page }) => {
    await uploadPortfolio(page, mockPortfolioData);
    await page.click('[data-testid="analyze-portfolio-button"]');
    await page.click('[data-testid="start-validation-button"]');
    await waitForValidationCompletion(page);
    
    // Check chart visibility
    await expect(page.locator('[data-testid="validation-accuracy-chart"]')).toBeVisible();
    
    // Test chart tooltip on hover
    await page.hover('[data-testid="chart-data-point-0"]');
    await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
    
    // Test chart type switching
    await page.click('[data-testid="chart-type-toggle"]');
    await expect(page.locator('[data-testid="validation-trend-chart"]')).toBeVisible();
    
    // Test chart zoom functionality
    await page.click('[data-testid="chart-zoom-in"]');
    await page.click('[data-testid="chart-zoom-out"]');
    await page.click('[data-testid="chart-reset-zoom"]');
  });

  test('should handle validation issue filtering and sorting', async ({ page }) => {
    await uploadPortfolio(page, problemPortfolioData);
    await page.click('[data-testid="analyze-portfolio-button"]');
    await page.click('[data-testid="start-validation-button"]');
    await waitForValidationCompletion(page);
    
    // Test severity filtering
    await page.selectOption('[data-testid="severity-filter"]', 'critical');
    const criticalIssues = await page.locator('[data-testid="validation-issue"]').count();
    
    await page.selectOption('[data-testid="severity-filter"]', 'warning');
    const warningIssues = await page.locator('[data-testid="validation-issue"]').count();
    
    await page.selectOption('[data-testid="severity-filter"]', ''); // All issues
    const allIssues = await page.locator('[data-testid="validation-issue"]').count();
    
    expect(allIssues).toBeGreaterThanOrEqual(criticalIssues + warningIssues);
    
    // Test issue expansion
    await page.click('[data-testid="expand-issue-0"]');
    await expect(page.locator('[data-testid="issue-details-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="suggested-action-0"]')).toBeVisible();
  });

  test('should handle German language toggles', async ({ page }) => {
    await uploadPortfolio(page, mockPortfolioData);
    await page.click('[data-testid="analyze-portfolio-button"]');
    await page.click('[data-testid="start-validation-button"]');
    await waitForValidationCompletion(page);
    
    // Toggle to German language
    await page.click('[data-testid="language-toggle"]');
    await page.selectOption('[data-testid="language-select"]', 'de');
    
    // Check German text appears
    await expect(page.locator('text=Validierungsergebnisse')).toBeVisible();
    await expect(page.locator('text=Gesamtbewertung')).toBeVisible();
    
    // Toggle back to English
    await page.selectOption('[data-testid="language-select"]', 'en');
    await expect(page.locator('text=Validation Results')).toBeVisible();
    await expect(page.locator('text=Overall Score')).toBeVisible();
  });
});

test.describe('Error Handling and Recovery Testing', () => {
  test('should handle network failures gracefully', async ({ page, context }) => {
    await uploadPortfolio(page, mockPortfolioData);
    await page.click('[data-testid="analyze-portfolio-button"]');
    
    // Simulate network failure
    await context.setOffline(true);
    
    await page.click('[data-testid="start-validation-button"]');
    
    // Should show network error message
    await expect(page.locator('[data-testid="network-error-message"]')).toBeVisible();
    await expect(page.locator('text=Network connection failed')).toBeVisible();
    
    // Restore network and retry
    await context.setOffline(false);
    await page.click('[data-testid="retry-validation-button"]');
    
    // Should proceed normally
    await expect(page.locator('[data-testid="validation-progress"]')).toBeVisible();
  });

  test('should handle server errors with appropriate messages', async ({ page }) => {
    // Mock server error
    await page.route('**/api/validation/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
          message: 'Validation service temporarily unavailable'
        })
      });
    });
    
    await uploadPortfolio(page, mockPortfolioData);
    await page.click('[data-testid="analyze-portfolio-button"]');
    await page.click('[data-testid="start-validation-button"]');
    
    // Should show server error message
    await expect(page.locator('[data-testid="server-error-message"]')).toBeVisible();
    await expect(page.locator('text=Validation service temporarily unavailable')).toBeVisible();
    
    // Should show retry option
    await expect(page.locator('[data-testid="retry-validation-button"]')).toBeVisible();
  });

  test('should handle validation timeout scenarios', async ({ page }) => {
    // Mock slow validation response
    await page.route('**/api/validation/**', route => {
      // Delay response by 10 seconds
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'completed', results: {} })
        });
      }, 10000);
    });
    
    await uploadPortfolio(page, mockPortfolioData);
    await page.click('[data-testid="analyze-portfolio-button"]');
    await page.click('[data-testid="start-validation-button"]');
    
    // Should show timeout warning after delay
    await expect(page.locator('[data-testid="validation-timeout-warning"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Validation is taking longer than expected')).toBeVisible();
    
    // Should offer option to continue waiting or cancel
    await expect(page.locator('[data-testid="continue-waiting-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="cancel-validation-button"]')).toBeVisible();
  });

  test('should recover from partial validation failures', async ({ page }) => {
    // Mock partial failure response
    await page.route('**/api/validation/fund-decomposition', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Fund decomposition failed' })
      });
    });
    
    await uploadPortfolio(page, mockPortfolioData);
    await page.click('[data-testid="analyze-portfolio-button"]');
    await page.click('[data-testid="start-validation-button"]');
    await waitForValidationCompletion(page);
    
    // Should show partial results
    await expect(page.locator('[data-testid="validation-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="partial-validation-warning"]')).toBeVisible();
    
    // Fund decomposition tab should show error
    await page.click('[data-testid="fund-decomposition-tab"]');
    await expect(page.locator('[data-testid="fund-decomposition-error"]')).toBeVisible();
    
    // Other tabs should work normally
    await page.click('[data-testid="currency-exposure-tab"]');
    await expect(page.locator('[data-testid="currency-exposure-results"]')).toBeVisible();
  });
});

test.describe('Mobile/Desktop Responsive Behavior Testing', () => {
  test('should adapt validation interface for mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await uploadPortfolio(page, mockPortfolioData);
    await page.click('[data-testid="analyze-portfolio-button"]');
    await page.click('[data-testid="start-validation-button"]');
    await waitForValidationCompletion(page);
    
    // Mobile layout should be active
    await expect(page.locator('[data-testid="validation-panel"]')).toHaveClass(/mobile-layout/);
    
    // Tabs should be collapsible on mobile
    await expect(page.locator('[data-testid="mobile-tab-menu"]')).toBeVisible();
    
    // Charts should be responsive
    await expect(page.locator('[data-testid="validation-chart"]')).toHaveClass(/responsive-chart/);
    
    // Fund decomposition table should scroll horizontally
    await page.click('[data-testid="fund-decomposition-tab"]');
    await expect(page.locator('[data-testid="fund-table-container"]')).toHaveClass(/overflow-x-auto/);
  });

  test('should optimize desktop layout for larger screens', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await uploadPortfolio(page, mockPortfolioData);
    await page.click('[data-testid="analyze-portfolio-button"]');
    await page.click('[data-testid="start-validation-button"]');
    await waitForValidationCompletion(page);
    
    // Desktop layout should be active
    await expect(page.locator('[data-testid="validation-panel"]')).toHaveClass(/desktop-layout/);
    
    // Should show side-by-side layout
    await expect(page.locator('[data-testid="validation-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-details"]')).toBeVisible();
    
    // Charts should utilize full width
    await expect(page.locator('[data-testid="validation-chart"]')).toHaveClass(/full-width/);
  });

  test('should handle tablet landscape orientation', async ({ page }) => {
    // Set tablet landscape viewport
    await page.setViewportSize({ width: 1024, height: 768 });
    
    await uploadPortfolio(page, mockPortfolioData);
    await page.click('[data-testid="analyze-portfolio-button"]');
    await page.click('[data-testid="start-validation-button"]');
    await waitForValidationCompletion(page);
    
    // Tablet layout should balance mobile and desktop features
    await expect(page.locator('[data-testid="validation-panel"]')).toHaveClass(/tablet-layout/);
    
    // Should show horizontal tab layout
    await expect(page.locator('[data-testid="horizontal-tabs"]')).toBeVisible();
    
    // Charts should be appropriately sized
    const chartWidth = await page.locator('[data-testid="validation-chart"]').boundingBox();
    expect(chartWidth?.width).toBeGreaterThan(600);
    expect(chartWidth?.width).toBeLessThan(900);
  });
});

test.describe('Accessibility Testing for Validation Components', () => {
  test('should meet WCAG accessibility standards', async ({ page }) => {
    await uploadPortfolio(page, mockPortfolioData);
    await page.click('[data-testid="analyze-portfolio-button"]');
    await page.click('[data-testid="start-validation-button"]');
    await waitForValidationCompletion(page);
    
    // Check for proper heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
    
    // Check for alt text on images/charts
    const images = await page.locator('img, svg').all();
    for (const image of images) {
      const altText = await image.getAttribute('alt') || await image.getAttribute('aria-label');
      expect(altText).toBeTruthy();
    }
    
    // Check for proper form labels
    const inputs = await page.locator('input, select, textarea').all();
    for (const input of inputs) {
      const label = await input.getAttribute('aria-label') || await input.getAttribute('aria-labelledby');
      expect(label).toBeTruthy();
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await uploadPortfolio(page, mockPortfolioData);
    await page.click('[data-testid="analyze-portfolio-button"]');
    await page.click('[data-testid="start-validation-button"]');
    await waitForValidationCompletion(page);
    
    // Tab through validation tabs
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="overview-tab"]')).toBeFocused();
    
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-testid="fund-decomposition-tab"]')).toBeFocused();
    
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-testid="currency-exposure-tab"]')).toBeFocused();
    
    // Enter should activate tab
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="currency-exposure-results"]')).toBeVisible();
  });

  test('should provide screen reader support', async ({ page }) => {
    await uploadPortfolio(page, mockPortfolioData);
    await page.click('[data-testid="analyze-portfolio-button"]');
    await page.click('[data-testid="start-validation-button"]');
    await waitForValidationCompletion(page);
    
    // Check for ARIA live regions
    await expect(page.locator('[aria-live="polite"]')).toBeVisible();
    await expect(page.locator('[aria-live="assertive"]')).toHaveCount(0); // Should not interrupt
    
    // Check for proper ARIA roles
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    await expect(page.locator('[role="tabpanel"]')).toBeVisible();
    await expect(page.locator('[role="table"]')).toBeVisible();
    
    // Status updates should be announced
    await page.click('[data-testid="revalidate-button"]');
    await expect(page.locator('[aria-live="polite"]')).toContainText(/validation/i);
  });

  test('should support high contrast mode', async ({ page }) => {
    // Mock high contrast media query
    await page.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        value: (query: string) => ({
          matches: query.includes('prefers-contrast: high'),
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => {},
        }),
      });
    });
    
    await uploadPortfolio(page, mockPortfolioData);
    await page.click('[data-testid="analyze-portfolio-button"]');
    await page.click('[data-testid="start-validation-button"]');
    await waitForValidationCompletion(page);
    
    // High contrast styles should be applied
    await expect(page.locator('[data-testid="validation-panel"]')).toHaveClass(/high-contrast/);
    
    // Charts should use high contrast colors
    await expect(page.locator('[data-testid="validation-chart"]')).toHaveClass(/high-contrast-chart/);
  });

  test('should handle reduced motion preferences', async ({ page }) => {
    // Mock reduced motion preference
    await page.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        value: (query: string) => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => {},
        }),
      });
    });
    
    await uploadPortfolio(page, mockPortfolioData);
    await page.click('[data-testid="analyze-portfolio-button"]');
    await page.click('[data-testid="start-validation-button"]');
    await waitForValidationCompletion(page);
    
    // Animations should be reduced
    await expect(page.locator('[data-testid="validation-panel"]')).toHaveClass(/reduced-motion/);
    
    // Progress indicators should not animate
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toHaveCSS('animation-duration', '0s');
  });
});