import { describe, it, expect } from 'vitest';
import { 
  categorizeError, 
  getErrorMetadata, 
  formatErrorForUser, 
  ErrorType, 
  ErrorSeverity 
} from '@/types/errors';

describe('Error Categorization Tests', () => {
  describe('categorizeError Function', () => {
    it('should categorize position value errors correctly', () => {
      const errorMessage = 'Position "Apple Inc." has invalid or missing value: undefined. Cannot proceed with accurate analysis.';
      const categorized = categorizeError(errorMessage);

      expect(categorized.type).toBe(ErrorType.POSITION_VALUE);
      expect(categorized.message).toBe(errorMessage);
      expect(categorized.details).toBe('Betroffene Position: Apple Inc.');
      expect(categorized.suggestions).toContain('Stellen Sie sicher, dass alle Positionen einen gültigen Wert haben');
      expect(categorized.affectedData?.positions).toContain('Apple Inc.');
    });

    it('should categorize validation errors correctly', () => {
      const errorMessage = 'Validation failed: required field missing';
      const categorized = categorizeError(errorMessage);

      expect(categorized.type).toBe(ErrorType.VALIDATION);
      expect(categorized.message).toBe(errorMessage);
      expect(categorized.suggestions).toContain('Überprüfen Sie die Eingabedaten auf Vollständigkeit und Format');
    });

    it('should categorize file format errors correctly', () => {
      const errorMessage = 'Unsupported file format';
      const categorized = categorizeError(errorMessage);

      expect(categorized.type).toBe(ErrorType.FILE_FORMAT);
      expect(categorized.suggestions).toContain('Unterstützte Formate: CSV, Excel (.xlsx, .xls), PDF');
    });

    it('should categorize network errors correctly', () => {
      const errorMessage = 'Network error: connection failed';
      const categorized = categorizeError(errorMessage);

      expect(categorized.type).toBe(ErrorType.NETWORK);
      expect(categorized.suggestions).toContain('Überprüfen Sie Ihre Internetverbindung');
    });

    it('should categorize analysis errors correctly', () => {
      const errorMessage = 'Analysis failed: could not process data';
      const categorized = categorizeError(errorMessage);

      expect(categorized.type).toBe(ErrorType.ANALYSIS);
      expect(categorized.suggestions).toContain('Überprüfen Sie die Datenqualität Ihres Portfolios');
    });

    it('should categorize upload errors correctly', () => {
      const errorMessage = 'Upload failed: file too large';
      const categorized = categorizeError(errorMessage);

      expect(categorized.type).toBe(ErrorType.UPLOAD);
      expect(categorized.suggestions).toContain('Stellen Sie sicher, dass die Datei nicht zu groß ist');
    });

    it('should categorize authentication errors correctly', () => {
      const errorMessage = 'Authentication required';
      const categorized = categorizeError(errorMessage);

      expect(categorized.type).toBe(ErrorType.AUTHENTICATION);
      expect(categorized.suggestions).toContain('Please log in to continue');
    });

    it('should handle Error objects', () => {
      const error = new Error('Position "AAPL" missing value');
      const categorized = categorizeError(error);

      expect(categorized.type).toBe(ErrorType.POSITION_VALUE);
      expect(categorized.message).toBe('Position "AAPL" missing value');
    });

    it('should default to unknown error type for unrecognized errors', () => {
      const errorMessage = 'Some random error message';
      const categorized = categorizeError(errorMessage);

      expect(categorized.type).toBe(ErrorType.UNKNOWN);
      expect(categorized.suggestions).toContain('Versuchen Sie es erneut');
    });
  });

  describe('HTTP Status Code Override', () => {
    it('should categorize 400 errors as validation', () => {
      const errorMessage = '400: Bad Request';
      const categorized = categorizeError(errorMessage);

      expect(categorized.type).toBe(ErrorType.VALIDATION);
      expect(categorized.code).toBe('400');
    });

    it('should categorize 422 errors as validation', () => {
      const errorMessage = '422: Unprocessable Entity';
      const categorized = categorizeError(errorMessage);

      expect(categorized.type).toBe(ErrorType.VALIDATION);
      expect(categorized.code).toBe('422');
    });

    it('should categorize 401 errors as authentication', () => {
      const errorMessage = '401: Unauthorized';
      const categorized = categorizeError(errorMessage);

      expect(categorized.type).toBe(ErrorType.AUTHENTICATION);
      expect(categorized.code).toBe('401');
    });

    it('should categorize 403 errors as authentication', () => {
      const errorMessage = '403: Forbidden';
      const categorized = categorizeError(errorMessage);

      expect(categorized.type).toBe(ErrorType.AUTHENTICATION);
      expect(categorized.code).toBe('403');
    });

    it('should categorize 500+ errors as server errors', () => {
      const errorMessage = '500: Internal Server Error';
      const categorized = categorizeError(errorMessage);

      expect(categorized.type).toBe(ErrorType.SERVER);
      expect(categorized.code).toBe('500');
    });

    it('should categorize 503 errors as server errors', () => {
      const errorMessage = '503: Service Unavailable';
      const categorized = categorizeError(errorMessage);

      expect(categorized.type).toBe(ErrorType.SERVER);
      expect(categorized.code).toBe('503');
    });
  });

  describe('Message Cleaning', () => {
    it('should remove status code prefix from message', () => {
      const errorMessage = '400: Validation failed';
      const categorized = categorizeError(errorMessage);

      expect(categorized.message).toBe('Validation failed');
      expect(categorized.code).toBe('400');
    });

    it('should remove "Error:" prefix from message', () => {
      const errorMessage = 'Error: Something went wrong';
      const categorized = categorizeError(errorMessage);

      expect(categorized.message).toBe('Something went wrong');
    });

    it('should trim whitespace from cleaned message', () => {
      const errorMessage = '  400:  Validation failed  ';
      const categorized = categorizeError(errorMessage);

      expect(categorized.message).toBe('Validation failed');
    });
  });

  describe('Details Extraction', () => {
    it('should extract position names from error messages', () => {
      const errorMessage = 'Position "Microsoft Corp" has an issue';
      const categorized = categorizeError(errorMessage);

      expect(categorized.details).toBe('Betroffene Position: Microsoft Corp');
    });

    it('should handle single quotes in position names', () => {
      const errorMessage = "Position 'Apple Inc.' has an issue";
      const categorized = categorizeError(errorMessage);

      expect(categorized.details).toBe('Betroffene Position: Apple Inc.');
    });

    it('should return undefined when no position is mentioned', () => {
      const errorMessage = 'Generic error message';
      const categorized = categorizeError(errorMessage);

      expect(categorized.details).toBeUndefined();
    });
  });

  describe('Affected Data Extraction', () => {
    it('should extract multiple position names', () => {
      const errorMessage = 'Position "Apple Inc." and Position "Microsoft Corp" have issues';
      const categorized = categorizeError(errorMessage);

      expect(categorized.affectedData?.positions).toContain('Apple Inc.');
      expect(categorized.affectedData?.positions).toContain('Microsoft Corp');
      expect(categorized.affectedData?.positions).toHaveLength(2);
    });

    it('should extract field names from error messages', () => {
      const errorMessage = 'Field "name" and field "value" are invalid';
      const categorized = categorizeError(errorMessage);

      expect(categorized.affectedData?.fields).toContain('name');
      expect(categorized.affectedData?.fields).toContain('value');
      expect(categorized.affectedData?.fields).toHaveLength(2);
    });

    it('should return undefined when no affected data is found', () => {
      const errorMessage = 'Generic error';
      const categorized = categorizeError(errorMessage);

      expect(categorized.affectedData).toBeUndefined();
    });
  });

  describe('Suggestion Generation', () => {
    it('should generate specific suggestions for position value errors', () => {
      const errorMessage = 'Position "AAPL" missing value';
      const categorized = categorizeError(errorMessage);

      expect(categorized.suggestions).toContain('Stellen Sie sicher, dass alle Positionen einen gültigen Wert haben');
      expect(categorized.suggestions).toContain('Verwenden Sie das deutsche Zahlenformat (Komma als Dezimaltrennzeichen)');
    });

    it('should include position-specific suggestions when position is missing', () => {
      const errorMessage = 'Position "AAPL" missing value';
      const categorized = categorizeError(errorMessage);

      expect(categorized.suggestions).toContain('Fügen Sie fehlende Werte in der entsprechenden Spalte hinzu');
    });

    it('should generate different suggestions for each error type', () => {
      const validationError = categorizeError('Validation failed');
      const networkError = categorizeError('Network error');
      const formatError = categorizeError('Unsupported file format');

      expect(validationError.suggestions).not.toEqual(networkError.suggestions);
      expect(networkError.suggestions).not.toEqual(formatError.suggestions);
    });

    it('should provide fallback suggestions for unknown errors', () => {
      const errorMessage = 'Unknown error';
      const categorized = categorizeError(errorMessage);

      expect(categorized.suggestions).toContain('Versuchen Sie es erneut');
      expect(categorized.suggestions).toContain('Laden Sie die Seite neu, falls das Problem weiterhin besteht');
    });
  });

  describe('getErrorMetadata Function', () => {
    it('should return correct metadata for position value errors', () => {
      const metadata = getErrorMetadata(ErrorType.POSITION_VALUE);

      expect(metadata.severity).toBe(ErrorSeverity.HIGH);
      expect(metadata.category).toBe('Datenvalidierung');
      expect(metadata.isRecoverable).toBe(true);
      expect(metadata.requiresUserAction).toBe(true);
      expect(metadata.canRetry).toBe(true);
    });

    it('should return correct metadata for validation errors', () => {
      const metadata = getErrorMetadata(ErrorType.VALIDATION);

      expect(metadata.severity).toBe(ErrorSeverity.MEDIUM);
      expect(metadata.category).toBe('Eingabefehler');
      expect(metadata.isRecoverable).toBe(true);
      expect(metadata.requiresUserAction).toBe(true);
      expect(metadata.canRetry).toBe(true);
    });

    it('should return correct metadata for file format errors', () => {
      const metadata = getErrorMetadata(ErrorType.FILE_FORMAT);

      expect(metadata.severity).toBe(ErrorSeverity.MEDIUM);
      expect(metadata.category).toBe('Dateifehler');
      expect(metadata.isRecoverable).toBe(true);
      expect(metadata.requiresUserAction).toBe(true);
      expect(metadata.canRetry).toBe(false);
    });

    it('should return correct metadata for network errors', () => {
      const metadata = getErrorMetadata(ErrorType.NETWORK);

      expect(metadata.severity).toBe(ErrorSeverity.LOW);
      expect(metadata.category).toBe('Verbindung');
      expect(metadata.isRecoverable).toBe(true);
      expect(metadata.requiresUserAction).toBe(false);
      expect(metadata.canRetry).toBe(true);
    });

    it('should return correct metadata for server errors', () => {
      const metadata = getErrorMetadata(ErrorType.SERVER);

      expect(metadata.severity).toBe(ErrorSeverity.HIGH);
      expect(metadata.category).toBe('Server');
      expect(metadata.isRecoverable).toBe(false);
      expect(metadata.requiresUserAction).toBe(false);
      expect(metadata.canRetry).toBe(true);
    });

    it('should return correct metadata for authentication errors', () => {
      const metadata = getErrorMetadata(ErrorType.AUTHENTICATION);

      expect(metadata.severity).toBe(ErrorSeverity.CRITICAL);
      expect(metadata.category).toBe('Authentifizierung');
      expect(metadata.isRecoverable).toBe(true);
      expect(metadata.requiresUserAction).toBe(true);
      expect(metadata.canRetry).toBe(false);
    });

    it('should return correct metadata for unknown errors', () => {
      const metadata = getErrorMetadata(ErrorType.UNKNOWN);

      expect(metadata.severity).toBe(ErrorSeverity.MEDIUM);
      expect(metadata.category).toBe('Allgemein');
      expect(metadata.isRecoverable).toBe(false);
      expect(metadata.requiresUserAction).toBe(false);
      expect(metadata.canRetry).toBe(true);
    });
  });

  describe('formatErrorForUser Function', () => {
    it('should format error with category prefix', () => {
      const error = {
        type: ErrorType.POSITION_VALUE,
        message: 'Position value is missing'
      };

      const formatted = formatErrorForUser(error as any);
      expect(formatted).toBe('[Datenvalidierung] Position value is missing');
    });

    it('should format different error types correctly', () => {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Validation failed'
      };

      const networkError = {
        type: ErrorType.NETWORK,
        message: 'Connection timeout'
      };

      const validationFormatted = formatErrorForUser(validationError as any);
      const networkFormatted = formatErrorForUser(networkError as any);

      expect(validationFormatted).toBe('[Eingabefehler] Validation failed');
      expect(networkFormatted).toBe('[Verbindung] Connection timeout');
    });
  });

  describe('Error Pattern Matching', () => {
    it('should match position value error patterns', () => {
      const patterns = [
        'Position "AAPL" missing valid value',
        'positions must have explicit values',
        'invalid position value for MSFT',
        'missing value for position GOOGL'
      ];

      patterns.forEach(pattern => {
        const categorized = categorizeError(pattern);
        expect(categorized.type).toBe(ErrorType.POSITION_VALUE);
      });
    });

    it('should match validation error patterns', () => {
      const patterns = [
        'validation failed for input',
        'invalid input detected',
        'required field is missing',
        'format error in data'
      ];

      patterns.forEach(pattern => {
        const categorized = categorizeError(pattern);
        expect(categorized.type).toBe(ErrorType.VALIDATION);
      });
    });

    it('should match network error patterns', () => {
      const patterns = [
        'network error occurred',
        'connection failed to server',
        'timeout while fetching data',
        'fetch failed due to network'
      ];

      patterns.forEach(pattern => {
        const categorized = categorizeError(pattern);
        expect(categorized.type).toBe(ErrorType.NETWORK);
      });
    });

    it('should be case insensitive in pattern matching', () => {
      const upperCaseError = 'VALIDATION FAILED';
      const lowerCaseError = 'validation failed';
      const mixedCaseError = 'Validation Failed';

      const upperCategorized = categorizeError(upperCaseError);
      const lowerCategorized = categorizeError(lowerCaseError);
      const mixedCategorized = categorizeError(mixedCaseError);

      expect(upperCategorized.type).toBe(ErrorType.VALIDATION);
      expect(lowerCategorized.type).toBe(ErrorType.VALIDATION);
      expect(mixedCategorized.type).toBe(ErrorType.VALIDATION);
    });
  });
});