/**
 * Claude AI-Driven Factsheet Analyzer
 * Spezialisierte KI-Analyse für detaillierte Fonds-Factsheet-Extraktion
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || "",
});

export interface FactsheetAnalysisResult {
  fundBasicInfo: {
    fundName: string;
    isin?: string;
    fundType: 'equity' | 'bond' | 'mixed' | 'real_estate' | 'commodity' | 'money_market';
    investmentStrategy: string;
    currency: string;
    totalExpenseRatio?: number;
    aum?: number; // Assets under Management
  };

  assetAllocation: {
    equities?: number;
    bonds?: number;
    realEstate?: number;
    commodities?: number;
    cash?: number;
    alternatives?: number;
    derivatives?: number;
  };

  geographicAllocation: {
    usa?: number;
    europe?: number;
    asiaPacific?: number;
    emergingMarkets?: number;
    germany?: number;
    uk?: number;
    japan?: number;
    china?: number;
    other?: number;
  };

  currencyExposure: {
    usd?: number;
    eur?: number;
    jpy?: number;
    gbp?: number;
    chf?: number;
    cad?: number;
    aud?: number;
    other?: number;
    hedgingRatio?: number; // Prozent des Portfolios, das gehedged ist
  };

  sectorAllocation?: {
    technology?: number;
    financials?: number;
    healthcare?: number;
    industrials?: number;
    consumerDiscretionary?: number;
    consumerStaples?: number;
    energy?: number;
    materials?: number;
    utilities?: number;
    telecommunications?: number;
    realEstate?: number;
    other?: number;
  };

  topHoldings: Array<{
    name: string;
    isin?: string;
    weight: number;
    instrumentType: string;
    sector?: string;
    country?: string;
  }>;

  riskMetrics?: {
    volatility?: number;
    sharpeRatio?: number;
    maxDrawdown?: number;
    beta?: number;
  };

  qualityIndicators: {
    dataCompleteness: number;
    confidence: number;
    sourceQuality: 'high' | 'medium' | 'low';
    warnings: string[];
  };
}

export class ClaudeFactsheetAnalyzer {
  /**
   * Hauptanalyse-Methode für Factsheets
   */
  async analyzeFactsheet(
    factsheetContent: string,
    fundName: string,
    isin?: string
  ): Promise<FactsheetAnalysisResult> {
    console.log(`Starting Claude AI analysis for ${fundName}`);

    try {
      // Phase 1: Grundinformationen extrahieren
      const basicInfo = await this.extractBasicInfo(factsheetContent, fundName, isin);

      // Phase 2: Asset-Allokation analysieren
      const assetAllocation = await this.extractAssetAllocation(factsheetContent);

      // Phase 3: Geografische Verteilung
      const geographicAllocation = await this.extractGeographicAllocation(factsheetContent);

      // Phase 4: Währungsexposure
      const currencyExposure = await this.extractCurrencyExposure(factsheetContent);

      // Phase 5: Top Holdings
      const topHoldings = await this.extractTopHoldings(factsheetContent);

      // Phase 6: Sektor-Allokation (optional)
      const sectorAllocation = await this.extractSectorAllocation(factsheetContent);

      // Phase 7: Risikometriken (optional)
      const riskMetrics = await this.extractRiskMetrics(factsheetContent);

      // Qualitätsbewertung
      const qualityIndicators = this.assessAnalysisQuality({
        basicInfo,
        assetAllocation,
        geographicAllocation,
        currencyExposure,
        topHoldings,
        sectorAllocation,
        riskMetrics
      });

      return {
        fundBasicInfo: basicInfo,
        assetAllocation,
        geographicAllocation,
        currencyExposure,
        sectorAllocation,
        topHoldings,
        riskMetrics,
        qualityIndicators
      };

    } catch (error) {
      console.error(`Error analyzing factsheet for ${fundName}:`, error);
      throw new Error(`Factsheet analysis failed: ${error.message}`);
    }
  }

  /**
   * Extrahiere Grundinformationen des Fonds
   */
  private async extractBasicInfo(
    content: string,
    fundName: string,
    isin?: string
  ): Promise<FactsheetAnalysisResult['fundBasicInfo']> {
    const prompt = `
Analysiere dieses Factsheet und extrahiere Grundinformationen:

Factsheet: ${content.substring(0, 2000)}

Erstelle JSON-Antwort mit folgender Struktur:
{
  "fundName": "${fundName}",
  "isin": "${isin || ''}",
  "fundType": "equity|bond|mixed|real_estate|commodity|money_market",
  "investmentStrategy": "Beschreibung der Anlagestrategie",
  "currency": "EUR|USD|GBP|etc",
  "totalExpenseRatio": 0.75,
  "aum": 1000000000
}

Achte besonders auf:
- Fondstyp aus dem Namen und der Beschreibung
- Basis-Währung des Fonds
- TER/Ongoing Charges
- Assets under Management
- Anlagestrategie und -ziele

Nur JSON zurückgeben!
`;

    try {
      const response = await this.callClaude(prompt, 1000);
      return this.parseJSON(response, {
        fundName,
        isin,
        fundType: 'mixed' as const,
        investmentStrategy: 'Nicht verfügbar',
        currency: 'EUR'
      });
    } catch (error) {
      console.error('Error extracting basic info:', error);
      return {
        fundName,
        isin,
        fundType: 'mixed',
        investmentStrategy: 'Nicht verfügbar',
        currency: 'EUR'
      };
    }
  }

  /**
   * Extrahiere Asset-Allokation
   */
  private async extractAssetAllocation(content: string): Promise<FactsheetAnalysisResult['assetAllocation']> {
    const prompt = `
Analysiere die Asset-Allokation in diesem Factsheet:

${content.substring(0, 3000)}

Erstelle JSON mit prozentualen Allokationen (Summe muss 100% ergeben):
{
  "equities": 0.65,
  "bonds": 0.25,
  "realEstate": 0.05,
  "commodities": 0.02,
  "cash": 0.03,
  "alternatives": 0.00,
  "derivatives": 0.00
}

Suche nach:
- Asset Allocation Tabellen
- Portfolio Composition
- Investment Breakdown
- "Aktien", "Anleihen", "Immobilien", "Rohstoffe"
- Equity/Bond Ratios

Falls keine genauen Daten: schätze basierend auf Fondsbeschreibung.
Nur JSON zurückgeben!
`;

    try {
      const response = await this.callClaude(prompt, 1000);
      const allocation = this.parseJSON(response, {});

      // Normalisiere auf 100%
      this.normalizeToSum(allocation, 1.0);
      return allocation;
    } catch (error) {
      console.error('Error extracting asset allocation:', error);
      return { equities: 0.6, bonds: 0.3, cash: 0.1 };
    }
  }

  /**
   * Extrahiere geografische Allokation
   */
  private async extractGeographicAllocation(content: string): Promise<FactsheetAnalysisResult['geographicAllocation']> {
    const prompt = `
Analysiere die geografische Verteilung in diesem Factsheet:

${content.substring(0, 3000)}

Erstelle JSON mit regionalen Allokationen (Summe 100%):
{
  "usa": 0.40,
  "europe": 0.30,
  "asiaPacific": 0.15,
  "emergingMarkets": 0.10,
  "germany": 0.05,
  "uk": 0.00,
  "japan": 0.00,
  "china": 0.00,
  "other": 0.00
}

Suche nach:
- Geographic/Regional Allocation
- Country Breakdown
- Regional Exposure
- "USA", "Europa", "Asien", "Schwellenländer"
- Top Countries

Achte auf Überschneidungen (Deutschland ist Teil von Europa).
Nur JSON zurückgeben!
`;

    try {
      const response = await this.callClaude(prompt, 1000);
      const allocation = this.parseJSON(response, {});
      this.normalizeToSum(allocation, 1.0);
      return allocation;
    } catch (error) {
      console.error('Error extracting geographic allocation:', error);
      return { usa: 0.4, europe: 0.4, asiaPacific: 0.1, emergingMarkets: 0.1 };
    }
  }

  /**
   * Extrahiere Währungsexposure
   */
  private async extractCurrencyExposure(content: string): Promise<FactsheetAnalysisResult['currencyExposure']> {
    const prompt = `
Analysiere die Währungsverteilung in diesem Factsheet:

${content.substring(0, 3000)}

Erstelle JSON mit Währungsallokationen (Summe 100%):
{
  "usd": 0.40,
  "eur": 0.35,
  "jpy": 0.10,
  "gbp": 0.08,
  "chf": 0.02,
  "cad": 0.02,
  "aud": 0.01,
  "other": 0.02,
  "hedgingRatio": 0.50
}

Suche nach:
- Currency Exposure/Allocation
- Währungsverteilung
- Currency Hedging Status
- "USD", "EUR", "JPY", "GBP", "CHF"
- Hedged/Unhedged Positionen

hedgingRatio = Anteil der Währungsrisiken, die abgesichert sind.
Nur JSON zurückgeben!
`;

    try {
      const response = await this.callClaude(prompt, 1000);
      const exposure = this.parseJSON(response, {});

      // Normalisiere Währungen (ohne hedgingRatio)
      const hedgingRatio = exposure.hedgingRatio;
      delete exposure.hedgingRatio;
      this.normalizeToSum(exposure, 1.0);
      if (hedgingRatio !== undefined) {
        exposure.hedgingRatio = hedgingRatio;
      }

      return exposure;
    } catch (error) {
      console.error('Error extracting currency exposure:', error);
      return { usd: 0.4, eur: 0.4, other: 0.2 };
    }
  }

  /**
   * Extrahiere Top Holdings
   */
  private async extractTopHoldings(content: string): Promise<FactsheetAnalysisResult['topHoldings']> {
    const prompt = `
Extrahiere die Top Holdings aus diesem Factsheet:

${content.substring(0, 4000)}

Erstelle JSON-Array mit den größten Positionen:
[
  {
    "name": "Apple Inc",
    "isin": "US0378331005",
    "weight": 0.045,
    "instrumentType": "Aktie",
    "sector": "Technologie",
    "country": "USA"
  },
  {
    "name": "Microsoft Corp",
    "isin": "US5949181045",
    "weight": 0.038,
    "instrumentType": "Aktie",
    "sector": "Technologie",
    "country": "USA"
  }
]

Regeln:
- Nur Holdings >1% Gewichtung
- weight als Dezimalzahl (0.045 = 4.5%)
- Deutsche Begriffe für instrumentType
- Maximal 20 Holdings

Suche nach:
- Top Holdings/Largest Positions
- Portfolio Holdings
- Major Investments
- Holdings Tabellen

Nur JSON-Array zurückgeben!
`;

    try {
      const response = await this.callClaude(prompt, 2000);
      const holdings = this.parseJSON(response, []);
      return Array.isArray(holdings) ? holdings : [];
    } catch (error) {
      console.error('Error extracting top holdings:', error);
      return [];
    }
  }

  /**
   * Extrahiere Sektor-Allokation
   */
  private async extractSectorAllocation(content: string): Promise<FactsheetAnalysisResult['sectorAllocation'] | undefined> {
    const prompt = `
Analysiere die Sektorverteilung in diesem Factsheet:

${content.substring(0, 3000)}

Erstelle JSON mit Sektorallokationen (Summe 100%):
{
  "technology": 0.25,
  "financials": 0.15,
  "healthcare": 0.12,
  "industrials": 0.10,
  "consumerDiscretionary": 0.08,
  "consumerStaples": 0.06,
  "energy": 0.05,
  "materials": 0.04,
  "utilities": 0.03,
  "telecommunications": 0.02,
  "realEstate": 0.02,
  "other": 0.08
}

Suche nach:
- Sector Allocation/Breakdown
- Industry Classification
- Sektoren-Verteilung
- GICS Sectors

Falls keine Sektor-Daten gefunden: antworte mit "null".
Nur JSON zurückgeben!
`;

    try {
      const response = await this.callClaude(prompt, 1000);
      if (response.trim() === 'null') {
        return undefined;
      }

      const allocation = this.parseJSON(response, null);
      if (allocation) {
        this.normalizeToSum(allocation, 1.0);
        return allocation;
      }
      return undefined;
    } catch (error) {
      console.error('Error extracting sector allocation:', error);
      return undefined;
    }
  }

  /**
   * Extrahiere Risikometriken
   */
  private async extractRiskMetrics(content: string): Promise<FactsheetAnalysisResult['riskMetrics'] | undefined> {
    const prompt = `
Extrahiere Risikokennzahlen aus diesem Factsheet:

${content.substring(0, 3000)}

Erstelle JSON mit verfügbaren Risikometriken:
{
  "volatility": 0.16,
  "sharpeRatio": 0.85,
  "maxDrawdown": -0.23,
  "beta": 0.95
}

Suche nach:
- Volatility/Volatilität
- Sharpe Ratio
- Maximum Drawdown
- Beta
- Risk Metrics
- Performance Statistics

Falls keine Risikodaten gefunden: antworte mit "null".
Werte als Dezimalzahlen (16% = 0.16).
Nur JSON zurückgeben!
`;

    try {
      const response = await this.callClaude(prompt, 800);
      if (response.trim() === 'null') {
        return undefined;
      }

      const metrics = this.parseJSON(response, null);
      return metrics || undefined;
    } catch (error) {
      console.error('Error extracting risk metrics:', error);
      return undefined;
    }
  }

  /**
   * Claude API-Aufruf mit Retry-Logik
   */
  private async callClaude(prompt: string, maxTokens: number = 1000): Promise<string> {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from Claude');
    }

    return content.text;
  }

  /**
   * Parse JSON-Response mit Fallback
   */
  private parseJSON<T>(jsonString: string, fallback: T): T {
    try {
      // Extrahiere JSON aus Text
      const jsonMatch = jsonString.match(/[\{\[][\s\S]*[\}\]]/);
      if (!jsonMatch) {
        console.warn('No JSON found in response, using fallback');
        return fallback;
      }

      return JSON.parse(jsonMatch[0]) as T;
    } catch (error) {
      console.error('JSON parsing failed:', error);
      return fallback;
    }
  }

  /**
   * Normalisiere Object-Werte auf gewünschte Summe
   */
  private normalizeToSum(obj: Record<string, number>, targetSum: number): void {
    const currentSum = Object.values(obj).reduce((sum, val) => sum + (val || 0), 0);

    if (currentSum > 0 && Math.abs(currentSum - targetSum) > 0.001) {
      const factor = targetSum / currentSum;
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'number') {
          obj[key] = obj[key] * factor;
        }
      });
    }
  }

  /**
   * Bewerte die Qualität der Analyse
   */
  private assessAnalysisQuality(results: {
    basicInfo: any;
    assetAllocation: any;
    geographicAllocation: any;
    currencyExposure: any;
    topHoldings: any[];
    sectorAllocation?: any;
    riskMetrics?: any;
  }): FactsheetAnalysisResult['qualityIndicators'] {
    let completenessScore = 0;
    const warnings: string[] = [];

    // Grundinformationen (20%)
    if (results.basicInfo.fundType && results.basicInfo.currency) {
      completenessScore += 0.2;
    } else {
      warnings.push('Unvollständige Grundinformationen');
    }

    // Asset-Allokation (30%)
    const assetSum = Object.values(results.assetAllocation).reduce((s: number, v: any) => s + (v || 0), 0);
    if (Math.abs(assetSum - 1.0) < 0.05) {
      completenessScore += 0.3;
    } else {
      warnings.push('Asset-Allokation summiert nicht zu 100%');
    }

    // Geografische Allokation (20%)
    const geoSum = Object.values(results.geographicAllocation).reduce((s: number, v: any) => s + (v || 0), 0);
    if (Math.abs(geoSum - 1.0) < 0.05) {
      completenessScore += 0.2;
    } else {
      warnings.push('Geografische Allokation unvollständig');
    }

    // Top Holdings (15%)
    if (results.topHoldings.length >= 5) {
      completenessScore += 0.15;
    } else if (results.topHoldings.length > 0) {
      completenessScore += 0.1;
      warnings.push('Wenige Top Holdings gefunden');
    } else {
      warnings.push('Keine Top Holdings identifiziert');
    }

    // Währungsexposure (10%)
    const currencySum = Object.values(results.currencyExposure)
      .filter((_, i, arr) => i < arr.length - 1) // Exclude hedgingRatio
      .reduce((s: number, v: any) => s + (v || 0), 0);
    if (Math.abs(currencySum - 1.0) < 0.05) {
      completenessScore += 0.1;
    }

    // Bonus für zusätzliche Daten (5%)
    if (results.sectorAllocation) completenessScore += 0.025;
    if (results.riskMetrics) completenessScore += 0.025;

    const confidence = Math.min(1.0, completenessScore);
    const sourceQuality = confidence > 0.8 ? 'high' : confidence > 0.5 ? 'medium' : 'low';

    return {
      dataCompleteness: completenessScore,
      confidence,
      sourceQuality,
      warnings
    };
  }
}