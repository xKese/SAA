import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  CheckCircle, 
  AlertTriangle,
  Info
} from "lucide-react";

const FormatGuidance = memo(function FormatGuidance() {
  const downloadSampleCSV = () => {
    const sampleData = `Name,ISIN,Wert
"Apple Inc",US0378331005,"1.234,56"
"Microsoft Corp",US5949181045,"2.345,67"
"Amazon.com Inc",US0231351067,"3.456,78"
"Alphabet Inc",US02079K3059,"4.567,89"
"Tesla Inc",US88160R1014,"5.678,90"`;

    const blob = new Blob([sampleData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'portfolio-sample.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatExamples = {
    csv: {
      title: "CSV-Format",
      icon: <FileSpreadsheet className="h-5 w-5" />,
      description: "Comma-Separated Values - einfaches Textformat",
      advantages: [
        "Universell kompatibel mit allen Tabellenkalkulationen",
        "Kleine Dateigröße",
        "Schnelle Verarbeitung",
        "Einfach zu bearbeiten"
      ],
      requirements: [
        "Erste Zeile: Spaltenüberschriften",
        "Name/Bezeichnung der Position erforderlich",
        "Wert/Betrag als Zahl erforderlich",
        "ISIN optional aber empfohlen",
        "Deutsche Zahlenformate (1.234,56) unterstützt",
        "Trennzeichen: Komma (,) oder Semikolon (;)"
      ],
      example: `Name,ISIN,Wert
"Apple Inc",US0378331005,"1.234,56"
"Microsoft Corp",US5949181045,"2.345,67"
"Amazon.com Inc",US0231351067,"3.456,78"`,
      tips: [
        "Verwenden Sie Anführungszeichen für Namen mit Kommas",
        "Stellen Sie sicher, dass alle Zeilen die gleiche Anzahl Spalten haben",
        "Vermeiden Sie leere Zeilen zwischen den Daten",
        "Deutsche Zahlenformat: 1.234,56 oder englisches Format: 1,234.56"
      ]
    },
    excel: {
      title: "Excel-Format",
      icon: <FileSpreadsheet className="h-5 w-5" />,
      description: "Microsoft Excel Arbeitsmappe (.xlsx/.xls)",
      advantages: [
        "Benutzerfreundliche Eingabe",
        "Automatische Formatierung",
        "Formel-Unterstützung",
        "Vertrautes Format für Finanzprofis"
      ],
      requirements: [
        "Erste Zeile: Spaltenüberschriften",
        "Name/Bezeichnung der Position erforderlich", 
        "Wert/Betrag als Zahl erforderlich",
        "ISIN optional aber empfohlen",
        "Nur das erste Arbeitsblatt wird verarbeitet",
        "Deutsche und englische Zahlenformate unterstützt"
      ],
      example: "Erstellen Sie eine Excel-Tabelle mit den Spalten:\nSpalte A: Name (z.B. 'Apple Inc')\nSpalte B: ISIN (z.B. 'US0378331005')\nSpalte C: Wert (z.B. 1234,56)",
      tips: [
        "Verwenden Sie aussagekräftige Spaltenüberschriften",
        "Formatieren Sie Werte als Währung oder Zahl",
        "Stellen Sie sicher, dass keine Formeln Fehler enthalten",
        "Speichern Sie als .xlsx für beste Kompatibilität"
      ]
    },
    pdf: {
      title: "PDF-Format", 
      icon: <FileText className="h-5 w-5" />,
      description: "Automatische AI-gestützte Extraktion aus Dokumenten",
      advantages: [
        "Depot-Auszüge direkt verwendbar",
        "Keine manuelle Datenübertragung nötig",
        "Automatische Erkennung verschiedener Formate",
        "Intelligente Wert-Extraktion"
      ],
      requirements: [
        "PDF muss durchsuchbaren Text enthalten",
        "Strukturierte Darstellung der Portfolio-Positionen",
        "Namen und Werte müssen klar erkennbar sein",
        "Dateigröße unter 10MB"
      ],
      example: "Unterstützte Dokumente:\n• Depot-Auszüge von Banken und Brokern\n• Portfolio-Berichte\n• Kontoauszüge mit Wertpapier-Positionen\n• Investmentberichte",
      tips: [
        "Verwenden Sie die neueste Version Ihres Depot-Auszugs",
        "Stellen Sie sicher, dass der Text nicht als Bild eingescannt ist",
        "PDF sollte klar strukturiert und gut lesbar sein",
        "Bei Problemen: Exportieren Sie die Daten als CSV/Excel"
      ]
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-ms-green">
            Unterstützte Dateiformate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="csv" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="csv" className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                CSV
              </TabsTrigger>
              <TabsTrigger value="excel" className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </TabsTrigger>
              <TabsTrigger value="pdf" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                PDF
              </TabsTrigger>
            </TabsList>

            {Object.entries(formatExamples).map(([key, format]) => (
              <TabsContent key={key} value={key} className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  {format.icon}
                  <div>
                    <h3 className="text-lg font-semibold text-ms-green">{format.title}</h3>
                    <p className="text-sm text-gray-600">{format.description}</p>
                  </div>
                </div>

                {/* Advantages */}
                <div className="space-y-3">
                  <h4 className="font-medium text-ms-green">Vorteile</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {format.advantages.map((advantage, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{advantage}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Requirements */}
                <div className="space-y-3">
                  <h4 className="font-medium text-ms-green">Anforderungen</h4>
                  <div className="space-y-2">
                    {format.requirements.map((requirement, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span>{requirement}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Example */}
                <div className="space-y-3">
                  <h4 className="font-medium text-ms-green">Beispiel</h4>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    {typeof format.example === 'string' && format.example.includes('\n') ? (
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {format.example}
                      </pre>
                    ) : (
                      <div className="text-sm text-gray-700">
                        {format.example}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tips */}
                <div className="space-y-3">
                  <h4 className="font-medium text-ms-green">Tipps</h4>
                  <div className="space-y-2">
                    {format.tips.map((tip, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sample Download for CSV */}
                {key === 'csv' && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-ms-green">Beispieldatei herunterladen</h4>
                    <Button 
                      onClick={downloadSampleCSV}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      portfolio-sample.csv herunterladen
                    </Button>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-ms-green">Schnellreferenz</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Badge className="bg-green-100 text-green-800">Empfohlen für Einsteiger</Badge>
              <div className="text-sm">
                <strong>CSV-Format</strong><br />
                Einfach zu erstellen und zu bearbeiten
              </div>
            </div>
            <div className="space-y-2">
              <Badge className="bg-blue-100 text-blue-800">Für Fortgeschrittene</Badge>
              <div className="text-sm">
                <strong>Excel-Format</strong><br />
                Beste Benutzererfahrung mit Formatierung
              </div>
            </div>
            <div className="space-y-2">
              <Badge className="bg-purple-100 text-purple-800">AI-gestützt</Badge>
              <div className="text-sm">
                <strong>PDF-Format</strong><br />
                Automatische Extraktion aus Dokumenten
              </div>
            </div>
          </div>

          <Alert className="mt-4 border-ms-blue/20 bg-ms-blue/5">
            <Info className="h-4 w-4 text-ms-blue" />
            <AlertDescription className="text-ms-blue">
              <strong>Tipp:</strong> Beginnen Sie mit dem CSV-Format, wenn Sie unsicher sind. 
              Es ist das universellste und am einfachsten zu bearbeitende Format.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
});

export default FormatGuidance;