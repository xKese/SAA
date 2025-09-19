import { investmentUniverseService, InvestmentUniverseItem, FactsheetData } from './investment-universe';
import { ResolvedInstrument, DataConflict } from './instrument-resolver';
import { storage } from '../storage-temp';

/**
 * Data Quality Management System
 * Monitors consistency, accuracy, and completeness across data sources
 */

export interface DataQualityReport {
  timestamp: Date;
  overallScore: number;
  summary: QualitySummary;
  sourceAnalysis: SourceQualityAnalysis[];
  issues: QualityIssue[];
  recommendations: QualityRecommendation[];
  trends: QualityTrend[];
  reportId: string;
}

export interface QualitySummary {
  totalInstruments: number;
  qualityScoreDistribution: {
    excellent: number; // 0.9-1.0
    good: number; // 0.7-0.89
    fair: number; // 0.5-0.69
    poor: number; // 0.0-0.49
  };
  completeness: CompletinessMetrics;
  consistency: ConsistencyMetrics;
  accuracy: AccuracyMetrics;
  freshness: FreshnessMetrics;
}

export interface CompletinessMetrics {
  overallScore: number;
  fieldsWithISIN: number;
  fieldsWithName: number;
  fieldsWithAssetClass: number;
  fieldsWithFactsheet: number;
  missingCriticalData: number;
}

export interface ConsistencyMetrics {
  overallScore: number;
  conflictsDetected: number;
  conflictsResolved: number;
  duplicateInstruments: number;
  inconsistentNaming: number;
}

export interface AccuracyMetrics {
  overallScore: number;
  validISINs: number;
  invalidISINs: number;
  suspiciousNames: number;
  outdatedFactsheets: number;
}

export interface FreshnessMetrics {
  overallScore: number;
  recentFactsheets: number; // Within 30 days
  moderatelyFresh: number; // 30-90 days
  staleFactsheets: number; // 90+ days
  unknownAge: number;
}

export interface SourceQualityAnalysis {
  source: DataSource;
  instrumentCount: number;
  qualityScore: number;
  strengths: string[];
  weaknesses: string[];
  coverage: number; // Percentage of total instruments
  reliability: number;
  updateFrequency: string;
}

export interface QualityIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: QualityCategory;
  title: string;
  description: string;
  affectedInstruments: string[]; // ISINs or instrument names
  source?: DataSource;
  detectedAt: Date;
  estimatedImpact: string;
  suggestedFix: string;
}

export interface QualityRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: QualityCategory;
  title: string;
  description: string;
  expectedImprovement: number; // Quality score improvement estimate
  effortRequired: 'low' | 'medium' | 'high';
  implementationSteps: string[];
}

export interface QualityTrend {
  metric: string;
  timeframe: 'day' | 'week' | 'month';
  direction: 'improving' | 'declining' | 'stable';
  changePercent: number;
  dataPoints: Array<{
    timestamp: Date;
    value: number;
  }>;
}

export enum DataSource {
  LOCAL_FACTSHEET = 'local_factsheet',
  LOCAL_INDEX = 'local_index',
  WEB_SEARCH = 'web_search',
  CLAUDE_API = 'claude_api',
  USER_INPUT = 'user_input'
}

export enum QualityCategory {
  COMPLETENESS = 'completeness',
  CONSISTENCY = 'consistency',
  ACCURACY = 'accuracy',
  FRESHNESS = 'freshness',
  RELIABILITY = 'reliability',
  PERFORMANCE = 'performance'
}

export interface QualityMonitoringConfig {
  enableContinuousMonitoring: boolean;
  monitoringInterval: number; // minutes
  alertThresholds: {
    criticalQualityScore: number;
    highConflictRate: number;
    stalenessThreshold: number; // days
  };
  autoRepairEnabled: boolean;
  reportRetentionDays: number;
}

/**
 * Data Quality Manager Implementation
 */
export class DataQualityManager {
  private qualityReports = new Map<string, DataQualityReport>();
  private monitoringConfig: QualityMonitoringConfig = {
    enableContinuousMonitoring: true,
    monitoringInterval: 60, // 1 hour
    alertThresholds: {
      criticalQualityScore: 0.5,
      highConflictRate: 0.1,
      stalenessThreshold: 90 // days
    },
    autoRepairEnabled: false,
    reportRetentionDays: 30
  };

  private qualityHistory: Array<{
    timestamp: Date;
    overallScore: number;
    issues: number;
  }> = [];

  /**
   * Generate comprehensive data quality report
   */
  async generateQualityReport(): Promise<DataQualityReport> {
    const startTime = Date.now();
    console.log('Generating data quality report...');
    
    try {
      // Get all instruments from investment universe
      const universe = await investmentUniverseService.getInvestmentUniverse();
      const instruments = universe.instruments;

      // Analyze each component
      const summary = await this.analyzeSummaryMetrics(instruments);
      const sourceAnalysis = await this.analyzeSourceQuality(instruments);
      const issues = await this.detectQualityIssues(instruments);
      const recommendations = this.generateRecommendations(summary, issues);
      const trends = await this.analyzeTrends();

      // Calculate overall score
      const overallScore = this.calculateOverallScore(summary);

      const report: DataQualityReport = {
        timestamp: new Date().toISOString(),
        overallScore,
        summary,
        sourceAnalysis,
        issues,
        recommendations,
        trends,
        reportId: this.generateReportId()
      };

      // Store report
      this.qualityReports.set(report.reportId, report);
      
      // Update quality history
      this.qualityHistory.push({
        timestamp: report.timestamp,
        overallScore,
        issues: issues.length
      });

      // Keep only recent history (last 100 entries)
      if (this.qualityHistory.length > 100) {
        this.qualityHistory = this.qualityHistory.slice(-100);
      }

      console.log(`Quality report generated in ${Date.now() - startTime}ms`);
      console.log(`Overall quality score: ${(overallScore * 100).toFixed(1)}%`);
      console.log(`Issues detected: ${issues.length}`);

      return report;

    } catch (error) {
      console.error('Failed to generate quality report:', error);
      throw error;
    }
  }

  /**
   * Analyze summary quality metrics
   */
  private async analyzeSummaryMetrics(instruments: InvestmentUniverseItem[]): Promise<QualitySummary> {
    const total = instruments.length;
    const qualityDistribution = { excellent: 0, good: 0, fair: 0, poor: 0 };

    // Calculate quality score distribution
    for (const instrument of instruments) {
      const score = instrument.confidence || 0.5;
      if (score >= 0.9) qualityDistribution.excellent++;
      else if (score >= 0.7) qualityDistribution.good++;
      else if (score >= 0.5) qualityDistribution.fair++;
      else qualityDistribution.poor++;
    }

    // Analyze completeness
    const completeness = this.analyzeCompleteness(instruments);
    
    // Analyze consistency
    const consistency = await this.analyzeConsistency(instruments);
    
    // Analyze accuracy
    const accuracy = this.analyzeAccuracy(instruments);
    
    // Analyze freshness
    const freshness = this.analyzeFreshness(instruments);

    return {
      totalInstruments: total,
      qualityScoreDistribution: qualityDistribution,
      completeness,
      consistency,
      accuracy,
      freshness
    };
  }

  /**
   * Analyze data completeness metrics
   */
  private analyzeCompleteness(instruments: InvestmentUniverseItem[]): CompletinessMetrics {
    const total = instruments.length;
    
    const fieldsWithISIN = instruments.filter(i => i.isin).length;
    const fieldsWithName = instruments.filter(i => i.name && i.name.length > 3).length;
    const fieldsWithAssetClass = instruments.filter(i => i.assetClass).length;
    const fieldsWithFactsheet = instruments.filter(i => i.factsheetData).length;
    const missingCriticalData = instruments.filter(i => !i.isin && !i.name).length;

    const overallScore = total > 0 ? 
      (fieldsWithISIN + fieldsWithName + fieldsWithAssetClass) / (total * 3) : 0;

    return {
      overallScore,
      fieldsWithISIN,
      fieldsWithName,
      fieldsWithAssetClass,
      fieldsWithFactsheet,
      missingCriticalData
    };
  }

  /**
   * Analyze data consistency metrics
   */
  private async analyzeConsistency(instruments: InvestmentUniverseItem[]): Promise<ConsistencyMetrics> {
    let conflictsDetected = 0;
    let conflictsResolved = 0;
    let duplicateInstruments = 0;
    let inconsistentNaming = 0;

    // Detect duplicates by ISIN
    const isinMap = new Map<string, InvestmentUniverseItem[]>();
    for (const instrument of instruments) {
      if (instrument.isin) {
        if (!isinMap.has(instrument.isin)) {
          isinMap.set(instrument.isin, []);
        }
        isinMap.get(instrument.isin)!.push(instrument);
      }
    }

    // Count duplicates and naming inconsistencies
    for (const [isin, instrumentList] of isinMap.entries()) {
      if (instrumentList.length > 1) {
        duplicateInstruments += instrumentList.length - 1;
        
        // Check for naming inconsistencies
        const names = [...new Set(instrumentList.map(i => i.name.toLowerCase()))];
        if (names.length > 1) {
          inconsistentNaming++;
          conflictsDetected++;
        }
      }
    }

    // Simple conflict resolution simulation
    conflictsResolved = Math.floor(conflictsDetected * 0.8); // Assume 80% can be auto-resolved

    const overallScore = 1 - (conflictsDetected / Math.max(instruments.length, 1));

    return {
      overallScore: Math.max(0, overallScore),
      conflictsDetected,
      conflictsResolved,
      duplicateInstruments,
      inconsistentNaming
    };
  }

  /**
   * Analyze data accuracy metrics
   */
  private analyzeAccuracy(instruments: InvestmentUniverseItem[]): AccuracyMetrics {
    let validISINs = 0;
    let invalidISINs = 0;
    let suspiciousNames = 0;
    let outdatedFactsheets = 0;

    for (const instrument of instruments) {
      // Check ISIN validity
      if (instrument.isin) {
        if (this.validateISIN(instrument.isin)) {
          validISINs++;
        } else {
          invalidISINs++;
        }
      }

      // Check for suspicious names
      if (this.isSuspiciousName(instrument.name)) {
        suspiciousNames++;
      }

      // Check factsheet freshness
      if (instrument.factsheetData?.lastUpdated) {
        const ageMs = Date.now() - instrument.factsheetData.lastUpdated.getTime();
        const ageDays = ageMs / (24 * 60 * 60 * 1000);
        if (ageDays > 180) { // 6 months
          outdatedFactsheets++;
        }
      }
    }

    const totalChecked = validISINs + invalidISINs;
    const overallScore = totalChecked > 0 ? 
      (validISINs / totalChecked) * 0.8 + 
      ((instruments.length - suspiciousNames) / instruments.length) * 0.2 : 0.5;

    return {
      overallScore,
      validISINs,
      invalidISINs,
      suspiciousNames,
      outdatedFactsheets
    };
  }

  /**
   * Analyze data freshness metrics
   */
  private analyzeFreshness(instruments: InvestmentUniverseItem[]): FreshnessMetrics {
    const now = Date.now();
    let recentFactsheets = 0;
    let moderatelyFresh = 0;
    let staleFactsheets = 0;
    let unknownAge = 0;

    for (const instrument of instruments) {
      if (instrument.factsheetData?.lastUpdated) {
        const ageMs = now - instrument.factsheetData.lastUpdated.getTime();
        const ageDays = ageMs / (24 * 60 * 60 * 1000);
        
        if (ageDays <= 30) recentFactsheets++;
        else if (ageDays <= 90) moderatelyFresh++;
        else staleFactsheets++;
      } else {
        unknownAge++;
      }
    }

    const total = instruments.length;
    const overallScore = total > 0 ? 
      (recentFactsheets + moderatelyFresh * 0.5) / total : 0;

    return {
      overallScore,
      recentFactsheets,
      moderatelyFresh,
      staleFactsheets,
      unknownAge
    };
  }

  /**
   * Analyze source quality
   */
  private async analyzeSourceQuality(instruments: InvestmentUniverseItem[]): Promise<SourceQualityAnalysis[]> {
    const sourceStats = new Map<DataSource, {
      count: number;
      totalQuality: number;
      strengths: string[];
      weaknesses: string[];
    }>();

    // Initialize source tracking
    Object.values(DataSource).forEach(source => {
      sourceStats.set(source, {
        count: 0,
        totalQuality: 0,
        strengths: [],
        weaknesses: []
      });
    });

    // Analyze each instrument
    for (const instrument of instruments) {
      const primarySource = this.inferPrimarySource(instrument);
      const stats = sourceStats.get(primarySource);
      
      if (stats) {
        stats.count++;
        stats.totalQuality += instrument.confidence || 0.5;
      }
    }

    // Generate analysis for each source
    const analyses: SourceQualityAnalysis[] = [];
    const total = instruments.length;

    for (const [source, stats] of sourceStats.entries()) {
      if (stats.count > 0) {
        const qualityScore = stats.totalQuality / stats.count;
        const coverage = stats.count / total;
        
        // Determine strengths and weaknesses based on source characteristics
        const { strengths, weaknesses } = this.analyzeSourceCharacteristics(source, qualityScore, coverage);

        analyses.push({
          source,
          instrumentCount: stats.count,
          qualityScore,
          strengths,
          weaknesses,
          coverage,
          reliability: this.getSourceReliability(source),
          updateFrequency: this.getSourceUpdateFrequency(source)
        });
      }
    }

    return analyses.sort((a, b) => b.qualityScore - a.qualityScore);
  }

  /**
   * Detect quality issues
   */
  private async detectQualityIssues(instruments: InvestmentUniverseItem[]): Promise<QualityIssue[]> {
    const issues: QualityIssue[] = [];

    // Critical issues
    const missingISINs = instruments.filter(i => !i.isin);
    if (missingISINs.length > instruments.length * 0.3) {
      issues.push({
        id: this.generateIssueId(),
        severity: 'critical',
        category: QualityCategory.COMPLETENESS,
        title: 'High Rate of Missing ISINs',
        description: `${missingISINs.length} instruments (${((missingISINs.length / instruments.length) * 100).toFixed(1)}%) lack ISIN codes`,
        affectedInstruments: missingISINs.map(i => i.name).slice(0, 10),
        detectedAt: new Date().toISOString(),
        estimatedImpact: 'Reduces matching accuracy and portfolio analysis quality',
        suggestedFix: 'Run enhanced factsheet analysis or manual ISIN lookup'
      });
    }

    // Accuracy issues
    const invalidISINs = instruments.filter(i => i.isin && !this.validateISIN(i.isin));
    if (invalidISINs.length > 0) {
      issues.push({
        id: this.generateIssueId(),
        severity: 'high',
        category: QualityCategory.ACCURACY,
        title: 'Invalid ISIN Codes Detected',
        description: `${invalidISINs.length} instruments have invalid ISIN format or checksum`,
        affectedInstruments: invalidISINs.map(i => i.isin!).slice(0, 10),
        detectedAt: new Date().toISOString(),
        estimatedImpact: 'Prevents accurate instrument identification',
        suggestedFix: 'Validate and correct ISIN codes through factsheet re-analysis'
      });
    }

    // Freshness issues
    const now = Date.now();
    const staleFactsheets = instruments.filter(i => {
      if (!i.factsheetData?.lastUpdated) return false;
      const ageMs = now - i.factsheetData.lastUpdated.getTime();
      return ageMs > (180 * 24 * 60 * 60 * 1000); // 6 months
    });

    if (staleFactsheets.length > 0) {
      issues.push({
        id: this.generateIssueId(),
        severity: 'medium',
        category: QualityCategory.FRESHNESS,
        title: 'Outdated Factsheet Data',
        description: `${staleFactsheets.length} instruments have factsheet data older than 6 months`,
        affectedInstruments: staleFactsheets.map(i => i.name).slice(0, 10),
        detectedAt: new Date().toISOString(),
        estimatedImpact: 'May contain outdated allocation and risk information',
        suggestedFix: 'Schedule factsheet refresh for affected instruments'
      });
    }

    // Consistency issues
    const duplicates = this.findDuplicateInstruments(instruments);
    if (duplicates.length > 0) {
      issues.push({
        id: this.generateIssueId(),
        severity: 'medium',
        category: QualityCategory.CONSISTENCY,
        title: 'Duplicate Instruments Detected',
        description: `${duplicates.length} potential duplicate instruments found`,
        affectedInstruments: duplicates.slice(0, 10),
        detectedAt: new Date().toISOString(),
        estimatedImpact: 'May cause double-counting in portfolio analysis',
        suggestedFix: 'Review and merge duplicate entries'
      });
    }

    return issues.sort((a, b) => {
      const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Generate quality improvement recommendations
   */
  private generateRecommendations(summary: QualitySummary, issues: QualityIssue[]): QualityRecommendation[] {
    const recommendations: QualityRecommendation[] = [];

    // Completeness improvements
    if (summary.completeness.overallScore < 0.8) {
      recommendations.push({
        priority: 'high',
        category: QualityCategory.COMPLETENESS,
        title: 'Improve Data Completeness',
        description: 'Enhance factsheet analysis to extract missing ISINs and asset classifications',
        expectedImprovement: 0.15,
        effortRequired: 'medium',
        implementationSteps: [
          'Run bulk factsheet analysis on instruments with missing ISINs',
          'Implement enhanced PDF parsing patterns',
          'Add web search fallback for missing data'
        ]
      });
    }

    // Accuracy improvements
    if (summary.accuracy.overallScore < 0.9) {
      recommendations.push({
        priority: 'high',
        category: QualityCategory.ACCURACY,
        title: 'Enhance Data Accuracy',
        description: 'Implement stronger validation and error correction mechanisms',
        expectedImprovement: 0.12,
        effortRequired: 'low',
        implementationSteps: [
          'Add ISIN checksum validation',
          'Implement name format consistency checks',
          'Add cross-reference validation between sources'
        ]
      });
    }

    // Freshness improvements
    if (summary.freshness.overallScore < 0.7) {
      recommendations.push({
        priority: 'medium',
        category: QualityCategory.FRESHNESS,
        title: 'Update Stale Data',
        description: 'Refresh outdated factsheet information and establish update schedule',
        expectedImprovement: 0.10,
        effortRequired: 'high',
        implementationSteps: [
          'Identify oldest factsheets for priority refresh',
          'Implement automated update scheduling',
          'Set up monitoring for data staleness'
        ]
      });
    }

    // Performance optimizations
    if (issues.length > 10) {
      recommendations.push({
        priority: 'low',
        category: QualityCategory.PERFORMANCE,
        title: 'Optimize Processing Performance',
        description: 'Improve processing speed and reduce quality check overhead',
        expectedImprovement: 0.05,
        effortRequired: 'medium',
        implementationSteps: [
          'Implement parallel processing for bulk operations',
          'Add intelligent caching for frequently accessed data',
          'Optimize database queries for quality checks'
        ]
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Analyze quality trends over time
   */
  private async analyzeTrends(): Promise<QualityTrend[]> {
    if (this.qualityHistory.length < 2) {
      return []; // Need at least 2 data points for trends
    }

    const trends: QualityTrend[] = [];

    // Overall quality trend
    const overallTrend = this.calculateTrend(
      this.qualityHistory.map(h => ({ timestamp: h.timestamp, value: h.overallScore }))
    );
    
    if (overallTrend) {
      trends.push(overallTrend);
    }

    // Issues trend
    const issuesTrend = this.calculateTrend(
      this.qualityHistory.map(h => ({ timestamp: h.timestamp, value: h.issues }))
    );
    
    if (issuesTrend) {
      issuesTrend.metric = 'Quality Issues';
      trends.push(issuesTrend);
    }

    return trends;
  }

  /**
   * Calculate trend direction and change
   */
  private calculateTrend(dataPoints: Array<{ timestamp: Date; value: number }>): QualityTrend | null {
    if (dataPoints.length < 2) return null;

    const recent = dataPoints.slice(-10); // Last 10 data points
    const firstValue = recent[0].value;
    const lastValue = recent[recent.length - 1].value;
    const changePercent = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

    let direction: 'improving' | 'declining' | 'stable' = 'stable';
    if (Math.abs(changePercent) > 5) { // 5% threshold for significant change
      direction = changePercent > 0 ? 'improving' : 'declining';
    }

    return {
      metric: 'Overall Quality Score',
      timeframe: 'week',
      direction,
      changePercent,
      dataPoints: recent
    };
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallScore(summary: QualitySummary): number {
    return (
      summary.completeness.overallScore * 0.3 +
      summary.consistency.overallScore * 0.25 +
      summary.accuracy.overallScore * 0.25 +
      summary.freshness.overallScore * 0.2
    );
  }

  // Utility methods
  private validateISIN(isin: string): boolean {
    if (!/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin)) return false;
    
    // Simple checksum validation (Luhn algorithm)
    let code = '';
    for (let i = 0; i < 12; i++) {
      const char = isin[i];
      code += /[A-Z]/.test(char) ? (char.charCodeAt(0) - 55).toString() : char;
    }
    
    let sum = 0;
    let alternate = true;
    for (let i = code.length - 1; i >= 0; i--) {
      let digit = parseInt(code[i]);
      if (alternate) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      alternate = !alternate;
    }
    
    return sum % 10 === 0;
  }

  private isSuspiciousName(name: string): boolean {
    const suspiciousPatterns = [
      /^Fund \([A-Z]{2}[A-Z0-9]{10}\)$/, // Generic "Fund (ISIN)" format
      /^[A-Z]{2}[A-Z0-9]{10}$/, // Just an ISIN as name
      /^\s*$/, // Empty or whitespace only
      /^.{1,3}$/, // Too short
      /^.{150,}$/, // Too long
      /test|sample|example|placeholder/i // Test data
    ];

    return suspiciousPatterns.some(pattern => pattern.test(name));
  }

  private findDuplicateInstruments(instruments: InvestmentUniverseItem[]): string[] {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const instrument of instruments) {
      if (instrument.isin) {
        if (seen.has(instrument.isin)) {
          duplicates.push(instrument.isin);
        } else {
          seen.add(instrument.isin);
        }
      }
    }

    return duplicates;
  }

  private inferPrimarySource(instrument: InvestmentUniverseItem): DataSource {
    if (instrument.factsheetData) {
      return DataSource.LOCAL_FACTSHEET;
    }
    if (instrument.hasFactsheet) {
      return DataSource.LOCAL_INDEX;
    }
    return DataSource.USER_INPUT;
  }

  private analyzeSourceCharacteristics(source: DataSource, qualityScore: number, coverage: number): {
    strengths: string[];
    weaknesses: string[];
  } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    switch (source) {
      case DataSource.LOCAL_FACTSHEET:
        if (qualityScore > 0.8) strengths.push('High data accuracy');
        if (coverage > 0.5) strengths.push('Good coverage');
        strengths.push('Rich factsheet data available');
        if (qualityScore < 0.7) weaknesses.push('Some parsing issues detected');
        break;

      case DataSource.LOCAL_INDEX:
        strengths.push('Fast access time');
        if (coverage > 0.3) strengths.push('Reasonable coverage');
        if (qualityScore < 0.6) weaknesses.push('Limited data depth');
        weaknesses.push('Dependent on filename parsing');
        break;

      case DataSource.WEB_SEARCH:
        strengths.push('Broad coverage potential');
        weaknesses.push('Network dependent');
        weaknesses.push('Variable quality');
        break;
    }

    return { strengths, weaknesses };
  }

  private getSourceReliability(source: DataSource): number {
    const reliabilityMap: Record<DataSource, number> = {
      [DataSource.LOCAL_FACTSHEET]: 0.95,
      [DataSource.LOCAL_INDEX]: 0.85,
      [DataSource.WEB_SEARCH]: 0.70,
      [DataSource.CLAUDE_API]: 0.80,
      [DataSource.USER_INPUT]: 0.60
    };

    return reliabilityMap[source] || 0.50;
  }

  private getSourceUpdateFrequency(source: DataSource): string {
    const frequencyMap: Record<DataSource, string> = {
      [DataSource.LOCAL_FACTSHEET]: 'Manual/On-demand',
      [DataSource.LOCAL_INDEX]: 'On file system changes',
      [DataSource.WEB_SEARCH]: 'Real-time',
      [DataSource.CLAUDE_API]: 'Real-time',
      [DataSource.USER_INPUT]: 'On upload'
    };

    return frequencyMap[source] || 'Unknown';
  }

  private generateReportId(): string {
    return `qr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private generateIssueId(): string {
    return `qi_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Get latest quality report
   */
  getLatestReport(): DataQualityReport | null {
    if (this.qualityReports.size === 0) return null;
    
    const reports = Array.from(this.qualityReports.values());
    return reports.reduce((latest, current) => 
      current.timestamp > latest.timestamp ? current : latest
    );
  }

  /**
   * Get quality history for trending
   */
  getQualityHistory(): Array<{ timestamp: Date; overallScore: number; issues: number }> {
    return [...this.qualityHistory];
  }

  /**
   * Update monitoring configuration
   */
  updateMonitoringConfig(config: Partial<QualityMonitoringConfig>): void {
    this.monitoringConfig = { ...this.monitoringConfig, ...config };
    console.log('Quality monitoring configuration updated');
  }
}

export const dataQualityManager = new DataQualityManager();