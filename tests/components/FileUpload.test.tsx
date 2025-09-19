import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FileUpload from '@/components/FileUpload';
import { Portfolio } from '@shared/schema';

// Mock the API request function
vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual('@/lib/queryClient');
  return {
    ...actual,
    apiRequest: vi.fn()
  };
});

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

// Mock the error handler hook
const mockHandleError = vi.fn();
const mockDismissError = vi.fn();
const mockRetryAction = vi.fn();

vi.mock('@/hooks/use-error-handler', () => ({
  useUploadErrorHandler: () => ({
    currentError: null,
    handleError: mockHandleError,
    dismissError: mockDismissError,
    retryAction: mockRetryAction,
    canRetry: false
  })
}));

const mockPortfolios: Portfolio[] = [
  {
    id: '1',
    name: 'Test Portfolio 1',
    fileName: 'portfolio1.csv',
    analysisStatus: 'completed' as const,
    analysisProgress: 100,
    currentPhase: 'Analyse abgeschlossen',
    totalValue: '100000',
    positionCount: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Test Portfolio 2',
    fileName: 'portfolio2.xlsx',
    analysisStatus: 'analyzing' as const,
    analysisProgress: 60,
    currentPhase: 'Phase 2: Asset-Allokations-Aufschlüsselung',
    totalValue: '50000',
    positionCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

describe('FileUpload Component Integration Tests', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;
  const mockOnUploadSuccess = vi.fn();
  const mockOnSelectPortfolio = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  const renderFileUpload = (props = {}) => {
    const defaultProps = {
      onUploadSuccess: mockOnUploadSuccess,
      portfolios: mockPortfolios,
      selectedPortfolioId: null,
      onSelectPortfolio: mockOnSelectPortfolio,
      ...props
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <FileUpload {...defaultProps} />
      </QueryClientProvider>
    );
  };

  describe('Component Rendering', () => {
    it('should render upload interface correctly', () => {
      renderFileUpload();

      expect(screen.getByTestId('upload-title')).toBeInTheDocument();
      expect(screen.getByText('Portfolio-Datei Upload')).toBeInTheDocument();
      expect(screen.getByTestId('upload-dropzone')).toBeInTheDocument();
      expect(screen.getByTestId('file-input')).toBeInTheDocument();
    });

    it('should show existing portfolios dropdown', () => {
      renderFileUpload();

      expect(screen.getByTestId('portfolio-select')).toBeInTheDocument();
      expect(screen.getByText('Vorhandene Portfolios')).toBeInTheDocument();
      expect(screen.getByTestId('clear-selection')).toBeInTheDocument();
    });

    it('should show supported file formats', () => {
      renderFileUpload();

      expect(screen.getByText('.csv')).toBeInTheDocument();
      expect(screen.getByText('.xlsx')).toBeInTheDocument();
      expect(screen.getByText('.xls')).toBeInTheDocument();
      expect(screen.getByText('.pdf')).toBeInTheDocument();
    });
  });

  describe('Portfolio Selection', () => {
    it('should handle portfolio selection', async () => {
      renderFileUpload();

      const select = screen.getByTestId('portfolio-select');
      await user.click(select);

      const option = screen.getByText(/Test Portfolio 1/);
      await user.click(option);

      expect(mockOnSelectPortfolio).toHaveBeenCalledWith('1');
    });

    it('should show delete button when portfolio is selected', () => {
      renderFileUpload({ selectedPortfolioId: '1' });

      expect(screen.getByTestId('delete-portfolio')).toBeInTheDocument();
    });

    it('should handle portfolio deletion', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      mockApiRequest.mockResolvedValue({
        json: () => Promise.resolve({ success: true })
      });

      renderFileUpload({ selectedPortfolioId: '1' });

      const deleteButton = screen.getByTestId('delete-portfolio');
      await user.click(deleteButton);

      // Should show confirmation dialog
      expect(screen.getByText('Portfolio löschen?')).toBeInTheDocument();

      const confirmButton = screen.getByText('Löschen');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('DELETE', '/api/portfolios/1', undefined, {
          timeout: 30000
        });
      });
    });

    it('should show analysis progress for analyzing portfolios', () => {
      renderFileUpload({ selectedPortfolioId: '2' });

      expect(screen.getByTestId('analysis-progress')).toBeInTheDocument();
      expect(screen.getByText('Analyse läuft...')).toBeInTheDocument();
      expect(screen.getByText('Phase 2: Asset-Allokations-Aufschlüsselung')).toBeInTheDocument();
    });
  });

  describe('File Upload Flow', () => {
    it('should handle file selection and preview', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      const mockPreviewData = {
        fileName: 'test.csv',
        fileType: 'csv',
        totalPositions: 2,
        totalValue: 55000,
        validPositions: 2,
        invalidPositions: 0,
        positions: [
          { name: 'Apple Inc.', isin: 'US0378331005', value: 25000, validation: { isValid: true, errors: [] } },
          { name: 'Microsoft Corp', isin: 'US5949181045', value: 30000, validation: { isValid: true, errors: [] } }
        ],
        validationErrors: [],
        warnings: [],
        canProceed: true
      };

      mockApiRequest.mockResolvedValue({
        json: () => Promise.resolve(mockPreviewData)
      });

      renderFileUpload();

      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/portfolios/preview', expect.any(FormData), {
          timeout: 60000
        });
      });
    });

    it('should show preview loading state', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      // Mock a delayed response
      mockApiRequest.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ json: () => ({}) }), 1000))
      );

      renderFileUpload();

      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);

      expect(screen.getByTestId('preview-loading')).toBeInTheDocument();
      expect(screen.getByText('Datei wird analysiert und validiert...')).toBeInTheDocument();
    });

    it('should handle successful file upload and analysis', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      const mockUploadResponse = {
        portfolio: {
          id: '3',
          name: 'Portfolio test.csv',
          fileName: 'test.csv',
          analysisStatus: 'pending'
        },
        positionCount: 2
      };

      mockApiRequest.mockResolvedValue({
        json: () => Promise.resolve(mockUploadResponse)
      });

      renderFileUpload();

      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);

      // Wait for upload to complete
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/portfolios/upload', expect.any(FormData), {
          timeout: 120000
        });
        expect(mockOnUploadSuccess).toHaveBeenCalledWith(mockUploadResponse.portfolio);
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Upload erfolgreich',
          description: 'Portfolio mit 2 Positionen hochgeladen. Analyse wird gestartet...'
        });
      });
    });

    it('should show upload status during upload', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      // Mock a delayed upload response
      mockApiRequest.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ json: () => ({}) }), 1000))
      );

      renderFileUpload();

      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);

      expect(screen.getByTestId('upload-status')).toBeInTheDocument();
      expect(screen.getByText('Datei wird hochgeladen und verarbeitet...')).toBeInTheDocument();
    });
  });

  describe('Preview Workflow', () => {
    it('should switch to preview mode after file selection', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      const mockPreviewData = {
        fileName: 'test.csv',
        fileType: 'csv',
        totalPositions: 2,
        validPositions: 2,
        invalidPositions: 0,
        canProceed: true,
        positions: [],
        validationErrors: [],
        warnings: []
      };

      mockApiRequest.mockResolvedValue({
        json: () => Promise.resolve(mockPreviewData)
      });

      renderFileUpload();

      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('Dateivorschau')).toBeInTheDocument();
        expect(screen.getByText('Überprüfen Sie Ihre Daten vor der Analyse')).toBeInTheDocument();
      });
    });

    it('should allow going back from preview to upload', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      mockApiRequest.mockResolvedValue({
        json: () => Promise.resolve({ canProceed: true, fileName: 'test.csv' })
      });

      renderFileUpload();

      // Upload file and get to preview
      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('Zurück zur Datei-Auswahl')).toBeInTheDocument();
      });

      // Click back button
      const backButton = screen.getByText('Zurück zur Datei-Auswahl');
      await user.click(backButton);

      expect(screen.getByText('Portfolio-Datei Upload')).toBeInTheDocument();
    });

    it('should handle preview errors', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      mockApiRequest.mockRejectedValue(new Error('Preview failed'));

      renderFileUpload();

      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle upload errors gracefully', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      mockApiRequest.mockRejectedValue(new Error('Upload failed'));

      renderFileUpload();

      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    it('should handle validation errors in preview', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      const mockErrorResponse = new Response(JSON.stringify({
        error: 'Validation failed',
        validationErrors: [
          { row: 2, field: 'value', error: 'Invalid value' }
        ]
      }), { status: 400 });

      mockApiRequest.mockRejectedValue(mockErrorResponse);

      renderFileUpload();

      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalled();
      });
    });

    it('should handle deletion errors', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      mockApiRequest.mockRejectedValue(new Error('Delete failed'));

      renderFileUpload({ selectedPortfolioId: '1' });

      const deleteButton = screen.getByTestId('delete-portfolio');
      await user.click(deleteButton);

      const confirmButton = screen.getByText('Löschen');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Löschen fehlgeschlagen',
          description: expect.any(String),
          variant: 'destructive'
        });
      });
    });
  });

  describe('File Type Validation', () => {
    it('should accept CSV files', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      mockApiRequest.mockResolvedValue({ json: () => ({}) });

      renderFileUpload();

      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalled();
      });
    });

    it('should accept Excel files', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      mockApiRequest.mockResolvedValue({ json: () => ({}) });

      renderFileUpload();

      const file = new File(['test content'], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalled();
      });
    });

    it('should accept PDF files', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      mockApiRequest.mockResolvedValue({ json: () => ({}) });

      renderFileUpload();

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalled();
      });
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag over events', async () => {
      renderFileUpload();

      const dropzone = screen.getByTestId('upload-dropzone');
      
      fireEvent.dragOver(dropzone);
      expect(dropzone).toHaveClass('border-ms-blue', 'bg-ms-blue/5');
    });

    it('should handle file drop', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      mockApiRequest.mockResolvedValue({ json: () => ({}) });

      renderFileUpload();

      const dropzone = screen.getByTestId('upload-dropzone');
      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });
      
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file]
        }
      });

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalled();
      });
    });
  });

  describe('Loading States', () => {
    it('should disable dropzone during upload', async () => {
      renderFileUpload();

      // Mock upload state
      const dropzone = screen.getByTestId('upload-dropzone');
      
      // During upload, dropzone should be disabled
      expect(dropzone).not.toHaveClass('pointer-events-none', 'opacity-50');
    });

    it('should show loading indicators appropriately', async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;
      
      // Mock delayed response for preview
      mockApiRequest.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ json: () => ({}) }), 1000))
      );

      renderFileUpload();

      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);

      expect(screen.getByTestId('preview-loading')).toBeInTheDocument();
    });
  });
});