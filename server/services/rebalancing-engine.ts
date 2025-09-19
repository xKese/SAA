import { ClaudePortfolioAnalysisService } from './claude';
import { UniverseManager } from './universe-manager';
import { ComplianceValidator } from './compliance-validator';
import { db } from '../db';
import { portfolios, portfolio_positions } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Rebalancing Engine
 * Führt intelligente Portfolio-Rebalancing-Operationen durch
 * WICHTIG: Alle Berechnungen und Optimierungen werden an Claude delegiert
 */
export class RebalancingEngine {
  private claudeService: ClaudePortfolioAnalysisService;
  private universeManager: UniverseManager;
  private complianceValidator: ComplianceValidator;

  constructor() {
    this.claudeService = ClaudePortfolioAnalysisService.getInstance();
    this.universeManager = new UniverseManager();
    this.complianceValidator = new ComplianceValidator();
  }

  /**
   * Erstellt einen optimalen Rebalancing-Plan
   */
  async createRebalancingPlan(request: {
    currentPortfolio: any;
    targetAllocation: Record<string, number>;
    constraints?: {
      maxTradingCosts?: number;
      minTradeSize?: number;
      maxPositionDeviation?: number;
      allowedInstruments?: string[];
      taxConstraints?: {
        avoidRealizedGains?: boolean;
        harvestLosses?: boolean;
        maxTaxImpact?: number;
      };
      liquidityConstraints?: {
        maxMarketImpact?: number;
        spreadLimits?: Record<string, number>;
      };
    };
    rebalancingType?: 'full' | 'threshold' | 'tactical' | 'calendar';
    optimizationGoals?: string[];
  }) {
    console.log('[Rebalancing-Engine] Creating rebalancing plan');

    try {
      // Schritt 1: Analysiere aktuelle vs. Ziel-Allokation
      const allocationAnalysis = await this.claudeService.analyzeAllocationDrift({
        currentPortfolio: request.currentPortfolio,
        targetAllocation: request.targetAllocation,
        constraints: request.constraints
      });

      // Schritt 2: Bestimme Rebalancing-Notwendigkeit
      const rebalancingNeed = await this.assessRebalancingNeed({
        allocationDrift: allocationAnalysis.drift,
        type: request.rebalancingType || 'threshold',
        constraints: request.constraints
      });

      if (!rebalancingNeed.required) {
        return {
          required: false,
          reason: rebalancingNeed.reason,
          nextRebalancingDate: rebalancingNeed.nextCheck,
          currentDrift: allocationAnalysis.drift
        };
      }

      // Schritt 3: Delegiere Rebalancing-Strategie an Claude
      const rebalancingStrategy = await this.claudeService.createRebalancingStrategy({
        currentPortfolio: request.currentPortfolio,
        targetAllocation: request.targetAllocation,
        allocationDrift: allocationAnalysis.drift,
        constraints: request.constraints,
        type: request.rebalancingType,
        goals: request.optimizationGoals || ['minimize_costs', 'minimize_tax_impact']
      });

      // Schritt 4: Generiere konkrete Trades
      const trades = await this.generateRebalancingTrades({
        strategy: rebalancingStrategy,
        currentPositions: request.currentPortfolio.positions,
        constraints: request.constraints
      });

      // Schritt 5: Optimiere Trade-Sequenzierung
      const optimizedTradeSequence = await this.optimizeTradeSequence({
        trades,
        constraints: request.constraints,
        marketConditions: await this.getMarketConditions()
      });

      // Schritt 6: Validiere Compliance
      const complianceCheck = await this.complianceValidator.validateRebalancingPlan({
        originalPortfolio: request.currentPortfolio,
        proposedTrades: optimizedTradeSequence.trades,
        constraints: request.constraints
      });

      return {
        required: true,
        strategy: rebalancingStrategy,
        trades: optimizedTradeSequence.trades,
        sequence: optimizedTradeSequence.timeline,
        costs: await this.calculateRebalancingCosts(optimizedTradeSequence.trades),
        taxImpact: await this.calculateTaxImpact(optimizedTradeSequence.trades),
        compliance: complianceCheck,
        projectedAllocation: await this.projectPostRebalancingAllocation({
          currentPortfolio: request.currentPortfolio,
          trades: optimizedTradeSequence.trades
        })
      };

    } catch (error) {
      console.error('[Rebalancing-Engine] Plan creation failed:', error);
      return {
        required: false,
        error: error instanceof Error ? error.message : 'Rebalancing-Plan-Erstellung fehlgeschlagen',
        suggestions: await this.generateRebalancingErrorSuggestions(request, error)
      };
    }
  }

  /**
   * Führt automatisches Smart-Rebalancing durch
   */
  async performSmartRebalancing(request: {
    portfolioId: string;
    cashInflow?: number;
    cashOutflow?: number;
    newTargetAllocation?: Record<string, number>;
    smartRules: {
      thresholdBased?: {
        absoluteThreshold?: number; // z.B. 5% Abweichung
        relativeThreshold?: number; // z.B. 20% relative Abweichung
      };
      opportunityBased?: {
        marketVolatility?: boolean;
        valuationDisparities?: boolean;
        seasonalPatterns?: boolean;
      };
      costOptimized?: {
        batchTrades?: boolean;
        taxLossHarvesting?: boolean;
        liquidityTiming?: boolean;
      };
    };
  }) {
    console.log(`[Rebalancing-Engine] Performing smart rebalancing for portfolio ${request.portfolioId}`);

    // Lade aktuelles Portfolio
    const portfolio = await this.loadPortfolio(request.portfolioId);

    // Analysiere Marktbedingungen und Timing
    const marketAnalysis = await this.claudeService.analyzeRebalancingTiming({
      portfolio,
      smartRules: request.smartRules,
      cashflows: {
        inflow: request.cashInflow,
        outflow: request.cashOutflow
      }
    });

    if (!marketAnalysis.shouldRebalance) {
      return {
        executed: false,
        reason: marketAnalysis.reason,
        nextOptimalTiming: marketAnalysis.nextOptimalDate,
        alternatives: marketAnalysis.alternatives
      };
    }

    // Erstelle intelligenten Rebalancing-Plan
    const smartPlan = await this.claudeService.createSmartRebalancingPlan({
      portfolio,
      cashflows: { inflow: request.cashInflow, outflow: request.cashOutflow },
      newTargetAllocation: request.newTargetAllocation,
      smartRules: request.smartRules,
      marketConditions: marketAnalysis.conditions
    });

    // Führe schrittweise Implementierung durch
    const implementation = await this.executeRebalancingPlan({
      plan: smartPlan,
      portfolioId: request.portfolioId,
      smartExecution: true
    });

    return {
      executed: true,
      plan: smartPlan,
      implementation,
      marketTiming: marketAnalysis,
      results: await this.analyzeRebalancingResults({
        portfolioId: request.portfolioId,
        beforeState: portfolio,
        implementation
      })
    };
  }

  /**
   * Cash-Flow basiertes Rebalancing (bei Zu-/Abflüssen)
   */
  async handleCashFlowRebalancing(request: {
    portfolioId: string;
    cashFlow: {
      amount: number;
      type: 'inflow' | 'outflow';
      source?: string;
      timing?: 'immediate' | 'gradual';
    };
    strategy: 'maintain_allocation' | 'opportunistic' | 'tax_optimized';
    constraints?: any;
  }) {
    console.log(`[Rebalancing-Engine] Handling ${request.cashFlow.type} of ${request.cashFlow.amount}`);

    const portfolio = await this.loadPortfolio(request.portfolioId);

    // Delegiere Cash-Flow Rebalancing an Claude
    const cashFlowPlan = await this.claudeService.createCashFlowRebalancingPlan({
      portfolio,
      cashFlow: request.cashFlow,
      strategy: request.strategy,
      constraints: request.constraints
    });

    if (request.cashFlow.type === 'inflow') {
      // Kaufe untergewichtete Positionen
      return await this.handleCashInflow({
        portfolio,
        amount: request.cashFlow.amount,
        plan: cashFlowPlan
      });
    } else {
      // Verkaufe übergewichtete Positionen
      return await this.handleCashOutflow({
        portfolio,
        amount: request.cashFlow.amount,
        plan: cashFlowPlan
      });
    }
  }

  /**
   * Kontinuierliches Drift-Monitoring
   */
  async monitorAllocationDrift(request: {
    portfolioId: string;
    targetAllocation: Record<string, number>;
    alertThresholds: {
      warning: number; // z.B. 3% Abweichung
      critical: number; // z.B. 5% Abweichung
    };
    autoRebalancing?: {
      enabled: boolean;
      triggerThreshold: number;
      maxFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    };
  }) {
    const portfolio = await this.loadPortfolio(request.portfolioId);

    // Berechne aktuelle Drift
    const driftAnalysis = await this.claudeService.calculateAllocationDrift({
      portfolio,
      targetAllocation: request.targetAllocation
    });

    const alerts = [];
    let autoRebalanceTriggered = false;

    // Prüfe Alert-Schwellenwerte
    for (const [assetClass, drift] of Object.entries(driftAnalysis.driftByAssetClass)) {
      if (Math.abs(drift as number) >= request.alertThresholds.critical) {
        alerts.push({
          level: 'critical',
          assetClass,
          drift,
          message: `Kritische Abweichung bei ${assetClass}: ${drift}%`
        });
      } else if (Math.abs(drift as number) >= request.alertThresholds.warning) {
        alerts.push({
          level: 'warning',
          assetClass,
          drift,
          message: `Warnung: Abweichung bei ${assetClass}: ${drift}%`
        });
      }
    }

    // Prüfe Auto-Rebalancing
    if (request.autoRebalancing?.enabled) {
      const maxDrift = Math.max(...Object.values(driftAnalysis.driftByAssetClass).map(d => Math.abs(d as number)));

      if (maxDrift >= request.autoRebalancing.triggerThreshold) {
        const canRebalance = await this.checkRebalancingFrequency({
          portfolioId: request.portfolioId,
          maxFrequency: request.autoRebalancing.maxFrequency
        });

        if (canRebalance) {
          autoRebalanceTriggered = true;
          // Trigger Auto-Rebalancing
          await this.performSmartRebalancing({
            portfolioId: request.portfolioId,
            smartRules: {
              thresholdBased: {
                absoluteThreshold: request.autoRebalancing.triggerThreshold
              }
            }
          });
        }
      }
    }

    return {
      driftAnalysis,
      alerts,
      autoRebalanceTriggered,
      recommendations: await this.claudeService.generateDriftRecommendations({
        driftAnalysis,
        portfolio,
        targetAllocation: request.targetAllocation
      })
    };
  }

  // Private Hilfsmethoden
  private async assessRebalancingNeed(params: any) {
    // Delegiere Bewertung an Claude
    return await this.claudeService.assessRebalancingNecessity(params);
  }

  private async generateRebalancingTrades(params: any) {
    return await this.claudeService.generateOptimalTrades(params);
  }

  private async optimizeTradeSequence(params: any) {
    return await this.claudeService.optimizeTradeSequencing(params);
  }

  private async getMarketConditions() {
    return await this.claudeService.analyzeCurrentMarketConditions();
  }

  private async calculateRebalancingCosts(trades: any[]) {
    return await this.claudeService.estimateTradingCosts({ trades });
  }

  private async calculateTaxImpact(trades: any[]) {
    return await this.claudeService.calculateTaxImplications({ trades });
  }

  private async projectPostRebalancingAllocation(params: any) {
    return await this.claudeService.projectPostTradeAllocation(params);
  }

  private async generateRebalancingErrorSuggestions(request: any, error: any) {
    return await this.claudeService.suggestRebalancingErrorSolutions({
      request,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  private async loadPortfolio(portfolioId: string) {
    const result = await db.select()
      .from(portfolios)
      .where(eq(portfolios.id, portfolioId))
      .limit(1);

    if (!result.length) {
      throw new Error(`Portfolio ${portfolioId} nicht gefunden`);
    }

    const positions = await db.select()
      .from(portfolio_positions)
      .where(eq(portfolio_positions.portfolioId, portfolioId));

    return {
      ...result[0],
      positions
    };
  }

  private async executeRebalancingPlan(params: any) {
    return await this.claudeService.executeRebalancingImplementation(params);
  }

  private async analyzeRebalancingResults(params: any) {
    return await this.claudeService.analyzeRebalancingOutcome(params);
  }

  private async handleCashInflow(params: any) {
    return await this.claudeService.optimizeCashInflow(params);
  }

  private async handleCashOutflow(params: any) {
    return await this.claudeService.optimizeCashOutflow(params);
  }

  private async checkRebalancingFrequency(params: any) {
    // Prüfe letzte Rebalancing-Operationen
    // Implementierung würde DB-Abfrage verwenden
    return true; // Placeholder
  }
}