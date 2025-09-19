import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { AlertTriangle, Target, TrendingUp, Info } from 'lucide-react';

interface AllocationChartProps {
  portfolioId?: string;
  portfolios?: any[];
  data?: Record<string, number>;
  editable?: boolean;
  onChange?: (allocation: Record<string, number>) => void;
  riskProfile?: string;
  showDrift?: boolean;
  compact?: boolean;
}

interface AllocationData {
  name: string;
  value: number;
  target?: number;
  drift?: number;
  color: string;
  risk: number;
  expectedReturn: number;
}

const ASSET_CLASS_COLORS = {
  'Aktien': '#3B82F6',
  'Anleihen': '#10B981',
  'Immobilien': '#F59E0B',
  'Rohstoffe': '#EF4444',
  'Alternative': '#8B5CF6',
  'Liquidität': '#6B7280',
  'ETFs': '#EC4899',
  'Fonds': '#14B8A6'
};

const DEFAULT_ALLOCATIONS = {
  conservative: {
    'Anleihen': 60,
    'Aktien': 25,
    'Immobilien': 8,
    'Liquidität': 5,
    'Alternative': 2
  },
  moderate: {
    'Aktien': 50,
    'Anleihen': 30,
    'Immobilien': 10,
    'Alternative': 7,
    'Liquidität': 3
  },
  balanced: {
    'Aktien': 60,
    'Anleihen': 25,
    'Immobilien': 8,
    'Alternative': 5,
    'Liquidität': 2
  },
  aggressive: {
    'Aktien': 70,
    'Anleihen': 15,
    'Alternative': 10,
    'Immobilien': 5,
    'Liquidität': 0
  }
};

export function AllocationChart({
  portfolioId,
  portfolios,
  data,
  editable = false,
  onChange,
  riskProfile,
  showDrift = false,
  compact = false
}: AllocationChartProps) {
  const [allocation, setAllocation] = useState<Record<string, number>>(
    data || (riskProfile ? DEFAULT_ALLOCATIONS[riskProfile as keyof typeof DEFAULT_ALLOCATIONS] : {})
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'pie' | 'bar' | 'drift'>('pie');

  useEffect(() => {
    if (data) {
      setAllocation(data);
    }
  }, [data]);

  const allocationData: AllocationData[] = Object.entries(allocation).map(([name, value]) => ({
    name,
    value,
    target: riskProfile ? DEFAULT_ALLOCATIONS[riskProfile as keyof typeof DEFAULT_ALLOCATIONS]?.[name] || 0 : undefined,
    drift: showDrift ? Math.random() * 4 - 2 : undefined, // Mock drift data
    color: ASSET_CLASS_COLORS[name as keyof typeof ASSET_CLASS_COLORS] || '#6B7280',
    risk: Math.random() * 10, // Mock risk data
    expectedReturn: Math.random() * 12 + 2 // Mock return data
  }));

  const totalAllocation = allocationData.reduce((sum, item) => sum + item.value, 0);
  const isValidAllocation = Math.abs(totalAllocation - 100) < 0.1;

  const handleAllocationChange = (assetClass: string, newValue: number) => {
    const newAllocation = { ...allocation, [assetClass]: newValue };
    setAllocation(newAllocation);
    onChange?.(newAllocation);
  };

  const handleNormalize = () => {
    const factor = 100 / totalAllocation;
    const normalized = Object.fromEntries(
      Object.entries(allocation).map(([key, value]) => [key, value * factor])
    );
    setAllocation(normalized);
    onChange?.(normalized);
  };

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={compact ? 200 : 400}>
      <PieChart>
        <Pie
          data={allocationData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={compact ? undefined : ({ name, value }) => `${name}: ${value.toFixed(1)}%`}
          outerRadius={compact ? 60 : 120}
          fill="#8884d8"
          dataKey="value"
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {allocationData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color}
              opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
            />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Allokation']} />
        {!compact && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  );

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={compact ? 200 : 400}>
      <BarChart data={allocationData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Allokation']} />
        <Bar dataKey="value" fill="#3B82F6">
          {allocationData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderDriftChart = () => {
    const driftData = allocationData.filter(item => item.target !== undefined).map(item => ({
      name: item.name,
      current: item.value,
      target: item.target,
      drift: item.drift || 0
    }));

    return (
      <ResponsiveContainer width="100%" height={compact ? 200 : 400}>
        <ComposedChart data={driftData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="current" fill="#3B82F6" name="Aktuell" />
          <Bar dataKey="target" fill="#10B981" name="Ziel" />
          <Line dataKey="drift" stroke="#EF4444" name="Drift" />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {renderPieChart()}
        {showDrift && (
          <div className="text-xs text-center">
            <Badge variant={Math.abs(allocationData[0]?.drift || 0) > 2 ? 'destructive' : 'secondary'}>
              Max. Drift: {Math.max(...allocationData.map(d => Math.abs(d.drift || 0))).toFixed(1)}%
            </Badge>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Asset Allocation</h3>
          {riskProfile && (
            <p className="text-sm text-muted-foreground">
              Optimiert für {riskProfile} Risikoprofil
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'pie' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('pie')}
          >
            Kreis
          </Button>
          <Button
            variant={viewMode === 'bar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('bar')}
          >
            Balken
          </Button>
          {showDrift && (
            <Button
              variant={viewMode === 'drift' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('drift')}
            >
              Drift
            </Button>
          )}
        </div>
      </div>

      {/* Allocation Warning */}
      {!isValidAllocation && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex justify-between items-center">
            <span>
              Gesamtallokation: {totalAllocation.toFixed(1)}% (sollte 100% sein)
            </span>
            <Button size="sm" onClick={handleNormalize}>
              Normalisieren
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <Card>
          <CardContent className="p-6">
            {viewMode === 'pie' && renderPieChart()}
            {viewMode === 'bar' && renderBarChart()}
            {viewMode === 'drift' && renderDriftChart()}
          </CardContent>
        </Card>

        {/* Controls/Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {editable ? (
                <>
                  <Target className="h-5 w-5" />
                  Allokation anpassen
                </>
              ) : (
                <>
                  <Info className="h-5 w-5" />
                  Allokations-Details
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {allocationData.map((item) => (
              <div key={item.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {editable ? (
                      <Input
                        type="number"
                        value={item.value.toFixed(1)}
                        onChange={(e) => handleAllocationChange(item.name, Number(e.target.value))}
                        className="w-20 h-8 text-right"
                        step="0.1"
                        min="0"
                        max="100"
                      />
                    ) : (
                      <span className="font-bold">{item.value.toFixed(1)}%</span>
                    )}
                    {item.drift !== undefined && (
                      <Badge
                        variant={Math.abs(item.drift) > 2 ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {item.drift > 0 ? '+' : ''}{item.drift.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                </div>

                {editable && (
                  <Slider
                    value={[item.value]}
                    onValueChange={([value]) => handleAllocationChange(item.name, value)}
                    min={0}
                    max={100}
                    step={0.5}
                    className="w-full"
                  />
                )}

                {!editable && (
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>Risiko: {item.risk.toFixed(1)}/10</div>
                    <div>Rendite: {item.expectedReturn.toFixed(1)}%</div>
                  </div>
                )}

                {item.target !== undefined && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Ziel: {item.target.toFixed(1)}%</span>
                    <span>
                      Abweichung: {(item.value - item.target).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            ))}

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between font-medium">
                <span>Gesamt:</span>
                <span className={isValidAllocation ? 'text-green-600' : 'text-red-600'}>
                  {totalAllocation.toFixed(1)}%
                </span>
              </div>

              {riskProfile && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Risiko-Score:</span>
                    <div className="font-medium">
                      {(allocationData.reduce((sum, item) => sum + (item.risk * item.value / 100), 0)).toFixed(1)}/10
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Erwartete Rendite:</span>
                    <div className="font-medium">
                      {(allocationData.reduce((sum, item) => sum + (item.expectedReturn * item.value / 100), 0)).toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      {!compact && (
        <Card>
          <CardHeader>
            <CardTitle>Performance-Metriken</CardTitle>
            <CardDescription>
              Basierend auf der aktuellen Allokation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {(allocationData.reduce((sum, item) => sum + (item.expectedReturn * item.value / 100), 0)).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Erwartete Rendite</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {(allocationData.reduce((sum, item) => sum + (item.risk * item.value / 100), 0)).toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Risiko-Score (1-10)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {((allocationData.reduce((sum, item) => sum + (item.expectedReturn * item.value / 100), 0)) /
                    (allocationData.reduce((sum, item) => sum + (item.risk * item.value / 100), 0))).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Rendite/Risiko-Verhältnis</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {allocationData.length}
                </div>
                <div className="text-sm text-muted-foreground">Asset-Klassen</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions for Editable Mode */}
      {editable && riskProfile && (
        <Card>
          <CardHeader>
            <CardTitle>Empfohlene Anpassungen</CardTitle>
            <CardDescription>
              Basierend auf Ihrem {riskProfile} Risikoprofil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const recommended = DEFAULT_ALLOCATIONS[riskProfile as keyof typeof DEFAULT_ALLOCATIONS];
                  setAllocation(recommended);
                  onChange?.(recommended);
                }}
              >
                <Target className="mr-2 h-4 w-4" />
                Empfohlene Allokation übernehmen
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {Object.entries(DEFAULT_ALLOCATIONS[riskProfile as keyof typeof DEFAULT_ALLOCATIONS] || {}).map(([asset, target]) => {
                  const current = allocation[asset] || 0;
                  const diff = current - target;

                  return (
                    <div key={asset} className="flex justify-between">
                      <span>{asset}:</span>
                      <span className={Math.abs(diff) > 5 ? 'text-orange-600' : 'text-muted-foreground'}>
                        {current.toFixed(1)}% / {target.toFixed(1)}%
                        {Math.abs(diff) > 1 && (
                          <span className="ml-1">
                            ({diff > 0 ? '+' : ''}{diff.toFixed(1)}%)
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}