/**
 * German Look-Through Compliance Service
 * Ensures BaFin/KAGB compliance for fund look-through analysis
 */

import { LookThroughPortfolioAnalysis } from './portfolioLookThroughIntegrator';
import { GermanTableFormatter } from './germanTableFormatter';
import { MathematicalValidator } from './mathematicalValidation';

export interface BaFinLookThroughRequirements {
  maxLookThroughDepth: number; // BaFin: 3 Ebenen
  minTransparencyThreshold: number; // Mindest-Transparenz 95%
  requiredDocumentation: string[];
  complianceCategories: {
    assetClasses: string[];
    geographicRegions: string[];
    riskCategories: string[];
  };
}

export interface GermanComplianceReport {
  portfolioId: string;
  complianceDate: string;
  regulatoryFramework: 'BaFin' | 'KAGB' | 'MiFID_II';

  complianceChecks: {
    lookThroughDepthCompliance: {
      status: 'compliant' | 'non_compliant' | 'warning';
      maxDepthFound: number;
      details: string;
    };

    transparencyCompliance: {
      status: 'compliant' | 'non_compliant' | 'warning';
      achievedTransparency: number;
      details: string;
    };

    allocationCompliance: {
      status: 'compliant' | 'non_compliant' | 'warning';
      assetClassConsistency: boolean;
      geographicConsistency: boolean;
      mathematicalAccuracy: boolean;
      details: string[];
    };

    documentationCompliance: {
      status: 'compliant' | 'non_compliant' | 'warning';
      missingDocuments: string[];
      qualityScore: number;
    };
  };

  germanTables: {
    anlagekategorieTabelle: string;
    waehrungsTabelle: string;
    regionalTabelle: string;
    kennzahlenTabelle: string;
  };

  overallComplianceStatus: 'compliant' | 'non_compliant' | 'requires_attention';
  recommendations: string[];
  riskAssessment: string[];
}

export class GermanLookThroughComplianceService {
  private static readonly BAFIN_REQUIREMENTS: BaFinLookThroughRequirements = {
    maxLookThroughDepth: 3,
    minTransparencyThreshold: 0.95,
    requiredDocumentation: [
      'Factsheets',
      'Prospekte',
      'Wesentliche Anlegerinformationen (KIID)',
      'Allokationsnachweise'
    ],
    complianceCategories: {
      assetClasses: [
        'Aktien',
        'Anleihen',
        'Geldmarktinstrumente',
        'Immobilien',
        'Rohstoffe',
        'Derivate',
        'Liquidität'
      ],
      geographicRegions: [
        'Deutschland',
        'Europa (ohne Deutschland)',
        'USA/Nordamerika',
        'Asien-Pazifik',
        'Schwellenländer',
        'Sonstige'
      ],
      riskCategories: [
        'Niedrigrisiko',
        'Mittleres Risiko',
        'Hochrisiko',
        'Spezialrisiken'
      ]
    }
  };

  /**
   * Führe vollständige Deutsche Compliance-Prüfung durch
   */
  async performGermanComplianceCheck(
    lookThroughAnalysis: LookThroughPortfolioAnalysis,
    regulatoryFramework: 'BaFin' | 'KAGB' | 'MiFID_II' = 'BaFin'
  ): Promise<GermanComplianceReport> {
    console.log(`📋 Performing German compliance check (${regulatoryFramework})`);

    // Schritt 1: Look-Through-Tiefe prüfen
    const lookThroughDepthCompliance = this.checkLookThroughDepth(lookThroughAnalysis);

    // Schritt 2: Transparenz-Anforderungen prüfen
    const transparencyCompliance = this.checkTransparencyRequirements(lookThroughAnalysis);

    // Schritt 3: Allokations-Compliance prüfen
    const allocationCompliance = await this.checkAllocationCompliance(lookThroughAnalysis);

    // Schritt 4: Dokumentations-Compliance prüfen
    const documentationCompliance = this.checkDocumentationCompliance(lookThroughAnalysis);

    // Schritt 5: Deutsche Tabellen erstellen
    const germanTables = await this.createGermanComplianceTables(lookThroughAnalysis);

    // Schritt 6: Gesamtbewertung
    const overallStatus = this.determineOverallCompliance([
      lookThroughDepthCompliance.status,
      transparencyCompliance.status,
      allocationCompliance.status,
      documentationCompliance.status
    ]);

    // Schritt 7: Empfehlungen generieren
    const { recommendations, riskAssessment } = this.generateComplianceRecommendations({
      lookThroughDepthCompliance,
      transparencyCompliance,
      allocationCompliance,
      documentationCompliance
    });

    return {
      portfolioId: lookThroughAnalysis.portfolioId,
      complianceDate: new Date().toISOString(),
      regulatoryFramework,
      complianceChecks: {
        lookThroughDepthCompliance,
        transparencyCompliance,
        allocationCompliance,
        documentationCompliance
      },
      germanTables,
      overallComplianceStatus: overallStatus,
      recommendations,
      riskAssessment
    };
  }

  /**
   * Prüfe Look-Through-Tiefe nach BaFin-Standards
   */
  private checkLookThroughDepth(analysis: LookThroughPortfolioAnalysis): {
    status: 'compliant' | 'non_compliant' | 'warning';
    maxDepthFound: number;
    details: string;
  } {
    const maxDepth = Math.max(...analysis.fundAnalyses.map(fa => fa.lookThroughDepth));
    const bafinMaxDepth = this.BAFIN_REQUIREMENTS.maxLookThroughDepth;

    if (maxDepth <= bafinMaxDepth) {
      return {
        status: 'compliant',
        maxDepthFound: maxDepth,
        details: `Look-Through-Tiefe ${maxDepth} entspricht BaFin-Anforderungen (max. ${bafinMaxDepth})`
      };
    } else if (maxDepth === bafinMaxDepth + 1) {
      return {
        status: 'warning',
        maxDepthFound: maxDepth,
        details: `Look-Through-Tiefe ${maxDepth} überschreitet BaFin-Empfehlung um 1 Ebene`
      };
    } else {
      return {
        status: 'non_compliant',
        maxDepthFound: maxDepth,
        details: `Look-Through-Tiefe ${maxDepth} überschreitet BaFin-Maximum von ${bafinMaxDepth} Ebenen`
      };
    }
  }

  /**
   * Prüfe Transparenz-Anforderungen
   */
  private checkTransparencyRequirements(analysis: LookThroughPortfolioAnalysis): {
    status: 'compliant' | 'non_compliant' | 'warning';
    achievedTransparency: number;
    details: string;
  } {
    const achievedTransparency = analysis.qualityMetrics.overallLookThroughCoverage;
    const requiredTransparency = this.BAFIN_REQUIREMENTS.minTransparencyThreshold;

    if (achievedTransparency >= requiredTransparency) {
      return {
        status: 'compliant',
        achievedTransparency: achievedTransparency * 100,
        details: `Transparenz ${(achievedTransparency * 100).toFixed(1)}% erfüllt BaFin-Mindestanforderung von ${(requiredTransparency * 100)}%`
      };
    } else if (achievedTransparency >= requiredTransparency - 0.05) {
      return {
        status: 'warning',
        achievedTransparency: achievedTransparency * 100,
        details: `Transparenz ${(achievedTransparency * 100).toFixed(1)}% liegt knapp unter BaFin-Anforderung`
      };
    } else {
      return {
        status: 'non_compliant',
        achievedTransparency: achievedTransparency * 100,
        details: `Transparenz ${(achievedTransparency * 100).toFixed(1)}% unterschreitet BaFin-Mindestanforderung von ${(requiredTransparency * 100)}%`
      };
    }
  }

  /**
   * Prüfe Allokations-Compliance
   */
  private async checkAllocationCompliance(analysis: LookThroughPortfolioAnalysis): Promise<{
    status: 'compliant' | 'non_compliant' | 'warning';
    assetClassConsistency: boolean;
    geographicConsistency: boolean;
    mathematicalAccuracy: boolean;
    details: string[];
  }> {
    const details: string[] = [];

    // Asset-Klassen-Konsistenz prüfen
    const assetClassSum = Object.values(analysis.integratedAllocations.assetClasses)
      .reduce((sum, allocation) => sum + allocation.percentage, 0);
    const assetClassConsistency = Math.abs(assetClassSum - 100) <= 0.1;

    if (!assetClassConsistency) {
      details.push(`Asset-Klassen summieren zu ${assetClassSum.toFixed(2)}% (sollte 100% sein)`);
    }

    // Geografische Konsistenz prüfen
    const geoSum = Object.values(analysis.integratedAllocations.geographicRegions)
      .reduce((sum, allocation) => sum + allocation.percentage, 0);
    const geographicConsistency = Math.abs(geoSum - 100) <= 0.1;

    if (!geographicConsistency) {
      details.push(`Geografische Allokationen summieren zu ${geoSum.toFixed(2)}% (sollte 100% sein)`);
    }

    // Mathematische Genauigkeit (allgemein)
    const overallMathAccuracy = analysis.qualityMetrics.mathematicalConsistency;
    const mathematicalAccuracy = overallMathAccuracy >= 0.95;

    if (!mathematicalAccuracy) {
      details.push(`Mathematische Konsistenz ${(overallMathAccuracy * 100).toFixed(1)}% unter Schwellenwert von 95%`);
    }

    // Prüfe deutsche Asset-Klassen-Terminologie
    const germanAssetClasses = this.BAFIN_REQUIREMENTS.complianceCategories.assetClasses;
    const usedAssetClasses = Object.keys(analysis.integratedAllocations.assetClasses);
    const nonGermanAssetClasses = usedAssetClasses.filter(ac => !germanAssetClasses.includes(ac));

    if (nonGermanAssetClasses.length > 0) {
      details.push(`Nicht-deutsche Asset-Klassen gefunden: ${nonGermanAssetClasses.join(', ')}`);
    }

    const status = assetClassConsistency && geographicConsistency && mathematicalAccuracy ?
      'compliant' :
      (details.length <= 1 ? 'warning' : 'non_compliant');

    return {
      status,
      assetClassConsistency,
      geographicConsistency,
      mathematicalAccuracy,
      details
    };
  }

  /**
   * Prüfe Dokumentations-Compliance
   */
  private checkDocumentationCompliance(analysis: LookThroughPortfolioAnalysis): {
    status: 'compliant' | 'non_compliant' | 'warning';
    missingDocuments: string[];
    qualityScore: number;
  } {
    const missingDocuments: string[] = [];
    let qualityScore = 0;

    // Prüfe Factsheet-Verfügbarkeit
    const factsheetCoverage = analysis.fundAnalyses.filter(fa =>
      fa.allocationBreakdown.dataSource === 'factsheet'
    ).length / analysis.fundAnalyses.length;

    qualityScore += factsheetCoverage * 0.4;

    if (factsheetCoverage < 0.8) {
      missingDocuments.push('Factsheets für alle Fonds');
    }

    // Prüfe Datenqualität
    const avgDataQuality = analysis.qualityMetrics.averageDataQuality;
    qualityScore += avgDataQuality * 0.3;

    if (avgDataQuality < 0.7) {
      missingDocuments.push('Hochwertige Quelldaten');
    }

    // Prüfe Look-Through-Abdeckung
    const lookThroughCoverage = analysis.qualityMetrics.overallLookThroughCoverage;
    qualityScore += lookThroughCoverage * 0.3;

    if (lookThroughCoverage < 0.9) {
      missingDocuments.push('Vollständige Look-Through-Dokumentation');
    }

    const status = qualityScore >= 0.8 ? 'compliant' :
                  qualityScore >= 0.6 ? 'warning' : 'non_compliant';

    return {
      status,
      missingDocuments,
      qualityScore
    };
  }

  /**
   * Erstelle deutsche Compliance-Tabellen
   */
  private async createGermanComplianceTables(analysis: LookThroughPortfolioAnalysis): Promise<{
    anlagekategorieTabelle: string;
    waehrungsTabelle: string;
    regionalTabelle: string;
    kennzahlenTabelle: string;
  }> {
    // Konvertiere zu GermanTableFormatter-Format
    const assetAllocations = Object.entries(analysis.integratedAllocations.assetClasses)
      .map(([category, data]) => ({
        category,
        value: data.value,
        percentage: data.percentage
      }));

    const currencyExposures = Object.entries(analysis.integratedAllocations.currencies)
      .map(([currency, data]) => ({
        currency,
        value: data.value,
        percentage: data.percentage,
        hedged: data.hedged !== undefined
      }));

    const geographicAllocations = Object.entries(analysis.integratedAllocations.geographicRegions)
      .map(([region, data]) => ({
        region,
        percentage: data.percentage
      }));

    // Berechne Kennzahlen für Look-Through-spezifische Metriken
    const riskMetrics = [
      {
        name: 'Look-Through-Abdeckung',
        value: analysis.qualityMetrics.overallLookThroughCoverage * 100,
        unit: '%'
      },
      {
        name: 'Datenqualität',
        value: analysis.qualityMetrics.averageDataQuality * 100,
        unit: '%'
      },
      {
        name: 'Anzahl Look-Through-Fonds',
        value: analysis.fundAnalyses.length,
        unit: ''
      },
      {
        name: 'Durchschnittliche Look-Through-Tiefe',
        value: analysis.fundAnalyses.reduce((sum, fa) => sum + fa.lookThroughDepth, 0) / analysis.fundAnalyses.length,
        unit: 'Ebenen'
      }
    ];

    return {
      anlagekategorieTabelle: GermanTableFormatter.createAssetTable(assetAllocations),
      waehrungsTabelle: GermanTableFormatter.createCurrencyTable(currencyExposures),
      regionalTabelle: GermanTableFormatter.createGeographicTable(geographicAllocations),
      kennzahlenTabelle: GermanTableFormatter.createRiskMetricsTable(riskMetrics)
    };
  }

  /**
   * Bestimme Gesamt-Compliance-Status
   */
  private determineOverallCompliance(
    statuses: Array<'compliant' | 'non_compliant' | 'warning'>
  ): 'compliant' | 'non_compliant' | 'requires_attention' {
    if (statuses.every(status => status === 'compliant')) {
      return 'compliant';
    } else if (statuses.some(status => status === 'non_compliant')) {
      return 'non_compliant';
    } else {
      return 'requires_attention';
    }
  }

  /**
   * Generiere Compliance-Empfehlungen
   */
  private generateComplianceRecommendations(complianceChecks: any): {
    recommendations: string[];
    riskAssessment: string[];
  } {
    const recommendations: string[] = [];
    const riskAssessment: string[] = [];

    // Look-Through-Tiefe
    if (complianceChecks.lookThroughDepthCompliance.status === 'non_compliant') {
      recommendations.push('Reduzierung der Look-Through-Tiefe auf BaFin-konforme 3 Ebenen');
      riskAssessment.push('Hohes Risiko: Überschreitung regulatorischer Look-Through-Limits');
    }

    // Transparenz
    if (complianceChecks.transparencyCompliance.status !== 'compliant') {
      recommendations.push('Verbesserung der Portfolio-Transparenz durch detailliertere Factsheet-Analyse');
      if (complianceChecks.transparencyCompliance.status === 'non_compliant') {
        riskAssessment.push('Mittleres Risiko: Unzureichende Portfolio-Transparenz');
      }
    }

    // Allokations-Konsistenz
    if (complianceChecks.allocationCompliance.status !== 'compliant') {
      if (!complianceChecks.allocationCompliance.assetClassConsistency) {
        recommendations.push('Korrektur der Asset-Klassen-Allokationen für 100% Summierung');
      }
      if (!complianceChecks.allocationCompliance.geographicConsistency) {
        recommendations.push('Anpassung der geografischen Allokationen für mathematische Konsistenz');
      }
      if (!complianceChecks.allocationCompliance.mathematicalAccuracy) {
        recommendations.push('Verbesserung der mathematischen Präzision in allen Berechnungen');
        riskAssessment.push('Mittleres Risiko: Mathematische Inkonsistenzen');
      }
    }

    // Dokumentation
    if (complianceChecks.documentationCompliance.status !== 'compliant') {
      if (complianceChecks.documentationCompliance.missingDocuments.length > 0) {
        recommendations.push(`Bereitstellung fehlender Dokumente: ${complianceChecks.documentationCompliance.missingDocuments.join(', ')}`);
      }
      if (complianceChecks.documentationCompliance.qualityScore < 0.7) {
        riskAssessment.push('Niedriges bis mittleres Risiko: Suboptimale Dokumentationsqualität');
      }
    }

    // Allgemeine Empfehlungen
    recommendations.push('Regelmäßige Aktualisierung der Look-Through-Analysen (mindestens vierteljährlich)');
    recommendations.push('Implementierung automatisierter Compliance-Checks');

    return { recommendations, riskAssessment };
  }

  /**
   * Erstelle Compliance-Zusammenfassung für Reporting
   */
  createComplianceSummary(report: GermanComplianceReport): string {
    let summary = '# Deutsche Look-Through Compliance-Zusammenfassung\n\n';

    summary += `**Portfolio:** ${report.portfolioId}\n`;
    summary += `**Regulatorischer Rahmen:** ${report.regulatoryFramework}\n`;
    summary += `**Compliance-Status:** ${this.translateStatus(report.overallComplianceStatus)}\n`;
    summary += `**Prüfungsdatum:** ${new Date(report.complianceDate).toLocaleDateString('de-DE')}\n\n`;

    // Detaillierte Checks
    summary += '## Detaillierte Compliance-Prüfungen\n\n';

    summary += `### Look-Through-Tiefe\n`;
    summary += `- Status: ${this.translateStatus(report.complianceChecks.lookThroughDepthCompliance.status)}\n`;
    summary += `- ${report.complianceChecks.lookThroughDepthCompliance.details}\n\n`;

    summary += `### Transparenz-Anforderungen\n`;
    summary += `- Status: ${this.translateStatus(report.complianceChecks.transparencyCompliance.status)}\n`;
    summary += `- ${report.complianceChecks.transparencyCompliance.details}\n\n`;

    summary += `### Allokations-Konsistenz\n`;
    summary += `- Status: ${this.translateStatus(report.complianceChecks.allocationCompliance.status)}\n`;
    if (report.complianceChecks.allocationCompliance.details.length > 0) {
      summary += `- Details: ${report.complianceChecks.allocationCompliance.details.join('; ')}\n`;
    }
    summary += '\n';

    // Empfehlungen
    if (report.recommendations.length > 0) {
      summary += '## Empfehlungen\n';
      report.recommendations.forEach(rec => {
        summary += `- ${rec}\n`;
      });
      summary += '\n';
    }

    // Risikobewertung
    if (report.riskAssessment.length > 0) {
      summary += '## Risikobewertung\n';
      report.riskAssessment.forEach(risk => {
        summary += `- ${risk}\n`;
      });
    }

    return summary;
  }

  private translateStatus(status: string): string {
    const translations: Record<string, string> = {
      'compliant': '✅ Konform',
      'non_compliant': '❌ Nicht konform',
      'warning': '⚠️ Warnung',
      'requires_attention': '⚠️ Erfordert Aufmerksamkeit'
    };
    return translations[status] || status;
  }
}