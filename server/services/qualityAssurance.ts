/**
 * Quality Assurance Service
 * Comprehensive validation checklist for portfolio analysis
 */

export interface ChecklistItem {
  id: string;
  category: string;
  description: string;
  status: 'passed' | 'failed' | 'warning' | 'not_applicable';
  details?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface QualityScore {
  totalScore: number;
  maxScore: number;
  percentage: number;
  rating: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement' | 'poor';
}

export interface AnalysisQualityReport {
  checklist: ChecklistItem[];
  score: QualityScore;
  timestamp: Date;
  recommendations: string[];
}

export class QualityAssuranceService {
  private static readonly CHECKLIST_TEMPLATE: Omit<ChecklistItem, 'status' | 'details'>[] = [
    // Instrument Classification
    {
      id: 'IC001',
      category: 'Instrument Classification',
      description: 'Every instrument >€1,000 has confirmed classification',
      severity: 'critical'
    },
    {
      id: 'IC002',
      category: 'Instrument Classification',
      description: 'Source documentation available for all classifications',
      severity: 'high'
    },
    {
      id: 'IC003',
      category: 'Instrument Classification',
      description: 'Funds/ETFs correctly distinguished from direct equities',
      severity: 'critical'
    },

    // Mathematical Precision
    {
      id: 'MP001',
      category: 'Mathematical Precision',
      description: 'Asset allocations sum to 100.0% ±0.1%',
      severity: 'critical'
    },
    {
      id: 'MP002',
      category: 'Mathematical Precision',
      description: 'Currency exposures sum to 100.0% ±0.1%',
      severity: 'critical'
    },
    {
      id: 'MP003',
      category: 'Mathematical Precision',
      description: 'Geographic allocations sum to 100.0% ±0.1%',
      severity: 'critical'
    },
    {
      id: 'MP004',
      category: 'Mathematical Precision',
      description: '"Sonstige/Nicht zugeordnet" <2% of portfolio',
      severity: 'high'
    },

    // Risk Metrics
    {
      id: 'RM001',
      category: 'Risk Metrics',
      description: 'Expected return within plausible range (0-15%)',
      severity: 'high'
    },
    {
      id: 'RM002',
      category: 'Risk Metrics',
      description: 'Portfolio volatility within plausible range (5-25%)',
      severity: 'high'
    },
    {
      id: 'RM003',
      category: 'Risk Metrics',
      description: 'Sharpe ratio within plausible range (-0.5 to 2.0)',
      severity: 'medium'
    },
    {
      id: 'RM004',
      category: 'Risk Metrics',
      description: 'Expected Shortfall worse than VaR',
      severity: 'high'
    },
    {
      id: 'RM005',
      category: 'Risk Metrics',
      description: 'Diversification quotient between 0 and 1',
      severity: 'medium'
    },

    // German Standards
    {
      id: 'GS001',
      category: 'German Standards',
      description: 'German decimal notation used (comma separator)',
      severity: 'medium'
    },
    {
      id: 'GS002',
      category: 'German Standards',
      description: 'German terminology used in all tables',
      severity: 'low'
    },
    {
      id: 'GS003',
      category: 'German Standards',
      description: 'ECB risk-free rate used for Sharpe ratio',
      severity: 'medium'
    },

    // Data Quality
    {
      id: 'DQ001',
      category: 'Data Quality',
      description: 'Factsheets available for funds >€10,000',
      severity: 'high'
    },
    {
      id: 'DQ002',
      category: 'Data Quality',
      description: 'Currency information confirmed for all positions',
      severity: 'high'
    },
    {
      id: 'DQ003',
      category: 'Data Quality',
      description: 'Missing data properly documented',
      severity: 'medium'
    },

    // Output Format
    {
      id: 'OF001',
      category: 'Output Format',
      description: 'All 4 standard tables present',
      severity: 'critical'
    },
    {
      id: 'OF002',
      category: 'Output Format',
      description: 'Tables properly formatted with headers',
      severity: 'medium'
    },
    {
      id: 'OF003',
      category: 'Output Format',
      description: 'Total rows included in all tables',
      severity: 'low'
    }
  ];

  /**
   * Perform comprehensive quality check
   */
  static performQualityCheck(analysisData: {
    instruments: Array<{ isin: string; value: number; classification?: string; source?: string }>;
    assetAllocations: Array<{ category: string; percentage: number }>;
    currencyExposures: Array<{ currency: string; percentage: number }>;
    geographicAllocations: Array<{ region: string; percentage: number }>;
    riskMetrics: Record<string, number>;
    outputTables: string[];
    missingData: Array<{ isin: string; dataType: string }>;
  }): AnalysisQualityReport {
    const checklist: ChecklistItem[] = [];
    let totalPoints = 0;
    let maxPoints = 0;

    // Check each item
    for (const template of this.CHECKLIST_TEMPLATE) {
      const result = this.checkItem(template, analysisData);
      checklist.push(result);

      // Calculate points
      const points = this.getPoints(template.severity);
      maxPoints += points;
      if (result.status === 'passed') {
        totalPoints += points;
      } else if (result.status === 'warning') {
        totalPoints += points * 0.5;
      }
    }

    const percentage = (totalPoints / maxPoints) * 100;
    const rating = this.getRating(percentage);
    const recommendations = this.generateRecommendations(checklist);

    return {
      checklist,
      score: {
        totalScore: totalPoints,
        maxScore: maxPoints,
        percentage,
        rating
      },
      timestamp: new Date(),
      recommendations
    };
  }

  /**
   * Check individual checklist item
   */
  private static checkItem(
    template: Omit<ChecklistItem, 'status' | 'details'>,
    data: any
  ): ChecklistItem {
    const item: ChecklistItem = {
      ...template,
      status: 'not_applicable'
    };

    switch (template.id) {
      // Instrument Classification checks
      case 'IC001':
        const significantInstruments = data.instruments.filter(i => i.value > 1000);
        const classifiedCount = significantInstruments.filter(i => i.classification).length;
        item.status = classifiedCount === significantInstruments.length ? 'passed' : 'failed';
        item.details = `${classifiedCount}/${significantInstruments.length} instruments classified`;
        break;

      case 'IC002':
        const withSource = data.instruments.filter(i => i.source).length;
        item.status = withSource === data.instruments.length ? 'passed' :
                     withSource > data.instruments.length * 0.8 ? 'warning' : 'failed';
        item.details = `${withSource}/${data.instruments.length} with source`;
        break;

      // Mathematical Precision checks
      case 'MP001':
        const assetSum = data.assetAllocations.reduce((sum, a) => sum + a.percentage, 0);
        item.status = Math.abs(assetSum - 100) <= 0.1 ? 'passed' : 'failed';
        item.details = `Sum: ${assetSum.toFixed(2)}%`;
        break;

      case 'MP002':
        const currencySum = data.currencyExposures.reduce((sum, c) => sum + c.percentage, 0);
        item.status = Math.abs(currencySum - 100) <= 0.1 ? 'passed' : 'failed';
        item.details = `Sum: ${currencySum.toFixed(2)}%`;
        break;

      case 'MP003':
        const geoSum = data.geographicAllocations.reduce((sum, g) => sum + g.percentage, 0);
        item.status = Math.abs(geoSum - 100) <= 0.1 ? 'passed' : 'failed';
        item.details = `Sum: ${geoSum.toFixed(2)}%`;
        break;

      case 'MP004':
        const sonstige = data.assetAllocations.find(a =>
          a.category.toLowerCase().includes('sonstige') ||
          a.category.toLowerCase().includes('other')
        );
        const sonstigePercentage = sonstige?.percentage || 0;
        item.status = sonstigePercentage < 2 ? 'passed' :
                     sonstigePercentage < 3 ? 'warning' : 'failed';
        item.details = `Sonstige: ${sonstigePercentage.toFixed(2)}%`;
        break;

      // Risk Metrics checks
      case 'RM001':
        const expectedReturn = data.riskMetrics.expectedReturn;
        item.status = expectedReturn >= 0 && expectedReturn <= 15 ? 'passed' : 'failed';
        item.details = `Return: ${expectedReturn?.toFixed(2)}%`;
        break;

      case 'RM002':
        const volatility = data.riskMetrics.volatility;
        item.status = volatility >= 5 && volatility <= 25 ? 'passed' : 'failed';
        item.details = `Volatility: ${volatility?.toFixed(2)}%`;
        break;

      case 'RM004':
        const es = data.riskMetrics.expectedShortfall95;
        const var95 = data.riskMetrics.valueAtRisk95;
        item.status = es <= var95 ? 'passed' : 'failed';
        item.details = `ES: ${es?.toFixed(2)}%, VaR: ${var95?.toFixed(2)}%`;
        break;

      // Output Format checks
      case 'OF001':
        item.status = data.outputTables.length >= 4 ? 'passed' : 'failed';
        item.details = `${data.outputTables.length}/4 tables present`;
        break;

      // Data Quality checks
      case 'DQ003':
        item.status = data.missingData.length === 0 ? 'passed' :
                     data.missingData.length < 5 ? 'warning' : 'failed';
        item.details = `${data.missingData.length} missing data points`;
        break;
    }

    return item;
  }

  /**
   * Get points for severity level
   */
  private static getPoints(severity: string): number {
    switch (severity) {
      case 'critical': return 10;
      case 'high': return 7;
      case 'medium': return 4;
      case 'low': return 2;
      default: return 0;
    }
  }

  /**
   * Get rating based on percentage
   */
  private static getRating(percentage: number): QualityScore['rating'] {
    if (percentage >= 95) return 'excellent';
    if (percentage >= 85) return 'good';
    if (percentage >= 70) return 'satisfactory';
    if (percentage >= 50) return 'needs_improvement';
    return 'poor';
  }

  /**
   * Generate recommendations based on checklist results
   */
  private static generateRecommendations(checklist: ChecklistItem[]): string[] {
    const recommendations: string[] = [];
    const failedCritical = checklist.filter(i => i.status === 'failed' && i.severity === 'critical');
    const failedHigh = checklist.filter(i => i.status === 'failed' && i.severity === 'high');

    if (failedCritical.length > 0) {
      recommendations.push('🚨 Kritische Fehler müssen sofort behoben werden:');
      failedCritical.forEach(item => {
        recommendations.push(`  - ${item.description} (${item.details})`);
      });
    }

    if (failedHigh.length > 0) {
      recommendations.push('⚠️ Wichtige Verbesserungen erforderlich:');
      failedHigh.forEach(item => {
        recommendations.push(`  - ${item.description} (${item.details})`);
      });
    }

    const warnings = checklist.filter(i => i.status === 'warning');
    if (warnings.length > 0) {
      recommendations.push('💡 Empfohlene Optimierungen:');
      warnings.forEach(item => {
        recommendations.push(`  - ${item.description} (${item.details})`);
      });
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Analyse erfüllt alle Qualitätsstandards!');
    }

    return recommendations;
  }

  /**
   * Format quality report for display
   */
  static formatQualityReport(report: AnalysisQualityReport): string {
    let output = '# Qualitätssicherungsbericht\n\n';

    // Score summary
    output += `## Gesamtbewertung: ${report.score.rating.toUpperCase()}\n`;
    output += `**Score: ${report.score.totalScore}/${report.score.maxScore} (${report.score.percentage.toFixed(1)}%)**\n\n`;

    // Checklist by category
    const categories = [...new Set(report.checklist.map(i => i.category))];

    for (const category of categories) {
      const items = report.checklist.filter(i => i.category === category);
      output += `### ${category}\n`;

      for (const item of items) {
        const icon = item.status === 'passed' ? '✅' :
                    item.status === 'warning' ? '⚠️' :
                    item.status === 'failed' ? '❌' : '⏭️';

        output += `${icon} ${item.description}`;
        if (item.details) {
          output += ` (${item.details})`;
        }
        output += '\n';
      }
      output += '\n';
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      output += '## Empfehlungen\n';
      report.recommendations.forEach(rec => {
        output += `${rec}\n`;
      });
    }

    output += `\n*Bericht erstellt: ${report.timestamp.toLocaleString('de-DE')}*\n`;

    return output;
  }
}