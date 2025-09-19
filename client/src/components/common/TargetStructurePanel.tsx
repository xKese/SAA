import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Target, Percent, Plus, X, BarChart3, Globe, DollarSign } from "lucide-react";
import { getCategoriesByType, getDisplayLabelForIdentifier, DEFAULT_ALLOCATIONS } from "@/lib/portfolio-categories";
import { useInvestmentUniverse } from "@/hooks/use-investment-universe";
import InvestmentUniverseSelector from "./InvestmentUniverseSelector";

interface TargetAllocation {
  identifier: string;
  targetPercentage: number;
  currentPercentage?: number;
  deviation?: number;
  isin?: string;
  source?: 'portfolio' | 'universe';
  assetClass?: string;
  category?: string;
}

interface TargetStructure {
  name: string;
  description: string;
  targets: {
    positions?: TargetAllocation[];
    assetClasses?: TargetAllocation[];
    regions?: TargetAllocation[];
    currencies?: TargetAllocation[];
  };
  constraints?: {
    maxTransactionCostPercent?: number;
    minPositionSize?: number;
    taxOptimization?: boolean;
  };
  // New fields for liquidity injection
  additionalCash?: number;
  reallocationStrategy?: 'sell-only' | 'buy-only' | 'hybrid';
  cashDeploymentPriority?: string[];
  allowPartialReallokation?: boolean;
}

interface TargetStructurePanelProps {
  portfolioId: string;
  currentAnalysis?: any;
  portfolioPositions?: Array<{
    name: string;
    isin?: string;
    value: number;
    percentage: number;
  }>;
  onSave: (targetStructure: TargetStructure) => void;
  onReallokationAnalysis?: (targetStructure: TargetStructure) => void;
  isLoading?: boolean;
  isAnalyzing?: boolean;
}

export function TargetStructurePanel({ 
  portfolioId, 
  currentAnalysis, 
  portfolioPositions = [],
  onSave, 
  onReallokationAnalysis,
  isLoading = false,
  isAnalyzing = false
}: TargetStructurePanelProps) {
  const [targetStructure, setTargetStructure] = useState<TargetStructure>({
    name: "Standard Zielstruktur",
    description: "",
    targets: {
      positions: [], // Start with empty positions - user will add manually
      assetClasses: DEFAULT_ALLOCATIONS.assetClasses,
      regions: DEFAULT_ALLOCATIONS.regions,
      currencies: DEFAULT_ALLOCATIONS.currencies
    },
    constraints: {
      maxTransactionCostPercent: 1.0,
      minPositionSize: 500,
      taxOptimization: true
    },
    // Default values for new fields
    additionalCash: 0,
    reallocationStrategy: 'hybrid',
    cashDeploymentPriority: ['Aktien', 'Anleihen', 'Alternative Investments'],
    allowPartialReallokation: true
  });

  const [activeTab, setActiveTab] = useState("positions");
  const [showInvestmentUniverseSelector, setShowInvestmentUniverseSelector] = useState(false);
  const [selectedPositionIndex, setSelectedPositionIndex] = useState<number>(-1);
  
  // Fetch investment universe
  const { data: investmentUniverseData, isLoading: isInvestmentUniverseLoading } = useInvestmentUniverse();

  // Calculate total percentage for validation
  const getTotalPercentage = (allocations: TargetAllocation[]) => {
    return allocations.reduce((sum, item) => sum + item.targetPercentage, 0);
  };

  // Update target percentage
  const updateTargetPercentage = (
    category: keyof typeof targetStructure.targets,
    index: number,
    percentage: number
  ) => {
    setTargetStructure(prev => ({
      ...prev,
      targets: {
        ...prev.targets,
        [category]: prev.targets[category]?.map((item, i) => 
          i === index ? { ...item, targetPercentage: percentage } : item
        )
      }
    }));
  };

  // Add new allocation
  const addAllocation = (category: keyof typeof targetStructure.targets) => {
    const availableCategories = getCategoriesByType(category);
    const currentIdentifiers = targetStructure.targets[category]?.map(item => item.identifier) || [];
    const availableOptions = availableCategories.filter(cat => !currentIdentifiers.includes(cat.value));
    
    if (availableOptions.length === 0) {
      return; // No more categories available
    }

    const newAllocation: TargetAllocation = {
      identifier: availableOptions[0].value, // Use the first available category
      targetPercentage: 0
    };

    setTargetStructure(prev => ({
      ...prev,
      targets: {
        ...prev.targets,
        [category]: [...(prev.targets[category] || []), newAllocation]
      }
    }));
  };

  // Remove allocation
  const removeAllocation = (
    category: keyof typeof targetStructure.targets,
    index: number
  ) => {
    setTargetStructure(prev => ({
      ...prev,
      targets: {
        ...prev.targets,
        [category]: prev.targets[category]?.filter((_, i) => i !== index)
      }
    }));
  };

  // Update allocation identifier
  const updateIdentifier = (
    category: keyof typeof targetStructure.targets,
    index: number,
    identifier: string
  ) => {
    setTargetStructure(prev => ({
      ...prev,
      targets: {
        ...prev.targets,
        [category]: prev.targets[category]?.map((item, i) => 
          i === index ? { ...item, identifier } : item
        )
      }
    }));
  };

  const handleSave = () => {
    // Validate percentages and categories
    const categories = ['positions', 'assetClasses', 'regions', 'currencies'] as const;
    for (const category of categories) {
      const allocations = targetStructure.targets[category];
      if (allocations && allocations.length > 0) {
        // Validate percentage sum (but not for positions - they can be partial)
        if (category !== 'positions') {
          const total = getTotalPercentage(allocations);
          if (Math.abs(total - 100) > 1) {
            const categoryName = category === 'assetClasses' ? 'Asset-Klassen' : 
                                category === 'regions' ? 'Regionen' : 'Währungen';
            alert(`${categoryName} müssen in der Summe 100% ergeben (aktuell: ${total.toFixed(1)}%)`);
            return;
          }
        }
        
        // Validate positions
        if (category === 'positions') {
          // Check for duplicate positions
          const identifiers = allocations.map(a => a.identifier);
          const uniqueIdentifiers = new Set(identifiers);
          if (identifiers.length !== uniqueIdentifiers.size) {
            alert('Doppelte Positionen nicht erlaubt.');
            return;
          }
          
          // Check that all positions exist in portfolio
          for (const allocation of allocations) {
            if (!portfolioPositions.some(pos => pos.name === allocation.identifier)) {
              alert(`Position "${allocation.identifier}" existiert nicht im Portfolio.`);
              return;
            }
          }
        } else {
          // Validate that all identifiers are from predefined categories
          const validCategories = getCategoriesByType(category);
          const validIdentifiers = validCategories.map(cat => cat.value);
          
          for (const allocation of allocations) {
            if (!validIdentifiers.includes(allocation.identifier)) {
              const categoryName = category === 'assetClasses' ? 'Asset-Klassen' : 
                                  category === 'regions' ? 'Regionen' : 'Währungen';
              alert(`Ungültige Kategorie "${allocation.identifier}" für ${categoryName}. Bitte verwenden Sie nur vordefinierte Kategorien.`);
              return;
            }
          }
          
          // Check for duplicate identifiers
          const identifiers = allocations.map(a => a.identifier);
          const uniqueIdentifiers = new Set(identifiers);
          if (identifiers.length !== uniqueIdentifiers.size) {
            const categoryName = category === 'assetClasses' ? 'Asset-Klassen' : 
                                category === 'regions' ? 'Regionen' : 'Währungen';
            alert(`Doppelte Kategorien nicht erlaubt für ${categoryName}.`);
            return;
          }
        }
      }
    }

    onSave(targetStructure);
  };

  // Special editor for position targets
  const renderPositionEditor = () => {
    const positions = targetStructure.targets.positions || [];
    const total = getTotalPercentage(positions);
    const isValid = Math.abs(total - 100) <= 1;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Einzelne Wertpapierpositionen</h3>
          <div className="flex items-center gap-2">
            <Badge variant={isValid ? "default" : "destructive"}>
              Summe: {total.toFixed(1)}%
            </Badge>
            <Button
              size="sm"
              onClick={() => addPositionAllocation()}
              className="h-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {positions.map((position, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{position.identifier}</h4>
                      {position.isin && (
                        <p className="text-xs text-muted-foreground">ISIN: {position.isin}</p>
                      )}
                      <div className="flex gap-1 mt-1">
                        {position.source === 'portfolio' ? (
                          <Badge variant="default" className="text-xs">Im Portfolio</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <Globe className="h-3 w-3 mr-1" />
                            Investment Universe
                          </Badge>
                        )}
                        {position.assetClass && (
                          <Badge variant="outline" className="text-xs">{position.assetClass}</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updatePositionIdentifier(index)}
                      className="h-8 text-xs"
                    >
                      Ändern
                    </Button>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePositionAllocation(index)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Zielallokation</Label>
                  <span className="font-mono">{position.targetPercentage.toFixed(1)}%</span>
                </div>
                <Slider
                  value={[position.targetPercentage]}
                  onValueChange={([value]) => updatePositionPercentage(index, value)}
                  max={100}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={position.targetPercentage}
                    onChange={(e) => updatePositionPercentage(index, parseFloat(e.target.value) || 0)}
                    min={0}
                    max={100}
                    step={0.1}
                    className="w-20 text-sm"
                  />
                  <span className="flex items-center text-sm text-muted-foreground">%</span>
                </div>
              </div>

              {/* Show current vs target */}
              {position.currentPercentage !== undefined && (
                <div className="flex justify-between text-xs text-muted-foreground bg-gray-50 rounded p-2">
                  <span>Aktuell: {position.currentPercentage.toFixed(1)}%</span>
                  <span>Differenz: {(position.targetPercentage - position.currentPercentage).toFixed(1)}%</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {!isValid && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              ⚠️ Die Summe muss 100% betragen. Aktuell: {total.toFixed(1)}%
            </p>
          </div>
        )}

        {positions.length === 0 && (
          <div className="text-center text-muted-foreground p-8 border-2 border-dashed border-gray-200 rounded-lg">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Noch keine Positionsziele definiert</p>
            <p className="text-sm">Klicken Sie auf "+" um eine Position hinzuzufügen</p>
          </div>
        )}

        {/* Investment Universe Selector Modal/Overlay */}
        {showInvestmentUniverseSelector && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    {selectedPositionIndex === -1 ? 'Position hinzufügen' : 'Position ändern'}
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearInstrumentSelection}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4 max-h-[calc(80vh-120px)] overflow-y-auto">
                <InvestmentUniverseSelector
                  investmentUniverse={investmentUniverseData || null}
                  isLoading={isInvestmentUniverseLoading}
                  onSelect={(instrument) => handleInstrumentSelect({
                    name: instrument.displayName || instrument.extractedName || instrument.name,
                    isin: instrument.isin,
                    source: 'universe',
                    assetClass: instrument.assetClass,
                    category: instrument.category
                  })}
                  onClear={() => {}}
                />
                
                {/* Also show portfolio positions */}
                <div className="mt-6 border-t pt-4">
                  <h4 className="font-medium mb-3">Portfolio-Positionen</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {portfolioPositions
                      .filter(pos => !targetStructure.targets.positions?.some(p => p.identifier === pos.name) || 
                                    (selectedPositionIndex >= 0 && 
                                     targetStructure.targets.positions?.[selectedPositionIndex]?.identifier === pos.name))
                      .map((position) => (
                        <div
                          key={position.name}
                          onClick={() => handleInstrumentSelect({
                            name: position.name,
                            isin: position.isin,
                            source: 'portfolio',
                            currentPercentage: position.percentage
                          })}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-medium text-sm">{position.name}</h5>
                              {position.isin && (
                                <p className="text-xs text-muted-foreground">ISIN: {position.isin}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="default" className="text-xs">Im Portfolio</Badge>
                                <span className="text-xs text-green-600">{position.percentage.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              €{position.value.toLocaleString('de-DE')}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper functions for position management
  const addPositionAllocation = () => {
    // Show investment universe selector
    setSelectedPositionIndex(-1); // -1 indicates adding new position
    setShowInvestmentUniverseSelector(true);
  };

  const handleInstrumentSelect = (instrument: {
    name: string;
    isin?: string;
    source: 'portfolio' | 'universe';
    currentPercentage?: number;
    assetClass?: string;
    category?: string;
  }) => {
    const newPosition: TargetAllocation = {
      identifier: instrument.name,
      targetPercentage: 0,
      currentPercentage: instrument.currentPercentage || 0,
      isin: instrument.isin,
      source: instrument.source,
      assetClass: instrument.assetClass,
      category: instrument.category
    };

    if (selectedPositionIndex === -1) {
      // Adding new position
      setTargetStructure(prev => ({
        ...prev,
        targets: {
          ...prev.targets,
          positions: [...(prev.targets.positions || []), newPosition]
        }
      }));
    } else {
      // Updating existing position
      setTargetStructure(prev => ({
        ...prev,
        targets: {
          ...prev.targets,
          positions: prev.targets.positions?.map((item, i) => 
            i === selectedPositionIndex ? { ...item, ...newPosition } : item
          )
        }
      }));
    }

    setShowInvestmentUniverseSelector(false);
    setSelectedPositionIndex(-1);
  };

  const clearInstrumentSelection = () => {
    setShowInvestmentUniverseSelector(false);
    setSelectedPositionIndex(-1);
  };

  const removePositionAllocation = (index: number) => {
    setTargetStructure(prev => ({
      ...prev,
      targets: {
        ...prev.targets,
        positions: prev.targets.positions?.filter((_, i) => i !== index)
      }
    }));
  };

  const updatePositionIdentifier = (index: number) => {
    // Show investment universe selector for editing
    setSelectedPositionIndex(index);
    setShowInvestmentUniverseSelector(true);
  };

  const updatePositionPercentage = (index: number, percentage: number) => {
    setTargetStructure(prev => ({
      ...prev,
      targets: {
        ...prev.targets,
        positions: prev.targets.positions?.map((item, i) => 
          i === index ? { ...item, targetPercentage: percentage } : item
        )
      }
    }));
  };

  const getPositionDisplayName = (identifier: string) => {
    const position = portfolioPositions.find(pos => pos.name === identifier);
    return position?.name || identifier;
  };

  const renderAllocationEditor = (category: keyof typeof targetStructure.targets) => {
    const allocations = targetStructure.targets[category] || [];
    const total = getTotalPercentage(allocations);
    const isValid = Math.abs(total - 100) <= 1;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {category === 'assetClasses' ? 'Asset-Klassen' : 
             category === 'regions' ? 'Geografische Regionen' : 'Währungen'}
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant={isValid ? "default" : "destructive"}>
              Summe: {total.toFixed(1)}%
            </Badge>
            <Button
              size="sm"
              onClick={() => addAllocation(category)}
              className="h-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {allocations.map((allocation, index) => {
            const availableCategories = getCategoriesByType(category);
            const currentIdentifiers = targetStructure.targets[category]?.map(item => item.identifier) || [];
            const availableOptions = availableCategories.filter(cat => 
              cat.value === allocation.identifier || !currentIdentifiers.includes(cat.value)
            );

            return (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Select
                    value={allocation.identifier}
                    onValueChange={(value) => updateIdentifier(category, index, value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue>
                        {getDisplayLabelForIdentifier(allocation.identifier, category)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{option.label}</span>
                            {option.description && (
                              <span className="text-xs text-muted-foreground">{option.description}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAllocation(category, index)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Zielallokation</Label>
                  <span className="font-mono">{allocation.targetPercentage.toFixed(1)}%</span>
                </div>
                <Slider
                  value={[allocation.targetPercentage]}
                  onValueChange={([value]) => updateTargetPercentage(category, index, value)}
                  max={100}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={allocation.targetPercentage}
                    onChange={(e) => updateTargetPercentage(category, index, parseFloat(e.target.value) || 0)}
                    min={0}
                    max={100}
                    step={0.1}
                    className="w-20 text-sm"
                  />
                  <span className="flex items-center text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        {!isValid && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              ⚠️ Die Summe muss 100% betragen. Aktuell: {total.toFixed(1)}%
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Portfolio-Zielstruktur definieren
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label>Name der Zielstruktur</Label>
            <Input
              value={targetStructure.name}
              onChange={(e) => setTargetStructure(prev => ({ ...prev, name: e.target.value }))}
              placeholder="z.B. Konservative Allokation"
            />
          </div>
          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <Textarea
              value={targetStructure.description}
              onChange={(e) => setTargetStructure(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Kurze Beschreibung der Anlagestrategie"
              rows={2}
            />
          </div>
        </div>

        {/* Target Allocations */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="positions">Positionen</TabsTrigger>
            <TabsTrigger value="assetClasses">Asset-Klassen</TabsTrigger>
            <TabsTrigger value="regions">Regionen</TabsTrigger>
            <TabsTrigger value="currencies">Währungen</TabsTrigger>
          </TabsList>

          <TabsContent value="positions" className="mt-4">
            {renderPositionEditor()}
          </TabsContent>

          <TabsContent value="assetClasses" className="mt-4">
            {renderAllocationEditor('assetClasses')}
          </TabsContent>

          <TabsContent value="regions" className="mt-4">
            {renderAllocationEditor('regions')}
          </TabsContent>

          <TabsContent value="currencies" className="mt-4">
            {renderAllocationEditor('currencies')}
          </TabsContent>
        </Tabs>

        {/* Constraints */}
        <div className="border-t pt-4 space-y-4">
          <h3 className="font-semibold">Reallokation-Beschränkungen</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max. Transaktionskosten (%)</Label>
              <Input
                type="number"
                value={targetStructure.constraints?.maxTransactionCostPercent || 1.0}
                onChange={(e) => setTargetStructure(prev => ({
                  ...prev,
                  constraints: {
                    ...prev.constraints,
                    maxTransactionCostPercent: parseFloat(e.target.value) || 1.0
                  }
                }))}
                step={0.1}
                min={0}
                max={5}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Min. Positionsgröße (€)</Label>
              <Input
                type="number"
                value={targetStructure.constraints?.minPositionSize || 500}
                onChange={(e) => setTargetStructure(prev => ({
                  ...prev,
                  constraints: {
                    ...prev.constraints,
                    minPositionSize: parseInt(e.target.value) || 500
                  }
                }))}
                step={100}
                min={0}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="taxOptimization"
              checked={targetStructure.constraints?.taxOptimization || false}
              onChange={(e) => setTargetStructure(prev => ({
                ...prev,
                constraints: {
                  ...prev.constraints,
                  taxOptimization: e.target.checked
                }
              }))}
              className="rounded"
            />
            <Label htmlFor="taxOptimization">Steueroptimierung berücksichtigen</Label>
          </div>
        </div>

        {/* Liquidity Injection Settings */}
        <div className="border-t pt-4 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Liquiditätszuführung & Reallokation-Strategie
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Zusätzliche Liquidität (€)</Label>
              <Input
                type="number"
                value={targetStructure.additionalCash || 0}
                onChange={(e) => setTargetStructure(prev => ({
                  ...prev,
                  additionalCash: parseFloat(e.target.value) || 0
                }))}
                step={1000}
                min={0}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Betrag der dem Portfolio hinzugefügt werden soll
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Reallokation-Strategie</Label>
              <Select
                value={targetStructure.reallocationStrategy || 'hybrid'}
                onValueChange={(value: 'sell-only' | 'buy-only' | 'hybrid') => 
                  setTargetStructure(prev => ({ ...prev, reallocationStrategy: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sell-only">
                    <div className="flex flex-col">
                      <span className="font-medium">Nur Verkäufe</span>
                      <span className="text-xs text-muted-foreground">Umschichtung durch Verkäufe</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="buy-only">
                    <div className="flex flex-col">
                      <span className="font-medium">Nur Käufe</span>
                      <span className="text-xs text-muted-foreground">Nur durch neue Liquidität</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="hybrid">
                    <div className="flex flex-col">
                      <span className="font-medium">Hybrid</span>
                      <span className="text-xs text-muted-foreground">Kombination aus Verkäufen & Käufen</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {targetStructure.additionalCash && targetStructure.additionalCash > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-blue-700">Erweiterte Portfolio-Informationen</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-blue-600">Aktueller Portfoliowert:</span>
                  <span className="ml-2 font-mono">
                    €{portfolioPositions.reduce((sum, pos) => sum + pos.value, 0).toLocaleString('de-DE')}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600">Neuer Portfoliowert:</span>
                  <span className="ml-2 font-mono">
                    €{(portfolioPositions.reduce((sum, pos) => sum + pos.value, 0) + (targetStructure.additionalCash || 0)).toLocaleString('de-DE')}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="allowPartialReallokation"
              checked={targetStructure.allowPartialReallokation || false}
              onChange={(e) => setTargetStructure(prev => ({
                ...prev,
                allowPartialReallokation: e.target.checked
              }))}
              className="rounded"
            />
            <Label htmlFor="allowPartialReallokation">Teilweises Reallokation bei begrenzter Liquidität erlauben</Label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button 
            onClick={handleSave} 
            disabled={isLoading}
            className="gap-2"
            variant="outline"
          >
            <Save className="h-4 w-4" />
            {isLoading ? "Speichere..." : "Zielstruktur speichern"}
          </Button>
          
          {onReallokationAnalysis && (
            <Button 
              onClick={() => onReallokationAnalysis(targetStructure)} 
              disabled={isAnalyzing}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Analysiere...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4" />
                  Reallokation analysieren
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}