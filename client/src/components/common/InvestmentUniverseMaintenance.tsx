import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Database, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Settings,
  FileText,
  AlertCircle,
  BarChart3,
  Download
} from "lucide-react";
import { InvestmentUniverseMaintenanceResult, MaintenanceStatusResponse } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface InvestmentUniverseMaintenanceProps {
  portfolioId: string;
  isVisible?: boolean;
}

const InvestmentUniverseMaintenance: React.FC<InvestmentUniverseMaintenanceProps> = ({ 
  portfolioId, 
  isVisible = true 
}) => {
  const [activeTab, setActiveTab] = useState("status");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for maintenance status
  const { 
    data: maintenanceData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<MaintenanceStatusResponse>({
    queryKey: [`/api/portfolios/${portfolioId}/maintenance-status`],
    enabled: isVisible && !!portfolioId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false;
      return failureCount < 2;
    }
  });

  // Mutation for triggering maintenance
  const triggerMaintenanceMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/system/orchestrate-maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleType: 'daily' })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Wartung gestartet",
        description: "Investment Universe Wartung läuft im Hintergrund.",
      });
      // Refetch maintenance status
      queryClient.invalidateQueries({ 
        queryKey: [`/api/portfolios/${portfolioId}/maintenance-status`] 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler bei Wartung",
        description: error?.message || "Die Wartung konnte nicht gestartet werden.",
        variant: "destructive"
      });
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return "text-green-600 bg-green-100";
      case 'completed_with_warnings':
        return "text-yellow-600 bg-yellow-100";
      case 'failed':
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'completed_with_warnings':
        return <AlertTriangle className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'success':
        return "Erfolgreich";
      case 'completed_with_warnings':
        return "Mit Warnungen";
      case 'failed':
        return "Fehlgeschlagen";
      default:
        return "Unbekannt";
    }
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  if (!isVisible) return null;

  if (isLoading || triggerMaintenanceMutation.isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-ms-blue" />
            Investment Universe Wartung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-3">
              <RefreshCw className="h-6 w-6 animate-spin text-ms-blue" />
              <span>
                {triggerMaintenanceMutation.isPending 
                  ? "Wartung wird gestartet..." 
                  : "Wartungsstatus wird geladen..."
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-ms-blue" />
            Investment Universe Wartung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Wartungsstatus konnte nicht geladen werden. 
              <Button 
                variant="link" 
                className="p-0 ml-2 h-auto text-red-800"
                onClick={() => refetch()}
              >
                Erneut versuchen
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!maintenanceData?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-ms-blue" />
            Investment Universe Wartung
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="mb-4">
            <Database className="h-12 w-12 text-gray-300 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            Wartungsstatus nicht verfügbar
          </h3>
          <p className="text-gray-500 mb-4">
            Starten Sie eine Wartung des Investment Universe für aktuelle Datenqualität und Systemleistung.
          </p>
          <Button 
            onClick={() => triggerMaintenanceMutation.mutate()}
            disabled={triggerMaintenanceMutation.isPending}
            className="bg-ms-blue hover:bg-ms-blue/90"
          >
            {triggerMaintenanceMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Settings className="h-4 w-4 mr-2" />
            )}
            Wartung starten
          </Button>
        </CardContent>
      </Card>
    );
  }

  const maintenance = maintenanceData.data;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-ms-blue" />
            Investment Universe Wartung
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              className={`${getStatusColor(maintenance.overallStatus)} px-2 py-1`}
            >
              {getStatusIcon(maintenance.overallStatus)}
              <span className="ml-1">{getStatusLabel(maintenance.overallStatus)}</span>
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => triggerMaintenanceMutation.mutate()}
              disabled={triggerMaintenanceMutation.isPending}
            >
              {triggerMaintenanceMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Maintenance Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-ms-green">
              {maintenance.performanceMetrics.totalInstruments.toLocaleString('de-DE')}
            </div>
            <div className="text-sm text-gray-600">Instrumente</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getQualityScoreColor(maintenance.performanceMetrics.qualityScore)}`}>
              {maintenance.performanceMetrics.qualityScore}%
            </div>
            <div className="text-sm text-gray-600">Datenqualität</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {maintenance.performanceMetrics.dataFreshness}
            </div>
            <div className="text-sm text-gray-600">Aktualität (Tage)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {maintenance.taskResults.length}
            </div>
            <div className="text-sm text-gray-600">Wartungsaufgaben</div>
          </div>
        </div>

        {/* Quality Score Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Datenqualität</span>
            <span className="text-sm text-gray-600">{maintenance.performanceMetrics.qualityScore}%</span>
          </div>
          <Progress 
            value={maintenance.performanceMetrics.qualityScore} 
            className="h-2"
          />
        </div>

        {/* Next Maintenance Alert */}
        <Alert className="border-blue-200 bg-blue-50 mb-6">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">Nächste geplante Wartung:</span>
                <div className="text-sm">
                  {formatDate(maintenance.nextMaintenanceScheduled)}
                </div>
              </div>
              <div className="text-sm">
                <div>Letzte Aktualisierung:</div>
                <div className="font-mono">
                  {formatDate(maintenance.performanceMetrics.lastUpdated)}
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Maintenance Details Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="tasks">Aufgaben</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="summary">Zusammenfassung</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    System-Metriken
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Instrumente insgesamt</span>
                      <span className="font-medium">
                        {maintenance.performanceMetrics.totalInstruments.toLocaleString('de-DE')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Qualitätsscore</span>
                      <div className="flex items-center gap-2">
                        <Progress value={maintenance.performanceMetrics.qualityScore} className="w-16 h-2" />
                        <span className="font-medium">{maintenance.performanceMetrics.qualityScore}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Datenfrische</span>
                      <span className="font-medium">
                        {maintenance.performanceMetrics.dataFreshness} Tage
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Letzte Aktualisierung</span>
                      <span className="font-medium text-sm">
                        {formatDate(maintenance.performanceMetrics.lastUpdated)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Wartungsstatus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status</span>
                      <Badge className={getStatusColor(maintenance.overallStatus)}>
                        {getStatusIcon(maintenance.overallStatus)}
                        <span className="ml-1">{getStatusLabel(maintenance.overallStatus)}</span>
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Wartungs-ID</span>
                      <span className="font-mono text-sm">{maintenance.maintenanceId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Zeitstempel</span>
                      <span className="font-medium text-sm">{formatDate(maintenance.timestamp)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Nächste Wartung</span>
                      <span className="font-medium text-sm">
                        {formatDate(maintenance.nextMaintenanceScheduled)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Wartungsaufgaben</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aufgabe</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Startzeit</TableHead>
                      <TableHead>Endzeit</TableHead>
                      <TableHead className="text-center">Empfehlungen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenance.taskResults.map((task, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{task.taskName}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(task.status)}>
                            {getStatusIcon(task.status)}
                            <span className="ml-1">{getStatusLabel(task.status)}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(task.startTime)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(task.endTime)}
                        </TableCell>
                        <TableCell className="text-center">
                          {task.recommendations.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {task.recommendations.length}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance-Übersicht</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-ms-blue mb-2">
                      {maintenance.performanceMetrics.totalInstruments.toLocaleString('de-DE')}
                    </div>
                    <div className="text-sm text-gray-600">Instrumente im Universe</div>
                    <div className="mt-2">
                      <Progress value={85} className="h-2" />
                      <div className="text-xs text-gray-500 mt-1">Abdeckung: 85%</div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className={`text-3xl font-bold mb-2 ${getQualityScoreColor(maintenance.performanceMetrics.qualityScore)}`}>
                      {maintenance.performanceMetrics.qualityScore}%
                    </div>
                    <div className="text-sm text-gray-600">Datenqualität</div>
                    <div className="mt-2">
                      <Progress value={maintenance.performanceMetrics.qualityScore} className="h-2" />
                      <div className="text-xs text-gray-500 mt-1">
                        Ziel: ≥90%
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {maintenance.performanceMetrics.dataFreshness}
                    </div>
                    <div className="text-sm text-gray-600">Tage seit Update</div>
                    <div className="mt-2">
                      <Progress 
                        value={Math.max(0, 100 - (maintenance.performanceMetrics.dataFreshness * 10))} 
                        className="h-2" 
                      />
                      <div className="text-xs text-gray-500 mt-1">Ziel: ≤1 Tag</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Wartungszusammenfassung
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert className={
                    maintenance.overallStatus === 'success' 
                      ? "border-green-200 bg-green-50"
                      : maintenance.overallStatus === 'completed_with_warnings'
                      ? "border-yellow-200 bg-yellow-50"
                      : "border-red-200 bg-red-50"
                  }>
                    <div className="flex items-start gap-2">
                      {getStatusIcon(maintenance.overallStatus)}
                      <div className="flex-1">
                        <div className="font-medium mb-2">
                          Wartung {getStatusLabel(maintenance.overallStatus).toLowerCase()}
                        </div>
                        <div className="text-sm">
                          {maintenance.summary}
                        </div>
                      </div>
                    </div>
                  </Alert>

                  <div className="space-y-2">
                    <h4 className="font-medium">Wichtige Erkenntnisse:</h4>
                    <ul className="space-y-1 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>
                          {maintenance.performanceMetrics.totalInstruments.toLocaleString('de-DE')} Instrumente erfolgreich verwaltet
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5" />
                        <span>
                          Datenqualität bei {maintenance.performanceMetrics.qualityScore}% 
                          {maintenance.performanceMetrics.qualityScore >= 90 ? " (Ziel erreicht)" : " (Verbesserung empfohlen)"}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-purple-500 mt-0.5" />
                        <span>
                          Daten sind {maintenance.performanceMetrics.dataFreshness} Tag(e) alt
                        </span>
                      </li>
                    </ul>
                  </div>

                  {maintenance.taskResults.some(task => task.recommendations.length > 0) && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Empfehlungen:</h4>
                      <div className="space-y-2">
                        {maintenance.taskResults
                          .filter(task => task.recommendations.length > 0)
                          .slice(0, 3)
                          .map((task, index) => (
                            <div key={index} className="p-3 bg-blue-50 rounded-lg">
                              <div className="font-medium text-sm text-blue-900 mb-1">
                                {task.taskName}
                              </div>
                              <ul className="text-xs text-blue-800 space-y-1">
                                {task.recommendations.slice(0, 2).map((rec, recIndex) => (
                                  <li key={recIndex}>• {rec}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Wartungsbericht
          </Button>
          <Button 
            size="sm"
            onClick={() => triggerMaintenanceMutation.mutate()}
            disabled={triggerMaintenanceMutation.isPending}
            className="bg-ms-blue hover:bg-ms-blue/90"
          >
            {triggerMaintenanceMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Settings className="h-4 w-4 mr-2" />
            )}
            Neue Wartung
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvestmentUniverseMaintenance;