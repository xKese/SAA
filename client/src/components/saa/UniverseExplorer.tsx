import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Search, Filter, Star, TrendingUp, Shield, Zap, Globe } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface UniverseExplorerProps {
  riskProfile: string;
  constraints?: any;
  onSelectionChange: (selected: InvestmentInstrument[]) => void;
}

interface InvestmentInstrument {
  id: string;
  name: string;
  isin?: string;
  assetClass: string;
  category: string;
  currency: string;
  domicile: string;
  ter?: number; // Total Expense Ratio
  aum?: number; // Assets Under Management
  performance1Y?: number;
  performance3Y?: number;
  volatility?: number;
  sharpeRatio?: number;
  esgRating?: string;
  liquidityRating: 'high' | 'medium' | 'low';
  riskRating: number; // 1-10 scale
  recommended: boolean;
}

interface FilterState {
  search: string;
  assetClasses: string[];
  currencies: string[];
  minAUM: number;
  maxTER: number;
  minPerformance: number;
  esgOnly: boolean;
  liquidityLevel: string;
  riskRange: [number, number];
}

const ASSET_CLASSES = [
  'Aktien',
  'Anleihen',
  'ETFs',
  'Immobilien',
  'Rohstoffe',
  'Alternative',
  'Liquidität'
];

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY'];

export function UniverseExplorer({ riskProfile, constraints, onSelectionChange }: UniverseExplorerProps) {
  const [selectedInstruments, setSelectedInstruments] = useState<InvestmentInstrument[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    assetClasses: [],
    currencies: ['EUR'],
    minAUM: 0,
    maxTER: 2.0,
    minPerformance: -50,
    esgOnly: false,
    liquidityLevel: 'all',
    riskRange: [1, 10]
  });

  // Fetch investment universe based on risk profile
  const { data: instruments = [], isLoading } = useQuery<InvestmentInstrument[]>({
    queryKey: ['investment-universe', riskProfile, constraints],
    queryFn: async () => {
      const response = await fetch(`/api/universe/filtered?riskProfile=${riskProfile}`);
      if (!response.ok) throw new Error('Failed to fetch investment universe');
      return response.json();
    }
  });

  // Apply filters to instruments
  const filteredInstruments = instruments.filter(instrument => {
    if (filters.search && !instrument.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.assetClasses.length > 0 && !filters.assetClasses.includes(instrument.assetClass)) {
      return false;
    }
    if (filters.currencies.length > 0 && !filters.currencies.includes(instrument.currency)) {
      return false;
    }
    if (instrument.aum && instrument.aum < filters.minAUM) {
      return false;
    }
    if (instrument.ter && instrument.ter > filters.maxTER) {
      return false;
    }
    if (instrument.performance1Y && instrument.performance1Y < filters.minPerformance) {
      return false;
    }
    if (filters.esgOnly && !instrument.esgRating) {
      return false;
    }
    if (filters.liquidityLevel !== 'all' && instrument.liquidityRating !== filters.liquidityLevel) {
      return false;
    }
    if (instrument.riskRating < filters.riskRange[0] || instrument.riskRating > filters.riskRange[1]) {
      return false;
    }
    return true;
  });

  // Recommended instruments based on risk profile
  const recommendedInstruments = filteredInstruments.filter(i => i.recommended);

  const handleInstrumentToggle = (instrument: InvestmentInstrument, checked: boolean) => {
    let newSelection: InvestmentInstrument[];

    if (checked) {
      newSelection = [...selectedInstruments, instrument];
    } else {
      newSelection = selectedInstruments.filter(i => i.id !== instrument.id);
    }

    setSelectedInstruments(newSelection);
    onSelectionChange(newSelection);
  };

  const handleSelectRecommended = () => {
    setSelectedInstruments(recommendedInstruments);
    onSelectionChange(recommendedInstruments);
  };

  const handleClearSelection = () => {
    setSelectedInstruments([]);
    onSelectionChange([]);
  };

  const getPerformanceColor = (performance?: number) => {
    if (!performance) return 'text-gray-500';
    return performance >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getESGBadgeColor = (rating?: string) => {
    if (!rating) return 'bg-gray-100 text-gray-600';
    switch (rating) {
      case 'AAA':
      case 'AA': return 'bg-green-100 text-green-800';
      case 'A':
      case 'BBB': return 'bg-blue-100 text-blue-800';
      case 'BB':
      case 'B': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  const getLiquidityIcon = (rating: string) => {
    switch (rating) {
      case 'high': return <Zap className="h-4 w-4 text-green-500" />;
      case 'medium': return <TrendingUp className="h-4 w-4 text-yellow-500" />;
      case 'low': return <Shield className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const columns = [
    {
      accessorKey: 'select',
      header: '',
      cell: ({ row }: any) => (
        <Checkbox
          checked={selectedInstruments.some(i => i.id === row.original.id)}
          onCheckedChange={(checked) => handleInstrumentToggle(row.original, checked as boolean)}
        />
      ),
    },
    {
      accessorKey: 'recommended',
      header: '',
      cell: ({ row }: any) => row.original.recommended && <Star className="h-4 w-4 text-yellow-500 fill-current" />,
    },
    {
      accessorKey: 'name',
      header: 'Instrument',
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          {row.original.isin && (
            <div className="text-sm text-muted-foreground">{row.original.isin}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'assetClass',
      header: 'Asset-Klasse',
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.original.assetClass}</Badge>
      ),
    },
    {
      accessorKey: 'currency',
      header: 'Währung',
    },
    {
      accessorKey: 'ter',
      header: 'TER',
      cell: ({ row }: any) => row.original.ter ? `${row.original.ter.toFixed(2)}%` : '-',
    },
    {
      accessorKey: 'performance1Y',
      header: '1J Performance',
      cell: ({ row }: any) => (
        <span className={getPerformanceColor(row.original.performance1Y)}>
          {row.original.performance1Y ? `${row.original.performance1Y.toFixed(1)}%` : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'riskRating',
      header: 'Risiko',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <span>{row.original.riskRating}/10</span>
          <div className="w-16 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${(row.original.riskRating / 10) * 100}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'liquidityRating',
      header: 'Liquidität',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          {getLiquidityIcon(row.original.liquidityRating)}
          <span className="capitalize">{row.original.liquidityRating}</span>
        </div>
      ),
    },
    {
      accessorKey: 'esgRating',
      header: 'ESG',
      cell: ({ row }: any) => row.original.esgRating ? (
        <Badge className={getESGBadgeColor(row.original.esgRating)}>
          {row.original.esgRating}
        </Badge>
      ) : '-',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Investment Universe Explorer</h2>
          <p className="text-muted-foreground">
            {filteredInstruments.length} Instrumente verfügbar für Ihr {riskProfile} Risikoprofil
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClearSelection}>
            Auswahl zurücksetzen
          </Button>
          <Button onClick={handleSelectRecommended}>
            <Star className="mr-2 h-4 w-4" />
            Empfohlene auswählen ({recommendedInstruments.length})
          </Button>
        </div>
      </div>

      {/* Selection Summary */}
      {selectedInstruments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ausgewählte Instrumente ({selectedInstruments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedInstruments.slice(0, 10).map(instrument => (
                <Badge key={instrument.id} variant="secondary" className="px-3 py-1">
                  {instrument.name}
                  <button
                    onClick={() => handleInstrumentToggle(instrument, false)}
                    className="ml-2 text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              ))}
              {selectedInstruments.length > 10 && (
                <Badge variant="outline">
                  +{selectedInstruments.length - 10} weitere
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="browse" className="space-y-4">
        <TabsList>
          <TabsTrigger value="browse">Durchsuchen</TabsTrigger>
          <TabsTrigger value="recommended">Empfohlen ({recommendedInstruments.length})</TabsTrigger>
          <TabsTrigger value="categories">Kategorien</TabsTrigger>
          <TabsTrigger value="filters">Filter</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {/* Search and Quick Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Instrumente suchen..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={filters.assetClasses[0] || 'all'}
                  onValueChange={(value) => setFilters({
                    ...filters,
                    assetClasses: value === 'all' ? [] : [value]
                  })}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Asset-Klasse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Asset-Klassen</SelectItem>
                    {ASSET_CLASSES.map(ac => (
                      <SelectItem key={ac} value={ac}>{ac}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Instruments Table */}
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={columns}
                data={filteredInstruments}
                searchKey="name"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommended" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Empfohlene Instrumente für {riskProfile} Risikoprofil</CardTitle>
              <CardDescription>
                Diese Instrumente sind optimal für Ihre Risikobereitschaft und Anlageziele
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendedInstruments.map(instrument => (
                  <Card
                    key={instrument.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedInstruments.some(i => i.id === instrument.id)
                        ? 'ring-2 ring-blue-500 bg-blue-50'
                        : ''
                    }`}
                    onClick={() => handleInstrumentToggle(
                      instrument,
                      !selectedInstruments.some(i => i.id === instrument.id)
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <Badge className={getESGBadgeColor(instrument.esgRating)}>
                          {instrument.esgRating || 'N/A'}
                        </Badge>
                      </div>
                      <h3 className="font-medium mb-1">{instrument.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {instrument.category}
                      </p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Performance 1J:</span>
                          <span className={getPerformanceColor(instrument.performance1Y)}>
                            {instrument.performance1Y ? `${instrument.performance1Y.toFixed(1)}%` : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>TER:</span>
                          <span>{instrument.ter ? `${instrument.ter.toFixed(2)}%` : '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Risiko:</span>
                          <span>{instrument.riskRating}/10</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ASSET_CLASSES.map(assetClass => {
              const categoryInstruments = filteredInstruments.filter(i => i.assetClass === assetClass);
              const selectedInCategory = selectedInstruments.filter(i => i.assetClass === assetClass).length;

              return (
                <Card key={assetClass}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{assetClass}</CardTitle>
                      <Badge variant="outline">
                        {categoryInstruments.length} verfügbar
                      </Badge>
                    </div>
                    {selectedInCategory > 0 && (
                      <CardDescription>
                        {selectedInCategory} ausgewählt
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {categoryInstruments.slice(0, 3).map(instrument => (
                        <div key={instrument.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedInstruments.some(i => i.id === instrument.id)}
                            onCheckedChange={(checked) => handleInstrumentToggle(instrument, checked as boolean)}
                          />
                          <span className="text-sm">{instrument.name}</span>
                        </div>
                      ))}
                      {categoryInstruments.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{categoryInstruments.length - 3} weitere
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Erweiterte Filter</CardTitle>
              <CardDescription>
                Verfeinern Sie Ihre Suche mit detaillierten Kriterien
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Währungen</Label>
                  <div className="space-y-2">
                    {CURRENCIES.map(currency => (
                      <div key={currency} className="flex items-center space-x-2">
                        <Checkbox
                          checked={filters.currencies.includes(currency)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFilters({
                                ...filters,
                                currencies: [...filters.currencies, currency]
                              });
                            } else {
                              setFilters({
                                ...filters,
                                currencies: filters.currencies.filter(c => c !== currency)
                              });
                            }
                          }}
                        />
                        <Label className="text-sm">{currency}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Performance-Filter</Label>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm">Min. Performance 1J (%)</Label>
                      <Input
                        type="number"
                        value={filters.minPerformance}
                        onChange={(e) => setFilters({
                          ...filters,
                          minPerformance: Number(e.target.value)
                        })}
                        step="1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Max. TER (%)</Label>
                      <Input
                        type="number"
                        value={filters.maxTER}
                        onChange={(e) => setFilters({
                          ...filters,
                          maxTER: Number(e.target.value)
                        })}
                        step="0.1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Qualitätsfilter</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={filters.esgOnly}
                        onCheckedChange={(checked) => setFilters({
                          ...filters,
                          esgOnly: checked as boolean
                        })}
                      />
                      <Label className="text-sm">Nur ESG-Instrumente</Label>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Liquidität</Label>
                      <Select
                        value={filters.liquidityLevel}
                        onValueChange={(value) => setFilters({
                          ...filters,
                          liquidityLevel: value
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Liquiditätsstufen</SelectItem>
                          <SelectItem value="high">Hoch</SelectItem>
                          <SelectItem value="medium">Mittel</SelectItem>
                          <SelectItem value="low">Niedrig</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setFilters({
                  search: '',
                  assetClasses: [],
                  currencies: ['EUR'],
                  minAUM: 0,
                  maxTER: 2.0,
                  minPerformance: -50,
                  esgOnly: false,
                  liquidityLevel: 'all',
                  riskRange: [1, 10]
                })}>
                  Filter zurücksetzen
                </Button>
                <div className="text-sm text-muted-foreground">
                  {filteredInstruments.length} von {instruments.length} Instrumenten angezeigt
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}