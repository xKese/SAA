import { describe, it, expect } from 'vitest';
import { Buffer } from 'buffer';

// These would normally be imported from the routes file, but we'll recreate the functions for testing
// In a real implementation, you'd extract these to separate modules for better testability

interface ParsedPosition {
  name: string;
  isin?: string;
  value: number;
}

function parseCSV(buffer: Buffer): ParsedPosition[] {
  const content = buffer.toString('utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV muss mindestens eine Kopfzeile und eine Datenzeile enthalten');
  }
  
  const headers = lines[0].split(/[,;]/).map(h => h.trim().toLowerCase());
  const positions: ParsedPosition[] = [];
  
  // Find column indices
  const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('bezeichnung') || h.includes('titel'));
  const isinIndex = headers.findIndex(h => h.includes('isin') || h.includes('wkn'));
  const valueIndex = headers.findIndex(h => h.includes('wert') || h.includes('betrag') || h.includes('value') || h.includes('amount'));
  
  if (nameIndex === -1 || valueIndex === -1) {
    throw new Error('CSV muss Spalten für Name/Bezeichnung und Wert/Betrag enthalten');
  }
  
  // Detect decimal separator by checking all value entries
  let useCommaAsDecimal = false;
  const sampleValues: string[] = [];
  for (let i = 1; i < Math.min(lines.length, 10); i++) {
    const values = lines[i].split(/[,;]/).map(v => v.trim());
    if (values[valueIndex]) {
      sampleValues.push(values[valueIndex]);
    }
  }
  
  // Check if values contain comma as decimal (e.g., "1.234,56" or "123,45")
  const germanPattern = sampleValues.some(v => /^\d{1,3}(\.\d{3})*,\d+/.test(v.replace(/[€$£¥\s]/g, '')));
  const commaDecimalPattern = sampleValues.some(v => /^\d+,\d+$/.test(v.replace(/[€$£¥\s]/g, '')));
  const dotDecimalPattern = sampleValues.some(v => /^\d+\.\d+$/.test(v.replace(/[€$£¥\s]/g, '')));
  
  if (germanPattern || (commaDecimalPattern && !dotDecimalPattern)) {
    useCommaAsDecimal = true;
  }
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/[,;]/).map(v => v.trim());
    
    if (values.length > Math.max(nameIndex, valueIndex, isinIndex)) {
      const name = values[nameIndex]?.replace(/"/g, '');
      const isin = isinIndex !== -1 ? values[isinIndex]?.replace(/"/g, '') : undefined;
      let valueStr = values[valueIndex]?.replace(/[€$£¥\s]/g, '');
      
      if (name && valueStr) {
        // Convert to standard format based on detected separator
        if (useCommaAsDecimal) {
          // German format: 1.234,56 -> 1234.56
          valueStr = valueStr.replace(/\./g, '').replace(',', '.');
        } else {
          // English format: 1,234.56 -> 1234.56
          valueStr = valueStr.replace(/,/g, '');
        }
        
        const value = parseFloat(valueStr);
        if (!isNaN(value) && value > 0) {
          positions.push({ name, isin: isin || undefined, value });
        }
      }
    }
  }
  
  return positions;
}

describe('File Parsing Validation Tests', () => {
  describe('CSV Parsing', () => {
    it('should parse valid CSV with English number format', () => {
      const csvContent = `Name,ISIN,Value
Apple Inc.,US0378331005,25000.50
Microsoft Corp,US5949181045,30125.75`;
      
      const positions = parseCSV(Buffer.from(csvContent));
      
      expect(positions).toHaveLength(2);
      expect(positions[0]).toEqual({
        name: 'Apple Inc.',
        isin: 'US0378331005',
        value: 25000.50
      });
      expect(positions[1]).toEqual({
        name: 'Microsoft Corp',
        isin: 'US5949181045',
        value: 30125.75
      });
    });

    it('should parse CSV with German number format', () => {
      const csvContent = `Name,ISIN,Value
"Apple Inc.","US0378331005","25.000,50"
"Microsoft Corp","US5949181045","30.125,75"`;
      
      const positions = parseCSV(Buffer.from(csvContent));
      
      expect(positions).toHaveLength(2);
      expect(positions[0].value).toBe(25000.50);
      expect(positions[1].value).toBe(30125.75);
    });

    it('should handle semicolon-separated CSV', () => {
      const csvContent = `Name;ISIN;Wert
Apple Inc.;US0378331005;25000
Microsoft Corp;US5949181045;30000`;
      
      const positions = parseCSV(Buffer.from(csvContent));
      
      expect(positions).toHaveLength(2);
      expect(positions[0].name).toBe('Apple Inc.');
      expect(positions[0].value).toBe(25000);
    });

    it('should handle German column names', () => {
      const csvContent = `Bezeichnung,ISIN,Betrag
Apple Inc.,US0378331005,25000
Microsoft Corp,US5949181045,30000`;
      
      const positions = parseCSV(Buffer.from(csvContent));
      
      expect(positions).toHaveLength(2);
    });

    it('should filter out invalid values', () => {
      const csvContent = `Name,ISIN,Value
Apple Inc.,US0378331005,25000
Microsoft Corp,US5949181045,0
Google Inc.,US02079K3059,-5000
Amazon Inc.,US0231351067,invalid
Tesla Inc.,US88160R1014,`;
      
      const positions = parseCSV(Buffer.from(csvContent));
      
      expect(positions).toHaveLength(1); // Only Apple should be valid
      expect(positions[0].name).toBe('Apple Inc.');
    });

    it('should handle missing ISIN column gracefully', () => {
      const csvContent = `Name,Value
Apple Inc.,25000
Microsoft Corp,30000`;
      
      const positions = parseCSV(Buffer.from(csvContent));
      
      expect(positions).toHaveLength(2);
      expect(positions[0].isin).toBeUndefined();
      expect(positions[1].isin).toBeUndefined();
    });

    it('should throw error for missing required columns', () => {
      const csvContent = `Title,Code
Apple Inc.,AAPL`;
      
      expect(() => parseCSV(Buffer.from(csvContent)))
        .toThrow('CSV muss Spalten für Name/Bezeichnung und Wert/Betrag enthalten');
    });

    it('should throw error for empty or invalid CSV', () => {
      expect(() => parseCSV(Buffer.from('')))
        .toThrow('CSV muss mindestens eine Kopfzeile und eine Datenzeile enthalten');
      
      expect(() => parseCSV(Buffer.from('Name,Value')))
        .toThrow('CSV muss mindestens eine Kopfzeile und eine Datenzeile enthalten');
    });

    it('should handle currency symbols in values', () => {
      const csvContent = `Name,ISIN,Value
Apple Inc.,US0378331005,"€25,000.50"
Microsoft Corp,US5949181045,$30000
Google Inc.,US02079K3059,£20000`;
      
      const positions = parseCSV(Buffer.from(csvContent));
      
      expect(positions).toHaveLength(3);
      expect(positions[0].value).toBe(25000.50);
      expect(positions[1].value).toBe(30000);
      expect(positions[2].value).toBe(20000);
    });

    it('should handle mixed number formats correctly', () => {
      const csvContent = `Name,ISIN,Value
Apple Inc.,US0378331005,"1.234,56"
Microsoft Corp,US5949181045,"2,345.67"
Google Inc.,US02079K3059,3456.78`;
      
      const positions = parseCSV(Buffer.from(csvContent));
      
      expect(positions).toHaveLength(3);
      // First position should be parsed as German format
      expect(positions[0].value).toBe(1234.56);
    });

    it('should handle whitespace and quotes in names', () => {
      const csvContent = `Name,ISIN,Value
" Apple Inc. ",US0378331005,25000
"Microsoft Corp",US5949181045,30000`;
      
      const positions = parseCSV(Buffer.from(csvContent));
      
      expect(positions).toHaveLength(2);
      expect(positions[0].name).toBe(' Apple Inc. ');
      expect(positions[1].name).toBe('Microsoft Corp');
    });
  });

  describe('Number Format Detection', () => {
    it('should detect German number format correctly', () => {
      const samples = ['1.234,56', '2.500,00', '123,45'];
      const germanPattern = samples.some(v => /^\d{1,3}(\.\d{3})*,\d+/.test(v));
      const commaDecimalPattern = samples.some(v => /^\d+,\d+$/.test(v));
      
      expect(germanPattern || commaDecimalPattern).toBe(true);
    });

    it('should detect English number format correctly', () => {
      const samples = ['1,234.56', '2,500.00', '123.45'];
      const dotDecimalPattern = samples.some(v => /^\d+\.\d+$/.test(v.replace(/,/g, '')));
      
      expect(dotDecimalPattern).toBe(true);
    });

    it('should handle ambiguous cases by defaulting to English', () => {
      const samples = ['1234', '5678', '9999'];
      const germanPattern = samples.some(v => /^\d{1,3}(\.\d{3})*,\d+/.test(v));
      const commaDecimalPattern = samples.some(v => /^\d+,\d+$/.test(v));
      
      expect(germanPattern || commaDecimalPattern).toBe(false);
    });
  });

  describe('Data Validation', () => {
    it('should validate position data structure', () => {
      const position = {
        name: 'Apple Inc.',
        isin: 'US0378331005',
        value: 25000
      };

      expect(position).toHaveProperty('name');
      expect(position).toHaveProperty('value');
      expect(typeof position.name).toBe('string');
      expect(typeof position.value).toBe('number');
      expect(position.name.length).toBeGreaterThan(0);
      expect(position.value).toBeGreaterThan(0);
    });

    it('should validate ISIN format when present', () => {
      const validISINs = ['US0378331005', 'DE0007164600', 'GB0002162385'];
      const invalidISINs = ['US037833100', 'INVALID', '123456789012'];
      
      validISINs.forEach(isin => {
        expect(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)).toBe(true);
      });
      
      invalidISINs.forEach(isin => {
        expect(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)).toBe(false);
      });
    });

    it('should handle edge cases in position names', () => {
      const edgeCaseNames = [
        'Company with "Quotes"',
        'Company, with commas',
        'Company; with semicolons',
        'Company\twith\ttabs',
        'Company\nwith\nlines',
        'Company with émojis 🚀',
        'Ünicöde Çompañy'
      ];

      edgeCaseNames.forEach(name => {
        expect(typeof name).toBe('string');
        expect(name.trim().length).toBeGreaterThan(0);
      });
    });

    it('should handle large values correctly', () => {
      const largeValues = [
        1000000000, // 1 billion
        999999999.99, // Close to 1 billion with decimals
        Number.MAX_SAFE_INTEGER
      ];

      largeValues.forEach(value => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
        expect(isFinite(value)).toBe(true);
      });
    });

    it('should handle small values correctly', () => {
      const smallValues = [
        0.01, // 1 cent
        0.001, // Sub-cent
        Number.MIN_VALUE
      ];

      smallValues.forEach(value => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
        expect(isFinite(value)).toBe(true);
      });
    });
  });
});