import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter, X } from 'lucide-react';
import { InvestmentUniverseItem, InvestmentUniverseResponse } from '@shared/schema';

interface InvestmentUniverseSelectorProps {
  investmentUniverse: InvestmentUniverseResponse | null;
  isLoading: boolean;
  onSelect: (instrument: InvestmentUniverseItem) => void;
  selectedInstrument?: InvestmentUniverseItem;
  onClear: () => void;
}

export default function InvestmentUniverseSelector({
  investmentUniverse,
  isLoading,
  onSelect,
  selectedInstrument,
  onClear
}: InvestmentUniverseSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetClass, setSelectedAssetClass] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filteredInstruments, setFilteredInstruments] = useState<InvestmentUniverseItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Filter instruments when search term or filters change
  useEffect(() => {
    if (!investmentUniverse) return;
    
    let filtered = investmentUniverse.instruments;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(instrument => {
        const displayName = (instrument.displayName || instrument.extractedName || instrument.name).toLowerCase();
        return displayName.includes(term) ||
          instrument.name.toLowerCase().includes(term) ||
          (instrument.isin && instrument.isin.toLowerCase().includes(term));
      });
    }
    
    // Apply asset class filter
    if (selectedAssetClass && selectedAssetClass !== 'all') {
      filtered = filtered.filter(instrument => instrument.assetClass === selectedAssetClass);
    }
    
    // Apply category filter
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(instrument => instrument.category === selectedCategory);
    }
    
    setFilteredInstruments(filtered.slice(0, 50)); // Limit to first 50 results
  }, [searchTerm, selectedAssetClass, selectedCategory, investmentUniverse]);

  const handleSelect = (instrument: InvestmentUniverseItem) => {
    onSelect(instrument);
    setIsOpen(false);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedAssetClass('all');
    setSelectedCategory('all');
  };

  const hasActiveFilters = searchTerm || (selectedAssetClass && selectedAssetClass !== 'all') || (selectedCategory && selectedCategory !== 'all');

  if (selectedInstrument) {
    return (
      <div className="space-y-2">
        <Label>Ausgewähltes Instrument</Label>
        <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex-1">
            <div className="font-medium text-green-900">
              {selectedInstrument.displayName || selectedInstrument.extractedName || selectedInstrument.name}
            </div>
            <div className="text-sm text-green-700">
              {selectedInstrument.isin && (
                <Badge variant="outline" className="mr-1 text-xs">
                  {selectedInstrument.isin}
                </Badge>
              )}
              <Badge variant="secondary" className="mr-1 text-xs">
                {selectedInstrument.assetClass}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {selectedInstrument.category}
              </Badge>
            </div>
          </div>
          <Button
            onClick={onClear}
            variant="ghost"
            size="sm"
            className="text-green-700 hover:text-green-900"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Instrument auswählen</Label>
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <Search className="h-4 w-4 mr-2" />
          {isLoading ? 'Lädt...' : 'Instrument suchen'}
        </Button>
      </div>

      {isOpen && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Nach Name oder ISIN suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Asset-Klasse</Label>
                <Select value={selectedAssetClass} onValueChange={setSelectedAssetClass}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Alle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Asset-Klassen</SelectItem>
                    {investmentUniverse?.assetClasses.map(assetClass => (
                      <SelectItem key={assetClass} value={assetClass}>
                        {assetClass}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Kategorie</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Alle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Kategorien</SelectItem>
                    {investmentUniverse?.categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>{filteredInstruments.length} von {investmentUniverse?.totalCount || 0} Instrumenten</span>
                <Button
                  onClick={clearFilters}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  <Filter className="h-3 w-3 mr-1" />
                  Filter zurücksetzen
                </Button>
              </div>
            )}

            {/* Results */}
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredInstruments.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  {searchTerm || hasActiveFilters ? 'Keine Instrumente gefunden' : 'Alle Instrumente werden geladen...'}
                </div>
              ) : (
                filteredInstruments.map((instrument, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelect(instrument)}
                    className="p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-sm">
                      {instrument.displayName || instrument.extractedName || instrument.name}
                    </div>
                    <div className="flex items-center space-x-1 mt-1">
                      {instrument.isin && (
                        <Badge variant="outline" className="text-xs">
                          {instrument.isin}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {instrument.assetClass}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {instrument.category}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>

            {filteredInstruments.length >= 50 && (
              <div className="text-xs text-gray-500 text-center">
                Nur die ersten 50 Ergebnisse werden angezeigt. Verfeinern Sie Ihre Suche für präzisere Ergebnisse.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}