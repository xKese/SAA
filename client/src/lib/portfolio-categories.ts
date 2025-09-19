// Standardisierte Portfolio-Kategorien basierend auf claudeSAA.md

export interface CategoryOption {
  value: string;
  label: string;
  description?: string;
}

// Asset-Klassen gemäß deutscher Standards
export const ASSET_CLASSES: CategoryOption[] = [
  {
    value: "aktien",
    label: "Aktien",
    description: "Alle direkten Aktieninvestments und Aktienanteil von Mischfonds"
  },
  {
    value: "anleihen",
    label: "Anleihen", 
    description: "Festverzinsliche Wertpapiere aller Laufzeiten und Qualitäten"
  },
  {
    value: "alternative_investments",
    label: "Alternative Investments",
    description: "Hedge Fonds, Private Equity, Immobilienfonds, Rohstofffonds, Infrastruktur"
  },
  {
    value: "liquiditaet_cash",
    label: "Liquidität/Cash",
    description: "Bankguthaben, Tagesgeld, kurzfristige Festgelder"
  },
  {
    value: "edelmetalle",
    label: "Edelmetalle",
    description: "Gold, Silber, Platin, Palladium (physisch und ETCs)"
  },
  {
    value: "geldmarktanlagen",
    label: "Geldmarktanlagen",
    description: "Geldmarktfonds, Commercial Papers, kurzfristige Staatsanleihen"
  }
];

// Geografische Regionen
export const REGIONS: CategoryOption[] = [
  {
    value: "usa_nordamerika",
    label: "USA/Nordamerika",
    description: "Vereinigte Staaten, Kanada, Mexiko"
  },
  {
    value: "europa_inkl_uk",
    label: "Europa (inkl. UK)",
    description: "Europäische Märkte inklusive Vereinigtes Königreich"
  },
  {
    value: "emerging_markets",
    label: "Emerging Markets",
    description: "China, Indien, Brasilien, Russland, andere Entwicklungsländer"
  },
  {
    value: "asien_pazifik",
    label: "Asien-Pazifik",
    description: "Japan, Australien, Südkorea, Hongkong, Singapur"
  },
  {
    value: "cash_in_aktienfonds",
    label: "Cash in Aktienfonds",
    description: "Liquiditätsanteil in Aktienfonds"
  }
];

// Währungen
export const CURRENCIES: CategoryOption[] = [
  {
    value: "eur",
    label: "Euro (EUR)",
    description: "Euro-denominierte Anlagen"
  },
  {
    value: "usd",
    label: "US-Dollar (USD)", 
    description: "US-Dollar-denominierte Anlagen"
  },
  {
    value: "chf",
    label: "Schweizer Franken (CHF)",
    description: "Schweizer Franken-denominierte Anlagen"
  },
  {
    value: "gbp",
    label: "Britisches Pfund (GBP)",
    description: "Britisches Pfund-denominierte Anlagen"
  },
  {
    value: "sonstige_waehrungen",
    label: "Sonstige Währungen",
    description: "JPY, CAD, AUD, SEK, NOK und andere Währungen"
  }
];

// Hilfsfunktion zum Abrufen der Kategorien basierend auf dem Typ
export function getCategoriesByType(type: 'assetClasses' | 'regions' | 'currencies' | 'positions'): CategoryOption[] {
  switch (type) {
    case 'assetClasses':
      return ASSET_CLASSES;
    case 'regions':
      return REGIONS;
    case 'currencies':
      return CURRENCIES;
    case 'positions':
      return []; // Positions are handled separately via Investment Universe
    default:
      return [];
  }
}

// Standard-Allokationen für neue Zielstrukturen
export const DEFAULT_ALLOCATIONS = {
  assetClasses: [
    { identifier: "aktien", targetPercentage: 60 },
    { identifier: "anleihen", targetPercentage: 30 },
    { identifier: "liquiditaet_cash", targetPercentage: 10 }
  ],
  regions: [
    { identifier: "europa_inkl_uk", targetPercentage: 40 },
    { identifier: "usa_nordamerika", targetPercentage: 35 },
    { identifier: "emerging_markets", targetPercentage: 25 }
  ],
  currencies: [
    { identifier: "eur", targetPercentage: 50 },
    { identifier: "usd", targetPercentage: 35 },
    { identifier: "sonstige_waehrungen", targetPercentage: 15 }
  ]
};

// Hilfsfunktion zum Konvertieren von identifier zu Label
export function getDisplayLabelForIdentifier(identifier: string, type: 'assetClasses' | 'regions' | 'currencies'): string {
  const categories = getCategoriesByType(type);
  const category = categories.find(cat => cat.value === identifier);
  return category?.label || identifier;
}