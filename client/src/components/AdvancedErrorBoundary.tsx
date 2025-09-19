import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  Bug, 
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  phase?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

class AdvancedErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Advanced Error Boundary caught an error:', error, errorInfo);
    }

    // In production, you would typically send this to an error reporting service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        showDetails: false
      });
    }
  };

  handleReset = () => {
    this.retryCount = 0;
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });
  };

  handleCopyError = () => {
    const errorDetails = {
      error: this.state.error?.toString(),
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      phase: this.props.phase,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2)).then(() => {
      // Could show a toast notification here
      console.log('Error details copied to clipboard');
    });
  };

  getErrorType = (error: Error | null) => {
    if (!error) return 'unknown';
    
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    } else if (message.includes('unauthorized') || message.includes('403')) {
      return 'auth';
    } else if (message.includes('not found') || message.includes('404')) {
      return 'notfound';
    } else if (message.includes('rate') || message.includes('429')) {
      return 'ratelimit';
    } else if (stack.includes('claude') || message.includes('claude')) {
      return 'claude';
    } else if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    } else if (stack.includes('chunk') || message.includes('loading')) {
      return 'loading';
    }
    
    return 'runtime';
  };

  getErrorMessage = (errorType: string) => {
    switch (errorType) {
      case 'network':
        return {
          title: 'Netzwerkfehler',
          description: 'Die Verbindung zum Server konnte nicht hergestellt werden. Prüfen Sie Ihre Internetverbindung.',
          tips: ['Internetverbindung prüfen', 'Seite neu laden', 'VPN deaktivieren']
        };
      case 'auth':
        return {
          title: 'Authentifizierungsfehler',
          description: 'Sie haben keine Berechtigung für diese Aktion. Melden Sie sich erneut an.',
          tips: ['Erneut anmelden', 'Berechtigungen prüfen', 'Cache leeren']
        };
      case 'notfound':
        return {
          title: 'Ressource nicht gefunden',
          description: 'Die angeforderten Daten konnten nicht gefunden werden.',
          tips: ['Portfolio neu auswählen', 'Daten aktualisieren', 'Cache leeren']
        };
      case 'ratelimit':
        return {
          title: 'Anfragen-Limit erreicht',
          description: 'Sie haben zu viele Anfragen gestellt. Bitte warten Sie einen Moment.',
          tips: ['15 Minuten warten', 'Weniger parallele Analysen', 'Cache nutzen']
        };
      case 'claude':
        return {
          title: 'Claude AI Service-Fehler',
          description: 'Der KI-Analyse-Service ist vorübergehend nicht verfügbar.',
          tips: ['Später erneut versuchen', 'Einfachere Analyse wählen', 'Service-Status prüfen']
        };
      case 'validation':
        return {
          title: 'Validierungsfehler',
          description: 'Die eingegebenen Daten entsprechen nicht den Anforderungen.',
          tips: ['Eingaben überprüfen', 'Portfolio-Format prüfen', 'Hilfe konsultieren']
        };
      case 'loading':
        return {
          title: 'Ladefehler',
          description: 'Ein Modul konnte nicht geladen werden. Dies kann an einer langsamen Verbindung liegen.',
          tips: ['Seite neu laden', 'Cache leeren', 'Anderer Browser']
        };
      default:
        return {
          title: 'Unerwarteter Fehler',
          description: 'Ein unerwarteter Fehler ist aufgetreten. Das Team wurde benachrichtigt.',
          tips: ['Seite neu laden', 'Anderer Browser', 'Support kontaktieren']
        };
    }
  };

  render() {
    if (this.state.hasError) {
      const errorType = this.getErrorType(this.state.error);
      const errorMessage = this.getErrorMessage(errorType);
      const canRetry = this.retryCount < this.maxRetries;

      // If custom fallback provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              {errorMessage.title}
              {this.props.phase && (
                <Badge variant="destructive" className="ml-2">
                  {this.props.phase}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-300 bg-red-100">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="font-medium mb-2">{errorMessage.description}</div>
                <div className="text-sm">
                  <strong>Lösungsvorschläge:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {errorMessage.tips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            {/* Error Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {canRetry && (
                <Button 
                  onClick={this.handleRetry} 
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Erneut versuchen ({this.maxRetries - this.retryCount} verbleibend)
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={this.handleReset}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Zurücksetzen
              </Button>

              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Seite neu laden
              </Button>

              <Button 
                variant="ghost" 
                onClick={this.handleCopyError}
                size="sm"
              >
                <Copy className="h-4 w-4 mr-2" />
                Fehlerdaten kopieren
              </Button>
            </div>

            {/* Technical Details (Collapsible) */}
            <div className="border-t pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="text-gray-600 hover:text-gray-800"
              >
                <Bug className="h-4 w-4 mr-2" />
                Technische Details
                {this.state.showDetails ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>

              {this.state.showDetails && (
                <div className="mt-3 space-y-3">
                  {this.state.error && (
                    <div className="p-3 bg-gray-100 rounded text-sm font-mono">
                      <div className="font-semibold text-red-800 mb-2">Fehlermeldung:</div>
                      <div className="text-red-700">{this.state.error.toString()}</div>
                    </div>
                  )}

                  {this.state.error?.stack && (
                    <div className="p-3 bg-gray-100 rounded text-xs font-mono max-h-32 overflow-y-auto">
                      <div className="font-semibold text-gray-800 mb-2">Stack Trace:</div>
                      <pre className="text-gray-700 whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}

                  {this.state.errorInfo?.componentStack && (
                    <div className="p-3 bg-gray-100 rounded text-xs font-mono max-h-32 overflow-y-auto">
                      <div className="font-semibold text-gray-800 mb-2">Component Stack:</div>
                      <pre className="text-gray-700 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    Fehler-ID: {Date.now().toString(36)}-{Math.random().toString(36).substr(2, 5)}
                    <br />
                    Zeitstempel: {new Date().toISOString()}
                    <br />
                    Phase: {this.props.phase || 'Unbekannt'}
                    <br />
                    Wiederholungsversuche: {this.retryCount}/{this.maxRetries}
                  </div>
                </div>
              )}
            </div>

            {/* German Banking Context */}
            {(errorType === 'claude' || errorType === 'ratelimit') && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <div className="font-medium mb-1">Hinweis für deutsche Banken:</div>
                  <div className="text-sm">
                    Bei anhaltenden Problemen mit der KI-Analyse können Sie auf die 
                    traditionellen Risiko- und Compliance-Tools zurückgreifen. 
                    Alle BaFin-konformen Berichte bleiben verfügbar.
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default AdvancedErrorBoundary;