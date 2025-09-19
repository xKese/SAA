import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  FileText,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  Grid,
  List
} from "lucide-react";
import { FactsheetViewer } from "@/components/FactsheetViewer";

interface InvestmentUniverseItem {
  name: string;
  isin?: string;
  assetClass: string;
  category: string;
  factsheetPath: string;
  hasFactsheet: boolean;
  fileName: string;
  confidence: number;
  factsheetData?: {
    fullName?: string;
    ter?: number;
    assetAllocation?: Record<string, number>;
    geographicAllocation?: Record<string, number>;
  };
}

interface InvestmentUniverseResponse {
  success: boolean;
  instruments: InvestmentUniverseItem[];
  totalCount: number;
  categories: string[];
  assetClasses: string[];
  pagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

export default function InvestmentUniverse() {
  // State Management
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssetClass, setSelectedAssetClass] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedFactsheet, setSelectedFactsheet] = useState<InvestmentUniverseItem | null>(null);
  const [isFactsheetViewerOpen, setIsFactsheetViewerOpen] = useState(false);

  const pageSize = 20;

  // API Query
  const { data, isLoading, error } = useQuery<InvestmentUniverseResponse>({
    queryKey: [
      "/api/investment-universe",
      {
        search: searchTerm || undefined,
        assetClass: selectedAssetClass !== "all" ? selectedAssetClass : undefined,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        limit: pageSize,
        offset: currentPage * pageSize
      }
    ],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Derived Values
  const instruments = data?.instruments || [];
  const categories = data?.categories || [];
  const assetClasses = data?.assetClasses || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Filtered Stats
  const statsData = useMemo(() => {
    if (!data) return null;

    const byAssetClass = assetClasses.reduce((acc, assetClass) => {
      acc[assetClass] = instruments.filter(i => i.assetClass === assetClass).length;
      return acc;
    }, {} as Record<string, number>);

    const withFactsheets = instruments.filter(i => i.hasFactsheet).length;
    const avgConfidence = instruments.reduce((sum, i) => sum + i.confidence, 0) / instruments.length;

    return {
      totalInstruments: totalCount,
      withFactsheets,
      factsheetCoverage: withFactsheets / totalCount,
      avgConfidence,
      byAssetClass
    };
  }, [data, instruments, totalCount, assetClasses]);

  // Event Handlers
  const handleViewFactsheet = (instrument: InvestmentUniverseItem) => {
    setSelectedFactsheet(instrument);
    setIsFactsheetViewerOpen(true);
  };

  const handleDownloadFactsheet = (instrument: InvestmentUniverseItem) => {
    window.open(`/api/factsheets/${encodeURIComponent(instrument.fileName)}`, '_blank');
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(0); // Reset to first page
  };

  const handleFilterChange = (type: 'assetClass' | 'category', value: string) => {
    if (type === 'assetClass') {
      setSelectedAssetClass(value);
    } else {
      setSelectedCategory(value);
    }
    setCurrentPage(0); // Reset to first page
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedAssetClass("all");
    setSelectedCategory("all");
    setCurrentPage(0);
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              Fehler beim Laden des Investment Universe: {error.message}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Investment Universe</h1>
          <p className="text-muted-foreground mt-1">
            Durchsuchen Sie alle verfügbaren Factsheets und Instrumente
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{statsData.totalInstruments}</div>
              <p className="text-sm text-muted-foreground">Instrumente</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{statsData.withFactsheets}</div>
              <p className="text-sm text-muted-foreground">Mit Factsheets</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">
                {(statsData.factsheetCoverage * 100).toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">Factsheet-Abdeckung</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">
                {(statsData.avgConfidence * 100).toFixed(0)}%
              </div>
              <p className="text-sm text-muted-foreground">Ø Datenqualität</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Suche und Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suche nach Name oder ISIN..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Asset-Klasse</label>
              <Select value={selectedAssetClass} onValueChange={(value) => handleFilterChange('assetClass', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle Asset-Klassen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Asset-Klassen</SelectItem>
                  {assetClasses.map(assetClass => (
                    <SelectItem key={assetClass} value={assetClass}>
                      {assetClass}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Kategorie</label>
              <Select value={selectedCategory} onValueChange={(value) => handleFilterChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle Kategorien" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kategorien</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={resetFilters}>
                Filter zurücksetzen
              </Button>
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm || selectedAssetClass !== "all" || selectedCategory !== "all") && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Aktive Filter:</span>
              {searchTerm && (
                <Badge variant="secondary">
                  Suche: "{searchTerm}"
                </Badge>
              )}
              {selectedAssetClass !== "all" && (
                <Badge variant="secondary">
                  Asset-Klasse: {selectedAssetClass}
                </Badge>
              )}
              {selectedCategory !== "all" && (
                <Badge variant="secondary">
                  Kategorie: {selectedCategory}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Instrumente ({totalCount} gefunden)
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Seite {currentPage + 1} von {totalPages}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Lade Investment Universe...
              </div>
            </div>
          ) : instruments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine Instrumente gefunden. Versuchen Sie andere Suchkriterien.
            </div>
          ) : viewMode === "table" ? (
            /* Table View */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instrument</TableHead>
                    <TableHead>ISIN</TableHead>
                    <TableHead>Asset-Klasse</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Factsheet</TableHead>
                    <TableHead>Qualität</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instruments.map((instrument, index) => (
                    <TableRow key={`${instrument.fileName}-${index}`}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{instrument.name}</div>
                          {instrument.factsheetData?.fullName && instrument.factsheetData.fullName !== instrument.name && (
                            <div className="text-sm text-muted-foreground">
                              {instrument.factsheetData.fullName}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm">{instrument.isin || "—"}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{instrument.assetClass}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{instrument.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {instrument.hasFactsheet ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <FileText className="h-4 w-4" />
                            Verfügbar
                          </div>
                        ) : (
                          <div className="text-muted-foreground">—</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="w-16">
                          <div className="text-sm">{(instrument.confidence * 100).toFixed(0)}%</div>
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div
                              className="bg-blue-600 h-1 rounded-full"
                              style={{ width: `${instrument.confidence * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {instrument.hasFactsheet && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewFactsheet(instrument)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadFactsheet(instrument)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {instruments.map((instrument, index) => (
                <Card key={`${instrument.fileName}-${index}`} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-medium line-clamp-2">{instrument.name}</h3>
                        {instrument.isin && (
                          <code className="text-sm text-muted-foreground">{instrument.isin}</code>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          {instrument.assetClass}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {instrument.category}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {instrument.hasFactsheet ? (
                            <div className="flex items-center gap-1 text-green-600 text-sm">
                              <FileText className="h-4 w-4" />
                              Factsheet
                            </div>
                          ) : (
                            <div className="text-muted-foreground text-sm">Kein Factsheet</div>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {(instrument.confidence * 100).toFixed(0)}%
                        </div>
                      </div>

                      {instrument.hasFactsheet && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleViewFactsheet(instrument)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Anzeigen
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadFactsheet(instrument)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-muted-foreground">
                Zeige {currentPage * pageSize + 1} bis {Math.min((currentPage + 1) * pageSize, totalCount)} von {totalCount} Instrumenten
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Zurück
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                >
                  Weiter
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Factsheet Viewer Modal */}
      {selectedFactsheet && (
        <FactsheetViewer
          instrument={selectedFactsheet}
          isOpen={isFactsheetViewerOpen}
          onClose={() => {
            setIsFactsheetViewerOpen(false);
            setSelectedFactsheet(null);
          }}
        />
      )}
    </div>
  );
}