import { ClaudePortfolioAnalysisService } from './claude';
import { db } from '../db';
import { portfolios, portfolio_positions } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Compliance Validator Service
 * Validiert Portfolio-Operationen gegen regulatorische und institutionelle Compliance-Regeln
 * WICHTIG: Alle komplexen Compliance-Analysen werden an Claude delegiert
 */
export class ComplianceValidator {
  private claudeService: ClaudePortfolioAnalysisService;

  constructor() {
    this.claudeService = ClaudePortfolioAnalysisService.getInstance();
  }

  /**
   * Führt umfassende Pre-Optimization Compliance-Prüfung durch
   */
  async performPreOptimizationCheck(request: {
    portfolio: any;
    optimizationType: string;
    constraints?: any;
  }) {
    console.log('[Compliance-Validator] Performing pre-optimization compliance check');

    try {
      // Delegiere komplexe Compliance-Analyse an Claude
      const complianceAnalysis = await this.claudeService.performComplianceAnalysis({
        portfolio: request.portfolio,
        optimizationType: request.optimizationType,
        constraints: request.constraints,
        rules: await this.getApplicableComplianceRules(request.optimizationType)
      });

      // Prüfe spezifische Deutsche Finanzmarkt-Regulierung
      const germanCompliance = await this.validateGermanFinancialCompliance({
        portfolio: request.portfolio,
        analysisContext: complianceAnalysis
      });

      // Prüfe MiFID II Compliance
      const mifidCompliance = await this.validateMiFIDCompliance({
        portfolio: request.portfolio,
        optimizationType: request.optimizationType
      });

      // Prüfe SREP (Supervisory Review and Evaluation Process) Anforderungen
      const srepCompliance = await this.validateSREPCompliance({
        portfolio: request.portfolio,
        optimizationType: request.optimizationType
      });

      // Konsolidiere alle Compliance-Ergebnisse
      const consolidatedResult = await this.consolidateComplianceResults({
        general: complianceAnalysis,
        german: germanCompliance,
        mifid: mifidCompliance,
        srep: srepCompliance
      });

      return {
        passed: consolidatedResult.overallPassed,
        issues: consolidatedResult.allIssues,
        warnings: consolidatedResult.warnings,
        requirements: consolidatedResult.requirements,
        recommendations: consolidatedResult.recommendations,
        details: {
          general: complianceAnalysis,
          german: germanCompliance,
          mifid: mifidCompliance,
          srep: srepCompliance
        }
      };

    } catch (error) {
      console.error('[Compliance-Validator] Pre-optimization check failed:', error);
      return {
        passed: false,
        issues: [{
          type: 'system_error',
          severity: 'critical',
          message: `Compliance-Prüfung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
        }],
        warnings: [],
        requirements: [],
        recommendations: []
      };
    }
  }

  /**
   * Validiert Portfolio-Konstruktions-Vorschläge
   */
  async validatePortfolioConstruction(request: {
    proposedPositions: any[];
    constraints?: any;
    type: string;
  }) {
    console.log('[Compliance-Validator] Validating portfolio construction');

    // Delegiere Konstruktions-Validierung an Claude
    const constructionValidation = await this.claudeService.validatePortfolioConstruction({
      proposedPositions: request.proposedPositions,
      constraints: request.constraints,
      type: request.type,
      complianceRules: await this.getConstructionComplianceRules()
    });

    // Prüfe Diversifikations-Anforderungen
    const diversificationCheck = await this.validateDiversificationRequirements({
      positions: request.proposedPositions,
      type: request.type
    });

    // Prüfe Liquiditäts-Anforderungen
    const liquidityCheck = await this.validateLiquidityRequirements({
      positions: request.proposedPositions
    });

    // Prüfe Risiko-Limits
    const riskLimitCheck = await this.validateRiskLimits({
      positions: request.proposedPositions,
      type: request.type
    });

    return {
      passed: constructionValidation.passed && diversificationCheck.passed &&
              liquidityCheck.passed && riskLimitCheck.passed,
      issues: [
        ...constructionValidation.issues,
        ...diversificationCheck.issues,
        ...liquidityCheck.issues,
        ...riskLimitCheck.issues
      ],
      details: {
        construction: constructionValidation,
        diversification: diversificationCheck,
        liquidity: liquidityCheck,
        riskLimits: riskLimitCheck
      }
    };
  }

  /**
   * Validiert Rebalancing-Pläne
   */
  async validateRebalancingPlan(request: {
    originalPortfolio: any;
    proposedTrades: any[];
    constraints?: any;
  }) {
    console.log('[Compliance-Validator] Validating rebalancing plan');

    // Delegiere Rebalancing-Validierung an Claude
    const rebalancingValidation = await this.claudeService.validateRebalancingPlan({
      originalPortfolio: request.originalPortfolio,
      proposedTrades: request.proposedTrades,
      constraints: request.constraints,
      complianceRules: await this.getRebalancingComplianceRules()
    });

    // Prüfe Trading-Volume-Limits
    const volumeCheck = await this.validateTradingVolumeLimits({
      trades: request.proposedTrades,
      portfolio: request.originalPortfolio
    });

    // Prüfe Market-Impact-Limits
    const marketImpactCheck = await this.validateMarketImpactLimits({
      trades: request.proposedTrades
    });

    // Prüfe Tax-Implications
    const taxComplianceCheck = await this.validateTaxCompliance({
      trades: request.proposedTrades,
      originalPortfolio: request.originalPortfolio
    });

    return {
      passed: rebalancingValidation.passed && volumeCheck.passed &&
              marketImpactCheck.passed && taxComplianceCheck.passed,
      issues: [
        ...rebalancingValidation.issues,
        ...volumeCheck.issues,
        ...marketImpactCheck.issues,
        ...taxComplianceCheck.issues
      ],
      details: {
        rebalancing: rebalancingValidation,
        volume: volumeCheck,
        marketImpact: marketImpactCheck,
        tax: taxComplianceCheck
      }
    };
  }

  /**
   * Validiert Implementierungs-Pläne
   */
  async validateImplementationPlan(request: {
    originalPortfolio: any;
    implementationPlan: any;
    optimizationType: string;
  }) {
    console.log('[Compliance-Validator] Validating implementation plan');

    // Delegiere Implementierungs-Validierung an Claude
    const implementationValidation = await this.claudeService.validateImplementationPlan({
      originalPortfolio: request.originalPortfolio,
      implementationPlan: request.implementationPlan,
      optimizationType: request.optimizationType,
      complianceRules: await this.getImplementationComplianceRules()
    });

    // Prüfe Timeline-Constraints
    const timelineCheck = await this.validateImplementationTimeline({
      plan: request.implementationPlan
    });

    // Prüfe Execution-Feasibility
    const feasibilityCheck = await this.validateExecutionFeasibility({
      plan: request.implementationPlan,
      originalPortfolio: request.originalPortfolio
    });

    return {
      passed: implementationValidation.passed && timelineCheck.passed && feasibilityCheck.passed,
      issues: [
        ...implementationValidation.issues,
        ...timelineCheck.issues,
        ...feasibilityCheck.issues
      ],
      details: {
        implementation: implementationValidation,
        timeline: timelineCheck,
        feasibility: feasibilityCheck
      }
    };
  }

  /**
   * Kontinuierliches Compliance-Monitoring
   */
  async monitorPortfolioCompliance(request: {
    portfolioId: string;
    monitoringRules: Array<{
      type: 'regulatory' | 'internal' | 'risk' | 'operational';
      rule: string;
      threshold?: number;
      frequency: 'realtime' | 'daily' | 'weekly' | 'monthly';
    }>;
  }) {
    console.log(`[Compliance-Validator] Starting compliance monitoring for portfolio ${request.portfolioId}`);

    const portfolio = await this.loadPortfolio(request.portfolioId);

    const monitoringResults = [];

    for (const rule of request.monitoringRules) {
      const ruleResult = await this.evaluateComplianceRule({
        portfolio,
        rule,
        currentTime: new Date()
      });

      monitoringResults.push({
        rule: rule.rule,
        type: rule.type,
        status: ruleResult.status,
        value: ruleResult.currentValue,
        threshold: rule.threshold,
        deviation: ruleResult.deviation,
        lastCheck: new Date(),
        nextCheck: this.calculateNextCheck(rule.frequency)
      });
    }

    // Identifiziere kritische Verstöße
    const violations = monitoringResults.filter(r => r.status === 'violation');
    const warnings = monitoringResults.filter(r => r.status === 'warning');

    if (violations.length > 0 || warnings.length > 0) {
      // Generiere automatische Compliance-Berichte
      const complianceReport = await this.generateComplianceReport({
        portfolioId: request.portfolioId,
        violations,
        warnings,
        allResults: monitoringResults
      });

      return {
        status: violations.length > 0 ? 'non_compliant' : 'warning',
        violations,
        warnings,
        report: complianceReport,
        actionRequired: violations.length > 0,
        recommendations: await this.generateComplianceRecommendations({
          violations,
          warnings,
          portfolio
        })
      };
    }

    return {
      status: 'compliant',
      monitoringResults,
      nextFullCheck: this.calculateNextFullCheck()
    };
  }

  // Private Hilfsmethoden für spezifische Compliance-Bereiche
  private async validateGermanFinancialCompliance(params: any) {
    return await this.claudeService.validateGermanFinancialCompliance(params);
  }

  private async validateMiFIDCompliance(params: any) {
    return await this.claudeService.validateMiFIDCompliance(params);
  }

  private async validateSREPCompliance(params: any) {
    return await this.claudeService.validateSREPCompliance(params);
  }

  private async validateDiversificationRequirements(params: any) {
    return await this.claudeService.validateDiversificationRequirements(params);
  }

  private async validateLiquidityRequirements(params: any) {
    return await this.claudeService.validateLiquidityRequirements(params);
  }

  private async validateRiskLimits(params: any) {
    return await this.claudeService.validateRiskLimits(params);
  }

  private async validateTradingVolumeLimits(params: any) {
    return await this.claudeService.validateTradingVolumeLimits(params);
  }

  private async validateMarketImpactLimits(params: any) {
    return await this.claudeService.validateMarketImpactLimits(params);
  }

  private async validateTaxCompliance(params: any) {
    return await this.claudeService.validateTaxCompliance(params);
  }

  private async validateImplementationTimeline(params: any) {
    return await this.claudeService.validateImplementationTimeline(params);
  }

  private async validateExecutionFeasibility(params: any) {
    return await this.claudeService.validateExecutionFeasibility(params);
  }

  // Hilfsmethoden für Compliance-Regeln
  private async getApplicableComplianceRules(optimizationType: string) {
    const rules = {
      'strategic': ['diversification', 'risk_limits', 'liquidity', 'regulatory'],
      'tactical': ['risk_limits', 'liquidity', 'position_size', 'frequency'],
      'liquidity': ['market_impact', 'timing', 'cost_limits'],
      'rebalancing': ['trading_volume', 'tax_efficiency', 'timing']
    };

    return rules[optimizationType as keyof typeof rules] || ['basic_compliance'];
  }

  private async getConstructionComplianceRules() {
    return [
      'max_position_size',
      'min_diversification',
      'asset_class_limits',
      'geographic_limits',
      'currency_limits',
      'liquidity_requirements'
    ];
  }

  private async getRebalancingComplianceRules() {
    return [
      'max_trading_volume',
      'market_impact_limits',
      'cost_efficiency',
      'tax_optimization',
      'timing_restrictions'
    ];
  }

  private async getImplementationComplianceRules() {
    return [
      'execution_timeline',
      'market_conditions',
      'liquidity_constraints',
      'cost_controls',
      'risk_controls'
    ];
  }

  private async consolidateComplianceResults(results: any) {
    return await this.claudeService.consolidateComplianceResults(results);
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

  private async evaluateComplianceRule(params: any) {
    return await this.claudeService.evaluateComplianceRule(params);
  }

  private async generateComplianceReport(params: any) {
    return await this.claudeService.generateComplianceReport(params);
  }

  private async generateComplianceRecommendations(params: any) {
    return await this.claudeService.generateComplianceRecommendations(params);
  }

  private calculateNextCheck(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case 'realtime':
        return new Date(now.getTime() + 60000); // 1 Minute
      case 'daily':
        return new Date(now.getTime() + 86400000); // 24 Stunden
      case 'weekly':
        return new Date(now.getTime() + 604800000); // 7 Tage
      case 'monthly':
        return new Date(now.getTime() + 2592000000); // 30 Tage
      default:
        return now;
    }
  }

  private calculateNextFullCheck(): Date {
    const now = new Date();
    return new Date(now.getTime() + 86400000); // 24 Stunden
  }
}