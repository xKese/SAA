import { ClaudePortfolioAnalysisService } from './claude';
import { db } from '../db';
import { portfolios, portfolioPositions } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { PerformanceTimer, performanceTracker } from '../utils/performance-monitor';

export interface OptimizationRequest {
  portfolioId: string;
  additionalLiquidity: number;
  optimizationTarget: 'maintain' | 'rebalance' | 'opportunity';
  constraints?: {
    maxPositionSize?: number;
    minOrderSize?: number;
    excludedInstruments?: string[];
    preferredAssetClasses?: string[];
  };
}

export interface Portfolio {
  id: string;
  name: string;
  totalValue: number;
  positions: Position[];
  analysisResults?: any;
}

export interface Position {
  id: string;
  name: string;
  isin?: string;
  value: number;
  percentage: number;
  assetClass?: string;
  instrumentType?: string;
}

export interface OptimizationPlan {
  targetAllocation: Record<string, number>;
  proposedTrades: TradeProposal[];
  expectedMetrics: {
    expectedReturn: number;
    expectedRisk: number;
    sharpeRatio: number;
    diversificationScore: number;
  };
  rationale: string;
}

export interface TradeProposal {
  isin?: string;
  name: string;
  action: 'buy' | 'sell' | 'hold';
  amount: number;
  percentage: number;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  estimatedCosts: number;
}

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  complianceChecks: {
    maxPositionSize: boolean;
    minOrderSize: boolean;
    liquidityRequirements: boolean;
    regulatoryCompliance: boolean;
  };
}

export interface ScenarioComparison {
  bestScenario: string;
  ranking: Array<{
    scenario: string;
    score: number;
    metrics: Record<string, number>;
  }>;
  analysis: string;
}

export class LiquidityOptimizer {
  private claudeService: ClaudePortfolioAnalysisService;

  constructor() {
    this.claudeService = ClaudePortfolioAnalysisService.getInstance();
  }

  @performanceTracker('optimizationCalculation')
  async optimizeLiquidityAllocation(request: OptimizationRequest) {
    // SCHRITT 1: Lade bestehendes Portfolio
    const currentPortfolio = await this.loadPortfolio(request.portfolioId);

    // SCHRITT 2: Berechne aktuelle Allokation über Claude
    const currentAllocation = await this.claudeService.calculateCurrentAllocation(
      currentPortfolio
    );

    // SCHRITT 3: Delegiere Optimierung an Claude mit SAA-Prompt
    const optimizationPlan = await this.claudeService.createOptimizationPlan({
      currentPositions: currentPortfolio.positions,
      currentAllocation: currentAllocation,
      additionalLiquidity: request.additionalLiquidity,
      strategy: request.optimizationTarget,
      constraints: request.constraints,
      // WICHTIG: Verwende SAA-Prompt für Optimierung
      usePrompt: 'SAA_LIQUIDITY_OPTIMIZATION'
    });

    // SCHRITT 4: Erstelle Trade-Vorschläge über Claude
    const tradeProposals = await this.generateTradeProposals(
      currentPortfolio,
      optimizationPlan,
      request.additionalLiquidity
    );

    // SCHRITT 5: Validiere Compliance über Claude
    const validationResult = await this.validateTradeProposals(tradeProposals, request.constraints);

    return {
      optimizationPlan,
      tradeProposals,
      validation: validationResult,
      projectedAllocation: optimizationPlan.targetAllocation,
      expectedImprovement: optimizationPlan.expectedMetrics
    };
  }

  @performanceTracker('scenarioSimulation')
  async simulateMultipleScenarios(request: {
    portfolioId: string;
    additionalLiquidity: number;
    scenarios: Array<'conservative' | 'balanced' | 'aggressive' | 'custom'>;
  }) {
    // Parallele Simulation verschiedener Szenarien
    const scenarios = await Promise.all(
      request.scenarios.map(async (scenario) => {
        const result = await this.optimizeLiquidityAllocation({
          portfolioId: request.portfolioId,
          additionalLiquidity: request.additionalLiquidity,
          optimizationTarget: this.mapScenarioToTarget(scenario)
        });

        return {
          scenario,
          ...result
        };
      })
    );

    // Vergleiche und ranke Szenarien über Claude
    const comparison = await this.claudeService.compareOptimizationScenarios({
      scenarios,
      evaluationCriteria: ['expectedReturn', 'risk', 'costs', 'diversification']
    });

    return {
      scenarios,
      comparison,
      recommendation: comparison.bestScenario
    };
  }

  async analyzeIncrementalImpact(request: {
    portfolioId: string;
    incrementAmounts: number[];
    strategy: 'maintain' | 'rebalance' | 'opportunity';
  }) {
    // Analysiere verschiedene Liquiditätsmengen über Claude
    const impactAnalysis = await this.claudeService.analyzeIncrementalLiquidityImpact({
      portfolioId: request.portfolioId,
      incrementAmounts: request.incrementAmounts,
      strategy: request.strategy
    });

    return impactAnalysis;
  }

  private async loadPortfolio(portfolioId: string): Promise<Portfolio> {
    const timer = new PerformanceTimer('portfolioLoading', portfolioId);

    try {
      // IMMER Drizzle ORM verwenden
      const [portfolio] = await db
        .select()
        .from(portfolios)
        .where(eq(portfolios.id, portfolioId));

      if (!portfolio) {
        timer.end(false, 'Portfolio not found');
        throw new Error(`Portfolio ${portfolioId} not found`);
      }

      const positions = await db
        .select()
        .from(portfolioPositions)
        .where(eq(portfolioPositions.portfolioId, portfolioId));

      const result = {
        id: portfolio.id,
        name: portfolio.name,
        totalValue: parseFloat(portfolio.totalValue || '0'),
        positions: positions.map(pos => ({
          id: pos.id,
          name: pos.name,
          isin: pos.isin || undefined,
          value: parseFloat(pos.value),
          percentage: parseFloat(pos.percentage || '0'),
          assetClass: pos.assetClass || undefined,
          instrumentType: pos.instrumentType || undefined
        })),
        analysisResults: portfolio.analysisResults
      };

      timer.end(true);
      return result;
    } catch (error) {
      timer.end(false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async generateTradeProposals(
    portfolio: Portfolio,
    optimizationPlan: OptimizationPlan,
    additionalLiquidity: number
  ): Promise<TradeProposal[]> {
    const timer = new PerformanceTimer('tradeGeneration', portfolio.id);

    try {
      // NIEMALS eigene Berechnungslogik!
      // Verwende IMMER Claude für Trade-Generierung
      const tradeProposals = await this.claudeService.generateTradeProposals({
      currentPortfolio: portfolio,
      optimizationPlan: optimizationPlan,
      additionalLiquidity: additionalLiquidity,
      includeTransactionCosts: true,
      includeLiquidityAnalysis: true
      });

      timer.end(true);
      return tradeProposals;
    } catch (error) {
      timer.end(false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async validateTradeProposals(
    tradeProposals: TradeProposal[],
    constraints?: OptimizationRequest['constraints']
  ): Promise<ValidationResult> {
    const timer = new PerformanceTimer('validationCheck');

    try {
      // IMMER Claude für Validierung verwenden
      const validationResult = await this.claudeService.validateTradeCompliance({
      tradeProposals,
      constraints,
      checkRegulatoryCompliance: true,
      checkLiquidityRequirements: true,
      checkRiskLimits: true
      });

      timer.end(true);
      return validationResult;
    } catch (error) {
      timer.end(false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private mapScenarioToTarget(scenario: string): 'maintain' | 'rebalance' | 'opportunity' {
    const scenarioMapping = {
      'conservative': 'maintain' as const,
      'balanced': 'rebalance' as const,
      'aggressive': 'opportunity' as const,
      'custom': 'rebalance' as const
    };

    return scenarioMapping[scenario] || 'rebalance';
  }

  async optimizeForSpecificGoal(request: {
    portfolioId: string;
    additionalLiquidity: number;
    goal: 'income_maximization' | 'growth_focus' | 'risk_reduction' | 'tax_efficiency';
    timeHorizon: '1m' | '3m' | '6m' | '1y' | '3y' | '5y+';
    constraints?: OptimizationRequest['constraints'];
  }) {
    // Lade Portfolio
    const currentPortfolio = await this.loadPortfolio(request.portfolioId);

    // Delegiere goal-spezifische Optimierung an Claude
    const goalOptimization = await this.claudeService.optimizeForSpecificGoal({
      currentPortfolio,
      additionalLiquidity: request.additionalLiquidity,
      investmentGoal: request.goal,
      timeHorizon: request.timeHorizon,
      constraints: request.constraints,
      usePrompt: 'SAA_GOAL_BASED_OPTIMIZATION'
    });

    return goalOptimization;
  }

  async calculateRebalancingFrequency(request: {
    portfolioId: string;
    targetVolatility: number;
    transactionCostRate: number;
  }) {
    // Berechne optimale Rebalancing-Frequenz über Claude
    const frequencyAnalysis = await this.claudeService.calculateOptimalRebalancingFrequency({
      portfolioId: request.portfolioId,
      targetVolatility: request.targetVolatility,
      transactionCostRate: request.transactionCostRate,
      considerMarketConditions: true
    });

    return frequencyAnalysis;
  }

  async performRiskBudgetOptimization(request: {
    portfolioId: string;
    additionalLiquidity: number;
    riskBudgets: Record<string, number>; // Asset class -> risk budget
    constraints?: OptimizationRequest['constraints'];
  }) {
    // Risk Parity Optimierung über Claude
    const riskBudgetOptimization = await this.claudeService.optimizeRiskBudgets({
      portfolioId: request.portfolioId,
      additionalLiquidity: request.additionalLiquidity,
      riskBudgets: request.riskBudgets,
      constraints: request.constraints,
      usePrompt: 'SAA_RISK_PARITY_OPTIMIZATION'
    });

    return riskBudgetOptimization;
  }
}