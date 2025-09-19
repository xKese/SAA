/**
 * Look-Through Test Suite
 * Comprehensive testing framework for fund look-through analysis
 */

import { IntegratedLookThroughAnalysisService, IntegratedAnalysisRequest } from './integratedLookThroughAnalysis';

export interface TestPortfolio {
  name: string;
  description: string;
  positions: Array<{
    name: string;
    isin?: string;
    value: number;
    percentage: number;
    instrumentType: string;
    classification?: string;
  }>;
  expectedResults: {
    lookThroughCoverage: number;
    primaryAssetClass: string;
    primaryRegion: string;
    primaryCurrency: string;
    complianceExpectation: 'compliant' | 'non_compliant' | 'requires_attention';
  };
}

export interface TestResult {
  portfolioName: string;
  success: boolean;
  duration: number;
  errors: string[];
  actualResults: any;
  expectedResults: any;
  deviations: Array<{
    metric: string;
    expected: any;
    actual: any;
    deviation: number;
  }>;
}

export class LookThroughTestSuite {
  private analysisService: IntegratedLookThroughAnalysisService;

  constructor() {
    this.analysisService = new IntegratedLookThroughAnalysisService();
  }

  /**
   * Test-Portfolios definieren
   */
  private static readonly TEST_PORTFOLIOS: TestPortfolio[] = [
    {
      name: "Balanced Mixed Fund Portfolio",
      description: "Portfolio mit gemischten Fonds und direkten Holdings",
      positions: [
        {
          name: "MSCI World UCITS ETF",
          isin: "IE00B4L5Y983",
          value: 500000,
          percentage: 50.0,
          instrumentType: "etf",
          classification: "Equity ETF"
        },
        {
          name: "iShares Core Euro Corporate Bond UCITS ETF",
          isin: "IE00B3F81R35",
          value: 200000,
          percentage: 20.0,
          instrumentType: "etf",
          classification: "Bond ETF"
        },
        {
          name: "DWS Top Dividende",
          isin: "DE0009848119",
          value: 150000,
          percentage: 15.0,
          instrumentType: "fund",
          classification: "Mixed Fund"
        },
        {
          name: "Apple Inc.",
          isin: "US0378331005",
          value: 100000,
          percentage: 10.0,
          instrumentType: "stock",
          classification: "Technology"
        },
        {
          name: "Cash",
          value: 50000,
          percentage: 5.0,
          instrumentType: "cash",
          classification: "Liquidity"
        }
      ],
      expectedResults: {
        lookThroughCoverage: 0.85,
        primaryAssetClass: "Aktien",
        primaryRegion: "USA/Nordamerika",
        primaryCurrency: "USD",
        complianceExpectation: "compliant"
      }
    },

    {
      name: "Complex Multi-Level Fund Portfolio",
      description: "Portfolio mit verschachtelten Fonds zur Testung der Look-Through-Tiefe",
      positions: [
        {
          name: "Deka-GlobalChampions CF",
          isin: "LU0133666759",
          value: 400000,
          percentage: 40.0,
          instrumentType: "fund",
          classification: "Fund of Funds"
        },
        {
          name: "Templeton Global Total Return Fund",
          isin: "LU0170444356",
          value: 300000,
          percentage: 30.0,
          instrumentType: "fund",
          classification: "Global Bond Fund"
        },
        {
          name: "Allianz Global Artificial Intelligence",
          isin: "LU1548497426",
          value: 200000,
          percentage: 20.0,
          instrumentType: "fund",
          classification: "Sector Fund"
        },
        {
          name: "Cash EUR",
          value: 100000,
          percentage: 10.0,
          instrumentType: "cash",
          classification: "Liquidity"
        }
      ],
      expectedResults: {
        lookThroughCoverage: 0.90,
        primaryAssetClass: "Aktien",
        primaryRegion: "USA/Nordamerika",
        primaryCurrency: "USD",
        complianceExpectation: "requires_attention"
      }
    },

    {
      name: "Direct Holdings Heavy Portfolio",
      description: "Portfolio mit überwiegend direkten Holdings",
      positions: [
        {
          name: "SAP SE",
          isin: "DE0007164600",
          value: 250000,
          percentage: 25.0,
          instrumentType: "stock",
          classification: "Technology"
        },
        {
          name: "Siemens AG",
          isin: "DE0007236101",
          value: 200000,
          percentage: 20.0,
          instrumentType: "stock",
          classification: "Industrials"
        },
        {
          name: "Deutsche Bank AG",
          isin: "DE0005140008",
          value: 150000,
          percentage: 15.0,
          instrumentType: "stock",
          classification: "Financials"
        },
        {
          name: "Bundesanleihe 2030",
          isin: "DE0001102416",
          value: 200000,
          percentage: 20.0,
          instrumentType: "bond",
          classification: "Government Bond"
        },
        {
          name: "iShares MSCI Emerging Markets UCITS ETF",
          isin: "IE00B0M63177",
          value: 100000,
          percentage: 10.0,
          instrumentType: "etf",
          classification: "Emerging Markets ETF"
        },
        {
          name: "Cash",
          value: 100000,
          percentage: 10.0,
          instrumentType: "cash",
          classification: "Liquidity"
        }
      ],
      expectedResults: {
        lookThroughCoverage: 0.10, // Nur ETF hat Look-Through
        primaryAssetClass: "Aktien",
        primaryRegion: "Deutschland",
        primaryCurrency: "EUR",
        complianceExpectation: "compliant"
      }
    },

    {
      name: "High Risk Alternative Portfolio",
      description: "Portfolio mit alternativen Investments zur Testung der Compliance-Grenzen",
      positions: [
        {
          name: "Structured Product Complex",
          isin: "DE000ABC1234",
          value: 300000,
          percentage: 30.0,
          instrumentType: "other",
          classification: "Structured Product"
        },
        {
          name: "Hedge Fund of Funds",
          isin: "LU0123456789",
          value: 250000,
          percentage: 25.0,
          instrumentType: "fund",
          classification: "Alternative Fund"
        },
        {
          name: "Real Estate Investment Trust",
          isin: "US1234567890",
          value: 200000,
          percentage: 20.0,
          instrumentType: "fund",
          classification: "REIT"
        },
        {
          name: "Cryptocurrency Fund",
          value: 150000,
          percentage: 15.0,
          instrumentType: "other",
          classification: "Crypto"
        },
        {
          name: "Cash USD",
          value: 100000,
          percentage: 10.0,
          instrumentType: "cash",
          classification: "Liquidity"
        }
      ],
      expectedResults: {
        lookThroughCoverage: 0.45,
        primaryAssetClass: "Sonstige",
        primaryRegion: "Sonstige",
        primaryCurrency: "USD",
        complianceExpectation: "non_compliant"
      }
    }
  ];

  /**
   * Führe alle Tests aus
   */
  async runAllTests(): Promise<{
    summary: {
      totalTests: number;
      passed: number;
      failed: number;
      averageDuration: number;
      overallSuccess: boolean;
    };
    results: TestResult[];
    detailedReport: string;
  }> {
    console.log('🧪 Starting comprehensive look-through test suite...');
    const startTime = Date.now();

    const results: TestResult[] = [];

    for (const portfolio of LookThroughTestSuite.TEST_PORTFOLIOS) {
      try {
        console.log(`\n📋 Testing portfolio: ${portfolio.name}`);
        const result = await this.testPortfolio(portfolio);
        results.push(result);

        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${portfolio.name}: ${result.duration}ms`);

        if (!result.success) {
          console.log(`   Errors: ${result.errors.join(', ')}`);
        }
      } catch (error) {
        console.error(`❌ Test failed for ${portfolio.name}:`, error);
        results.push({
          portfolioName: portfolio.name,
          success: false,
          duration: 0,
          errors: [error.message],
          actualResults: null,
          expectedResults: portfolio.expectedResults,
          deviations: []
        });
      }
    }

    const summary = this.generateTestSummary(results, Date.now() - startTime);
    const detailedReport = this.generateDetailedReport(results, summary);

    console.log(`\n🎯 Test Suite Complete: ${summary.passed}/${summary.totalTests} passed`);

    return { summary, results, detailedReport };
  }

  /**
   * Teste einzelnes Portfolio
   */
  private async testPortfolio(portfolio: TestPortfolio): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Erstelle Analyse-Request
      const request: IntegratedAnalysisRequest = {
        portfolioId: `test_${portfolio.name.replace(/\s+/g, '_').toLowerCase()}`,
        positions: portfolio.positions,
        requestedPhases: [0, 2, 3, 4, 5],
        includeLookThrough: true,
        complianceFramework: 'BaFin'
      };

      // Führe Analyse durch
      const analysisResult = await this.analysisService.performIntegratedAnalysis(request);

      // Validiere Ergebnisse
      const deviations = this.validateResults(analysisResult, portfolio.expectedResults);

      // Bestimme Erfolg
      const success = deviations.every(d => d.deviation <= 0.1) && errors.length === 0;

      return {
        portfolioName: portfolio.name,
        success,
        duration: Date.now() - startTime,
        errors,
        actualResults: this.extractActualResults(analysisResult),
        expectedResults: portfolio.expectedResults,
        deviations
      };

    } catch (error) {
      return {
        portfolioName: portfolio.name,
        success: false,
        duration: Date.now() - startTime,
        errors: [error.message],
        actualResults: null,
        expectedResults: portfolio.expectedResults,
        deviations: []
      };
    }
  }

  /**
   * Validiere Analyse-Ergebnisse gegen Erwartungen
   */
  private validateResults(analysisResult: any, expectedResults: any): Array<{
    metric: string;
    expected: any;
    actual: any;
    deviation: number;
  }> {
    const deviations: Array<{ metric: string; expected: any; actual: any; deviation: number }> = [];

    // Look-Through Coverage
    const actualCoverage = analysisResult.qualityMetrics?.lookThroughCoverage || 0;
    const expectedCoverage = expectedResults.lookThroughCoverage;
    deviations.push({
      metric: 'lookThroughCoverage',
      expected: expectedCoverage,
      actual: actualCoverage,
      deviation: Math.abs(actualCoverage - expectedCoverage)
    });

    // Primary Asset Class
    const actualPrimaryAsset = this.getPrimaryAllocation(
      analysisResult.consolidatedAllocations?.assetClasses || {}
    );
    deviations.push({
      metric: 'primaryAssetClass',
      expected: expectedResults.primaryAssetClass,
      actual: actualPrimaryAsset,
      deviation: actualPrimaryAsset === expectedResults.primaryAssetClass ? 0 : 1
    });

    // Primary Region
    const actualPrimaryRegion = this.getPrimaryAllocation(
      analysisResult.consolidatedAllocations?.geographicRegions || {}
    );
    deviations.push({
      metric: 'primaryRegion',
      expected: expectedResults.primaryRegion,
      actual: actualPrimaryRegion,
      deviation: actualPrimaryRegion === expectedResults.primaryRegion ? 0 : 1
    });

    // Primary Currency
    const actualPrimaryCurrency = this.getPrimaryAllocation(
      analysisResult.consolidatedAllocations?.currencies || {}
    );
    deviations.push({
      metric: 'primaryCurrency',
      expected: expectedResults.primaryCurrency,
      actual: actualPrimaryCurrency,
      deviation: actualPrimaryCurrency === expectedResults.primaryCurrency ? 0 : 1
    });

    // Compliance Status
    const actualCompliance = analysisResult.complianceReport?.overallComplianceStatus || 'unknown';
    deviations.push({
      metric: 'complianceStatus',
      expected: expectedResults.complianceExpectation,
      actual: actualCompliance,
      deviation: actualCompliance === expectedResults.complianceExpectation ? 0 : 1
    });

    return deviations;
  }

  /**
   * Ermittle primäre Allokation
   */
  private getPrimaryAllocation(allocations: Record<string, any>): string {
    let maxPercentage = 0;
    let primaryCategory = 'Unknown';

    Object.entries(allocations).forEach(([category, data]) => {
      const percentage = data.percentage || 0;
      if (percentage > maxPercentage) {
        maxPercentage = percentage;
        primaryCategory = category;
      }
    });

    return primaryCategory;
  }

  /**
   * Extrahiere tatsächliche Ergebnisse
   */
  private extractActualResults(analysisResult: any): any {
    return {
      lookThroughCoverage: analysisResult.qualityMetrics?.lookThroughCoverage,
      primaryAssetClass: this.getPrimaryAllocation(analysisResult.consolidatedAllocations?.assetClasses || {}),
      primaryRegion: this.getPrimaryAllocation(analysisResult.consolidatedAllocations?.geographicRegions || {}),
      primaryCurrency: this.getPrimaryAllocation(analysisResult.consolidatedAllocations?.currencies || {}),
      complianceStatus: analysisResult.complianceReport?.overallComplianceStatus,
      totalValue: analysisResult.totalValue,
      processingTime: analysisResult.performanceMetrics?.totalDuration
    };
  }

  /**
   * Generiere Test-Zusammenfassung
   */
  private generateTestSummary(results: TestResult[], totalDuration: number): any {
    const totalTests = results.length;
    const passed = results.filter(r => r.success).length;
    const failed = totalTests - passed;
    const averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / totalTests;

    return {
      totalTests,
      passed,
      failed,
      averageDuration,
      overallSuccess: failed === 0,
      totalSuiteDuration: totalDuration
    };
  }

  /**
   * Generiere detaillierten Test-Bericht
   */
  private generateDetailedReport(results: TestResult[], summary: any): string {
    let report = '# Look-Through Analysis Test Suite Report\n\n';
    report += `**Ausgeführt:** ${new Date().toLocaleString('de-DE')}\n\n`;

    // Zusammenfassung
    report += '## Zusammenfassung\n';
    report += `- **Tests gesamt:** ${summary.totalTests}\n`;
    report += `- **Erfolgreich:** ${summary.passed}\n`;
    report += `- **Fehlgeschlagen:** ${summary.failed}\n`;
    report += `- **Erfolgsrate:** ${(summary.passed / summary.totalTests * 100).toFixed(1)}%\n`;
    report += `- **Durchschnittliche Dauer:** ${summary.averageDuration.toFixed(0)}ms\n`;
    report += `- **Gesamt-Testdauer:** ${summary.totalSuiteDuration.toFixed(0)}ms\n\n`;

    // Detaillierte Ergebnisse
    report += '## Detaillierte Test-Ergebnisse\n\n';

    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      report += `### ${status} ${result.portfolioName}\n`;
      report += `**Dauer:** ${result.duration}ms\n\n`;

      if (result.errors.length > 0) {
        report += '**Fehler:**\n';
        result.errors.forEach(error => {
          report += `- ${error}\n`;
        });
        report += '\n';
      }

      if (result.deviations.length > 0) {
        report += '**Abweichungen:**\n';
        report += '| Metrik | Erwartet | Tatsächlich | Abweichung |\n';
        report += '|--------|----------|-------------|------------|\n';

        result.deviations.forEach(dev => {
          const deviationStr = typeof dev.deviation === 'number' ?
            dev.deviation.toFixed(3) : dev.deviation;
          report += `| ${dev.metric} | ${dev.expected} | ${dev.actual} | ${deviationStr} |\n`;
        });
        report += '\n';
      }
    });

    // Empfehlungen
    report += '## Empfehlungen\n';
    if (summary.failed > 0) {
      report += '- Analyse der fehlgeschlagenen Tests erforderlich\n';
      report += '- Validierung der Test-Erwartungen\n';
      report += '- Mögliche Verbesserungen der Look-Through-Algorithmen\n';
    } else {
      report += '- Alle Tests erfolgreich - System ist produktionsbereit\n';
      report += '- Regelmäßige Ausführung der Test-Suite empfohlen\n';
    }

    return report;
  }

  /**
   * Führe Einzeltest für spezifisches Portfolio aus
   */
  async runSingleTest(portfolioName: string): Promise<TestResult | null> {
    const portfolio = LookThroughTestSuite.TEST_PORTFOLIOS.find(p => p.name === portfolioName);
    if (!portfolio) {
      throw new Error(`Portfolio '${portfolioName}' not found in test suite`);
    }

    console.log(`🧪 Running single test: ${portfolioName}`);
    return await this.testPortfolio(portfolio);
  }

  /**
   * Erstelle Custom-Test
   */
  async runCustomTest(
    name: string,
    positions: any[],
    expectedResults: any
  ): Promise<TestResult> {
    const customPortfolio: TestPortfolio = {
      name,
      description: 'Custom test portfolio',
      positions,
      expectedResults
    };

    console.log(`🧪 Running custom test: ${name}`);
    return await this.testPortfolio(customPortfolio);
  }
}