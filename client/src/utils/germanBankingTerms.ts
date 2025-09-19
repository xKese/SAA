/**
 * German Banking and Financial Terminology
 * Comprehensive localization for Meeder & Seifer Portfolio Analyzer
 */

export interface GermanTerm {
  german: string;
  english?: string;
  description?: string;
  category: 'general' | 'risk' | 'compliance' | 'analysis' | 'instruments' | 'regulatory';
}

export const germanBankingTerms: Record<string, GermanTerm> = {
  // General Portfolio Terms
  'portfolio': {
    german: 'Portfolio',
    english: 'Portfolio',
    description: 'Gesamtheit aller Anlagen eines Investors',
    category: 'general'
  },
  'position': {
    german: 'Position',
    english: 'Position',
    description: 'Einzelne Anlage im Portfolio',
    category: 'general'
  },
  'allocation': {
    german: 'Allokation',
    english: 'Allocation',
    description: 'Verteilung des Kapitals auf verschiedene Anlagen',
    category: 'general'
  },
  'diversification': {
    german: 'Diversifikation',
    english: 'Diversification',
    description: 'Risikostreuung durch Verteilung auf verschiedene Anlagen',
    category: 'general'
  },

  // Risk Management Terms
  'var': {
    german: 'Value-at-Risk (VaR)',
    english: 'Value at Risk',
    description: 'Maximaler erwarteter Verlust bei gegebenem Konfidenzniveau',
    category: 'risk'
  },
  'cvar': {
    german: 'Conditional VaR (CVaR)',
    english: 'Conditional Value at Risk',
    description: 'Erwarteter Verlust über dem VaR-Schwellenwert',
    category: 'risk'
  },
  'volatility': {
    german: 'Volatilität',
    english: 'Volatility',
    description: 'Schwankungsbreite der Renditen',
    category: 'risk'
  },
  'sharpe_ratio': {
    german: 'Sharpe-Ratio',
    english: 'Sharpe Ratio',
    description: 'Risikoadjustierte Rendite-Kennzahl',
    category: 'risk'
  },
  'max_drawdown': {
    german: 'Maximaler Drawdown',
    english: 'Maximum Drawdown',
    description: 'Größter Wertverlust von einem Höchststand',
    category: 'risk'
  },
  'monte_carlo': {
    german: 'Monte-Carlo-Simulation',
    english: 'Monte Carlo Simulation',
    description: 'Stochastisches Verfahren zur Risikoberechnung',
    category: 'risk'
  },

  // German Regulatory Terms
  'bafin': {
    german: 'BaFin',
    english: 'Federal Financial Supervisory Authority',
    description: 'Bundesanstalt für Finanzdienstleistungsaufsicht',
    category: 'regulatory'
  },
  'wphg': {
    german: 'WpHG',
    english: 'Securities Trading Act',
    description: 'Wertpapierhandelsgesetz',
    category: 'regulatory'
  },
  'mifid': {
    german: 'MiFID II',
    english: 'Markets in Financial Instruments Directive',
    description: 'Richtlinie über Märkte für Finanzinstrumente',
    category: 'regulatory'
  },
  'srep': {
    german: 'SREP',
    english: 'Supervisory Review and Evaluation Process',
    description: 'Aufsichtliches Überprüfungs- und Bewertungsverfahren',
    category: 'regulatory'
  },
  'ucits': {
    german: 'OGAW',
    english: 'UCITS',
    description: 'Organismen für gemeinsame Anlagen in Wertpapieren',
    category: 'regulatory'
  },
  'kagb': {
    german: 'KAGB',
    english: 'Investment Code',
    description: 'Kapitalanlagegesetzbuch',
    category: 'regulatory'
  },

  // Compliance Terms
  'compliance': {
    german: 'Compliance',
    english: 'Compliance',
    description: 'Einhaltung regulatorischer Vorschriften',
    category: 'compliance'
  },
  'due_diligence': {
    german: 'Due Diligence',
    english: 'Due Diligence',
    description: 'Sorgfaltspflicht bei Investmentanalyse',
    category: 'compliance'
  },
  'suitability': {
    german: 'Geeignetheitsprüfung',
    english: 'Suitability Assessment',
    description: 'Prüfung der Angemessenheit für den Kunden',
    category: 'compliance'
  },
  'appropriateness': {
    german: 'Angemessenheitsprüfung',
    english: 'Appropriateness Assessment',
    description: 'Prüfung der Produktkenntnis des Kunden',
    category: 'compliance'
  },

  // Analysis Terms
  'look_through': {
    german: 'Look-Through-Analyse',
    english: 'Look-Through Analysis',
    description: 'Durchschau-Analyse der zugrunde liegenden Bestände',
    category: 'analysis'
  },
  'decomposition': {
    german: 'Dekomposition',
    english: 'Decomposition',
    description: 'Aufschlüsselung komplexer Strukturen',
    category: 'analysis'
  },
  'stress_test': {
    german: 'Stresstest',
    english: 'Stress Test',
    description: 'Belastungsprüfung unter extremen Marktbedingungen',
    category: 'analysis'
  },
  'scenario_analysis': {
    german: 'Szenario-Analyse',
    english: 'Scenario Analysis',
    description: 'Analyse verschiedener Marktszenarien',
    category: 'analysis'
  },
  'correlation': {
    german: 'Korrelation',
    english: 'Correlation',
    description: 'Statistische Abhängigkeit zwischen Anlagen',
    category: 'analysis'
  },

  // Financial Instruments
  'fund': {
    german: 'Fonds',
    english: 'Fund',
    description: 'Sondervermögen zur kollektiven Kapitalanlage',
    category: 'instruments'
  },
  'etf': {
    german: 'ETF',
    english: 'Exchange-Traded Fund',
    description: 'Börsengehandelter Indexfonds',
    category: 'instruments'
  },
  'bond': {
    german: 'Anleihe',
    english: 'Bond',
    description: 'Festverzinsliches Wertpapier',
    category: 'instruments'
  },
  'equity': {
    german: 'Aktie',
    english: 'Equity/Stock',
    description: 'Anteilsschein an einer Aktiengesellschaft',
    category: 'instruments'
  },
  'derivative': {
    german: 'Derivat',
    english: 'Derivative',
    description: 'Abgeleitetes Finanzinstrument',
    category: 'instruments'
  },
  'structured_product': {
    german: 'Strukturiertes Produkt',
    english: 'Structured Product',
    description: 'Komplexes Finanzprodukt mit eingebetteten Derivaten',
    category: 'instruments'
  },

  // Quality and Validation Terms
  'data_quality': {
    german: 'Datenqualität',
    english: 'Data Quality',
    description: 'Güte und Verlässlichkeit der verwendeten Daten',
    category: 'analysis'
  },
  'validation': {
    german: 'Validierung',
    english: 'Validation',
    description: 'Überprüfung auf Korrektheit und Plausibilität',
    category: 'analysis'
  },
  'confidence_level': {
    german: 'Konfidenzniveau',
    english: 'Confidence Level',
    description: 'Wahrscheinlichkeit der statistischen Aussage',
    category: 'analysis'
  },
  'benchmark': {
    german: 'Benchmark',
    english: 'Benchmark',
    description: 'Vergleichsindex für Performance-Messung',
    category: 'analysis'
  }
};

/**
 * Get German term by key
 */
export const getGermanTerm = (key: string): string => {
  return germanBankingTerms[key]?.german || key;
};

/**
 * Get term description
 */
export const getTermDescription = (key: string): string | undefined => {
  return germanBankingTerms[key]?.description;
};

/**
 * Get terms by category
 */
export const getTermsByCategory = (category: GermanTerm['category']): Record<string, GermanTerm> => {
  return Object.entries(germanBankingTerms)
    .filter(([_, term]) => term.category === category)
    .reduce((acc, [key, term]) => ({ ...acc, [key]: term }), {});
};

/**
 * Format currency in German style
 */
export const formatCurrencyDE = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format percentage in German style
 */
export const formatPercentageDE = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

/**
 * Format number in German style
 */
export const formatNumberDE = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Format date in German style
 */
export const formatDateDE = (date: Date | string, includeTime: boolean = false): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (includeTime) {
    return dateObj.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return dateObj.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * German banking status translations
 */
export const statusTranslations = {
  'pending': 'Ausstehend',
  'analyzing': 'Analyse läuft',
  'completed': 'Abgeschlossen',
  'failed': 'Fehlgeschlagen',
  'running': 'Läuft',
  'success': 'Erfolgreich',
  'warning': 'Warnung',
  'error': 'Fehler',
  'compliant': 'Konform',
  'non_compliant': 'Nicht konform',
  'advisory': 'Beratend',
  'valid': 'Gültig',
  'invalid': 'Ungültig'
};

/**
 * Get German status translation
 */
export const getStatusDE = (status: string): string => {
  return statusTranslations[status as keyof typeof statusTranslations] || status;
};

/**
 * German phase descriptions
 */
export const phaseDescriptions = {
  7: 'Multi-Level Look-Through Analyse - 3-stufige Fonds-Dekomposition nach BaFin-Standards',
  8: 'Hybrid-Risikometriken - Monte-Carlo-Simulationen und VaR/CVaR-Berechnungen',
  9: 'Deutsche Compliance-Berichterstattung - MiFID II, WpHG, BaFin SREP konforme Berichte',
  10: 'Investment Universe Wartung - Qualitätssicherung und Datenaktualisierung',
  11: 'Erweiterte Analyse-Features - Orchestrierte Kombination aller Module',
  12: 'High-Performance Orchestrierung - Parallele Ausführung für maximale Effizienz'
};

/**
 * German risk level descriptions
 */
export const riskLevels = {
  'very_low': { german: 'Sehr niedrig', color: 'green', description: 'Konservativ, geringe Schwankungen' },
  'low': { german: 'Niedrig', color: 'lightgreen', description: 'Sicherheitsorientiert mit leichten Schwankungen' },
  'moderate': { german: 'Moderat', color: 'yellow', description: 'Ausgewogen zwischen Sicherheit und Rendite' },
  'high': { german: 'Hoch', color: 'orange', description: 'Renditeorientiert mit höheren Schwankungen' },
  'very_high': { german: 'Sehr hoch', color: 'red', description: 'Spekulativ mit starken Schwankungen' }
};

/**
 * Asset class translations
 */
export const assetClassTranslations = {
  'equities': 'Aktien',
  'bonds': 'Anleihen',
  'alternatives': 'Alternative Investments',
  'cash': 'Liquidität',
  'commodities': 'Rohstoffe',
  'real_estate': 'Immobilien',
  'private_equity': 'Private Equity',
  'hedge_funds': 'Hedge Fonds'
};

/**
 * Geographic region translations
 */
export const regionTranslations = {
  'europe': 'Europa',
  'north_america': 'Nordamerika',
  'asia_pacific': 'Asien-Pazifik',
  'emerging_markets': 'Schwellenländer',
  'germany': 'Deutschland',
  'usa': 'USA',
  'china': 'China',
  'japan': 'Japan'
};

export default {
  germanBankingTerms,
  getGermanTerm,
  getTermDescription,
  getTermsByCategory,
  formatCurrencyDE,
  formatPercentageDE,
  formatNumberDE,
  formatDateDE,
  getStatusDE,
  phaseDescriptions,
  riskLevels,
  assetClassTranslations,
  regionTranslations
};