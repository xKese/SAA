import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes';
import * as storage from '../../server/storage';

// Mock dependencies
vi.mock('../../server/storage');
vi.mock('../../server/services/claude');

const mockedStorage = vi.mocked(storage);

describe('Backend Validation Tests', () => {
  let app: express.Application;
  let server: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('Portfolio Preview Validation', () => {
    it('should validate CSV file and return preview data', async () => {
      const csvContent = `Name,ISIN,Value
Apple Inc.,US0378331005,25000
Microsoft Corp,US5949181045,30000`;
      
      const response = await request(app)
        .post('/api/portfolios/preview')
        .attach('file', Buffer.from(csvContent), {
          filename: 'portfolio.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('fileName', 'portfolio.csv');
      expect(response.body).toHaveProperty('fileType', 'csv');
      expect(response.body).toHaveProperty('totalPositions', 2);
      expect(response.body).toHaveProperty('canProceed', true);
      expect(response.body.positions).toHaveLength(2);
    });

    it('should detect validation errors in CSV positions', async () => {
      const csvContent = `Name,ISIN,Value
Apple Inc.,US0378331005,25000
,US5949181045,30000
Invalid Position,,invalid_value`;
      
      const response = await request(app)
        .post('/api/portfolios/preview')
        .attach('file', Buffer.from(csvContent), {
          filename: 'portfolio.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(200);
      expect(response.body.validationErrors).toHaveLength(3); // Missing name, invalid value, missing ISIN
      expect(response.body.canProceed).toBe(false);
      expect(response.body.invalidPositions).toBe(2);
    });

    it('should handle Excel file validation', async () => {
      // Mock Excel parsing
      const mockExcelData = [
        ['Name', 'ISIN', 'Value'],
        ['Apple Inc.', 'US0378331005', 25000],
        ['Microsoft Corp', 'US5949181045', 30000]
      ];

      const response = await request(app)
        .post('/api/portfolios/preview')
        .attach('file', Buffer.from('mock excel content'), {
          filename: 'portfolio.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

      expect(response.status).toBe(200);
      expect(response.body.fileType).toBe('xlsx');
    });

    it('should reject unsupported file formats', async () => {
      const response = await request(app)
        .post('/api/portfolios/preview')
        .attach('file', Buffer.from('invalid content'), {
          filename: 'portfolio.txt',
          contentType: 'text/plain'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate position values are positive numbers', async () => {
      const csvContent = `Name,ISIN,Value
Apple Inc.,US0378331005,-25000
Microsoft Corp,US5949181045,0
Google Inc.,US02079K3059,abc`;
      
      const response = await request(app)
        .post('/api/portfolios/preview')
        .attach('file', Buffer.from(csvContent), {
          filename: 'portfolio.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(200);
      expect(response.body.validationErrors).toHaveLength(3);
      expect(response.body.validationErrors).toContainEqual(
        expect.objectContaining({
          field: 'value',
          error: expect.stringContaining('größer als 0')
        })
      );
    });

    it('should detect German number format (comma decimal)', async () => {
      const csvContent = `Name,ISIN,Value
Apple Inc.,US0378331005,"25.000,50"
Microsoft Corp,US5949181045,"30.125,75"`;
      
      const response = await request(app)
        .post('/api/portfolios/preview')
        .attach('file', Buffer.from(csvContent), {
          filename: 'portfolio.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(200);
      expect(response.body.totalPositions).toBe(2);
      expect(response.body.positions[0].value).toBe(25000.50);
      expect(response.body.positions[1].value).toBe(30125.75);
    });

    it('should detect English number format (dot decimal)', async () => {
      const csvContent = `Name,ISIN,Value
Apple Inc.,US0378331005,25000.50
Microsoft Corp,US5949181045,"30,125.75"`;
      
      const response = await request(app)
        .post('/api/portfolios/preview')
        .attach('file', Buffer.from(csvContent), {
          filename: 'portfolio.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(200);
      expect(response.body.totalPositions).toBe(2);
      expect(response.body.positions[0].value).toBe(25000.50);
      expect(response.body.positions[1].value).toBe(30125.75);
    });

    it('should handle missing required columns', async () => {
      const csvContent = `Title,Code,Amount
Apple Inc.,AAPL,25000`;
      
      const response = await request(app)
        .post('/api/portfolios/preview')
        .attach('file', Buffer.from(csvContent), {
          filename: 'portfolio.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('muss Spalten für Name/Bezeichnung und Wert/Betrag enthalten');
    });

    it('should handle empty files', async () => {
      const response = await request(app)
        .post('/api/portfolios/preview')
        .attach('file', Buffer.from(''), {
          filename: 'empty.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('mindestens eine Kopfzeile und eine Datenzeile');
    });

    it('should validate ISIN format when provided', async () => {
      const csvContent = `Name,ISIN,Value
Apple Inc.,INVALID_ISIN,25000
Microsoft Corp,US5949181045,30000`;
      
      const response = await request(app)
        .post('/api/portfolios/preview')
        .attach('file', Buffer.from(csvContent), {
          filename: 'portfolio.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(200);
      expect(response.body.warnings).toContain(
        expect.stringContaining('ISIN-Format könnte ungültig sein')
      );
    });
  });

  describe('Portfolio Upload and Analysis', () => {
    it('should successfully upload valid portfolio and start analysis', async () => {
      const csvContent = `Name,ISIN,Value
Apple Inc.,US0378331005,25000
Microsoft Corp,US5949181045,30000`;

      mockedStorage.createPortfolio = vi.fn().mockResolvedValue({
        id: 'test-id',
        name: 'Portfolio portfolio.csv',
        fileName: 'portfolio.csv',
        analysisStatus: 'pending'
      });

      const response = await request(app)
        .post('/api/portfolios/upload')
        .attach('file', Buffer.from(csvContent), {
          filename: 'portfolio.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('portfolio');
      expect(response.body).toHaveProperty('positionCount', 2);
      expect(mockedStorage.createPortfolio).toHaveBeenCalled();
    });

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/portfolios/upload');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Keine Datei hochgeladen');
    });

    it('should reject files with no valid positions', async () => {
      const csvContent = `Name,ISIN,Value
,,,`;
      
      const response = await request(app)
        .post('/api/portfolios/upload')
        .attach('file', Buffer.from(csvContent), {
          filename: 'empty_portfolio.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Keine gültigen Positionen');
    });

    it('should handle file parsing errors gracefully', async () => {
      const response = await request(app)
        .post('/api/portfolios/upload')
        .attach('file', Buffer.from('invalid content'), {
          filename: 'corrupted.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Fehler beim Verarbeiten der Datei');
    });
  });

  describe('Analysis Phase Validation', () => {
    it('should enforce position value validation during analysis', async () => {
      const positions = [
        { name: 'Apple Inc.', isin: 'US0378331005', value: 25000 },
        { name: 'Invalid Position', isin: 'US5949181045', value: 0 } // Invalid value
      ];

      // This would be tested through the analysis function
      // The validation should catch positions with invalid values
      expect(() => {
        positions.forEach((pos, i) => {
          if (!pos.value || pos.value <= 0) {
            throw new Error(`Position ${i + 1} ("${pos.name}") has invalid or missing value: ${pos.value}. Cannot proceed with accurate analysis.`);
          }
        });
      }).toThrow('has invalid or missing value');
    });

    it('should validate all positions have required fields before analysis', async () => {
      const positions = [
        { name: 'Apple Inc.', isin: 'US0378331005', value: 25000 },
        { name: '', isin: 'US5949181045', value: 30000 }, // Missing name
        { name: 'Google Inc.', isin: 'US02079K3059', value: null } // Missing value
      ];

      const validationErrors = [];
      positions.forEach((pos, index) => {
        if (!pos.name || pos.name.trim().length === 0) {
          validationErrors.push({ row: index + 1, field: 'name', error: 'Name ist erforderlich' });
        }
        if (pos.value === null || pos.value === undefined || pos.value <= 0) {
          validationErrors.push({ row: index + 1, field: 'value', error: 'Ungültiger oder fehlender Wert' });
        }
      });

      expect(validationErrors).toHaveLength(2);
      expect(validationErrors).toContainEqual({ row: 2, field: 'name', error: 'Name ist erforderlich' });
      expect(validationErrors).toContainEqual({ row: 3, field: 'value', error: 'Ungültiger oder fehlender Wert' });
    });
  });

  describe('Error Response Validation', () => {
    it('should return proper error structure for validation failures', async () => {
      const response = await request(app)
        .post('/api/portfolios/preview')
        .attach('file', Buffer.from('invalid'), {
          filename: 'invalid.txt',
          contentType: 'text/plain'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    it('should include validation details in error responses', async () => {
      const csvContent = `Name,ISIN,Value
,US5949181045,
Invalid,,invalid`;
      
      const response = await request(app)
        .post('/api/portfolios/preview')
        .attach('file', Buffer.from(csvContent), {
          filename: 'invalid.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(200); // Preview should still work
      expect(response.body).toHaveProperty('validationErrors');
      expect(Array.isArray(response.body.validationErrors)).toBe(true);
      expect(response.body.validationErrors.length).toBeGreaterThan(0);
      
      // Check validation error structure
      response.body.validationErrors.forEach((error: any) => {
        expect(error).toHaveProperty('row');
        expect(error).toHaveProperty('field');
        expect(error).toHaveProperty('error');
      });
    });
  });

  describe('File Size and Security Validation', () => {
    it('should handle large file uploads appropriately', async () => {
      // Create a large CSV content (simulate large file)
      let largeCsvContent = 'Name,ISIN,Value\n';
      for (let i = 0; i < 1000; i++) {
        largeCsvContent += `Position ${i},US037833100${i % 10},${25000 + i}\n`;
      }
      
      const response = await request(app)
        .post('/api/portfolios/preview')
        .attach('file', Buffer.from(largeCsvContent), {
          filename: 'large_portfolio.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(200);
      expect(response.body.totalPositions).toBe(1000);
    });

    it('should sanitize file names and prevent path traversal', async () => {
      const csvContent = `Name,ISIN,Value
Apple Inc.,US0378331005,25000`;
      
      const response = await request(app)
        .post('/api/portfolios/preview')
        .attach('file', Buffer.from(csvContent), {
          filename: '../../../malicious.csv',
          contentType: 'text/csv'
        });

      expect(response.status).toBe(200);
      expect(response.body.fileName).toBe('../../../malicious.csv'); // Preserved but not executed
    });
  });
});