import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorType } from '@/types/errors';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = false, errorType = 'generic' }) => {
  if (shouldThrow) {
    if (errorType === 'position_value') {
      throw new Error('Position "AAPL" has invalid or missing value: undefined. Cannot proceed with accurate analysis.');
    } else if (errorType === 'validation') {
      throw new Error('Validation failed: required field missing');
    } else if (errorType === 'network') {
      const networkError = new Error('Network timeout error');
      (networkError as any).name = 'TimeoutError';
      (networkError as any).status = 0;
      throw networkError;
    } else {
      throw new Error('Test error');
    }
  }
  return <div data-testid="child-component">Child Component</div>;
};

describe('ErrorBoundary', () => {
  let consoleError: any;

  beforeEach(() => {
    // Mock console.error to avoid noise in test output
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child-component')).toBeInTheDocument();
  });

  it('should render error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Etwas ist schiefgelaufen')).toBeInTheDocument();
    expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
    expect(screen.getByText('Seite neu laden')).toBeInTheDocument();
  });

  it('should categorize position value errors correctly', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorType="position_value" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Portfolio-Daten unvollständig')).toBeInTheDocument();
    expect(screen.getByText('Datenvalidierung')).toBeInTheDocument();
    expect(screen.getByText('Support kontaktieren')).toBeInTheDocument();
  });

  it('should categorize validation errors correctly', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorType="validation" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Eingabedaten ungültig')).toBeInTheDocument();
    expect(screen.getByText('Eingabefehler')).toBeInTheDocument();
  });

  it('should categorize network errors correctly', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorType="network" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Verbindungsproblem')).toBeInTheDocument();
    expect(screen.getByText('Verbindung')).toBeInTheDocument();
  });

  it('should reset error state when retry button is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Etwas ist schiefgelaufen')).toBeInTheDocument();

    const retryButton = screen.getByText('Erneut versuchen');
    fireEvent.click(retryButton);

    // Re-render with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child-component')).toBeInTheDocument();
  });

  it('should reload page when reload button is clicked', () => {
    // Mock window.location.reload
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByText('Seite neu laden');
    fireEvent.click(reloadButton);

    expect(mockReload).toHaveBeenCalled();
  });

  it('should display custom fallback when provided', () => {
    const CustomFallback = () => <div data-testid="custom-fallback">Custom Error</div>;

    render(
      <ErrorBoundary fallback={<CustomFallback />}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.queryByText('Etwas ist schiefgelaufen')).not.toBeInTheDocument();
  });

  it('should show developer details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Entwickler-Details anzeigen')).toBeInTheDocument();

    // Click to expand details
    fireEvent.click(screen.getByText('Entwickler-Details anzeigen'));

    expect(screen.getByText('Kategorisierter Fehler:')).toBeInTheDocument();
    expect(screen.getByText('Original Fehler:')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not show developer details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Entwickler-Details anzeigen')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should handle critical errors appropriately', () => {
    const CriticalError = () => {
      const error = new Error('Authentication required');
      (error as any).status = 401;
      throw error;
    };

    render(
      <ErrorBoundary>
        <CriticalError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Anmeldung erforderlich')).toBeInTheDocument();
    expect(screen.getByText('Authentifizierung')).toBeInTheDocument();
    
    // Critical errors should disable retry
    const retryButton = screen.getByText('Erneut versuchen');
    expect(retryButton).toBeDisabled();
  });

  it('should display error suggestions when available', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorType="position_value" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Lösungsvorschläge:')).toBeInTheDocument();
    expect(screen.getByText(/Stellen Sie sicher, dass alle Positionen/)).toBeInTheDocument();
  });

  it('should handle different error severities with appropriate styling', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorType="position_value" />
      </ErrorBoundary>
    );

    const errorCard = screen.getByRole('group'); // Card has implicit role
    expect(errorCard).toBeInTheDocument();

    // Check for appropriate styling classes based on error type
    const alertIcon = screen.getByTestId('alert-triangle') || document.querySelector('.lucide-alert-triangle');
    expect(alertIcon).toBeInTheDocument();
  });

  it('should log errors properly for monitoring', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalled();
    expect(groupSpy).toHaveBeenCalledWith('🚨 Error Boundary');
    expect(groupEndSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
    groupSpy.mockRestore();
    groupEndSpy.mockRestore();
  });

  it('should handle error info componentStack', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // In development mode, should show component stack
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    fireEvent.click(screen.getByText('Entwickler-Details anzeigen'));
    
    // Should display error details
    expect(screen.getByText('Original Fehler:')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should provide contact support option for specific error types', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorType="position_value" />
      </ErrorBoundary>
    );

    const supportButton = screen.getByText('Support kontaktieren');
    expect(supportButton).toBeInTheDocument();

    // Mock window.open
    const mockOpen = vi.fn();
    window.open = mockOpen;

    fireEvent.click(supportButton);

    expect(mockOpen).toHaveBeenCalledWith(
      'mailto:support@example.com?subject=Portfolio Analysis Error',
      '_blank'
    );
  });
});