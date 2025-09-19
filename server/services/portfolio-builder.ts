import { ClaudePortfolioAnalysisService } from './claude';
import { UniverseManager } from './universe-manager';
import { ComplianceValidator } from './compliance-validator';
import { db } from '../db';
import { portfolios, portfolio_positions } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Portfolio Builder Service
 * Konstruiert optimierte Portfolios basierend auf strategischen Vorgaben
 * WICHTIG: Alle Berechnungen und Optimierungen werden an Claude delegiert
 */
export class PortfolioBuilder {
  private claudeService: ClaudePortfolioAnalysisService;
  private universeManager: UniverseManager;
  private complianceValidator: ComplianceValidator;

  constructor() {
    this.claudeService = ClaudePortfolioAnalysisService.getInstance();
    this.universeManager = new UniverseManager();
    this.complianceValidator = new ComplianceValidator();
  }

  /**
   * Erstellt ein optimiertes Portfolio basierend auf strategischen Asset Allocation Vorgaben
   */
  async buildOptimizedPortfolio(request: {
    basePortfolio?: any;
    optimizationPlan: any;
    type: 'strategic' | 'tactical';
    constraints?: {
      maxPositions?: number;
      minPositionSize?: number;
      maxPositionSize?: number;
      allowedInstruments?: string[];
      excludedInstruments?: string[];
      assetClassLimits?: Record<string, { min: number; max: number }>;
      geographicLimits?: Record<string, { min: number; max: number }>;
      currencyLimits?: Record<string, { min: number; max: number }>;
    };
    preferences?: {
      lowCost?: boolean;
      highLiquidity?: boolean;
      esgFocus?: boolean;
      taxOptimized?: boolean;
      passiveInvesting?: boolean;
    };
  }) {
    console.log(`[Portfolio-Builder] Building ${request.type} portfolio`);

    try {
      // Schritt 1: Validiere Investment Universe für verfügbare Instrumente
      const availableInstruments = await this.universeManager.validatePortfolioInstruments(
        request.basePortfolio || { positions: [] }
      );

      // Schritt 2: Delegiere Portfolio-Konstruktion an Claude mit SAA-Prompt
      const portfolioConstruction = await this.claudeService.constructOptimalPortfolio({
        type: request.type,
        targetAllocation: request.optimizationPlan.targetAllocation,
        constraints: request.constraints,
        preferences: request.preferences,
        availableInstruments: availableInstruments.instrumentData,
        basePortfolio: request.basePortfolio
      });

      // Schritt 3: Validiere Compliance der konstruierten Positionen
      const complianceCheck = await this.complianceValidator.validatePortfolioConstruction({
        proposedPositions: portfolioConstruction.positions,
        constraints: request.constraints,
        type: request.type
      });

      if (!complianceCheck.passed) {
        // Iterative Anpassung über Claude
        const adjustedConstruction = await this.claudeService.adjustPortfolioForCompliance({
          originalConstruction: portfolioConstruction,
          complianceIssues: complianceCheck.issues,
          constraints: request.constraints
        });

        portfolioConstruction.positions = adjustedConstruction.positions;
        portfolioConstruction.adjustments = adjustedConstruction.changes;
      }

      // Schritt 4: Erstelle detaillierte Implementierungsanweisungen
      const implementation = await this.createImplementationPlan({
        targetPositions: portfolioConstruction.positions,
        basePortfolio: request.basePortfolio,
        type: request.type
      });

      return {
        success: true,
        construction: portfolioConstruction,
        implementation,
        compliance: complianceCheck,
        estimatedCosts: await this.calculateImplementationCosts(implementation),
        timeline: await this.generateImplementationTimeline(implementation)
      };

    } catch (error) {
      console.error('[Portfolio-Builder] Construction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Portfolio-Konstruktion fehlgeschlagen',
        suggestions: await this.generateErrorSuggestions(request, error)
      };
    }
  }

  /**
   * Erstellt einen spezialisierten Liquiditätsplan
   */
  async createLiquidityPlan(request: {
    portfolio: any;
    liquidityNeeds: {
      amount: number;
      timeHorizon: string;
      preserveAllocation?: boolean;
      minimizeImpact?: boolean;
    };
    optimizationGuidance: any;
  }) {
    console.log(`[Portfolio-Builder] Creating liquidity plan for ${request.liquidityNeeds.amount}`);

    // Delegiere Liquiditätsplanung an Claude
    const liquidityPlan = await this.claudeService.createLiquidityOptimizationPlan({
      currentPortfolio: request.portfolio,
      liquidityRequirement: request.liquidityNeeds,
      optimization: request.optimizationGuidance
    });

    // Erstelle konkrete Verkaufs-/Umschichtungsvorschläge
    const tradeProposals = await this.generateLiquidityTrades({
      plan: liquidityPlan,
      portfolio: request.portfolio,
      constraints: request.liquidityNeeds
    });

    return {
      liquidityPlan,
      tradeProposals,
      marketImpact: await this.estimateMarketImpact(tradeProposals),
      allocationImpact: await this.analyzeAllocationChange(
        request.portfolio,
        tradeProposals
      )
    };
  }

  /**
   * Erstellt ein Core-Satellite Portfolio
   */
  async buildCoreSatellitePortfolio(request: {
    totalValue: number;
    coreAllocation: number; // Prozent für Core (z.B. 80%)
    satelliteStrategies: Array<{
      name: string;
      allocation: number;
      strategy: 'growth' | 'value' | 'momentum' | 'quality' | 'dividend' | 'esg' | 'thematic';
      constraints?: any;
    }>;
    constraints?: any;
    preferences?: any;
  }) {
    console.log('[Portfolio-Builder] Building Core-Satellite portfolio');

    // Berechne Allokationen
    const coreValue = request.totalValue * (request.coreAllocation / 100);
    const satelliteValue = request.totalValue - coreValue;

    // Baue Core-Portfolio (breit diversifiziert, niedrige Kosten)
    const corePortfolio = await this.claudeService.buildCorePortfolio({
      targetValue: coreValue,
      strategy: 'broad_diversification',
      preferences: { lowCost: true, highLiquidity: true, ...request.preferences }
    });

    // Baue Satellite-Portfolios
    const satellitePromises = request.satelliteStrategies.map(async (satellite) => {
      const satelliteValue_allocated = satelliteValue * (satellite.allocation / 100);

      const satellitePortfolio = await this.claudeService.buildSatellitePortfolio({
        targetValue: satelliteValue_allocated,
        strategy: satellite.strategy,
        constraints: satellite.constraints,
        preferences: request.preferences
      });

      return {
        ...satellite,
        portfolio: satellitePortfolio,
        value: satelliteValue_allocated
      };
    });

    const satellites = await Promise.all(satellitePromises);

    // Kombiniere zu Gesamt-Portfolio
    const combinedPortfolio = await this.combinePortfolios({
      core: { ...corePortfolio, value: coreValue },
      satellites
    });

    return {
      structure: {
        core: {
          allocation: request.coreAllocation,
          value: coreValue,
          positions: corePortfolio.positions
        },
        satellites: satellites.map(s => ({
          name: s.name,
          strategy: s.strategy,
          allocation: s.allocation,
          value: s.value,
          positions: s.portfolio.positions
        }))
      },
      combinedPortfolio,
      rebalancingGuidelines: await this.createRebalancingGuidelines({
        core: corePortfolio,
        satellites
      })
    };
  }

  /**
   * Erstellt ein ESG-optimiertes Portfolio
   */
  async buildESGPortfolio(request: {
    basePortfolio?: any;
    targetValue: number;
    esgCriteria: {
      minESGRating?: string; // 'AAA', 'AA', 'A', 'BBB'
      excludeSectors?: string[];
      includeOnlyESGFunds?: boolean;
      carbonFootprintTarget?: number;
      sustainabilityThemes?: string[];
    };
    performanceTarget?: {
      minExpectedReturn?: number;
      maxVolatility?: number;
    };
    constraints?: any;
  }) {
    console.log('[Portfolio-Builder] Building ESG portfolio');

    // Filtere Investment Universe nach ESG-Kriterien
    const esgInstruments = await this.universeManager.findAlternatives({
      currentInstrument: { name: 'ESG_UNIVERSE', assetClass: 'All' },
      criteria: {
        specificFeatures: [
          'high_esg_rating',
          'low_carbon_footprint',
          'sustainable_themes',
          ...request.esgCriteria.sustainabilityThemes || []
        ]
      }
    });

    // Delegiere ESG-Portfolio-Konstruktion an Claude
    const esgPortfolio = await this.claudeService.buildESGOptimizedPortfolio({
      targetValue: request.targetValue,
      esgCriteria: request.esgCriteria,
      availableInstruments: esgInstruments.alternatives,
      performanceTarget: request.performanceTarget,
      basePortfolio: request.basePortfolio
    });

    return {
      portfolio: esgPortfolio,
      esgMetrics: await this.calculateESGMetrics(esgPortfolio),
      impactAnalysis: await this.analyzeESGImpact(esgPortfolio),
      complianceReport: await this.generateESGComplianceReport(esgPortfolio)
    };
  }

  // Private Hilfsmethoden
  private async createImplementationPlan(params: {
    targetPositions: any[];
    basePortfolio?: any;
    type: string;
  }) {
    return await this.claudeService.createPortfolioImplementationPlan({
      targetPositions: params.targetPositions,
      currentPositions: params.basePortfolio?.positions || [],
      implementationType: params.type
    });
  }

  private async calculateImplementationCosts(implementation: any) {
    return await this.claudeService.estimateImplementationCosts({
      trades: implementation.trades,
      timeline: implementation.timeline
    });
  }

  private async generateImplementationTimeline(implementation: any) {
    return await this.claudeService.generateImplementationTimeline({
      trades: implementation.trades,
      complexity: implementation.complexity
    });
  }

  private async generateErrorSuggestions(request: any, error: any) {
    return await this.claudeService.suggestPortfolioBuildingSolutions({
      request,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  private async generateLiquidityTrades(params: any) {
    return await this.claudeService.generateLiquidityTrades(params);
  }

  private async estimateMarketImpact(trades: any[]) {
    return await this.claudeService.estimateMarketImpact({ trades });
  }

  private async analyzeAllocationChange(portfolio: any, trades: any[]) {
    return await this.claudeService.analyzeAllocationImpact({
      originalPortfolio: portfolio,
      proposedTrades: trades
    });
  }

  private async combinePortfolios(params: any) {
    return await this.claudeService.combineCoreSatellitePortfolios(params);
  }

  private async createRebalancingGuidelines(params: any) {
    return await this.claudeService.createCoreSatelliteRebalancingGuidelines(params);
  }

  private async calculateESGMetrics(portfolio: any) {
    return await this.claudeService.calculateESGMetrics({ portfolio });
  }

  private async analyzeESGImpact(portfolio: any) {
    return await this.claudeService.analyzeESGImpact({ portfolio });
  }

  private async generateESGComplianceReport(portfolio: any) {
    return await this.claudeService.generateESGComplianceReport({ portfolio });
  }
}