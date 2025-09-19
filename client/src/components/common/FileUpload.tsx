import { useState, useCallback, useMemo, memo } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, createMutationOptions } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Portfolio } from "@shared/schema";
import { Trash2, Upload, Eye, ArrowLeft } from "lucide-react";
import { categorizeError, ErrorType } from "@/types/errors";
import { useUploadErrorHandler } from "@/hooks/use-error-handler";
import ValidationError from "@/components/ui/validation-error";
import ErrorAlert from "@/components/ui/error-alert";
import DataPreviewTable from "@/components/DataPreviewTable";
import ValidationSummary from "@/components/ValidationSummary";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface FileUploadProps {
  onUploadSuccess: (portfolio: Portfolio) => void;
  portfolios: Portfolio[];
  selectedPortfolioId: string | null;
  onSelectPortfolio: (id: string | null) => void;
}

const FileUpload = memo(function FileUpload({ 
  onUploadSuccess, 
  portfolios, 
  selectedPortfolioId, 
  onSelectPortfolio 
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Enhanced error handling for uploads
  const { 
    currentError, 
    handleError, 
    dismissError, 
    retryAction,
    canRetry 
  } = useUploadErrorHandler();

  const previewMutation = useMutation({
    ...createMutationOptions({
      errorType: ErrorType.VALIDATION, // Preview errors are typically validation related
    }),
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiRequest('POST', '/api/portfolios/preview', formData, {
        timeout: 60000 // 1 minute timeout for file processing
      });
      return response.json();
    },
    onSuccess: useCallback((data: any) => {
      setPreviewData(data);
      setShowPreview(true);
      dismissError(); // Clear any previous errors
    }, [dismissError]),
    onError: useCallback((error: any) => {
      // Check if the error is a cancellation error
      const categorizedError = categorizeError(error);
      if (categorizedError.type === ErrorType.CANCELLED || 
          (error as any)?.isCancelled ||
          error?.name === 'CancelledError') {
        console.debug('Preview mutation cancelled - component unmounted');
        return;
      }
      console.error('Preview error:', error);
      handleError(error);
    }, [handleError])
  });

  const uploadMutation = useMutation({
    ...createMutationOptions({
      errorType: ErrorType.UPLOAD,
    }),
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiRequest('POST', '/api/portfolios/upload', formData, {
        timeout: 120000 // 2 minutes timeout for upload and processing
      });
      return response.json();
    },
    onSuccess: useCallback((data: any) => {
      dismissError(); // Clear any previous errors
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios'] });
      onUploadSuccess(data.portfolio);
      toast({
        title: "Upload erfolgreich",
        description: `Portfolio mit ${data.positionCount} Positionen hochgeladen. Analyse wird gestartet...`,
      });
    }, [queryClient, onUploadSuccess, toast, dismissError]),
    onError: useCallback((error: any) => {
      // Check if the error is a cancellation error
      const categorizedError = categorizeError(error);
      if (categorizedError.type === ErrorType.CANCELLED || 
          (error as any)?.isCancelled ||
          error?.name === 'CancelledError') {
        console.debug('Upload mutation cancelled - component unmounted');
        return;
      }
      console.error('Upload error:', error);
      handleError(error);
    }, [handleError]),
  });

  const deleteMutation = useMutation({
    ...createMutationOptions({
      errorType: ErrorType.SERVER,
    }),
    mutationFn: async (portfolioId: string) => {
      try {
        const response = await apiRequest('DELETE', `/api/portfolios/${portfolioId}`, undefined, {
          timeout: 30000 // 30 seconds timeout for delete
        });
        return response.json();
      } catch (error: any) {
        // Legacy fallback: treat 404 errors as successful deletion (for old behavior)
        if (error.status === 404 || error.message?.includes('404')) {
          console.debug('Portfolio already deleted (404 fallback):', portfolioId);
          return { 
            success: true, 
            message: 'Portfolio bereits gelöscht', 
            wasAlreadyDeleted: true 
          };
        }
        throw error;
      }
    },
    onSuccess: useCallback((data: any, portfolioId: string) => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios'] });
      onSelectPortfolio(null);
      
      const isAlreadyDeleted = data?.wasAlreadyDeleted || data?.message?.includes('bereits gelöscht');
      toast({
        title: isAlreadyDeleted ? "Portfolio bereits gelöscht" : "Portfolio gelöscht",
        description: isAlreadyDeleted 
          ? "Das Portfolio war bereits gelöscht und wurde aus der Liste entfernt."
          : "Das Portfolio wurde erfolgreich gelöscht.",
        variant: "default"
      });
      
      // Log for debugging
      console.debug('Portfolio deletion completed:', {
        portfolioId,
        wasAlreadyDeleted: isAlreadyDeleted,
        response: data
      });
    }, [queryClient, onSelectPortfolio, toast]),
    onError: useCallback((error: any) => {
      // Check if the error is a cancellation error
      const categorizedError = categorizeError(error);
      
      // Don't show error toast for cancelled operations
      if (categorizedError.type === ErrorType.CANCELLED || 
          (error as any)?.isCancelled ||
          error?.name === 'CancelledError') {
        console.debug('Delete mutation cancelled - component unmounted');
        return;
      }
      
      console.error('Delete error:', error);
      toast({
        title: "Löschen fehlgeschlagen",
        description: categorizedError.message,
        variant: "destructive",
      });
    }, [toast]),
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      setIsPreviewLoading(true);
      dismissError(); // Clear any previous errors
      previewMutation.mutate(file, {
        onSettled: () => setIsPreviewLoading(false)
      });
    }
  }, [previewMutation, dismissError]);

  const dropzoneConfig = useMemo(() => ({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/pdf': ['.pdf']
    },
    multiple: false
  }), [onDrop]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone(dropzoneConfig);

  const selectedPortfolio = useMemo(() => {
    if (!selectedPortfolioId) return undefined;
    return portfolios.find(p => p.id === selectedPortfolioId);
  }, [portfolios, selectedPortfolioId]);

  const handleSelectPortfolio = useCallback((value: string) => {
    onSelectPortfolio(value || null);
  }, [onSelectPortfolio]);

  const handleClearSelection = useCallback(() => {
    onSelectPortfolio(null);
  }, [onSelectPortfolio]);

  const handleDeletePortfolio = useCallback(() => {
    if (selectedPortfolioId) {
      deleteMutation.mutate(selectedPortfolioId);
    }
  }, [selectedPortfolioId, deleteMutation]);

  const handleRetryUpload = useCallback(() => {
    dismissError();
    setShowPreview(false);
    setPreviewData(null);
    setSelectedFile(null);
  }, [dismissError]);

  const handleBackToUpload = useCallback(() => {
    setShowPreview(false);
    setPreviewData(null);
    setSelectedFile(null);
    dismissError();
  }, [dismissError]);

  const handleProceedWithAnalysis = useCallback(() => {
    if (selectedFile && previewData?.canProceed) {
      setIsUploading(true);
      uploadMutation.mutate(selectedFile, {
        onSettled: () => {
          setIsUploading(false);
          setShowPreview(false);
          setPreviewData(null);
          setSelectedFile(null);
        }
      });
    }
  }, [selectedFile, previewData, uploadMutation]);

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-serif font-semibold text-ms-green mb-2" data-testid="upload-title">
            {showPreview ? "Dateivorschau" : "Portfolio-Datei Upload"}
          </h2>
          <p className="text-gray-600">
            {showPreview 
              ? "Überprüfen Sie Ihre Daten vor der Analyse" 
              : "Laden Sie Ihre Portfolio-Datei mit ISINs, Namen und Werten hoch (CSV/Excel/PDF)"
            }
          </p>
        </div>

        {/* Error Display */}
        {currentError && (
          <div className="mb-6">
            {currentError.type === ErrorType.POSITION_VALUE || currentError.type === ErrorType.VALIDATION ? (
              <ValidationError
                error={currentError}
                onRetry={canRetry ? retryAction : handleRetryUpload}
                onDismiss={dismissError}
                data-testid="validation-error"
              />
            ) : (
              <ErrorAlert
                error={currentError}
                onRetry={canRetry ? retryAction : handleRetryUpload}
                onDismiss={dismissError}
                showRetry={canRetry}
                data-testid="upload-error"
              />
            )}
          </div>
        )}

        {/* Data Preview Section */}
        {showPreview && previewData && (
          <div className="space-y-6 mb-6">
            {/* Back Button */}
            <Button 
              variant="outline" 
              onClick={handleBackToUpload}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zur Datei-Auswahl
            </Button>

            {/* Validation Summary */}
            <ValidationSummary
              validationErrors={previewData.validationErrors}
              warnings={previewData.warnings}
              canProceed={previewData.canProceed}
              fileType={previewData.fileType}
              totalPositions={previewData.totalPositions}
              validPositions={previewData.validPositions}
            />

            {/* Data Preview Table */}
            <DataPreviewTable previewData={previewData} />

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end">
              <Button 
                variant="outline" 
                onClick={handleBackToUpload}
                disabled={isUploading}
              >
                Andere Datei wählen
              </Button>
              <Button 
                onClick={handleProceedWithAnalysis}
                disabled={!previewData.canProceed || isUploading}
                className="bg-ms-green hover:bg-ms-green/90"
              >
                {isUploading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Analyse läuft...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Analyse starten
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Existing Portfolios Selection */}
        {!showPreview && portfolios.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vorhandene Portfolios
            </label>
            <div className="flex gap-2">
              <Select value={selectedPortfolioId || ""} onValueChange={handleSelectPortfolio}>
                <SelectTrigger className="flex-1" data-testid="portfolio-select">
                  <SelectValue placeholder="Portfolio auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {portfolios.map((portfolio) => (
                    <SelectItem key={portfolio.id} value={portfolio.id}>
                      {portfolio.name} - {portfolio.analysisStatus === 'completed' ? 'Fertig' : 
                       portfolio.analysisStatus === 'analyzing' ? `${portfolio.analysisProgress}%` : 
                       'Wartend'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                onClick={handleClearSelection}
                data-testid="clear-selection"
              >
                Neue Analyse
              </Button>
              {selectedPortfolioId && selectedPortfolio && selectedPortfolio.analysisStatus !== 'analyzing' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      data-testid="delete-portfolio"
                      disabled={deleteMutation.isPending || !selectedPortfolioId}
                      title={deleteMutation.isPending ? "Löschen läuft..." : "Portfolio löschen"}
                    >
                      {deleteMutation.isPending ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Portfolio löschen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Diese Aktion kann nicht rückgängig gemacht werden. {
                          selectedPortfolio?.analysisStatus === 'pending' ? 
                            'Dieses wartende Portfolio und alle zugehörigen Daten werden dauerhaft gelöscht.' :
                          selectedPortfolio?.analysisStatus === 'failed' ? 
                            'Dieses fehlgeschlagene Portfolio und alle zugehörigen Daten werden dauerhaft gelöscht.' :
                            'Das Portfolio und alle zugehörigen Daten werden dauerhaft gelöscht.'
                        }
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeletePortfolio}
                        disabled={deleteMutation.isPending}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleteMutation.isPending ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Wird gelöscht...
                          </>
                        ) : (
                          'Löschen'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        )}
        
        {/* File Upload Dropzone */}
        {!showPreview && (
          <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragActive
              ? 'border-ms-blue bg-ms-blue/5'
              : 'border-ms-blue/30 hover:border-ms-blue/50'
          } ${isUploading || isPreviewLoading ? 'pointer-events-none opacity-50' : ''}`}
          data-testid="upload-dropzone"
        >
          <input {...getInputProps()} data-testid="file-input" />
          <div className="mb-4">
            <i className="fas fa-cloud-upload-alt text-4xl text-ms-blue/60"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isDragActive ? 'Datei hier ablegen...' : 'Portfolio-Datei hier ablegen'}
          </h3>
          <p className="text-gray-500 mb-4">
            oder klicken Sie hier um eine Datei auszuwählen
          </p>
          <div className="flex justify-center space-x-2 text-sm text-gray-400">
            <span className="bg-gray-100 px-2 py-1 rounded">.csv</span>
            <span className="bg-gray-100 px-2 py-1 rounded">.xlsx</span>
            <span className="bg-gray-100 px-2 py-1 rounded">.xls</span>
            <span className="bg-gray-100 px-2 py-1 rounded">.pdf</span>
          </div>
        </div>
        )}

        {/* Preview Loading Status */}
        {isPreviewLoading && (
          <div className="mt-6" data-testid="preview-loading">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <i className="fas fa-spinner fa-spin text-ms-blue mr-2"></i>
                <span className="text-sm font-medium text-ms-blue">
                  Datei wird analysiert und validiert...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Progress */}
        {selectedPortfolio && selectedPortfolio.analysisStatus === 'analyzing' && (
          <div className="mt-6" data-testid="analysis-progress">
            <div className="bg-ms-yellow/20 border border-ms-yellow rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-ms-green">Analyse läuft...</span>
                <span className="text-sm text-ms-blue">{selectedPortfolio.currentPhase}</span>
              </div>
              <Progress value={selectedPortfolio.analysisProgress || 0} className="mb-2" />
              <div className="text-xs text-gray-600">
                <i className="fas fa-robot mr-1"></i>
                Claude AI analysiert Ihre Portfolio-Daten...
              </div>
            </div>
          </div>
        )}

        {/* Upload Status */}
        {isUploading && (
          <div className="mt-6" data-testid="upload-status">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <i className="fas fa-spinner fa-spin text-ms-blue mr-2"></i>
                <span className="text-sm font-medium text-ms-blue">
                  Datei wird hochgeladen und verarbeitet...
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default FileUpload;
