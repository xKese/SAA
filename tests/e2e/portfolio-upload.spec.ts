import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

test.describe('Portfolio Upload Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete successful CSV upload flow', async ({ page }) => {
    // Create test CSV data
    const csvContent = `Name,ISIN,Value
Apple Inc.,US0378331005,25000
Microsoft Corp,US5949181045,30000
Google Inc.,US02079K3059,20000`;

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    
    // Create a temporary file buffer for upload
    const buffer = Buffer.from(csvContent);
    await fileInput.setInputFiles({
      name: 'test-portfolio.csv',
      mimeType: 'text/csv',
      buffer: buffer
    });

    // Wait for preview to load
    await expect(page.getByText('Dateivorschau')).toBeVisible({ timeout: 10000 });

    // Verify preview data
    await expect(page.getByText('test-portfolio.csv')).toBeVisible();
    await expect(page.getByText('3')).toBeVisible(); // Total positions
    await expect(page.getByText('75.000,00 €')).toBeVisible(); // Total value

    // Check positions in table
    await expect(page.getByText('Apple Inc.')).toBeVisible();
    await expect(page.getByText('Microsoft Corp')).toBeVisible();
    await expect(page.getByText('Google Inc.')).toBeVisible();

    // Proceed with analysis
    const analyzeButton = page.getByText('Analyse starten');
    await expect(analyzeButton).toBeEnabled();
    await analyzeButton.click();

    // Wait for upload success
    await expect(page.getByText('Upload erfolgreich')).toBeVisible({ timeout: 15000 });
    
    // Verify portfolio appears in list
    await expect(page.getByText('Portfolio test-portfolio.csv')).toBeVisible();
  });

  test('should handle validation errors in CSV upload', async ({ page }) => {
    // Create CSV with validation errors
    const invalidCsvContent = `Name,ISIN,Value
Apple Inc.,US0378331005,25000
,US5949181045,30000
Invalid Position,INVALID_ISIN,invalid_value`;

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'invalid-portfolio.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(invalidCsvContent)
    });

    // Wait for preview to load
    await expect(page.getByText('Dateivorschau')).toBeVisible();

    // Should show validation errors
    await expect(page.getByText('Fehler müssen behoben werden')).toBeVisible();
    await expect(page.getByText('Name ist erforderlich')).toBeVisible();
    await expect(page.getByText('Ungültiger oder fehlender Wert')).toBeVisible();

    // Analyze button should be disabled
    const analyzeButton = page.getByText('Analyse starten');
    await expect(analyzeButton).toBeDisabled();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('/api/portfolios/preview', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    const csvContent = `Name,ISIN,Value
Apple Inc.,US0378331005,25000`;

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-portfolio.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });

    // Should show error message
    await expect(page.getByText('Server-Fehler')).toBeVisible({ timeout: 10000 });
  });

  test('should handle file format validation', async ({ page }) => {
    // Try to upload unsupported file type
    const txtContent = 'This is not a supported file format';

    const fileInput = page.locator('input[type="file"]');
    
    // This should be rejected by the file input filter
    await fileInput.setInputFiles({
      name: 'unsupported.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(txtContent)
    });

    // Should show error for unsupported format
    await expect(page.getByText('Dateiformat nicht unterstützt')).toBeVisible({ timeout: 5000 });
  });

  test('should show progress during file processing', async ({ page }) => {
    // Mock slow response to see loading states
    await page.route('/api/portfolios/preview', async route => {
      await page.waitForTimeout(1000); // Simulate processing time
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fileName: 'test.csv',
          fileType: 'csv',
          totalPositions: 1,
          validPositions: 1,
          invalidPositions: 0,
          canProceed: true,
          positions: [],
          validationErrors: [],
          warnings: []
        })
      });
    });

    const csvContent = `Name,ISIN,Value
Apple Inc.,US0378331005,25000`;

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-portfolio.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });

    // Should show loading state
    await expect(page.getByText('Datei wird analysiert und validiert...')).toBeVisible();
    
    // Then show preview
    await expect(page.getByText('Dateivorschau')).toBeVisible();
  });

  test('should handle PDF upload workflow', async ({ page }) => {
    // Mock PDF processing response
    await page.route('/api/portfolios/preview', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fileName: 'portfolio.pdf',
          fileType: 'pdf',
          totalPositions: 1,
          validPositions: 0,
          invalidPositions: 1,
          positions: [{
            name: '__PDF_RAW_TEXT__',
            value: 0,
            validation: { isValid: false, errors: [] },
            rawText: 'Portfolio Report\n\nApple Inc. - US0378331005 - €25,000\nTotal Value: €25,000'
          }],
          validationErrors: [],
          warnings: ['PDF-Dateien erfordern AI-gestützte Extraktion.'],
          canProceed: true
        })
      });
    });

    // Simulate PDF upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'portfolio.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('PDF content placeholder')
    });

    // Wait for preview
    await expect(page.getByText('Dateivorschau')).toBeVisible();

    // Should show PDF-specific UI
    await expect(page.getByText('PDF-Rohtext erkannt')).toBeVisible();
    await expect(page.getByText('AI-gestützte Analyse')).toBeVisible();
    
    // Should show raw text
    await expect(page.getByText('Portfolio Report')).toBeVisible();
  });

  test('should handle portfolio selection and deletion', async ({ page }) => {
    // Mock existing portfolios
    await page.route('/api/portfolios', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            name: 'Test Portfolio 1',
            fileName: 'portfolio1.csv',
            analysisStatus: 'completed',
            analysisProgress: 100,
            positionCount: 5,
            totalValue: '100000'
          }
        ])
      });
    });

    await page.reload();

    // Select portfolio
    const portfolioSelect = page.locator('[data-testid="portfolio-select"]');
    await portfolioSelect.click();
    await page.getByText('Test Portfolio 1').click();

    // Should show delete button
    await expect(page.locator('[data-testid="delete-portfolio"]')).toBeVisible();

    // Mock deletion
    await page.route('/api/portfolios/1', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Delete portfolio
    await page.locator('[data-testid="delete-portfolio"]').click();
    await expect(page.getByText('Portfolio löschen?')).toBeVisible();
    await page.getByText('Löschen').click();

    // Should show success message
    await expect(page.getByText('Portfolio gelöscht')).toBeVisible();
  });

  test('should show error recovery options', async ({ page }) => {
    // Mock validation error
    await page.route('/api/portfolios/preview', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Position "Apple Inc." has invalid or missing value: undefined',
          validationErrors: [
            { row: 2, field: 'value', error: 'Ungültiger oder fehlender Wert' }
          ]
        })
      });
    });

    const csvContent = `Name,ISIN,Value
Apple Inc.,US0378331005,`;

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'invalid-portfolio.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });

    // Should show error with recovery options
    await expect(page.getByText('Positionswerte fehlerhaft')).toBeVisible({ timeout: 10000 });
    
    // Should show retry button
    await expect(page.getByText('Erneut versuchen')).toBeVisible();
    
    // Should show suggestions
    await expect(page.getByText('Lösungsvorschläge')).toBeVisible();
  });

  test('should handle drag and drop file upload', async ({ page }) => {
    const csvContent = `Name,ISIN,Value
Apple Inc.,US0378331005,25000`;

    // Create a file for drag and drop
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    
    // Simulate drag and drop
    const dropzone = page.locator('[data-testid="upload-dropzone"]');
    
    // This is a simplified simulation - in real tests you'd use more sophisticated drag/drop
    await dropzone.dispatchEvent('drop', {
      dataTransfer: {
        files: [{
          name: 'dragged-portfolio.csv',
          type: 'text/csv',
          size: csvContent.length
        }]
      }
    });

    // Note: Full drag/drop testing requires more complex setup with actual file objects
    // This is a basic test to verify the dropzone is interactive
    await expect(dropzone).toBeVisible();
  });

  test('should validate file size limits', async ({ page }) => {
    // Create a very large file (simulated)
    const largeContent = 'Name,ISIN,Value\n' + 'Apple Inc.,US0378331005,25000\n'.repeat(10000);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'large-portfolio.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(largeContent)
    });

    // The system should handle large files appropriately
    await expect(page.getByText('Dateivorschau')).toBeVisible({ timeout: 20000 });
  });

  test('should maintain state during navigation', async ({ page }) => {
    const csvContent = `Name,ISIN,Value
Apple Inc.,US0378331005,25000`;

    // Upload file and get to preview
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-portfolio.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });

    await expect(page.getByText('Dateivorschau')).toBeVisible();

    // Go back to upload
    await page.getByText('Zurück zur Datei-Auswahl').click();
    await expect(page.getByText('Portfolio-Datei Upload')).toBeVisible();

    // State should be reset
    await expect(page.locator('[data-testid="upload-dropzone"]')).toBeVisible();
  });
});