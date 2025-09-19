import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DataPreviewTable from '@/components/DataPreviewTable';

const mockValidPreviewData = {
  fileName: 'portfolio.csv',
  fileType: 'csv',
  totalPositions: 3,
  totalValue: 75000,
  validPositions: 3,
  invalidPositions: 0,
  positions: [
    {
      name: 'Apple Inc.',
      isin: 'US0378331005',
      value: 25000,
      validation: { isValid: true, errors: [] }
    },
    {
      name: 'Microsoft Corp',
      isin: 'US5949181045',
      value: 30000,
      validation: { isValid: true, errors: [] }
    },
    {
      name: 'Google Inc.',
      isin: 'US02079K3059',
      value: 20000,
      validation: { isValid: true, errors: [] }
    }
  ],
  validationErrors: [],
  warnings: [],
  canProceed: true
};

const mockInvalidPreviewData = {
  fileName: 'invalid_portfolio.csv',
  fileType: 'csv',
  totalPositions: 3,
  totalValue: 55000,
  validPositions: 1,
  invalidPositions: 2,
  positions: [
    {
      name: 'Apple Inc.',
      isin: 'US0378331005',
      value: 25000,
      validation: { isValid: true, errors: [] }
    },
    {
      name: '',
      isin: 'US5949181045',
      value: 30000,
      validation: { isValid: false, errors: ['Name ist erforderlich'] }
    },
    {
      name: 'Invalid Position',
      isin: '',
      value: NaN,
      validation: { isValid: false, errors: ['Ungültiger oder fehlender Wert'] }
    }
  ],
  validationErrors: [
    { row: 2, field: 'name', error: 'Name ist erforderlich' },
    { row: 3, field: 'value', error: 'Ungültiger oder fehlender Wert' }
  ],
  warnings: ['ISIN-Format könnte ungültig sein'],
  canProceed: false
};

const mockPDFPreviewData = {
  fileName: 'portfolio.pdf',
  fileType: 'pdf',
  totalPositions: 1,
  totalValue: 0,
  validPositions: 0,
  invalidPositions: 1,
  positions: [
    {
      name: '__PDF_RAW_TEXT__',
      isin: undefined,
      value: 0,
      validation: { isValid: false, errors: [] },
      rawText: 'Portfolio Bericht\n\nApple Inc. - US0378331005 - €25,000\nMicrosoft Corp - US5949181045 - €30,000\nGoogle Inc. - US02079K3059 - €20,000\n\nGesamtwert: €75,000'
    }
  ],
  validationErrors: [],
  warnings: ['PDF-Dateien erfordern AI-gestützte Extraktion. Die Vorschau zeigt den erkannten Rohtext.'],
  canProceed: true
};

const mockEmptyPreviewData = {
  fileName: 'empty.csv',
  fileType: 'csv',
  totalPositions: 0,
  totalValue: 0,
  validPositions: 0,
  invalidPositions: 0,
  positions: [],
  validationErrors: [],
  warnings: ['Keine Positionen in der Datei gefunden'],
  canProceed: false
};

describe('DataPreviewTable Component', () => {
  describe('Valid Data Rendering', () => {
    it('should render preview data with valid positions', () => {
      render(<DataPreviewTable previewData={mockValidPreviewData} />);

      // Check title
      expect(screen.getByText('Dateivorschau: portfolio.csv')).toBeInTheDocument();

      // Check summary statistics
      expect(screen.getByText('3')).toBeInTheDocument(); // Total positions
      expect(screen.getByText('3')).toBeInTheDocument(); // Valid positions
      expect(screen.getByText('0')).toBeInTheDocument(); // Invalid positions
      expect(screen.getByText('75.000,00 €')).toBeInTheDocument(); // Total value

      // Check status badge
      expect(screen.getByText('Bereit für Analyse')).toBeInTheDocument();

      // Check table headers
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('ISIN')).toBeInTheDocument();
      expect(screen.getByText('Wert')).toBeInTheDocument();
      expect(screen.getByText('Anteil')).toBeInTheDocument();
      expect(screen.getByText('Fehler')).toBeInTheDocument();

      // Check position data
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
      expect(screen.getByText('Microsoft Corp')).toBeInTheDocument();
      expect(screen.getByText('Google Inc.')).toBeInTheDocument();
      
      // Check ISINs
      expect(screen.getByText('US0378331005')).toBeInTheDocument();
      expect(screen.getByText('US5949181045')).toBeInTheDocument();
      expect(screen.getByText('US02079K3059')).toBeInTheDocument();

      // Check formatted values
      expect(screen.getByText('25.000,00 €')).toBeInTheDocument();
      expect(screen.getByText('30.000,00 €')).toBeInTheDocument();
      expect(screen.getByText('20.000,00 €')).toBeInTheDocument();

      // Check percentages
      expect(screen.getByText('33.33%')).toBeInTheDocument(); // 25000/75000
      expect(screen.getByText('40.00%')).toBeInTheDocument(); // 30000/75000
      expect(screen.getByText('26.67%')).toBeInTheDocument(); // 20000/75000
    });

    it('should display check icons for valid positions', () => {
      render(<DataPreviewTable previewData={mockValidPreviewData} />);

      // Should have check circle icons for all valid positions
      const checkIcons = document.querySelectorAll('.lucide-check-circle');
      expect(checkIcons).toHaveLength(3);
    });
  });

  describe('Invalid Data Rendering', () => {
    it('should render preview data with validation errors', () => {
      render(<DataPreviewTable previewData={mockInvalidPreviewData} />);

      // Check summary statistics
      expect(screen.getByText('1')).toBeInTheDocument(); // Valid positions
      expect(screen.getByText('2')).toBeInTheDocument(); // Invalid positions

      // Check error status badge
      expect(screen.getByText('Fehler müssen behoben werden')).toBeInTheDocument();

      // Check warning display
      expect(screen.getByText('Warnungen:')).toBeInTheDocument();
      expect(screen.getByText('ISIN-Format könnte ungültig sein')).toBeInTheDocument();

      // Check invalid position display
      expect(screen.getByText('Name fehlt')).toBeInTheDocument();
      expect(screen.getByText('Ungültiger Wert')).toBeInTheDocument();

      // Check error badges in table
      expect(screen.getByText('Name ist erforderlich')).toBeInTheDocument();
      expect(screen.getByText('Ungültiger oder fehlender Wert')).toBeInTheDocument();
    });

    it('should display x-circle icons for invalid positions', () => {
      render(<DataPreviewTable previewData={mockInvalidPreviewData} />);

      // Should have x-circle icons for invalid positions
      const errorIcons = document.querySelectorAll('.lucide-x-circle');
      expect(errorIcons).toHaveLength(2);
    });

    it('should highlight invalid rows with red background', () => {
      render(<DataPreviewTable previewData={mockInvalidPreviewData} />);

      // Invalid rows should have red background class
      const invalidRows = document.querySelectorAll('.bg-red-50');
      expect(invalidRows.length).toBeGreaterThan(0);
    });
  });

  describe('PDF Preview Handling', () => {
    it('should render PDF preview with raw text display', () => {
      render(<DataPreviewTable previewData={mockPDFPreviewData} />);

      // Should show PDF-specific title and content
      expect(screen.getByText('PDF-Rohtext erkannt')).toBeInTheDocument();
      expect(screen.getByText(/PDF-Dateien erfordern AI-gestützte Analyse/)).toBeInTheDocument();

      // Should display raw text content
      expect(screen.getByText(/Portfolio Bericht/)).toBeInTheDocument();
      expect(screen.getByText(/Apple Inc. - US0378331005 - €25,000/)).toBeInTheDocument();

      // Should not show regular table
      expect(screen.queryByText('Portfolio-Positionen')).not.toBeInTheDocument();
      expect(screen.queryByText('Status')).not.toBeInTheDocument();
    });

    it('should truncate long PDF text content', () => {
      const longTextData = {
        ...mockPDFPreviewData,
        positions: [
          {
            ...mockPDFPreviewData.positions[0],
            rawText: 'A'.repeat(1500) // Text longer than 1000 characters
          }
        ]
      };

      render(<DataPreviewTable previewData={longTextData} />);

      // Should show truncation indicator
      expect(screen.getByText(/\[Text gekürzt\]/)).toBeInTheDocument();
    });

    it('should handle missing PDF raw text gracefully', () => {
      const noPDFTextData = {
        ...mockPDFPreviewData,
        positions: [
          {
            ...mockPDFPreviewData.positions[0],
            rawText: undefined
          }
        ]
      };

      render(<DataPreviewTable previewData={noPDFTextData} />);

      // Should show fallback message
      expect(screen.getByText('Rohtext konnte nicht geladen werden')).toBeInTheDocument();
    });
  });

  describe('Empty Data Handling', () => {
    it('should render empty state when no positions found', () => {
      render(<DataPreviewTable previewData={mockEmptyPreviewData} />);

      // Should show empty state message
      expect(screen.getByText('Keine Positionen in der Datei gefunden')).toBeInTheDocument();

      // Should show warning
      expect(screen.getByText('Warnungen:')).toBeInTheDocument();
      expect(screen.getByText('Keine Positionen in der Datei gefunden')).toBeInTheDocument();

      // Should show error status
      expect(screen.getByText('Fehler müssen behoben werden')).toBeInTheDocument();
    });

    it('should show empty state icon', () => {
      render(<DataPreviewTable previewData={mockEmptyPreviewData} />);

      // Should display file icon in empty state
      const fileIcons = document.querySelectorAll('.lucide-file-text');
      expect(fileIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Currency and Percentage Formatting', () => {
    it('should format currency values in German locale', () => {
      render(<DataPreviewTable previewData={mockValidPreviewData} />);

      // Check German currency formatting
      expect(screen.getByText('25.000,00 €')).toBeInTheDocument();
      expect(screen.getByText('30.000,00 €')).toBeInTheDocument();
      expect(screen.getByText('20.000,00 €')).toBeInTheDocument();
      expect(screen.getByText('75.000,00 €')).toBeInTheDocument();
    });

    it('should calculate and display correct percentages', () => {
      render(<DataPreviewTable previewData={mockValidPreviewData} />);

      // Check percentage calculations (value/total * 100)
      expect(screen.getByText('33.33%')).toBeInTheDocument(); // 25000/75000
      expect(screen.getByText('40.00%')).toBeInTheDocument(); // 30000/75000  
      expect(screen.getByText('26.67%')).toBeInTheDocument(); // 20000/75000
    });

    it('should handle zero total value in percentage calculation', () => {
      const zeroTotalData = {
        ...mockValidPreviewData,
        totalValue: 0,
        positions: mockValidPreviewData.positions.map(pos => ({ ...pos, value: 0 }))
      };

      render(<DataPreviewTable previewData={zeroTotalData} />);

      // Should show 0% when total is zero
      const percentages = screen.getAllByText('0%');
      expect(percentages).toHaveLength(3);
    });
  });

  describe('ISIN Display', () => {
    it('should display ISINs in monospace code blocks', () => {
      render(<DataPreviewTable previewData={mockValidPreviewData} />);

      // ISINs should be wrapped in code elements
      const isins = document.querySelectorAll('code');
      expect(isins.length).toBeGreaterThanOrEqual(3);
    });

    it('should show placeholder for missing ISINs', () => {
      const noISINData = {
        ...mockValidPreviewData,
        positions: mockValidPreviewData.positions.map(pos => ({ ...pos, isin: undefined }))
      };

      render(<DataPreviewTable previewData={noISINData} />);

      // Should show dashes for missing ISINs
      const placeholders = screen.getAllByText('-');
      expect(placeholders).toHaveLength(3);
    });
  });

  describe('Validation Error Display', () => {
    it('should display validation error badges for each position error', () => {
      render(<DataPreviewTable previewData={mockInvalidPreviewData} />);

      // Should show error badges
      const errorBadges = document.querySelectorAll('[class*="destructive"]');
      expect(errorBadges.length).toBeGreaterThan(0);
    });

    it('should handle positions with multiple validation errors', () => {
      const multipleErrorsData = {
        ...mockInvalidPreviewData,
        positions: [
          ...mockInvalidPreviewData.positions.slice(0, 1),
          {
            name: '',
            isin: '',
            value: NaN,
            validation: { 
              isValid: false, 
              errors: ['Name ist erforderlich', 'Ungültiger oder fehlender Wert', 'ISIN fehlt'] 
            }
          }
        ]
      };

      render(<DataPreviewTable previewData={multipleErrorsData} />);

      // Should display all error messages
      expect(screen.getByText('Name ist erforderlich')).toBeInTheDocument();
      expect(screen.getByText('Ungültiger oder fehlender Wert')).toBeInTheDocument();
      expect(screen.getByText('ISIN fehlt')).toBeInTheDocument();
    });
  });

  describe('Warning Display', () => {
    it('should display warnings in alert format', () => {
      render(<DataPreviewTable previewData={mockInvalidPreviewData} />);

      // Should show warning alert
      expect(screen.getByText('Warnungen:')).toBeInTheDocument();
      expect(screen.getByText('ISIN-Format könnte ungültig sein')).toBeInTheDocument();

      // Should use warning styling
      const warningAlert = document.querySelector('.border-yellow-200');
      expect(warningAlert).toBeInTheDocument();
    });

    it('should handle multiple warnings', () => {
      const multipleWarningsData = {
        ...mockValidPreviewData,
        warnings: ['Warning 1', 'Warning 2', 'Warning 3']
      };

      render(<DataPreviewTable previewData={multipleWarningsData} />);

      expect(screen.getByText('Warning 1')).toBeInTheDocument();
      expect(screen.getByText('Warning 2')).toBeInTheDocument();
      expect(screen.getByText('Warning 3')).toBeInTheDocument();
    });
  });
});