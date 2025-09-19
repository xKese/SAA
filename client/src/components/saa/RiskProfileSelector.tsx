import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMutation } from '@tanstack/react-query';
import { Shield, TrendingUp, AlertTriangle, Target, Zap } from 'lucide-react';

interface RiskProfileSelectorProps {
  onProfileSelect: (data: any) => void;
}

const RISK_PROFILES = [
  {
    value: 1,
    label: 'Sehr Konservativ',
    description: 'Kapitalschutz steht im Vordergrund',
    equity: 10,
    bonds: 70,
    alternatives: 10,
    cash: 10,
    expectedReturn: '2-4%',
    volatility: 'Sehr niedrig',
    icon: Shield,
    color: 'bg-emerald-500',
    gradient: 'from-emerald-400 to-emerald-600'
  },
  {
    value: 2,
    label: 'Konservativ',
    description: 'Sicherheit mit moderatem Wachstum',
    equity: 20,
    bonds: 60,
    alternatives: 10,
    cash: 10,
    expectedReturn: '3-5%',
    volatility: 'Niedrig',
    icon: Shield,
    color: 'bg-green-500',
    gradient: 'from-green-400 to-green-600'
  },
  {
    value: 3,
    label: 'Moderat',
    description: 'Ausgewogenes Risiko-Rendite-Verhältnis',
    equity: 40,
    bonds: 45,
    alternatives: 10,
    cash: 5,
    expectedReturn: '4-6%',
    volatility: 'Mittel',
    icon: Target,
    color: 'bg-blue-500',
    gradient: 'from-blue-400 to-blue-600'
  },
  {
    value: 4,
    label: 'Ausgewogen',
    description: 'Wachstumsorientiert mit kontrolliertem Risiko',
    equity: 60,
    bonds: 30,
    alternatives: 8,
    cash: 2,
    expectedReturn: '5-7%',
    volatility: 'Mittel-Hoch',
    icon: TrendingUp,
    color: 'bg-purple-500',
    gradient: 'from-purple-400 to-purple-600'
  },
  {
    value: 5,
    label: 'Aggressiv',
    description: 'Maximales Wachstumspotenzial',
    equity: 80,
    bonds: 10,
    alternatives: 10,
    cash: 0,
    expectedReturn: '6-9%',
    volatility: 'Hoch',
    icon: AlertTriangle,
    color: 'bg-red-500',
    gradient: 'from-red-400 to-red-600'
  },
  {
    value: 6,
    label: 'Sehr Aggressiv',
    description: 'Höchste Renditeerwartung mit maximaler Volatilität',
    equity: 90,
    bonds: 5,
    alternatives: 5,
    cash: 0,
    expectedReturn: '7-12%',
    volatility: 'Sehr hoch',
    icon: Zap,
    color: 'bg-orange-500',
    gradient: 'from-orange-400 to-orange-600'
  }
] as const;

// Helper function to get current client ID
const getCurrentClientId = () => {
  // Mock implementation - in real app would get from auth context
  return 'client-123';
};

export function RiskProfileSelector({ onProfileSelect }: RiskProfileSelectorProps) {
  const [selectedProfile, setSelectedProfile] = useState(3);

  const profileMutation = useMutation({
    mutationFn: async (profile: number) => {
      // WICHTIG: Rufe IMMER den Backend-Service auf
      const response = await fetch('/api/saa/validate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riskProfile: profile,
          clientId: getCurrentClientId()
        })
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Update UI mit Validierungsergebnis
      onProfileSelect(data.validatedProfile);
    }
  });

  const handleProfileChange = (values: number[]) => {
    const newProfile = values[0];
    setSelectedProfile(newProfile);

    // Trigger backend validation
    profileMutation.mutate(newProfile);
  };

  const handleProfileClick = (profileValue: number) => {
    setSelectedProfile(profileValue);
    profileMutation.mutate(profileValue);
  };

  const currentProfileData = RISK_PROFILES.find(p => p.value === selectedProfile) || RISK_PROFILES[2];

  return (
    <TooltipProvider>
      <div className="space-y-8 @container">
        {/* Visual Feedback Header */}
        <div className="text-center space-y-2">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${currentProfileData.gradient} text-white transition-all duration-500 transform ${profileMutation.isPending ? 'scale-105 animate-pulse' : ''}`}>
            <currentProfileData.icon className="h-5 w-5" />
            <span className="font-medium">{currentProfileData.label}</span>
          </div>
          {profileMutation.isPending && (
            <div className="text-sm text-muted-foreground animate-fade-in">
              Validierung läuft...
            </div>
          )}
        </div>

        {/* Interactive Slider with Visual Feedback */}
        <Card className="overflow-hidden">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Risikoprofil auswählen</h3>
                <Badge variant="outline" className="text-base px-3 py-1">
                  Level {selectedProfile}/6
                </Badge>
              </div>

              {/* Main Slider */}
              <div className="space-y-4">
                <Slider
                  value={[selectedProfile]}
                  onValueChange={handleProfileChange}
                  min={1}
                  max={6}
                  step={1}
                  className="w-full"
                  disabled={profileMutation.isPending}
                />

                {/* Profile Labels with Responsive Layout */}
                <div className="grid grid-cols-2 @sm:grid-cols-3 @lg:grid-cols-6 gap-2 text-xs text-center">
                  {RISK_PROFILES.map((profile) => (
                    <div
                      key={profile.value}
                      className={`transition-all duration-300 ${
                        selectedProfile === profile.value
                          ? 'text-foreground font-medium scale-105'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {profile.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Cards Grid with Animations */}
        <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 gap-4">
          {RISK_PROFILES.map((profile) => {
            const Icon = profile.icon;
            const isSelected = selectedProfile === profile.value;

            return (
              <Tooltip key={profile.value}>
                <TooltipTrigger asChild>
                  <Card
                    className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                      isSelected
                        ? `ring-2 ring-offset-2 ring-blue-500 shadow-lg scale-105 bg-gradient-to-br ${profile.gradient} text-white`
                        : 'hover:bg-gray-50'
                    } ${
                      profileMutation.isPending ? 'pointer-events-none opacity-70' : ''
                    }`}
                    onClick={() => handleProfileClick(profile.value)}
                  >
                    <CardContent className="p-6 text-center space-y-3">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${
                        isSelected ? 'bg-white/20' : profile.color
                      } transition-all duration-300`}>
                        <Icon className={`h-6 w-6 ${isSelected ? 'text-white' : 'text-white'}`} />
                      </div>

                      <div>
                        <h3 className="font-semibold text-base mb-1">{profile.label}</h3>
                        <p className={`text-sm ${isSelected ? 'text-white/90' : 'text-muted-foreground'}`}>
                          {profile.description}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className={`text-xs ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                          Rendite: {profile.expectedReturn} • {profile.volatility}
                        </div>

                        {/* Allocation Preview */}
                        <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-white/20">
                          <div
                            className="bg-blue-400"
                            style={{ width: `${profile.equity}%` }}
                            title={`Aktien: ${profile.equity}%`}
                          />
                          <div
                            className="bg-green-400"
                            style={{ width: `${profile.bonds}%` }}
                            title={`Anleihen: ${profile.bonds}%`}
                          />
                          <div
                            className="bg-purple-400"
                            style={{ width: `${profile.alternatives}%` }}
                            title={`Alternative: ${profile.alternatives}%`}
                          />
                          <div
                            className="bg-gray-400"
                            style={{ width: `${profile.cash}%` }}
                            title={`Cash: ${profile.cash}%`}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-2">
                    <div className="font-medium">{profile.label}</div>
                    <div className="text-sm text-muted-foreground">{profile.description}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Aktien: {profile.equity}%</div>
                      <div>Anleihen: {profile.bonds}%</div>
                      <div>Alternative: {profile.alternatives}%</div>
                      <div>Cash: {profile.cash}%</div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Selected Profile Details with Animation */}
        <Card className={`transition-all duration-500 ${profileMutation.isSuccess ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 @lg:grid-cols-2 gap-8">
              {/* Profile Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-full ${currentProfileData.color}`}>
                    <currentProfileData.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{currentProfileData.label}</h3>
                    <p className="text-muted-foreground">{currentProfileData.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="text-muted-foreground">Erwartete Rendite</div>
                    <div className="text-lg font-semibold text-green-600">
                      {currentProfileData.expectedReturn}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-muted-foreground">Volatilität</div>
                    <div className="text-lg font-semibold">
                      {currentProfileData.volatility}
                    </div>
                  </div>
                </div>
              </div>

              {/* Allocation Breakdown */}
              <div className="space-y-4">
                <h4 className="font-semibold">Asset Allocation</h4>
                <div className="space-y-3">
                  {[
                    { label: 'Aktien', value: currentProfileData.equity, color: 'bg-blue-500' },
                    { label: 'Anleihen', value: currentProfileData.bonds, color: 'bg-green-500' },
                    { label: 'Alternative', value: currentProfileData.alternatives, color: 'bg-purple-500' },
                    { label: 'Cash', value: currentProfileData.cash, color: 'bg-gray-500' }
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <div className="flex-1 flex justify-between items-center">
                        <span className="text-sm font-medium">{item.label}</span>
                        <span className="text-sm font-semibold">{item.value}%</span>
                      </div>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${item.color}`}
                          style={{ width: `${(item.value / 100) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Validation Status */}
            {profileMutation.isSuccess && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
                <div className="flex items-center gap-2 text-green-800">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">Profil erfolgreich validiert</span>
                </div>
              </div>
            )}

            {profileMutation.isError && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
                <div className="flex items-center gap-2 text-red-800">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm font-medium">Validierung fehlgeschlagen</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}