import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorAlert, { ErrorToast } from '@/components/ui/error-alert';
import { ErrorType, ErrorInfo, ErrorSeverity } from '@/types/errors';

const mockCriticalError: ErrorInfo = {
  type: ErrorType.AUTHENTICATION,
  code: '401',
  message: 'Authentication required',
  suggestions: ['Please log in to continue']
};

const mockHighError: ErrorInfo = {
  type: ErrorType.POSITION_VALUE,
  message: 'Position values are missing',
  suggestions: ['Check your data file', 'Ensure all values are present']
};

const mockMediumError: ErrorInfo = {
  type: ErrorType.VALIDATION,
  code: '400', 
  message: 'Validation failed',
  details: 'Field validation error',
  suggestions: ['Fix the validation errors']
};

const mockLowError: ErrorInfo = {
  type: ErrorType.NETWORK,
  message: 'Network connection timeout',
  suggestions: ['Check your internet connection', 'Try again later']
};

describe('ErrorAlert Component', () => {
  describe('Compact Mode', () => {
    it('should render compact error alert', () => {
      render(<ErrorAlert error={mockMediumError} compact={true} />);

      expect(screen.getByText('Eingabedaten ungültig:')).toBeInTheDocument();
      expect(screen.getByText('Validation failed')).toBeInTheDocument();
    });

    it('should show retry button in compact mode when retryable', () => {
      const onRetry = vi.fn();
      
      render(<ErrorAlert error={mockMediumError} compact={true} onRetry={onRetry} />);

      const retryButton = screen.getByRole('button');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalled();
    });

    it('should show dismiss button in compact mode when provided', () => {
      const onDismiss = vi.fn();
      
      render(<ErrorAlert error={mockMediumError} compact={true} onDismiss={onDismiss} />);

      const dismissButton = screen.getByRole('button', { name: '' }); // X button has no accessible name
      fireEvent.click(dismissButton);
      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe('Full Mode', () => {
    it('should render full error alert with all details', () => {
      render(<ErrorAlert error={mockMediumError} />);

      expect(screen.getByText('Eingabedaten ungültig')).toBeInTheDocument();
      expect(screen.getByText('Eingabefehler')).toBeInTheDocument();
      expect(screen.getByText('Code: 400')).toBeInTheDocument();
      expect(screen.getByText('Validation failed')).toBeInTheDocument();
      expect(screen.getByText('Details: Field validation error')).toBeInTheDocument();
    });

    it('should show first suggestion in full mode', () => {
      render(<ErrorAlert error={mockMediumError} />);

      expect(screen.getByText('Lösungsvorschlag:')).toBeInTheDocument();
      expect(screen.getByText('Fix the validation errors')).toBeInTheDocument();
    });

    it('should render retry button in full mode when retryable', () => {
      const onRetry = vi.fn();
      
      render(<ErrorAlert error={mockMediumError} onRetry={onRetry} />);

      const retryButton = screen.getByText('Wiederholen');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalled();
    });

    it('should render dismiss button in full mode when provided', () => {
      const onDismiss = vi.fn();
      
      render(<ErrorAlert error={mockMediumError} onDismiss={onDismiss} />);

      // Find X button
      const dismissButton = screen.getByRole('button', { name: '' });
      fireEvent.click(dismissButton);
      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe('Error Type Styling', () => {
    it('should apply critical styling for authentication errors', () => {
      render(<ErrorAlert error={mockCriticalError} />);

      expect(screen.getByText('Anmeldung erforderlich')).toBeInTheDocument();
      expect(screen.getByText('Authentifizierung')).toBeInTheDocument();
      
      // Should have critical error styling
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-ms-red');
    });

    it('should apply high severity styling for position value errors', () => {
      render(<ErrorAlert error={mockHighError} />);

      expect(screen.getByText('Positionswerte fehlerhaft')).toBeInTheDocument();
      expect(screen.getByText('Datenvalidierung')).toBeInTheDocument();
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-ms-red/60');
    });

    it('should apply medium severity styling for validation errors', () => {
      render(<ErrorAlert error={mockMediumError} />);

      expect(screen.getByText('Eingabedaten ungültig')).toBeInTheDocument();
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-orange-300');
    });

    it('should apply low severity styling for network errors', () => {
      render(<ErrorAlert error={mockLowError} />);

      expect(screen.getByText('Verbindungsproblem')).toBeInTheDocument();
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-blue-300');
    });
  });

  describe('Error Type Titles', () => {
    it('should display correct titles for different error types', () => {
      const testCases = [
        { type: ErrorType.POSITION_VALUE, title: 'Positionswerte fehlerhaft' },
        { type: ErrorType.VALIDATION, title: 'Eingabedaten ungültig' },
        { type: ErrorType.FILE_FORMAT, title: 'Dateiformat nicht unterstützt' },
        { type: ErrorType.NETWORK, title: 'Verbindungsproblem' },
        { type: ErrorType.SERVER, title: 'Server-Fehler' },
        { type: ErrorType.ANALYSIS, title: 'Analyse-Fehler' },
        { type: ErrorType.UPLOAD, title: 'Upload-Fehler' },
        { type: ErrorType.AUTHENTICATION, title: 'Anmeldung erforderlich' },
        { type: ErrorType.UNKNOWN, title: 'Ein Fehler ist aufgetreten' }
      ];

      testCases.forEach(({ type, title }) => {
        const error: ErrorInfo = { type, message: 'Test message' };
        const { unmount } = render(<ErrorAlert error={error} />);
        
        expect(screen.getByText(title)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Conditional Rendering', () => {
    it('should not render details section when details are missing', () => {
      const errorWithoutDetails: ErrorInfo = {
        type: ErrorType.VALIDATION,
        message: 'Simple error'
      };
      
      render(<ErrorAlert error={errorWithoutDetails} />);

      expect(screen.queryByText('Details:')).not.toBeInTheDocument();
    });

    it('should not render suggestions section when suggestions are missing', () => {
      const errorWithoutSuggestions: ErrorInfo = {
        type: ErrorType.VALIDATION,
        message: 'Simple error'
      };
      
      render(<ErrorAlert error={errorWithoutSuggestions} />);

      expect(screen.queryByText('Lösungsvorschlag:')).not.toBeInTheDocument();
    });

    it('should not render code badge when code is missing', () => {
      const errorWithoutCode: ErrorInfo = {
        type: ErrorType.VALIDATION,
        message: 'Simple error'
      };
      
      render(<ErrorAlert error={errorWithoutCode} />);

      expect(screen.queryByText(/Code:/)).not.toBeInTheDocument();
    });

    it('should not render retry button for non-retryable errors', () => {
      const nonRetryableError: ErrorInfo = {
        type: ErrorType.FILE_FORMAT, // File format errors are not retryable
        message: 'Invalid file format'
      };
      
      render(<ErrorAlert error={nonRetryableError} onRetry={() => {}} />);

      expect(screen.queryByText('Wiederholen')).not.toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ErrorAlert error={mockMediumError} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});

describe('ErrorToast Component', () => {
  it('should render error toast with basic information', () => {
    render(<ErrorToast error={mockHighError} />);

    expect(screen.getByText('Positionswerte fehlerhaft')).toBeInTheDocument();
    expect(screen.getByText('Position values are missing')).toBeInTheDocument();
    expect(screen.getByText('Datenvalidierung')).toBeInTheDocument();
  });

  it('should render retry button when onRetry is provided and error is retryable', () => {
    const onRetry = vi.fn();
    
    render(<ErrorToast error={mockHighError} onRetry={onRetry} />);

    const retryButton = screen.getByText('Wiederholen');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('should render dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn();
    
    render(<ErrorToast error={mockHighError} onDismiss={onDismiss} />);

    const dismissButton = screen.getByText('Schließen');
    expect(dismissButton).toBeInTheDocument();
    
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('should show appropriate title for position value errors', () => {
    render(<ErrorToast error={mockHighError} />);

    expect(screen.getByText('Positionswerte fehlerhaft')).toBeInTheDocument();
  });

  it('should show generic title for other error types', () => {
    render(<ErrorToast error={mockMediumError} />);

    expect(screen.getByText('Fehler aufgetreten')).toBeInTheDocument();
  });

  it('should not render retry button for non-retryable errors', () => {
    const nonRetryableError: ErrorInfo = {
      type: ErrorType.FILE_FORMAT,
      message: 'Invalid file format'
    };
    
    render(<ErrorToast error={nonRetryableError} onRetry={() => {}} />);

    expect(screen.queryByText('Wiederholen')).not.toBeInTheDocument();
  });
});