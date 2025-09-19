import { ClaudePortfolioAnalysisService } from './claude';
import { UniverseManager } from './universe-manager';
import { storage } from '../storage-temp';
import {
  PortfolioCreationRequest,
  PortfolioOptimizationRequest,
  RebalancingRequest,
  ComplianceCheckRequest,
  portfolioCreationRequestSchema,
  portfolioOptimizationRequestSchema,
  rebalancingRequestSchema,
  complianceCheckRequestSchema
} from '../../shared/schema';

/**
 * Strategic Asset Allocation Orchestrator
 * Zentrale Koordinationsstelle für alle SAA-bezogenen Prozesse
 * WICHTIG: Alle Berechnungen werden an Claude delegiert
 */
export class SAAOrchestrator {
  private claude: ClaudePortfolioAnalysisService;
  private universe: UniverseManager;

  constructor() {
    // WICHTIG: Initialisiere mit Singleton-Pattern
    this.claude = ClaudePortfolioAnalysisService.getInstance();
    this.universe = new UniverseManager();
  }

  async createNewPortfolio(request: PortfolioCreationRequest) {
    console.log('[SAA-Orchestrator] Creating new portfolio');

    try {
      // SCHRITT 1: Validiere Request
      // Implementiere Validation mit Zod-Schema aus shared/schema.ts
      const validatedRequest = portfolioCreationRequestSchema.parse(request);

      // SCHRITT 2: Lade Investment Universe
      const availableInstruments = await this.universe.getFilteredUniverse(
        validatedRequest.riskProfile,
        validatedRequest.constraints
      );

      // SCHRITT 3: Delegiere an Claude für Strategie
      const strategy = await this.claude.createPortfolioStrategy({
        riskProfile: validatedRequest.riskProfile,
        amount: validatedRequest.amount,
        universe: availableInstruments,
        constraints: validatedRequest.constraints
      });

      // SCHRITT 4: Persistiere in Datenbank
      const portfolioId = await storage.createPortfolio({
        ...strategy,
        createdBy: 'SAA_PLATFORM',
        status: 'draft'
      });

      return { portfolioId, strategy };

    } catch (error) {
      console.error('[SAA-Orchestrator] Portfolio creation failed:', error);
      throw new Error(`Portfolio-Erstellung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  async optimizeExistingPortfolio(request: PortfolioOptimizationRequest) {
    console.log(`[SAA-Orchestrator] Optimizing portfolio ${request.portfolioId}`);

    try {
      // SCHRITT 1: Validiere Request
      const validatedRequest = portfolioOptimizationRequestSchema.parse(request);

      // SCHRITT 2: Lade Portfolio aus Datenbank
      const portfolio = await storage.getPortfolio(validatedRequest.portfolioId);
      if (!portfolio) {
        throw new Error(`Portfolio ${validatedRequest.portfolioId} nicht gefunden`);
      }

      // SCHRITT 3: Prüfe Investment Universe
      const universeCheck = await this.universe.validatePortfolioInstruments(portfolio);

      // SCHRITT 4: Delegiere Optimierung an Claude
      const optimization = await this.claude.optimizePortfolio({
        portfolio,
        optimizationType: validatedRequest.optimizationType,
        targetAllocation: validatedRequest.targetAllocation,
        constraints: validatedRequest.constraints,
        universeData: universeCheck.instrumentData
      });

      // SCHRITT 5: Speichere Optimierungsergebnisse
      await storage.updatePortfolio(validatedRequest.portfolioId, {
        optimizationResults: optimization,
        lastOptimized: new Date(),
        status: 'optimized'
      });

      return optimization;

    } catch (error) {
      console.error('[SAA-Orchestrator] Portfolio optimization failed:', error);
      throw new Error(`Portfolio-Optimierung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  async performRebalancing(request: RebalancingRequest) {
    console.log(`[SAA-Orchestrator] Performing rebalancing for portfolio ${request.portfolioId}`);

    try {
      // SCHRITT 1: Validiere Request
      const validatedRequest = rebalancingRequestSchema.parse(request);

      // SCHRITT 2: Lade Portfolio und aktuelle Positionen
      const portfolio = await storage.getPortfolio(validatedRequest.portfolioId);
      if (!portfolio) {
        throw new Error(`Portfolio ${validatedRequest.portfolioId} nicht gefunden`);
      }

      const positions = await storage.getPortfolioPositions(validatedRequest.portfolioId);

      // SCHRITT 3: Delegiere Rebalancing-Analyse an Claude
      const rebalancingPlan = await this.claude.createRebalancingPlan({
        portfolio,
        positions,
        targetAllocation: validatedRequest.targetAllocation,
        thresholds: validatedRequest.thresholds,
        constraints: validatedRequest.constraints
      });

      // SCHRITT 4: Erstelle Analysis Phase für Rebalancing
      const analysisPhase = await storage.createAnalysisPhase({
        portfolioId: validatedRequest.portfolioId,
        phase: 98, // Spezielle Phase für Rebalancing
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        result: rebalancingPlan,
        errorMessage: null
      });

      return {
        rebalancingPlan,
        analysisPhaseId: analysisPhase.id,
        executionReady: rebalancingPlan.trades && rebalancingPlan.trades.length > 0
      };

    } catch (error) {
      console.error('[SAA-Orchestrator] Rebalancing failed:', error);
      throw new Error(`Rebalancing fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  async performComplianceCheck(request: ComplianceCheckRequest) {
    console.log(`[SAA-Orchestrator] Performing compliance check for portfolio ${request.portfolioId}`);

    try {
      // SCHRITT 1: Validiere Request
      const validatedRequest = complianceCheckRequestSchema.parse(request);

      // SCHRITT 2: Lade Portfolio
      const portfolio = await storage.getPortfolio(validatedRequest.portfolioId);
      if (!portfolio) {
        throw new Error(`Portfolio ${validatedRequest.portfolioId} nicht gefunden`);
      }

      // SCHRITT 3: Delegiere Compliance-Prüfung an Claude
      const complianceResult = await this.claude.performComplianceCheck({
        portfolio,
        rules: validatedRequest.rules,
        scope: validatedRequest.scope
      });

      // SCHRITT 4: Speichere Compliance-Ergebnis
      await storage.createAnalysisPhase({
        portfolioId: validatedRequest.portfolioId,
        phase: 97, // Spezielle Phase für Compliance
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        result: complianceResult,
        errorMessage: null
      });

      return complianceResult;

    } catch (error) {
      console.error('[SAA-Orchestrator] Compliance check failed:', error);
      throw new Error(`Compliance-Prüfung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  async runScenarioAnalysis(request: {
    portfolioId: string;
    scenarios: Array<{
      name: string;
      type: 'market_shock' | 'allocation_change' | 'instrument_swap' | 'custom';
      parameters: Record<string, any>;
    }>;
    comparisonMetrics?: string[];
  }) {
    console.log(`[SAA-Orchestrator] Running scenario analysis for portfolio ${request.portfolioId}`);

    try {
      // Lade Basis-Portfolio
      const portfolio = await storage.getPortfolio(request.portfolioId);
      if (!portfolio) {
        throw new Error(`Portfolio ${request.portfolioId} nicht gefunden`);
      }

      // Delegiere Szenario-Analyse an Claude
      const scenarioAnalysis = await this.claude.runScenarioAnalysis({
        portfolio,
        scenarios: request.scenarios,
        comparisonMetrics: request.comparisonMetrics || [
          'expectedReturn',
          'volatility',
          'sharpeRatio',
          'maxDrawdown',
          'diversification'
        ]
      });

      // Speichere Szenario-Ergebnisse
      await storage.createAnalysisPhase({
        portfolioId: request.portfolioId,
        phase: 96, // Spezielle Phase für Szenarien
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        result: scenarioAnalysis,
        errorMessage: null
      });

      return scenarioAnalysis;

    } catch (error) {
      console.error('[SAA-Orchestrator] Scenario analysis failed:', error);
      throw new Error(`Szenario-Analyse fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  async getPortfolioStatus(portfolioId: string) {
    console.log(`[SAA-Orchestrator] Getting portfolio status for ${portfolioId}`);

    try {
      // Lade Portfolio
      const portfolio = await storage.getPortfolio(portfolioId);
      if (!portfolio) {
        throw new Error(`Portfolio ${portfolioId} nicht gefunden`);
      }

      // Lade aktuelle Positionen
      const positions = await storage.getPortfolioPositions(portfolioId);

      // Lade Analysis Phases
      const analysisPhases = await storage.getAnalysisPhases(portfolioId);

      // Delegiere Status-Analyse an Claude
      const statusAnalysis = await this.claude.analyzePortfolioStatus({
        portfolio,
        positions,
        analysisPhases
      });

      return {
        portfolio,
        positions: positions.length,
        totalValue: positions.reduce((sum, pos) => sum + (pos.marketValue || 0), 0),
        analysisPhases: analysisPhases.length,
        lastAnalysis: analysisPhases[analysisPhases.length - 1]?.completedAt,
        status: statusAnalysis
      };

    } catch (error) {
      console.error('[SAA-Orchestrator] Status retrieval failed:', error);
      throw new Error(`Status-Abfrage fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  async getAllPortfolios() {
    console.log('[SAA-Orchestrator] Getting all portfolios');

    try {
      const portfolios = await storage.getAllPortfolios();

      // Erweitere jedes Portfolio mit zusätzlichen Informationen
      const enhancedPortfolios = await Promise.all(
        portfolios.map(async (portfolio) => {
          const positions = await storage.getPortfolioPositions(portfolio.id);
          const analysisPhases = await storage.getAnalysisPhases(portfolio.id);

          return {
            ...portfolio,
            positionCount: positions.length,
            totalValue: positions.reduce((sum, pos) => sum + (pos.marketValue || 0), 0),
            lastAnalysis: analysisPhases[analysisPhases.length - 1]?.completedAt,
            analysisCount: analysisPhases.length
          };
        })
      );

      return enhancedPortfolios;

    } catch (error) {
      console.error('[SAA-Orchestrator] Portfolio retrieval failed:', error);
      throw new Error(`Portfolio-Abfrage fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }
}