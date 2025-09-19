import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ValidationError from '@/components/ui/validation-error';
import { ErrorType, ErrorInfo } from '@/types/errors';

const mockPositionValueError: ErrorInfo = {
  type: ErrorType.POSITION_VALUE,
  code: '400',
  message: 'Position "Apple Inc." has invalid or missing value: undefined. Cannot proceed with accurate analysis.',
  details: 'Betroffene Position: Apple Inc.',
  suggestions: [
    'Stellen Sie sicher, dass alle Positionen einen gültigen Wert haben',
    'Überprüfen Sie Ihre Datei auf fehlende oder ungültige Werte',
    'Verwenden Sie das deutsche Zahlenformat (Komma als Dezimaltrennzeichen)',
    'Fügen Sie fehlende Werte in der entsprechenden Spalte hinzu'
  ],
  affectedData: {
    positions: ['Apple Inc.', 'Microsoft Corp', 'Google Inc.'],
    fields: ['value']
  }
};

const mockValidationError: ErrorInfo = {
  type: ErrorType.VALIDATION,
  message: 'Validation failed: required field missing',
  suggestions: [
    'Überprüfen Sie die Eingabedaten auf Vollständigkeit und Format',
    'Stellen Sie sicher, dass alle Pflichtfelder ausgefüllt sind'
  ]
};

const mockFileFormatError: ErrorInfo = {
  type: ErrorType.FILE_FORMAT,
  message: 'Unsupported file format',
  suggestions: [
    'Unterstützte Formate: CSV, Excel (.xlsx, .xls), PDF',
    'Stellen Sie sicher, dass Ihre Datei das richtige Format hat'
  ]
};

describe('ValidationError Component', () => {
  it('should render position value error with all details', () => {
    render(<ValidationError error={mockPositionValueError} />);

    expect(screen.getByText('Fehlende oder ungültige Positionswerte')).toBeInTheDocument();
    expect(screen.getByText('Datenvalidierung')).toBeInTheDocument();
    expect(screen.getByText('Code: 400')).toBeInTheDocument();
    expect(screen.getByText(/Position "Apple Inc." has invalid/)).toBeInTheDocument();
    expect(screen.getByText('Betroffene Position: Apple Inc.')).toBeInTheDocument();
  });

  it('should display affected data correctly', () => {
    render(<ValidationError error={mockPositionValueError} />);

    expect(screen.getByText('Betroffene Daten:')).toBeInTheDocument();
    expect(screen.getByText('Positionen:')).toBeInTheDocument();
    expect(screen.getByText('Felder:')).toBeInTheDocument();
    
    // Check position badges
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('Microsoft Corp')).toBeInTheDocument();
    expect(screen.getByText('Google Inc.')).toBeInTheDocument();
    
    // Check field badges
    expect(screen.getByText('value')).toBeInTheDocument();
  });

  it('should display suggestions with expand/collapse functionality', () => {
    render(<ValidationError error={mockPositionValueError} />);

    expect(screen.getByText('Lösungsvorschläge:')).toBeInTheDocument();
    
    // Should show first 2 suggestions initially
    expect(screen.getByText(/Stellen Sie sicher, dass alle Positionen/)).toBeInTheDocument();
    expect(screen.getByText(/Überprüfen Sie Ihre Datei/)).toBeInTheDocument();
    
    // Should have expand button for more suggestions
    const expandButton = screen.getByText(/weitere Vorschläge anzeigen/);
    expect(expandButton).toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(expandButton);
    
    // Should show all suggestions
    expect(screen.getByText(/Verwenden Sie das deutsche Zahlenformat/)).toBeInTheDocument();
    expect(screen.getByText(/Fügen Sie fehlende Werte/)).toBeInTheDocument();
    
    // Should show collapse button
    expect(screen.getByText('Weniger anzeigen')).toBeInTheDocument();
  });

  it('should render special help section for position value errors', () => {
    render(<ValidationError error={mockPositionValueError} />);

    expect(screen.getByText('Häufige Ursachen für Positionswert-Fehler:')).toBeInTheDocument();
    expect(screen.getByText('Leere Zellen in der Wert-Spalte')).toBeInTheDocument();
    expect(screen.getByText('Verwendung von Punkt statt Komma als Dezimaltrennzeichen')).toBeInTheDocument();
    expect(screen.getByText('Text oder Sonderzeichen in numerischen Feldern')).toBeInTheDocument();
    expect(screen.getByText('Fehlende Währungsangaben oder ungültige Formate')).toBeInTheDocument();
  });

  it('should render retry button when onRetry is provided and error is retryable', () => {
    const onRetry = vi.fn();
    
    render(<ValidationError error={mockPositionValueError} onRetry={onRetry} />);

    const retryButton = screen.getByText('Erneut versuchen');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('should render dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn();
    
    render(<ValidationError error={mockPositionValueError} onDismiss={onDismiss} />);

    const dismissButton = screen.getByText('Schließen');
    expect(dismissButton).toBeInTheDocument();
    
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('should render help link for position value errors', () => {
    // Mock window.open
    const mockOpen = vi.fn();
    window.open = mockOpen;
    
    render(<ValidationError error={mockPositionValueError} />);

    const helpButton = screen.getByText('Hilfe zur Dateibearbeitung');
    expect(helpButton).toBeInTheDocument();
    
    fireEvent.click(helpButton);
    expect(mockOpen).toHaveBeenCalledWith('https://help.example.com/position-values', '_blank');
  });

  it('should handle validation errors with different styling', () => {
    render(<ValidationError error={mockValidationError} />);

    expect(screen.getByText('Validierungsfehler')).toBeInTheDocument();
    expect(screen.getByText('Eingabefehler')).toBeInTheDocument();
    
    // Should not show position value specific content
    expect(screen.queryByText('Häufige Ursachen für Positionswert-Fehler:')).not.toBeInTheDocument();
    expect(screen.queryByText('Hilfe zur Dateibearbeitung')).not.toBeInTheDocument();
  });

  it('should handle file format errors', () => {
    render(<ValidationError error={mockFileFormatError} />);

    expect(screen.getByText('Validierungsfehler')).toBeInTheDocument();
    expect(screen.getByText('Dateifehler')).toBeInTheDocument();
    expect(screen.getByText(/Unterstützte Formate: CSV, Excel/)).toBeInTheDocument();
  });

  it('should handle errors without suggestions', () => {
    const errorWithoutSuggestions: ErrorInfo = {
      type: ErrorType.VALIDATION,
      message: 'Simple validation error'
    };
    
    render(<ValidationError error={errorWithoutSuggestions} />);

    expect(screen.queryByText('Lösungsvorschläge:')).not.toBeInTheDocument();
  });

  it('should handle errors without details', () => {
    const errorWithoutDetails: ErrorInfo = {
      type: ErrorType.VALIDATION,
      message: 'Simple validation error'
    };
    
    render(<ValidationError error={errorWithoutDetails} />);

    expect(screen.getByText('Simple validation error')).toBeInTheDocument();
    expect(screen.queryByText('Details:')).not.toBeInTheDocument();
  });

  it('should handle errors without affected data', () => {
    render(<ValidationError error={mockValidationError} />);

    expect(screen.queryByText('Betroffene Daten:')).not.toBeInTheDocument();
  });

  it('should limit displayed positions when there are many', () => {
    const errorWithManyPositions: ErrorInfo = {
      type: ErrorType.POSITION_VALUE,
      message: 'Multiple positions have errors',
      affectedData: {
        positions: ['Pos1', 'Pos2', 'Pos3', 'Pos4', 'Pos5']
      }
    };
    
    render(<ValidationError error={errorWithManyPositions} />);

    expect(screen.getByText('Pos1')).toBeInTheDocument();
    expect(screen.getByText('Pos2')).toBeInTheDocument();
    expect(screen.getByText('Pos3')).toBeInTheDocument();
    expect(screen.getByText('+2 weitere')).toBeInTheDocument();
    expect(screen.queryByText('Pos4')).not.toBeInTheDocument();
    expect(screen.queryByText('Pos5')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ValidationError error={mockValidationError} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should show correct colors for different error types', () => {
    const { rerender } = render(<ValidationError error={mockPositionValueError} />);
    
    // Position value error should use red styling
    expect(document.querySelector('.border-ms-red\\/20')).toBeInTheDocument();
    
    rerender(<ValidationError error={mockValidationError} />);
    
    // Validation error should use orange styling
    expect(document.querySelector('.border-orange-200')).toBeInTheDocument();
    
    rerender(<ValidationError error={mockFileFormatError} />);
    
    // File format error should use yellow styling
    expect(document.querySelector('.border-yellow-200')).toBeInTheDocument();
  });

  it('should handle showDetails prop', () => {
    render(<ValidationError error={mockPositionValueError} showDetails={false} />);

    // Component should still render, but this prop can be used to control detail visibility
    expect(screen.getByText('Fehlende oder ungültige Positionswerte')).toBeInTheDocument();
  });
});