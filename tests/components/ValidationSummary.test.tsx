import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ValidationSummary from '@/components/ValidationSummary';

const mockValidationErrors = [
  { row: 2, field: 'name', error: 'Name ist erforderlich' },
  { row: 3, field: 'value', error: 'Ungültiger oder fehlender Wert' },
  { row: 4, field: 'isin', error: 'ISIN-Format ungültig' }
];

const mockWarnings = [
  'ISIN-Format könnte ungültig sein',
  'Währungssymbole wurden automatisch entfernt'
];

describe('ValidationSummary Component', () => {
  describe('Success State', () => {
    it('should render successful validation state', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={[]}
          canProceed={true}
          fileType="csv"
          totalPositions={3}
          validPositions={3}
        />
      );

      expect(screen.getByText('Validierungsstatus')).toBeInTheDocument();
      expect(screen.getByText('Validation erfolgreich')).toBeInTheDocument();
      expect(screen.getByText('3 von 3 Positionen sind gültig')).toBeInTheDocument();
      expect(screen.getByText('Alle Positionen sind gültig. Sie können mit der Analyse fortfahren.')).toBeInTheDocument();
    });

    it('should show success icons and styling', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={[]}
          canProceed={true}
          fileType="csv"
          totalPositions={3}
          validPositions={3}
        />
      );

      // Should have success icons
      const checkIcons = document.querySelectorAll('.lucide-check-circle');
      expect(checkIcons.length).toBeGreaterThan(0);

      // Should have success styling
      const successAlert = document.querySelector('.border-green-200');
      expect(successAlert).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should render validation errors state', () => {
      render(
        <ValidationSummary
          validationErrors={mockValidationErrors}
          warnings={mockWarnings}
          canProceed={false}
          fileType="csv"
          totalPositions={5}
          validPositions={2}
        />
      );

      expect(screen.getByText('Fehler gefunden')).toBeInTheDocument();
      expect(screen.getByText('2 von 5 Positionen sind gültig')).toBeInTheDocument();
      expect(screen.getByText('3 Validierungsfehler gefunden:')).toBeInTheDocument();
    });

    it('should display individual validation errors', () => {
      render(
        <ValidationSummary
          validationErrors={mockValidationErrors}
          warnings={[]}
          canProceed={false}
          fileType="csv"
          totalPositions={5}
          validPositions={2}
        />
      );

      expect(screen.getByText('Zeile 2, Feld "name": Name ist erforderlich')).toBeInTheDocument();
      expect(screen.getByText('Zeile 3, Feld "value": Ungültiger oder fehlender Wert')).toBeInTheDocument();
      expect(screen.getByText('Zeile 4, Feld "isin": ISIN-Format ungültig')).toBeInTheDocument();
    });

    it('should limit displayed errors and show count of additional errors', () => {
      const manyErrors = Array.from({ length: 8 }, (_, i) => ({
        row: i + 1,
        field: 'test',
        error: `Error ${i + 1}`
      }));

      render(
        <ValidationSummary
          validationErrors={manyErrors}
          warnings={[]}
          canProceed={false}
          fileType="csv"
          totalPositions={10}
          validPositions={2}
        />
      );

      expect(screen.getByText('... und 3 weitere Fehler')).toBeInTheDocument();
      expect(screen.queryByText('Error 6')).not.toBeInTheDocument();
      expect(screen.queryByText('Error 7')).not.toBeInTheDocument();
      expect(screen.queryByText('Error 8')).not.toBeInTheDocument();
    });

    it('should show error icons and styling', () => {
      render(
        <ValidationSummary
          validationErrors={mockValidationErrors}
          warnings={[]}
          canProceed={false}
          fileType="csv"
          totalPositions={5}
          validPositions={2}
        />
      );

      // Should have error icons
      const errorIcons = document.querySelectorAll('.lucide-x-circle');
      expect(errorIcons.length).toBeGreaterThan(0);

      // Should have error styling
      const errorAlert = document.querySelector('.border-red-200');
      expect(errorAlert).toBeInTheDocument();
    });
  });

  describe('Warning Display', () => {
    it('should display warnings when present', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={mockWarnings}
          canProceed={true}
          fileType="csv"
          totalPositions={3}
          validPositions={3}
        />
      );

      expect(screen.getByText('Warnungen:')).toBeInTheDocument();
      expect(screen.getByText('ISIN-Format könnte ungültig sein')).toBeInTheDocument();
      expect(screen.getByText('Währungssymbole wurden automatisch entfernt')).toBeInTheDocument();
    });

    it('should use warning styling for warnings', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={mockWarnings}
          canProceed={true}
          fileType="csv"
          totalPositions={3}
          validPositions={3}
        />
      );

      // Should have warning styling
      const warningAlert = document.querySelector('.border-yellow-200');
      expect(warningAlert).toBeInTheDocument();

      // Should have warning icon
      const warningIcons = document.querySelectorAll('.lucide-alert-triangle');
      expect(warningIcons.length).toBeGreaterThan(0);
    });

    it('should not show warnings section when no warnings present', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={[]}
          canProceed={true}
          fileType="csv"
          totalPositions={3}
          validPositions={3}
        />
      );

      expect(screen.queryByText('Warnungen:')).not.toBeInTheDocument();
    });
  });

  describe('File Type Icons', () => {
    it('should display CSV icon for CSV files', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={[]}
          canProceed={true}
          fileType="csv"
          totalPositions={3}
          validPositions={3}
        />
      );

      expect(screen.getByText('Format-Hilfe')).toBeInTheDocument();
      
      // Should have spreadsheet icon for CSV
      const spreadsheetIcons = document.querySelectorAll('.lucide-file-spreadsheet');
      expect(spreadsheetIcons.length).toBeGreaterThan(0);
    });

    it('should display Excel icon for Excel files', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={[]}
          canProceed={true}
          fileType="xlsx"
          totalPositions={3}
          validPositions={3}
        />
      );

      const spreadsheetIcons = document.querySelectorAll('.lucide-file-spreadsheet');
      expect(spreadsheetIcons.length).toBeGreaterThan(0);
    });

    it('should display PDF icon for PDF files', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={[]}
          canProceed={true}
          fileType="pdf"
          totalPositions={3}
          validPositions={3}
        />
      );

      const pdfIcons = document.querySelectorAll('.lucide-file-text');
      expect(pdfIcons.length).toBeGreaterThan(0);
    });

    it('should display help icon for unknown file types', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={[]}
          canProceed={true}
          fileType="unknown"
          totalPositions={3}
          validPositions={3}
        />
      );

      const helpIcons = document.querySelectorAll('.lucide-help-circle');
      expect(helpIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Format Guidance', () => {
    it('should show CSV format guidance', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={[]}
          canProceed={true}
          fileType="csv"
          totalPositions={3}
          validPositions={3}
        />
      );

      expect(screen.getByText('CSV-Format Anforderungen')).toBeInTheDocument();
      expect(screen.getByText('Comma-Separated Values Datei')).toBeInTheDocument();
      expect(screen.getByText(/Erste Zeile muss Spaltenüberschriften enthalten/)).toBeInTheDocument();
      expect(screen.getByText(/Deutsche Zahlenformate unterstützt/)).toBeInTheDocument();
    });

    it('should show Excel format guidance', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={[]}
          canProceed={true}
          fileType="xlsx"
          totalPositions={3}
          validPositions={3}
        />
      );

      expect(screen.getByText('Excel-Format Anforderungen')).toBeInTheDocument();
      expect(screen.getByText('Microsoft Excel Arbeitsmappe')).toBeInTheDocument();
      expect(screen.getByText(/Nur das erste Arbeitsblatt wird verarbeitet/)).toBeInTheDocument();
    });

    it('should show PDF format guidance', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={[]}
          canProceed={true}
          fileType="pdf"
          totalPositions={3}
          validPositions={3}
        />
      );

      expect(screen.getByText('PDF-Format Hinweise')).toBeInTheDocument();
      expect(screen.getByText('Portable Document Format')).toBeInTheDocument();
      expect(screen.getByText(/PDF muss durchsuchbaren Text enthalten/)).toBeInTheDocument();
      expect(screen.getByText(/Portfolio-Daten werden automatisch mit AI erkannt/)).toBeInTheDocument();
    });

    it('should not show format guidance for unknown file types', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={[]}
          canProceed={true}
          fileType="unknown"
          totalPositions={3}
          validPositions={3}
        />
      );

      // Should not show specific format guidance
      expect(screen.queryByText('CSV-Format Anforderungen')).not.toBeInTheDocument();
      expect(screen.queryByText('Excel-Format Anforderungen')).not.toBeInTheDocument();
      expect(screen.queryByText('PDF-Format Hinweise')).not.toBeInTheDocument();
    });
  });

  describe('Format Guidance Tabs', () => {
    it('should have requirements and example tabs', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={[]}
          canProceed={true}
          fileType="csv"
          totalPositions={3}
          validPositions={3}
        />
      );

      expect(screen.getByText('Anforderungen')).toBeInTheDocument();
      expect(screen.getByText('Beispiel')).toBeInTheDocument();
    });

    it('should switch between tabs when clicked', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={[]}
          canProceed={true}
          fileType="csv"
          totalPositions={3}
          validPositions={3}
        />
      );

      // Initially should show requirements
      expect(screen.getByText('CSV-Format Anforderungen')).toBeInTheDocument();

      // Click example tab
      fireEvent.click(screen.getByText('Beispiel'));

      // Should show example content
      expect(screen.getByText('Format-Beispiel')).toBeInTheDocument();
    });

    it('should display CSV example in code format', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={[]}
          canProceed={true}
          fileType="csv"
          totalPositions={3}
          validPositions={3}
        />
      );

      // Switch to example tab
      fireEvent.click(screen.getByText('Beispiel'));

      // Should show CSV example
      expect(screen.getByText(/Name,ISIN,Wert/)).toBeInTheDocument();
      expect(screen.getByText(/"Apple Inc"/)).toBeInTheDocument();
    });

    it('should display Excel example as descriptive text', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={[]}
          canProceed={true}
          fileType="xlsx"
          totalPositions={3}
          validPositions={3}
        />
      );

      // Switch to example tab
      fireEvent.click(screen.getByText('Beispiel'));

      // Should show Excel description
      expect(screen.getByText(/Verwenden Sie die erste Zeile für Spaltenüberschriften/)).toBeInTheDocument();
    });
  });

  describe('Common Issues Section', () => {
    it('should display common issues help section', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={[]}
          canProceed={true}
          fileType="csv"
          totalPositions={3}
          validPositions={3}
        />
      );

      expect(screen.getByText('Häufige Probleme')).toBeInTheDocument();
      expect(screen.getByText(/Fehlende Werte:/)).toBeInTheDocument();
      expect(screen.getByText(/Zahlenformat:/)).toBeInTheDocument();
      expect(screen.getByText(/Spaltenüberschriften:/)).toBeInTheDocument();
      expect(screen.getByText(/PDF-Qualität:/)).toBeInTheDocument();
    });

    it('should show warning icons for common issues', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={[]}
          canProceed={true}
          fileType="csv"
          totalPositions={3}
          validPositions={3}
        />
      );

      // Should have multiple warning triangles for each issue
      const warningTriangles = document.querySelectorAll('.lucide-alert-triangle');
      expect(warningTriangles.length).toBeGreaterThanOrEqual(4); // At least 4 for common issues
    });
  });

  describe('Format Requirements List', () => {
    it('should display all CSV requirements with check icons', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={[]}
          canProceed={true}
          fileType="csv"
          totalPositions={3}
          validPositions={3}
        />
      );

      // Should show check icons for requirements
      const checkIcons = document.querySelectorAll('.lucide-check-circle');
      expect(checkIcons.length).toBeGreaterThan(5); // Format requirements + validation success

      // Check specific requirements
      expect(screen.getByText(/Erste Zeile muss Spaltenüberschriften enthalten/)).toBeInTheDocument();
      expect(screen.getByText(/Optionale ISIN-Spalte für bessere Identifikation/)).toBeInTheDocument();
      expect(screen.getByText(/Deutsche Zahlenformate unterstützt/)).toBeInTheDocument();
    });

    it('should display Excel-specific requirements', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={[]}
          canProceed={true}
          fileType="xlsx"
          totalPositions={3}
          validPositions={3}
        />
      );

      expect(screen.getByText(/Deutsche und englische Zahlenformate unterstützt/)).toBeInTheDocument();
      expect(screen.getByText(/Nur das erste Arbeitsblatt wird verarbeitet/)).toBeInTheDocument();
    });

    it('should display PDF-specific requirements', () => {
      render(
        <ValidationSummary
          validationErrors={[]}
          warnings={[]}
          canProceed={true}
          fileType="pdf"
          totalPositions={3}
          validPositions={3}
        />
      );

      expect(screen.getByText(/PDF muss durchsuchbaren Text enthalten/)).toBeInTheDocument();
      expect(screen.getByText(/Portfolio-Daten werden automatisch mit AI erkannt/)).toBeInTheDocument();
      expect(screen.getByText(/Funktioniert am besten mit strukturierten Dokumenten/)).toBeInTheDocument();
    });
  });
});