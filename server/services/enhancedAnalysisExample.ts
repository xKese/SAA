/**
 * Example Integration: Enhanced Portfolio Analysis with German Standards
 *
 * This demonstrates how to use the new compliance services with the existing system
 */

import { claudeService } from './claude';
import { PortfolioAnalysisIntegration } from './portfolioAnalysisIntegration';
import { GermanTableFormatter } from './germanTableFormatter';
import { MathematicalValidator } from './mathematicalValidation';
import { RiskMetricsCalculator } from './riskMetricsCalculator';
import { ErrorHandlingService } from './errorHandling';
import { QualityAssuranceService } from './qualityAssurance';

export async function performEnhancedAnalysis(
  portfolioId: string,
  positions: any[],
  analysisPhase?: number
): Promise<any> {
  try {
    console.log('Starting enhanced portfolio analysis with German compliance...');

    // Step 1: Run standard Claude analysis (existing functionality)
    const claudeAnalysis = await claudeService.analyzePortfolio({
      portfolioId,
      positions,
      phase: analysisPhase || 5
    });

    // Step 2: Apply German standards and enhancements
    const enhancedResult = await PortfolioAnalysisIntegration.processAnalysisResults(
      claudeAnalysis,
      positions
    );

    // Step 3: Generate comprehensive report
    const report = generateComplianceReport(enhancedResult);

    return {
      ...claudeAnalysis,
      germanCompliance: enhancedResult,
      complianceReport: report,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    // Use error handling service for recovery
    const recovery = await ErrorHandlingService.handleCalculationError(
      error as Error,
      analysisPhase || 5,
      'portfolio_analysis',
      { portfolioId, positions },
      3
    );

    if (recovery.success) {
      console.log('Recovered from error:', recovery.documentation);
      return recovery.data;
    }

    throw new Error(`Enhanced analysis failed: ${error.message}`);
  }
}

/**
 * Generate a comprehensive compliance report
 */
function generateComplianceReport(analysisResult: any): string {
  let report = '# Portfolio-Analyse Compliance-Bericht\n\n';
  report += `Erstellt: ${new Date().toLocaleString('de-DE')}\n\n`;

  // Add formatted tables
  if (analysisResult.formattedTables) {
    report += '## Standardisierte Tabellen nach deutschen Vorgaben\n\n';
    report += analysisResult.formattedTables + '\n\n';
  }

  // Add validation report
  if (analysisResult.validationReport) {
    report += '## Mathematische Validierung\n\n';
    report += analysisResult.validationReport + '\n\n';
  }

  // Add quality report
  if (analysisResult.qualityReport) {
    report += '## Qualitätssicherung\n\n';
    report += analysisResult.qualityReport + '\n\n';
  }

  // Add error report if present
  if (analysisResult.errorReport) {
    report += '## Fehlerbehandlung\n\n';
    report += analysisResult.errorReport + '\n\n';
  }

  return report;
}

/**
 * Validate portfolio before analysis
 */
export async function validatePortfolioData(positions: any[]): Promise<{
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check for required fields
  positions.forEach((position, index) => {
    if (!position.isin && !position.name) {
      issues.push(`Position ${index + 1}: ISIN oder Name fehlt`);
    }
    if (!position.value && !position.percentage) {
      issues.push(`Position ${index + 1}: Wert oder Prozentsatz fehlt`);
    }
  });

  // Check total allocation
  const totalPercentage = positions
    .filter(p => p.percentage)
    .reduce((sum, p) => sum + (p.percentage || 0), 0);

  if (Math.abs(totalPercentage - 100) > 0.1) {
    issues.push(`Gesamtallokation: ${totalPercentage}% (sollte 100% sein)`);
    recommendations.push('Prozentsätze anpassen für 100% Summe');
  }

  // Check for significant "Other" allocations
  const otherPositions = positions.filter(p =>
    p.classification?.toLowerCase().includes('other') ||
    p.classification?.toLowerCase().includes('sonstige')
  );

  const otherPercentage = otherPositions.reduce((sum, p) => sum + (p.percentage || 0), 0);
  if (otherPercentage > 2) {
    issues.push(`"Sonstige" Kategorie: ${otherPercentage}% (Max: 2%)`);
    recommendations.push('Weitere Klassifizierung für "Sonstige" Positionen vornehmen');
  }

  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  };
}

/**
 * Calculate before/after comparison
 */
export function calculateBeforeAfterComparison(
  beforeAnalysis: any,
  afterAnalysis: any,
  newInvestment: number
): string {
  return PortfolioAnalysisIntegration.createBeforeAfterComparison(
    beforeAnalysis.germanCompliance.rawData,
    afterAnalysis.germanCompliance.rawData,
    newInvestment
  );
}

/**
 * Export functions for API endpoints
 */
export const enhancedAnalysisService = {
  performEnhancedAnalysis,
  validatePortfolioData,
  calculateBeforeAfterComparison,

  // Direct access to specialized services
  formatGermanTables: (data: any) => GermanTableFormatter.formatCompleteAnalysis(
    data.assetAllocations,
    data.currencyExposures,
    data.geographicAllocations,
    data.riskMetrics
  ),

  validateMathematics: (data: any) => MathematicalValidator.performCompleteValidation(
    data.assetAllocations,
    data.currencyExposures,
    data.geographicAllocations,
    data.riskMetrics
  ),

  calculateRiskMetrics: (weights: any) => RiskMetricsCalculator.calculateAllMetrics(weights),

  performQualityCheck: (analysisData: any) => QualityAssuranceService.performQualityCheck(analysisData)
};