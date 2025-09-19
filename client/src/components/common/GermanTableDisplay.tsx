import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

interface TableData {
  headers: string[];
  rows: Array<Record<string, string | number>>;
}

interface GermanTableDisplayProps {
  analysisResult: {
    formattedTables?: string;
    validationReport?: string;
    qualityReport?: string;
    errorReport?: string;
    riskMetrics?: any;
    rawData?: any;
  };
}

export function GermanTableDisplay({ analysisResult }: GermanTableDisplayProps) {
  // Parse markdown tables to structured data
  const parseMarkdownTable = (markdown: string): TableData[] => {
    const tables: TableData[] = [];
    const sections = markdown.split(/##\s+/);

    for (const section of sections) {
      if (!section.trim()) continue;

      const lines = section.split('\n').filter(line => line.trim());
      const titleLine = lines[0];

      // Find table lines
      const tableStartIndex = lines.findIndex(line => line.includes('|'));
      if (tableStartIndex === -1) continue;

      const headerLine = lines[tableStartIndex];
      const separatorLine = lines[tableStartIndex + 1];

      if (!headerLine || !separatorLine || !separatorLine.includes('---')) continue;

      const headers = headerLine.split('|')
        .map(h => h.trim())
        .filter(h => h);

      const rows: Array<Record<string, string | number>> = [];

      for (let i = tableStartIndex + 2; i < lines.length; i++) {
        const line = lines[i];
        if (!line.includes('|')) break;

        const cells = line.split('|')
          .map(c => c.trim())
          .filter(c => c);

        if (cells.length === headers.length) {
          const row: Record<string, string | number> = {};
          headers.forEach((header, index) => {
            row[header] = cells[index];
          });
          rows.push(row);
        }
      }

      if (rows.length > 0) {
        tables.push({ headers, rows });
      }
    }

    return tables;
  };

  // Format German number notation
  const formatGermanNumber = (value: string | number): string => {
    if (typeof value === 'string') {
      // Check if it's already formatted
      if (value.includes(',')) return value;
      // Check if it's a percentage
      if (value.includes('%')) return value;
      // Try to parse and format
      const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
      if (!isNaN(num)) {
        return num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return value;
    }
    return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Parse validation report for status
  const getValidationStatus = (report: string): { type: 'success' | 'error' | 'warning'; message: string } => {
    if (!report) return { type: 'success', message: 'Keine Validierung durchgeführt' };

    if (report.includes('✅') && report.includes('erfolgreich')) {
      return { type: 'success', message: 'Alle Validierungen erfolgreich' };
    } else if (report.includes('❌') || report.includes('fehlgeschlagen')) {
      return { type: 'error', message: 'Validierung fehlgeschlagen - siehe Bericht' };
    } else if (report.includes('⚠️') || report.includes('Warnung')) {
      return { type: 'warning', message: 'Validierung mit Warnungen' };
    }
    return { type: 'success', message: 'Validierung abgeschlossen' };
  };

  const validationStatus = getValidationStatus(analysisResult.validationReport || '');
  const tables = analysisResult.formattedTables ? parseMarkdownTable(analysisResult.formattedTables) : [];

  return (
    <div className="space-y-6">
      {/* Validation Status Alert */}
      <Alert className={validationStatus.type === 'error' ? 'border-red-500' :
                       validationStatus.type === 'warning' ? 'border-yellow-500' :
                       'border-green-500'}>
        <div className="flex items-center gap-2">
          {validationStatus.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          {validationStatus.type === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
          {validationStatus.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
          <AlertDescription>{validationStatus.message}</AlertDescription>
        </div>
      </Alert>

      {/* Asset Allocation Table */}
      <Card>
        <CardHeader>
          <CardTitle>Anlagekategorie-Tabelle</CardTitle>
        </CardHeader>
        <CardContent>
          {tables[0] ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {tables[0].headers.map((header, idx) => (
                    <TableHead key={idx} className={idx > 0 ? 'text-right' : ''}>
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables[0].rows.map((row, idx) => (
                  <TableRow key={idx} className={row[tables[0].headers[0]]?.toString().includes('Gesamt') ? 'font-bold' : ''}>
                    {tables[0].headers.map((header, cellIdx) => (
                      <TableCell key={cellIdx} className={cellIdx > 0 ? 'text-right' : ''}>
                        {cellIdx > 0 ? formatGermanNumber(row[header]) : row[header]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">Keine Daten verfügbar</p>
          )}
        </CardContent>
      </Card>

      {/* Currency Exposure Table */}
      <Card>
        <CardHeader>
          <CardTitle>Währungs-Tabelle</CardTitle>
        </CardHeader>
        <CardContent>
          {tables[1] ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {tables[1].headers.map((header, idx) => (
                    <TableHead key={idx} className={idx > 0 && idx < 3 ? 'text-right' : 'text-center'}>
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables[1].rows.map((row, idx) => (
                  <TableRow key={idx} className={row[tables[1].headers[0]]?.toString().includes('Gesamt') ? 'font-bold' : ''}>
                    {tables[1].headers.map((header, cellIdx) => (
                      <TableCell key={cellIdx} className={cellIdx > 0 && cellIdx < 3 ? 'text-right' : cellIdx === 3 ? 'text-center' : ''}>
                        {cellIdx > 0 && cellIdx < 3 ? formatGermanNumber(row[header]) : row[header]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">Keine Daten verfügbar</p>
          )}
        </CardContent>
      </Card>

      {/* Geographic Allocation Table */}
      <Card>
        <CardHeader>
          <CardTitle>Regional-Tabelle (Aktienanteil)</CardTitle>
        </CardHeader>
        <CardContent>
          {tables[2] ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {tables[2].headers.map((header, idx) => (
                    <TableHead key={idx} className={idx > 0 ? 'text-right' : ''}>
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables[2].rows.map((row, idx) => (
                  <TableRow key={idx} className={row[tables[2].headers[0]]?.toString().includes('Gesamt') ? 'font-bold' : ''}>
                    {tables[2].headers.map((header, cellIdx) => (
                      <TableCell key={cellIdx} className={cellIdx > 0 ? 'text-right' : ''}>
                        {cellIdx > 0 ? formatGermanNumber(row[header]) : row[header]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">Keine Daten verfügbar</p>
          )}
        </CardContent>
      </Card>

      {/* Risk Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Kennzahlen-Tabelle</CardTitle>
        </CardHeader>
        <CardContent>
          {tables[3] ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {tables[3].headers.map((header, idx) => (
                    <TableHead key={idx} className={idx === 1 ? 'text-right' : idx === 2 ? 'text-center' : ''}>
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables[3].rows.map((row, idx) => (
                  <TableRow key={idx}>
                    {tables[3].headers.map((header, cellIdx) => (
                      <TableCell key={cellIdx} className={cellIdx === 1 ? 'text-right' : cellIdx === 2 ? 'text-center' : ''}>
                        {cellIdx === 1 ? formatGermanNumber(row[header]) : row[header]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">Keine Daten verfügbar</p>
          )}
        </CardContent>
      </Card>

      {/* Quality Report */}
      {analysisResult.qualityReport && (
        <Card>
          <CardHeader>
            <CardTitle>Qualitätssicherungsbericht</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm">{analysisResult.qualityReport}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Report (if any) */}
      {analysisResult.errorReport && (
        <Alert className="border-yellow-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="mt-2">
              <strong>Fehlerbehandlung durchgeführt:</strong>
              <pre className="whitespace-pre-wrap text-sm mt-2">{analysisResult.errorReport}</pre>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Details */}
      {analysisResult.validationReport && (
        <Card>
          <CardHeader>
            <CardTitle>Validierungsdetails</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm">{analysisResult.validationReport}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}