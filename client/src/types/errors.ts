// Error types and categorization for the portfolio analysis application
//
// Usage Examples:
//
// 1. Basic error categorization:
//    const error = new Error("Position 'AAPL' is missing a valid value");
//    const categorized = categorizeError(error);
//    // categorized.type will be ErrorType.POSITION_VALUE
//    // categorized.suggestions will contain actionable advice
//
// 2. Using with ValidationError component:
//    <ValidationError 
//      error={categorizedError} 
//      onRetry={() => retryUpload()} 
//      onDismiss={() => setError(null)} 
//    />
//
// 3. Using with ErrorAlert component:
//    <ErrorAlert 
//      error={categorizedError} 
//      compact={true}
//      onRetry={() => refetch()} 
//    />
//
// 4. Using with the error handler hook:
//    const { currentError, handleError, dismissError } = useErrorHandler({
//      onRetry: () => mutate()
//    });
//    // In error callback: handleError(error);
//

export interface ErrorInfo {
  type: ErrorType;
  code?: string;
  message: string;
  details?: string;
  suggestions?: string[];
  affectedData?: {
    positions?: string[];
    fields?: string[];
  };
}

export enum ErrorType {
  VALIDATION = 'validation',
  POSITION_VALUE = 'position_value',
  FILE_FORMAT = 'file_format',
  NETWORK = 'network',
  SERVER = 'server',
  ANALYSIS = 'analysis',
  UPLOAD = 'upload',
  AUTHENTICATION = 'authentication',
  CANCELLED = 'cancelled',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorMetadata {
  severity: ErrorSeverity;
  category: string;
  isRecoverable: boolean;
  requiresUserAction: boolean;
  canRetry: boolean;
}

// Error patterns for categorization
const ERROR_PATTERNS = {
  [ErrorType.POSITION_VALUE]: [
    /Position.*missing.*valid value/i,
    /positions must have explicit values/i,
    /invalid position value/i,
    /missing value for position/i
  ],
  [ErrorType.VALIDATION]: [
    /validation failed/i,
    /invalid input/i,
    /required field/i,
    /format error/i
  ],
  [ErrorType.FILE_FORMAT]: [
    /unsupported file format/i,
    /invalid file type/i,
    /could not parse file/i,
    /file format not supported/i
  ],
  [ErrorType.NETWORK]: [
    /network error/i,
    /connection failed/i,
    /timeout/i,
    /fetch failed/i
  ],
  [ErrorType.ANALYSIS]: [
    /analysis failed/i,
    /could not analyze/i,
    /analysis error/i
  ],
  [ErrorType.UPLOAD]: [
    /upload failed/i,
    /could not upload/i,
    /file upload error/i
  ],
  [ErrorType.AUTHENTICATION]: [
    /unauthorized/i,
    /authentication/i,
    /login required/i
  ],
  [ErrorType.CANCELLED]: [
    /cancelled/i,
    /aborted/i,
    /request.*cancelled/i,
    /query.*cancelled/i
  ]
};

/**
 * Categorizes an error based on its message and properties
 */
export function categorizeError(error: Error | string): ErrorInfo {
  const message = typeof error === 'string' ? error : error.message;
  const statusMatch = message.match(/^(\d{3}):/);
  const statusCode = statusMatch ? parseInt(statusMatch[1]) : null;
  
  // Handle specific error types first
  if (typeof error === 'object' && error.name) {
    if (error.name === 'AbortError' || error.name === 'CancelledError' || error.name === 'ComponentAbortError') {
      return {
        type: ErrorType.CANCELLED,
        message: 'Anfrage wurde abgebrochen',
        originalMessage: message,
        details: 'Die Anfrage wurde durch Navigationswechsel oder Komponentenabbau abgebrochen',
        affectedData: undefined,
        suggestions: [] // No suggestions for cancelled operations
      };
    }
  }
  
  // Also check for isCancelled flag
  if (typeof error === 'object' && (error as any).isCancelled) {
    return {
      type: ErrorType.CANCELLED,
      message: 'Anfrage wurde abgebrochen',
      originalMessage: message,
      details: 'Die Anfrage wurde durch Navigationswechsel oder Komponentenabbau abgebrochen',
      affectedData: undefined,
      suggestions: [] // No suggestions for cancelled operations
    };
  }
  
  // Also check for cancellation patterns in the message
  if (message && (
    message.includes('Query cancelled') ||
    message.includes('component unmount') ||
    message.includes('Request aborted')
  )) {
    return {
      type: ErrorType.CANCELLED,
      message: 'Anfrage wurde abgebrochen',
      originalMessage: message,
      details: 'Die Anfrage wurde durch Navigationswechsel oder Komponentenabbau abgebrochen',
      affectedData: undefined,
      suggestions: [] // No suggestions for cancelled operations
    };
  }
  
  // Continue with other error type checks
  if (typeof error === 'object' && error.name) {
    if (error.name === 'TimeoutError') {
      return {
        type: ErrorType.NETWORK,
        message: cleanErrorMessage(message),
        originalMessage: message,
        details: 'Anfrage hat das Zeitlimit überschritten',
        affectedData: undefined,
        suggestions: generateErrorSuggestions(ErrorType.NETWORK, message)
      };
    }
  }
  
  // Determine error type based on patterns
  let type = ErrorType.UNKNOWN;
  for (const [errorType, patterns] of Object.entries(ERROR_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(message))) {
      type = errorType as ErrorType;
      break;
    }
  }
  
  // Override type based on HTTP status codes
  if (statusCode) {
    if (statusCode === 400 || statusCode === 422) {
      type = ErrorType.VALIDATION;
    } else if (statusCode === 401 || statusCode === 403) {
      type = ErrorType.AUTHENTICATION;
    } else if (statusCode >= 500) {
      type = ErrorType.SERVER;
    }
  }
  
  return {
    type,
    code: statusCode?.toString(),
    message: cleanErrorMessage(message),
    details: extractErrorDetails(message),
    suggestions: generateSuggestions(type, message),
    affectedData: extractAffectedData(message)
  };
}

/**
 * Cleans error message by removing status codes and redundant text
 */
function cleanErrorMessage(message: string): string {
  return message
    .replace(/^\d{3}:\s*/, '') // Remove status code prefix
    .replace(/Error:\s*/, '') // Remove "Error:" prefix
    .trim();
}

/**
 * Extracts additional details from error message
 */
function extractErrorDetails(message: string): string | undefined {
  // Extract position names from validation errors
  const positionMatch = message.match(/Position\s+['"]([^'"]+)['"]/i);
  if (positionMatch) {
    return `Betroffene Position: ${positionMatch[1]}`;
  }
  
  return undefined;
}

/**
 * Extracts affected data from error message
 */
function extractAffectedData(message: string): { positions?: string[]; fields?: string[] } | undefined {
  const affected: { positions?: string[]; fields?: string[] } = {};
  
  // Extract position names
  const positionMatches = message.matchAll(/Position\s+['"]([^'"]+)['"]/gi);
  const positions = Array.from(positionMatches).map(match => match[1]);
  if (positions.length > 0) {
    affected.positions = positions;
  }
  
  // Extract field names
  const fieldMatches = message.matchAll(/field\s+['"]([^'"]+)['"]/gi);
  const fields = Array.from(fieldMatches).map(match => match[1]);
  if (fields.length > 0) {
    affected.fields = fields;
  }
  
  return Object.keys(affected).length > 0 ? affected : undefined;
}

/**
 * Generates actionable suggestions based on error type and message
 */
function generateSuggestions(type: ErrorType, message: string): string[] {
  const suggestions: string[] = [];
  
  switch (type) {
    case ErrorType.POSITION_VALUE:
      suggestions.push("Stellen Sie sicher, dass alle Positionen einen gültigen Wert haben");
      suggestions.push("Überprüfen Sie Ihre Datei auf fehlende oder ungültige Werte");
      suggestions.push("Verwenden Sie das deutsche Zahlenformat (Komma als Dezimaltrennzeichen)");
      if (message.includes("missing")) {
        suggestions.push("Fügen Sie fehlende Werte in der entsprechenden Spalte hinzu");
      }
      break;
      
    case ErrorType.VALIDATION:
      suggestions.push("Überprüfen Sie die Eingabedaten auf Vollständigkeit und Format");
      suggestions.push("Stellen Sie sicher, dass alle Pflichtfelder ausgefüllt sind");
      break;
      
    case ErrorType.FILE_FORMAT:
      suggestions.push("Unterstützte Formate: CSV, Excel (.xlsx, .xls), PDF");
      suggestions.push("Stellen Sie sicher, dass Ihre Datei das richtige Format hat");
      suggestions.push("Überprüfen Sie, ob die Datei nicht beschädigt ist");
      break;
      
    case ErrorType.NETWORK:
      suggestions.push("Überprüfen Sie Ihre Internetverbindung");
      suggestions.push("Versuchen Sie es nach kurzer Zeit erneut");
      break;
      
    case ErrorType.UPLOAD:
      suggestions.push("Stellen Sie sicher, dass die Datei nicht zu groß ist");
      suggestions.push("Versuchen Sie eine andere Datei oder versuchen Sie es erneut");
      break;
      
    case ErrorType.ANALYSIS:
      suggestions.push("Überprüfen Sie die Datenqualität Ihres Portfolios");
      suggestions.push("Versuchen Sie es mit einer anderen Portfolio-Datei");
      break;
      
    case ErrorType.CANCELLED:
      // Don't show suggestions for cancelled operations - they're usually intentional
      break;
      
    default:
      suggestions.push("Versuchen Sie es erneut");
      suggestions.push("Laden Sie die Seite neu, falls das Problem weiterhin besteht");
  }
  
  return suggestions;
}

/**
 * Gets error metadata for UI presentation
 */
export function getErrorMetadata(type: ErrorType): ErrorMetadata {
  const metadata: Record<ErrorType, ErrorMetadata> = {
    [ErrorType.POSITION_VALUE]: {
      severity: ErrorSeverity.HIGH,
      category: 'Datenvalidierung',
      isRecoverable: true,
      requiresUserAction: true,
      canRetry: true
    },
    [ErrorType.VALIDATION]: {
      severity: ErrorSeverity.MEDIUM,
      category: 'Eingabefehler',
      isRecoverable: true,
      requiresUserAction: true,
      canRetry: true
    },
    [ErrorType.FILE_FORMAT]: {
      severity: ErrorSeverity.MEDIUM,
      category: 'Dateifehler',
      isRecoverable: true,
      requiresUserAction: true,
      canRetry: false
    },
    [ErrorType.NETWORK]: {
      severity: ErrorSeverity.LOW,
      category: 'Verbindung',
      isRecoverable: true,
      requiresUserAction: false,
      canRetry: true
    },
    [ErrorType.SERVER]: {
      severity: ErrorSeverity.HIGH,
      category: 'Server',
      isRecoverable: false,
      requiresUserAction: false,
      canRetry: true
    },
    [ErrorType.ANALYSIS]: {
      severity: ErrorSeverity.MEDIUM,
      category: 'Analyse',
      isRecoverable: true,
      requiresUserAction: true,
      canRetry: true
    },
    [ErrorType.UPLOAD]: {
      severity: ErrorSeverity.MEDIUM,
      category: 'Upload',
      isRecoverable: true,
      requiresUserAction: true,
      canRetry: true
    },
    [ErrorType.AUTHENTICATION]: {
      severity: ErrorSeverity.CRITICAL,
      category: 'Authentifizierung',
      isRecoverable: true,
      requiresUserAction: true,
      canRetry: false
    },
    [ErrorType.CANCELLED]: {
      severity: ErrorSeverity.LOW,
      category: 'Abbruch',
      isRecoverable: true,
      requiresUserAction: false,
      canRetry: true
    },
    [ErrorType.UNKNOWN]: {
      severity: ErrorSeverity.MEDIUM,
      category: 'Allgemein',
      isRecoverable: false,
      requiresUserAction: false,
      canRetry: true
    }
  };
  
  return metadata[type];
}

/**
 * Formats error message for user display
 */
export function formatErrorForUser(error: ErrorInfo): string {
  const metadata = getErrorMetadata(error.type);
  return `[${metadata.category}] ${error.message}`;
}