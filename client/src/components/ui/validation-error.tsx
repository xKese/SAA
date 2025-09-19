import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorInfo, ErrorType, getErrorMetadata } from '@/types/errors';
import { 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  RefreshCw, 
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState } from 'react';

interface ValidationErrorProps {
  error: ErrorInfo;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

const ValidationError = memo(function ValidationError({
  error,
  onRetry,
  onDismiss,
  showDetails = true,
  className = ''
}: ValidationErrorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const metadata = getErrorMetadata(error.type);
  
  // Get appropriate colors based on error type
  const getErrorColors = () => {
    switch (error.type) {
      case ErrorType.POSITION_VALUE:
        return {
          border: 'border-ms-red/20',
          bg: 'bg-ms-red/5',
          icon: 'text-ms-red',
          badge: 'bg-ms-red/10 text-ms-red border-ms-red/20'
        };
      case ErrorType.VALIDATION:
        return {
          border: 'border-orange-200',
          bg: 'bg-orange-50',
          icon: 'text-orange-500',
          badge: 'bg-orange-100 text-orange-700 border-orange-200'
        };
      case ErrorType.FILE_FORMAT:
        return {
          border: 'border-yellow-200',
          bg: 'bg-yellow-50',
          icon: 'text-yellow-600',
          badge: 'bg-yellow-100 text-yellow-700 border-yellow-200'
        };
      default:
        return {
          border: 'border-ms-red/20',
          bg: 'bg-ms-red/5',
          icon: 'text-ms-red',
          badge: 'bg-ms-red/10 text-ms-red border-ms-red/20'
        };
    }
  };
  
  const colors = getErrorColors();
  
  const handleToggleDetails = () => {
    setIsExpanded(!isExpanded);
  };
  
  return (
    <Card className={`${colors.border} ${colors.bg} ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 ${colors.icon}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          
          <div className="flex-1 space-y-4">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={colors.badge}>
                  {metadata.category}
                </Badge>
                {error.code && (
                  <Badge variant="outline" className="text-xs text-gray-500">
                    Code: {error.code}
                  </Badge>
                )}
              </div>
              
              <h3 className="text-lg font-serif font-semibold text-ms-green">
                {error.type === ErrorType.POSITION_VALUE 
                  ? 'Fehlende oder ungültige Positionswerte'
                  : 'Validierungsfehler'}
              </h3>
              
              <p className="text-gray-700 leading-relaxed">
                {error.message}
              </p>
              
              {error.details && (
                <Alert className="border-ms-blue/20 bg-ms-blue/5">
                  <AlertDescription className="text-ms-blue text-sm">
                    {error.details}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            {/* Affected Data */}
            {error.affectedData && (error.affectedData.positions || error.affectedData.fields) && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Betroffene Daten:
                </h4>
                {error.affectedData.positions && (
                  <div className="mb-2">
                    <span className="text-sm text-gray-600">Positionen: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {error.affectedData.positions.slice(0, 3).map((position, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {position}
                        </Badge>
                      ))}
                      {error.affectedData.positions.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{error.affectedData.positions.length - 3} weitere
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                {error.affectedData.fields && (
                  <div>
                    <span className="text-sm text-gray-600">Felder: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {error.affectedData.fields.map((field, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Action Suggestions */}
            {error.suggestions && error.suggestions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-ms-green flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Lösungsvorschläge:
                </h4>
                <div className="space-y-2">
                  {error.suggestions.slice(0, isExpanded ? undefined : 2).map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-2 h-2 bg-ms-blue rounded-full mt-2" />
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {suggestion}
                      </p>
                    </div>
                  ))}
                  {error.suggestions.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleDetails}
                      className="text-ms-blue hover:text-ms-blue/80 h-auto p-0"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          Weniger anzeigen
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          {error.suggestions.length - 2} weitere Vorschläge anzeigen
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            {/* Position Value Specific Help */}
            {error.type === ErrorType.POSITION_VALUE && (
              <Alert className="border-ms-cream bg-ms-cream/50">
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium text-ms-green">
                      Häufige Ursachen für Positionswert-Fehler:
                    </p>
                    <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                      <li>Leere Zellen in der Wert-Spalte</li>
                      <li>Verwendung von Punkt statt Komma als Dezimaltrennzeichen</li>
                      <li>Text oder Sonderzeichen in numerischen Feldern</li>
                      <li>Fehlende Währungsangaben oder ungültige Formate</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              {metadata.canRetry && onRetry && (
                <Button 
                  onClick={onRetry}
                  className="flex items-center gap-2"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4" />
                  Erneut versuchen
                </Button>
              )}
              
              {onDismiss && (
                <Button 
                  onClick={onDismiss}
                  variant="outline"
                >
                  Schließen
                </Button>
              )}
              
              {error.type === ErrorType.POSITION_VALUE && (
                <Button 
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => window.open('https://help.example.com/position-values', '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Hilfe zur Dateibearbeitung
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default ValidationError;