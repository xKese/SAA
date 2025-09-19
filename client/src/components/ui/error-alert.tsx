import { memo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorInfo, ErrorType, ErrorSeverity, getErrorMetadata } from '@/types/errors';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  XCircle, 
  RefreshCw, 
  X 
} from 'lucide-react';

interface ErrorAlertProps {
  error: ErrorInfo;
  onRetry?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
  className?: string;
}

const ErrorAlert = memo(function ErrorAlert({
  error,
  onRetry,
  onDismiss,
  compact = false,
  className = ''
}: ErrorAlertProps) {
  const metadata = getErrorMetadata(error.type);
  
  // Get appropriate styling based on severity and type
  const getAlertStyling = () => {
    switch (metadata.severity) {
      case ErrorSeverity.CRITICAL:
        return {
          container: 'border-ms-red bg-ms-red/5',
          icon: 'text-ms-red',
          iconComponent: XCircle,
          badge: 'bg-ms-red/10 text-ms-red border-ms-red/20'
        };
      case ErrorSeverity.HIGH:
        return {
          container: 'border-ms-red/60 bg-ms-red/5',
          icon: 'text-ms-red',
          iconComponent: AlertTriangle,
          badge: 'bg-ms-red/10 text-ms-red border-ms-red/20'
        };
      case ErrorSeverity.MEDIUM:
        return {
          container: 'border-orange-300 bg-orange-50',
          icon: 'text-orange-500',
          iconComponent: AlertCircle,
          badge: 'bg-orange-100 text-orange-700 border-orange-200'
        };
      case ErrorSeverity.LOW:
        return {
          container: 'border-blue-300 bg-blue-50',
          icon: 'text-blue-500',
          iconComponent: Info,
          badge: 'bg-blue-100 text-blue-700 border-blue-200'
        };
      default:
        return {
          container: 'border-gray-300 bg-gray-50',
          icon: 'text-gray-500',
          iconComponent: AlertCircle,
          badge: 'bg-gray-100 text-gray-700 border-gray-200'
        };
    }
  };
  
  const styling = getAlertStyling();
  const IconComponent = styling.iconComponent;
  
  // Generate user-friendly titles based on error type
  const getErrorTitle = () => {
    switch (error.type) {
      case ErrorType.POSITION_VALUE:
        return 'Positionswerte fehlerhaft';
      case ErrorType.VALIDATION:
        return 'Eingabedaten ungültig';
      case ErrorType.FILE_FORMAT:
        return 'Dateiformat nicht unterstützt';
      case ErrorType.NETWORK:
        return 'Verbindungsproblem';
      case ErrorType.SERVER:
        return 'Server-Fehler';
      case ErrorType.ANALYSIS:
        return 'Analyse-Fehler';
      case ErrorType.UPLOAD:
        return 'Upload-Fehler';
      case ErrorType.AUTHENTICATION:
        return 'Anmeldung erforderlich';
      default:
        return 'Ein Fehler ist aufgetreten';
    }
  };
  
  if (compact) {
    return (
      <Alert className={`${styling.container} ${className}`}>
        <IconComponent className={`h-4 w-4 ${styling.icon}`} />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex-1">
            <span className="font-medium">{getErrorTitle()}: </span>
            <span className="text-sm">{error.message}</span>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {metadata.canRetry && onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="h-7 px-2"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="h-7 px-2"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Alert className={`${styling.container} ${className}`}>
      <IconComponent className={`h-5 w-5 ${styling.icon}`} />
      <AlertDescription>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={styling.badge}>
                  {metadata.category}
                </Badge>
                {error.code && (
                  <Badge variant="outline" className="text-xs text-gray-500">
                    {error.code}
                  </Badge>
                )}
              </div>
              <h4 className="font-medium text-ms-green">
                {getErrorTitle()}
              </h4>
            </div>
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="h-8 w-8 p-0 -mt-1"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Message */}
          <p className="text-sm text-gray-700 leading-relaxed">
            {error.message}
          </p>
          
          {/* Details */}
          {error.details && (
            <div className="bg-white/50 rounded-md p-3 border border-white/80">
              <p className="text-xs text-gray-600">
                <strong>Details:</strong> {error.details}
              </p>
            </div>
          )}
          
          {/* Quick suggestions for common errors */}
          {error.suggestions && error.suggestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Lösungsvorschlag:</p>
              <p className="text-xs text-gray-600">
                {error.suggestions[0]}
              </p>
            </div>
          )}
          
          {/* Action Buttons */}
          {(metadata.canRetry && onRetry) && (
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={onRetry}
                className="h-8 flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Wiederholen
              </Button>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
});

// Convenience component for toast-style error notifications
interface ErrorToastProps {
  error: ErrorInfo;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorToast = memo(function ErrorToast({
  error,
  onRetry,
  onDismiss
}: ErrorToastProps) {
  const metadata = getErrorMetadata(error.type);
  
  return (
    <div className="bg-white border border-ms-red/20 rounded-lg shadow-lg p-4 max-w-md">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-ms-red flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-ms-red/10 text-ms-red border-ms-red/20 text-xs">
              {metadata.category}
            </Badge>
          </div>
          <p className="text-sm font-medium text-ms-green">
            {error.type === ErrorType.POSITION_VALUE ? 'Positionswerte fehlerhaft' : 'Fehler aufgetreten'}
          </p>
          <p className="text-xs text-gray-600">
            {error.message}
          </p>
          <div className="flex gap-2 pt-1">
            {metadata.canRetry && onRetry && (
              <Button
                size="sm"
                onClick={onRetry}
                className="h-7 text-xs"
              >
                Wiederholen
              </Button>
            )}
            {onDismiss && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDismiss}
                className="h-7 text-xs"
              >
                Schließen
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ErrorAlert;