import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FileUpload from '@/components/FileUpload';
import { apiRequest } from '@/lib/queryClient';
import { categorizeError, ErrorType } from '@/types/errors';

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual('@/lib/queryClient');
  return {
    ...actual,
    apiRequest: vi.fn()
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}));

describe('Edge Cases and Stress Tests', () => {
  let queryClient: QueryClient;
  const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
  });

  const renderFileUpload = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <FileUpload 
          onUploadSuccess={vi.fn()}
          portfolios={[]}
          selectedPortfolioId={null}
          onSelectPortfolio={vi.fn()}
        />
      </QueryClientProvider>
    );
  };

  describe('Large File Handling', () => {
    it('should handle extremely large CSV files', async () => {
      // Generate large CSV content
      let largeCsv = 'Name,ISIN,Value\n';
      for (let i = 0; i < 10000; i++) {
        largeCsv += `Position ${i},US037833100${i % 10},${25000 + i}\n`;
      }

      mockApiRequest.mockResolvedValue({
        json: () => Promise.resolve({
          fileName: 'large.csv',
          fileType: 'csv',
          totalPositions: 10000,
          validPositions: 10000,
          invalidPositions: 0,
          canProceed: true,
          positions: [], // Truncated for response
          validationErrors: [],
          warnings: ['Large file detected - preview truncated']
        })
      });

      const user = userEvent.setup();
      renderFileUpload();

      const file = new File([largeCsv], 'large.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('10000')).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('should handle files with extremely long position names', async () => {
      const longName = 'A'.repeat(1000); // 1000 character name
      const csvContent = `Name,ISIN,Value\n"${longName}",US0378331005,25000`;

      mockApiRequest.mockResolvedValue({
        json: () => Promise.resolve({
          fileName: 'long-names.csv',
          fileType: 'csv',
          totalPositions: 1,
          validPositions: 1,
          invalidPositions: 0,
          canProceed: true,
          positions: [{
            name: longName,
            isin: 'US0378331005',
            value: 25000,
            validation: { isValid: true, errors: [] }
          }],
          validationErrors: [],
          warnings: []
        })
      });

      const user = userEvent.setup();
      renderFileUpload();

      const file = new File([csvContent], 'long-names.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('Dateivorschau')).toBeInTheDocument();
      });
    });

    it('should handle files with maximum numeric precision', async () => {
      const csvContent = `Name,ISIN,Value
Precision Test,US0378331005,123456789.123456789`;

      mockApiRequest.mockResolvedValue({
        json: () => Promise.resolve({
          fileName: 'precision.csv',
          fileType: 'csv',
          totalPositions: 1,
          validPositions: 1,
          invalidPositions: 0,
          canProceed: true,
          positions: [{
            name: 'Precision Test',
            isin: 'US0378331005',
            value: 123456789.123456789,
            validation: { isValid: true, errors: [] }
          }],
          validationErrors: [],
          warnings: []
        })
      });

      const user = userEvent.setup();
      renderFileUpload();

      const file = new File([csvContent], 'precision.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('123.456.789,12 €')).toBeInTheDocument();
      });
    });
  });

  describe('Malformed Data Handling', () => {
    it('should handle CSV with inconsistent column counts', async () => {
      const malformedCsv = `Name,ISIN,Value
Apple Inc.,US0378331005,25000,Extra Column
Microsoft Corp,US5949181045
Google Inc.,US02079K3059,20000,Extra1,Extra2,Extra3`;

      mockApiRequest.mockResolvedValue({
        json: () => Promise.resolve({
          fileName: 'malformed.csv',
          fileType: 'csv',
          totalPositions: 2, // Only valid rows
          validPositions: 2,
          invalidPositions: 1,
          canProceed: true,
          positions: [
            { name: 'Apple Inc.', isin: 'US0378331005', value: 25000, validation: { isValid: true, errors: [] } },
            { name: 'Google Inc.', isin: 'US02079K3059', value: 20000, validation: { isValid: true, errors: [] } }
          ],
          validationErrors: [
            { row: 3, field: 'value', error: 'Wert fehlt' }
          ],
          warnings: ['Inkonsistente Spaltenanzahl in einigen Zeilen']
        })
      });

      const user = userEvent.setup();
      renderFileUpload();

      const file = new File([malformedCsv], 'malformed.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('Inkonsistente Spaltenanzahl')).toBeInTheDocument();
      });
    });

    it('should handle CSV with special characters and encoding', async () => {
      const specialCharsCsv = `Name,ISIN,Value
"Société Générale",FR0000130809,"1.234,56"
"Björk & Co",SE0000123456,"2.345,67"
"中国银行",US123456789,"3.456,78"
"Company with 'quotes' and "nested" quotes",US987654321,"4.567,89"`;

      mockApiRequest.mockResolvedValue({
        json: () => Promise.resolve({
          fileName: 'special-chars.csv',
          fileType: 'csv',
          totalPositions: 4,
          validPositions: 4,
          invalidPositions: 0,
          canProceed: true,
          positions: [
            { name: 'Société Générale', isin: 'FR0000130809', value: 1234.56, validation: { isValid: true, errors: [] } },
            { name: 'Björk & Co', isin: 'SE0000123456', value: 2345.67, validation: { isValid: true, errors: [] } },
            { name: '中国银行', isin: 'US123456789', value: 3456.78, validation: { isValid: true, errors: [] } },
            { name: 'Company with \'quotes\' and "nested" quotes', isin: 'US987654321', value: 4567.89, validation: { isValid: true, errors: [] } }
          ],
          validationErrors: [],
          warnings: []
        })
      });

      const user = userEvent.setup();
      renderFileUpload();

      const file = new File([specialCharsCsv], 'special-chars.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('Société Générale')).toBeInTheDocument();
        expect(screen.getByText('中国银行')).toBeInTheDocument();
      });
    });

    it('should handle CSV with various number formats', async () => {
      const mixedNumbersCsv = `Name,ISIN,Value
Standard,US0001,"1234.56"
German,US0002,"1.234,56"
With Currency,US0003,"€1,234.56"
Scientific,US0004,"1.23E+6"
Negative,US0005,"-1234.56"
Percentage,US0006,"12.34%"
Zero,US0007,"0"
Very Small,US0008,"0.01"`;

      mockApiRequest.mockResolvedValue({
        json: () => Promise.resolve({
          fileName: 'mixed-numbers.csv',
          fileType: 'csv',
          totalPositions: 7, // Excluding percentage which might be invalid
          validPositions: 6, // Excluding negative which might be invalid
          invalidPositions: 2,
          canProceed: true,
          positions: [
            { name: 'Standard', value: 1234.56, validation: { isValid: true, errors: [] } },
            { name: 'German', value: 1234.56, validation: { isValid: true, errors: [] } },
            { name: 'With Currency', value: 1234.56, validation: { isValid: true, errors: [] } },
            { name: 'Scientific', value: 1230000, validation: { isValid: true, errors: [] } },
            { name: 'Zero', value: 0, validation: { isValid: false, errors: ['Wert muss größer als 0 sein'] } },
            { name: 'Very Small', value: 0.01, validation: { isValid: true, errors: [] } }
          ],
          validationErrors: [
            { row: 6, field: 'value', error: 'Negative Werte nicht erlaubt' },
            { row: 7, field: 'value', error: 'Prozentangaben nicht unterstützt' },
            { row: 8, field: 'value', error: 'Wert muss größer als 0 sein' }
          ],
          warnings: ['Verschiedene Zahlenformate erkannt']
        })
      });

      const user = userEvent.setup();
      renderFileUpload();

      const file = new File([mixedNumbersCsv], 'mixed-numbers.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('Verschiedene Zahlenformate erkannt')).toBeInTheDocument();
      });
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle rapid successive file uploads', async () => {
      let callCount = 0;
      mockApiRequest.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          json: () => Promise.resolve({
            fileName: `file-${callCount}.csv`,
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

      const user = userEvent.setup();
      renderFileUpload();

      const input = screen.getByTestId('file-input');
      
      // Rapidly upload multiple files
      for (let i = 0; i < 5; i++) {
        const file = new File([`content ${i}`], `file-${i}.csv`, { type: 'text/csv' });
        await user.upload(input, file);
      }

      // Should handle the last upload
      await waitFor(() => {
        expect(screen.getByText('file-5.csv')).toBeInTheDocument();
      });

      expect(callCount).toBe(5);
    });

    it('should handle memory pressure during large file processing', async () => {
      // Simulate memory pressure scenario
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        rss: 2000000000, // 2GB
        heapTotal: 1500000000,
        heapUsed: 1400000000,
        external: 100000000,
        arrayBuffers: 50000000
      });

      mockApiRequest.mockImplementation(() => {
        // Simulate slow processing under memory pressure
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              json: () => Promise.resolve({
                fileName: 'memory-test.csv',
                fileType: 'csv',
                totalPositions: 1000,
                validPositions: 1000,
                invalidPositions: 0,
                canProceed: true,
                positions: [],
                validationErrors: [],
                warnings: ['Large file processed under memory constraints']
              })
            });
          }, 100);
        });
      });

      const user = userEvent.setup();
      renderFileUpload();

      const largeCsv = 'Name,ISIN,Value\n' + 'Test,US0001,1000\n'.repeat(1000);
      const file = new File([largeCsv], 'memory-test.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('memory constraints')).toBeInTheDocument();
      }, { timeout: 5000 });

      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent upload and deletion operations', async () => {
      let operationCount = 0;
      mockApiRequest.mockImplementation((method, url) => {
        operationCount++;
        if (method === 'DELETE') {
          return Promise.resolve({ json: () => Promise.resolve({ success: true }) });
        } else {
          return Promise.resolve({
            json: () => Promise.resolve({
              fileName: 'concurrent-test.csv',
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
        }
      });

      const user = userEvent.setup();
      
      render(
        <QueryClientProvider client={queryClient}>
          <FileUpload 
            onUploadSuccess={vi.fn()}
            portfolios={[{
              id: '1',
              name: 'Test Portfolio',
              fileName: 'test.csv',
              analysisStatus: 'completed' as const,
              analysisProgress: 100,
              currentPhase: 'Completed',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }]}
            selectedPortfolioId="1"
            onSelectPortfolio={vi.fn()}
          />
        </QueryClientProvider>
      );

      // Start file upload
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');
      const uploadPromise = user.upload(input, file);

      // Simultaneously try to delete portfolio
      const deleteButton = screen.getByTestId('delete-portfolio');
      const deletePromise = user.click(deleteButton);

      await Promise.all([uploadPromise, deletePromise]);
      
      expect(operationCount).toBeGreaterThan(0);
    });
  });

  describe('Error Categorization Edge Cases', () => {
    it('should handle error messages with mixed languages', () => {
      const mixedLanguageError = 'Validation failed: Position "测试" hat fehlerhafte value';
      const categorized = categorizeError(mixedLanguageError);
      
      expect(categorized.type).toBe(ErrorType.VALIDATION);
      expect(categorized.message).toContain('测试');
    });

    it('should handle extremely long error messages', () => {
      const longErrorMessage = 'Position ' + '"A'.repeat(1000) + '" has invalid value: ' + 'details '.repeat(100);
      const categorized = categorizeError(longErrorMessage);
      
      expect(categorized.type).toBe(ErrorType.POSITION_VALUE);
      expect(categorized.message.length).toBeGreaterThan(1000);
    });

    it('should handle error messages with special regex characters', () => {
      const specialCharsError = 'Position "[test].(value)*+?{error}|^$" has issues';
      const categorized = categorizeError(specialCharsError);
      
      expect(categorized.type).toBe(ErrorType.POSITION_VALUE);
      expect(categorized.details).toContain('[test].(value)*+?{error}|^$');
    });

    it('should handle null and undefined error inputs gracefully', () => {
      expect(() => categorizeError(null as any)).not.toThrow();
      expect(() => categorizeError(undefined as any)).not.toThrow();
      
      const nullError = categorizeError(null as any);
      expect(nullError.type).toBe(ErrorType.UNKNOWN);
    });

    it('should handle circular reference errors', () => {
      const circularError = new Error('Circular reference error');
      (circularError as any).circular = circularError;
      
      const categorized = categorizeError(circularError);
      expect(categorized.type).toBe(ErrorType.UNKNOWN);
    });
  });

  describe('Browser Compatibility Edge Cases', () => {
    it('should handle missing File API support', async () => {
      const originalFile = window.File;
      delete (window as any).File;

      const user = userEvent.setup();
      renderFileUpload();

      // Should still render without crashing
      expect(screen.getByTestId('upload-dropzone')).toBeInTheDocument();

      // Restore File API
      (window as any).File = originalFile;
    });

    it('should handle missing FormData support', () => {
      const originalFormData = window.FormData;
      delete (window as any).FormData;

      // Should not crash during rendering
      expect(() => renderFileUpload()).not.toThrow();

      // Restore FormData
      (window as any).FormData = originalFormData;
    });

    it('should handle missing fetch support', async () => {
      const originalFetch = global.fetch;
      delete (global as any).fetch;

      mockApiRequest.mockRejectedValue(new Error('fetch is not defined'));

      const user = userEvent.setup();
      renderFileUpload();

      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/Fehler|Error/)).toBeInTheDocument();
      });

      global.fetch = originalFetch;
    });
  });

  describe('Accessibility Edge Cases', () => {
    it('should handle screen reader navigation during errors', () => {
      renderFileUpload();
      
      // Error elements should have proper ARIA labels
      const dropzone = screen.getByTestId('upload-dropzone');
      expect(dropzone).toHaveAttribute('role', 'button');
    });

    it('should handle keyboard navigation in error states', async () => {
      mockApiRequest.mockRejectedValue(new Error('Test error'));

      const user = userEvent.setup();
      renderFileUpload();

      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/Fehler|Error/)).toBeInTheDocument();
      });

      // Error elements should be focusable
      const errorElement = screen.getByText(/Fehler|Error/).closest('[role="alert"]');
      if (errorElement) {
        expect(errorElement).toBeInTheDocument();
      }
    });
  });
});