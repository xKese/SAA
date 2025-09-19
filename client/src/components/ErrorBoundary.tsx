import { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Bug, ExternalLink } from 'lucide-react';
import { categorizeError, ErrorType, getErrorMetadata } from '@/types/errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  categorizedError?: import('@/types/errors').ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Categorize the error for better user experience
    const categorizedError = categorizeError(error);
    
    this.setState({
      error,
      errorInfo,
      categorizedError
    });

    // Log error to monitoring service (could be expanded)
    if (typeof window !== 'undefined' && window.console) {
      console.group('🚨 Error Boundary');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Categorized:', categorizedError);
      console.groupEnd();
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined, 
      categorizedError: undefined 
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const categorizedError = this.state.categorizedError;
      const metadata = categorizedError ? getErrorMetadata(categorizedError.type) : null;
      
      // Determine if this is a critical error that requires special handling
      const isCritical = categorizedError?.type === ErrorType.AUTHENTICATION || 
                         categorizedError?.type === ErrorType.SERVER ||
                         !metadata?.isRecoverable;

      return (
        <Card className="max-w-3xl mx-auto my-8">
          <CardContent className="p-8">
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <div className="mb-6">
                  {isCritical ? (
                    <AlertTriangle className="h-16 w-16 text-ms-red mx-auto" />
                  ) : (
                    <Bug className="h-16 w-16 text-orange-500 mx-auto" />
                  )}
                </div>
                
                <div className="flex items-center justify-center gap-2 mb-4">
                  {categorizedError && (
                    <Badge 
                      variant="outline" 
                      className="bg-ms-red/10 text-ms-red border-ms-red/20"
                    >
                      {metadata?.category || 'Allgemein'}
                    </Badge>
                  )}
                </div>
                
                <h2 className="text-2xl font-serif font-semibold text-ms-green mb-4">
                  {categorizedError ? this.getErrorTitle(categorizedError.type) : 'Etwas ist schiefgelaufen'}
                </h2>
                
                <p className="text-gray-600 mb-6 leading-relaxed max-w-2xl mx-auto">
                  {categorizedError?.message || 
                   'Es ist ein unerwarteter Fehler aufgetreten. Dies wurde automatisch protokolliert.'}
                </p>
              </div>

              {/* Error Details */}
              {categorizedError?.details && (
                <div className="bg-ms-cream/50 border border-ms-cream rounded-lg p-4">
                  <p className="text-sm text-ms-green">
                    <strong>Details:</strong> {categorizedError.details}
                  </p>
                </div>
              )}

              {/* Suggestions */}
              {categorizedError?.suggestions && categorizedError.suggestions.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-ms-blue mb-2">
                    Lösungsvorschläge:
                  </h3>
                  <ul className="space-y-1">
                    {categorizedError.suggestions.slice(0, 3).map((suggestion, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                        <div className="w-2 h-2 bg-ms-blue rounded-full mt-2 flex-shrink-0" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 justify-center">
                <Button 
                  onClick={this.handleReset}
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={!metadata?.isRecoverable}
                >
                  <RefreshCw className="h-4 w-4" />
                  Erneut versuchen
                </Button>
                
                <Button 
                  onClick={this.handleReload}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Seite neu laden
                </Button>

                {categorizedError?.type === ErrorType.POSITION_VALUE && (
                  <Button 
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => window.open('mailto:support@example.com?subject=Portfolio Analysis Error', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Support kontaktieren
                  </Button>
                )}
              </div>

              {/* Developer Details */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="border-t pt-6">
                  <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700 mb-4">
                    Entwickler-Details anzeigen
                  </summary>
                  <div className="space-y-4">
                    {categorizedError && (
                      <div className="bg-gray-50 rounded-md p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Kategorisierter Fehler:</h4>
                        <pre className="text-xs overflow-auto text-gray-600">
                          {JSON.stringify(categorizedError, null, 2)}
                        </pre>
                      </div>
                    )}
                    <div className="bg-red-50 rounded-md p-4">
                      <h4 className="text-sm font-medium text-red-700 mb-2">Original Fehler:</h4>
                      <pre className="text-xs overflow-auto text-red-600">
                        {this.state.error.toString()}
                        {this.state.errorInfo?.componentStack}
                      </pre>
                    </div>
                  </div>
                </details>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }

  private getErrorTitle(type: ErrorType): string {
    switch (type) {
      case ErrorType.POSITION_VALUE:
        return 'Portfolio-Daten unvollständig';
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
        return 'Upload-Problem';
      case ErrorType.AUTHENTICATION:
        return 'Anmeldung erforderlich';
      default:
        return 'Ein unerwarteter Fehler ist aufgetreten';
    }
  }
}