import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';

interface Position {
  name: string;
  isin?: string | null;
  value: number;
}

interface AnalysisOptions {
  portfolioId: string;
  totalValue: number;
}

class ClaudeAnalysisService {
  private anthropic: Anthropic;
  private saaPrompt: string | null = null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    this.anthropic = new Anthropic({ apiKey });
    this.loadSAAPrompt();
  }

  private async loadSAAPrompt() {
    try {
      const promptPath = path.join(process.cwd(), 'server', 'services', 'claudeSAA.md');
      console.log('Looking for prompt at:', promptPath);
      this.saaPrompt = await fs.readFile(promptPath, 'utf-8');
      console.log('✅ Claude SAA prompt loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load Claude SAA prompt:', error);
      this.saaPrompt = this.getDefaultPrompt();
    }
  }

  private getDefaultPrompt(): string {
    return `Du bist ein Portfolio-Analyst. Analysiere das folgende Portfolio und gib eine strukturierte Analyse zurück.
    
    Bitte analysiere:
    1. Asset-Allokation (Aktien, Anleihen, etc.)
    2. Geografische Verteilung
    3. Währungsexposition
    4. Risikometriken
    
    Gib die Ergebnisse als strukturiertes JSON zurück.`;
  }

  async analyzePortfolio(positions: Position[], options: AnalysisOptions): Promise<any> {
    try {
      const prompt = this.saaPrompt || this.getDefaultPrompt();
      
      // Prepare portfolio data for Claude
      const portfolioData = {
        totalValue: options.totalValue,
        positionCount: positions.length,
        positions: positions.map(p => ({
          name: p.name,
          isin: p.isin || 'N/A',
          value: p.value,
          percentage: (p.value / options.totalValue * 100).toFixed(2) + '%'
        }))
      };

      const userMessage = `
${prompt}

Portfolio-Daten:
${JSON.stringify(portfolioData, null, 2)}

Bitte analysiere dieses Portfolio vollständig und gib die Ergebnisse als strukturiertes JSON zurück mit:
- assetAllocation: Array von {category: string, value: number, percentage: number, assignedPositions: [{name: string, isin: string, value: number, percentage: number}]}
- geographicAllocation: Array von {region: string, value: number, percentage: number, assignedPositions: [{name: string, isin: string, value: number, percentage: number}]}
- currencyExposure: Array von {currency: string, value: number, percentage: number, assignedPositions: [{name: string, isin: string, value: number, percentage: number}]}
- riskMetrics: Objekt mit expectedReturn, volatility, sharpeRatio, etc.
- summary: Textuelle Zusammenfassung der Analyse

WICHTIG: Für jede Kategorie (Asset-Klasse, geografische Region, Währung) zeige in assignedPositions auf, welche konkreten Portfolio-Positionen du dieser Kategorie zugeordnet hast. Dies ermöglicht Transparenz über deine Kategorisierungslogik.
`;

      console.log(`🤖 Sending portfolio with ${positions.length} positions to Claude for analysis...`);

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        temperature: 0.2,
        messages: [{
          role: 'user',
          content: userMessage
        }]
      });

      // Extract JSON from Claude's response
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Try to parse JSON from the response
      let analysisResults;
      try {
        // Look for JSON in the response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResults = JSON.parse(jsonMatch[0]);
        } else {
          // If no JSON found, return the raw text
          analysisResults = {
            rawAnalysis: content.text,
            error: 'Could not parse structured JSON from response'
          };
        }
      } catch (parseError) {
        console.warn('Failed to parse JSON from Claude response:', parseError);
        analysisResults = {
          rawAnalysis: content.text,
          error: 'JSON parsing failed'
        };
      }

      console.log('✅ Claude analysis completed');
      return analysisResults;

    } catch (error) {
      console.error('❌ Claude analysis failed:', error);
      throw error;
    }
  }

  async analyzeReallocation(
    positions: Position[], 
    currentAnalysis: any,
    targetStructure: any,
    portfolioId: string
  ): Promise<any> {
    try {
      const reallocationPrompt = `Du bist ein erfahrener Portfolio-Analyst für Reallokation-Analysen. 

Analysiere das folgende Portfolio und erstelle eine detaillierte Reallokation-Empfehlung zur Erreichung der Zielstruktur.

AKTUELLES PORTFOLIO:
${JSON.stringify({
  portfolioId,
  positions: positions.map(p => ({
    name: p.name,
    isin: p.isin || 'N/A',
    value: p.value,
    percentage: ((p.value / positions.reduce((sum, pos) => sum + pos.value, 0)) * 100).toFixed(2) + '%'
  })),
  totalValue: positions.reduce((sum, pos) => sum + pos.value, 0),
  currentStructure: currentAnalysis
}, null, 2)}

GEWÜNSCHTE ZIELSTRUKTUR:
${JSON.stringify(targetStructure, null, 2)}

Erstelle eine strukturierte Reallokation-Analyse als JSON mit folgender Struktur:

{
  "recommendations": [
    {
      "action": "buy|sell|hold|adjust",
      "positionName": "Name der Position",
      "isin": "ISIN falls verfügbar",
      "category": "position|assetClass|region|currency",
      "currentAmount": 0,
      "currentPercentage": 0,
      "targetAmount": 0,
      "targetPercentage": 0,
      "changeAmount": 0,
      "changePercentage": 0,
      "priority": "high|medium|low",
      "reasoning": "Detaillierte Begründung für diese Empfehlung",
      "estimatedCost": 0,
      "taxImplication": "Steuerliche Auswirkungen"
    }
  ],
  "summary": {
    "totalBuyAmount": 0,
    "totalSellAmount": 0,
    "estimatedTotalCost": 0,
    "numberOfTransactions": 0,
    "reallocationEfficiency": 85,
    "riskImpact": "positive|negative|neutral",
    "expectedImprovement": ["Liste der erwarteten Verbesserungen"]
  },
  "deviationAnalysis": {
    "assetClassDeviation": 0,
    "regionDeviation": 0,
    "currencyDeviation": 0,
    "overallDeviation": 0
  },
  "claudeAnalysis": {
    "detailedRecommendations": "Ausführliche deutsche Analyse",
    "riskAssessment": "Risikobewertung der Umschichtungen",
    "taxConsiderations": "Steuerliche Überlegungen",
    "alternativeStrategies": ["Alternative Reallokation-Strategien"]
  }
}

WICHTIGE REALLOKATIONS-PRIORITÄTEN:

1. **Position-spezifische Ziele haben höchste Priorität**: Wenn Zielstruktur explizite Position-Targets (positions Array) enthält, haben diese Vorrang vor kategorialen Targets.

2. **Multi-Level-Ansatz**: 
   - Primär: Erfülle spezifische Positionsziele (falls definiert)
   - Sekundär: Erfülle Asset-Klassen, Regions- und Währungsziele
   - Balance zwischen beiden bei Konflikten

3. **Position-Target-Logik**:
   - Jede Position mit targetPercentage > 0 soll auf genau diesen Wert rebalanced werden
   - Positions ohne explizite Targets können zur Erfüllung kategorialer Ziele verwendet werden
   - Bei partieller Positionsabdeckung (<100% der Targets): Verbleibende Allokation nach kategorialen Zielen

Berücksichtige zusätzlich:
- Deutsche Steuergesetze (Abgeltungssteuer, Verlusttöpfe)
- Transaktionskosten (ca. 0,25-1% je Trade)
- Minimale Handelsgrößen
- Liquidität der Positionen
- Risiko-Auswirkungen der Umschichtungen
- Effiziente Reihenfolge der Trades
- Prioritätshierarchie: Position-Targets → Kategoriale Targets → Portfolio-Balance`;

      console.log(`🤖 Starting Claude reallocation analysis for portfolio ${portfolioId}...`);

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        temperature: 0.2,
        messages: [{
          role: 'user',
          content: reallocationPrompt
        }]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Try to parse JSON from the response
      let reallocationResults;
      try {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          reallocationResults = JSON.parse(jsonMatch[0]);
        } else {
          reallocationResults = {
            rawAnalysis: content.text,
            error: 'Could not parse structured JSON from response'
          };
        }
      } catch (parseError) {
        console.warn('Failed to parse JSON from Claude reallocation response:', parseError);
        reallocationResults = {
          rawAnalysis: content.text,
          error: 'JSON parsing failed'
        };
      }

      console.log('✅ Claude reallocation analysis completed');
      return reallocationResults;

    } catch (error) {
      console.error('❌ Claude reallocation analysis failed:', error);
      throw error;
    }
  }
}

export const claudeService = new ClaudeAnalysisService();