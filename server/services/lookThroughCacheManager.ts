/**
 * Look-Through Cache Manager
 * High-performance caching and error handling for fund look-through analysis
 */

import { CompleteFundAnalysis } from './enhancedFundLookThrough';
import { FactsheetAnalysisResult } from './claudeFactsheetAnalyzer';
import { LookThroughPortfolioAnalysis } from './portfolioLookThroughIntegrator';
import { ErrorHandlingService } from './errorHandling';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  version: string;
  checksumHash?: string;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  averageAccessTime: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

export interface FundCacheKey {
  fundName: string;
  isin?: string;
  factsheetHash?: string;
}

export interface PerformanceMetrics {
  analysisId: string;
  startTime: number;
  endTime: number;
  duration: number;
  cacheHits: number;
  cacheMisses: number;
  fundAnalysisCount: number;
  errors: Array<{
    type: string;
    message: string;
    recovered: boolean;
    timestamp: number;
  }>;
}

export class LookThroughCacheManager {
  private static readonly DEFAULT_TTL = {
    factsheetAnalysis: 24 * 60 * 60 * 1000, // 24 Stunden
    fundAnalysis: 12 * 60 * 60 * 1000,      // 12 Stunden
    portfolioAnalysis: 6 * 60 * 60 * 1000,  // 6 Stunden
    onlineData: 4 * 60 * 60 * 1000          // 4 Stunden
  };

  private static readonly MAX_CACHE_SIZE = {
    factsheetCache: 500,  // Max 500 Factsheet-Analysen
    fundCache: 1000,      // Max 1000 Fund-Analysen
    portfolioCache: 100   // Max 100 Portfolio-Analysen
  };

  private factsheetCache = new Map<string, CacheEntry<FactsheetAnalysisResult>>();
  private fundAnalysisCache = new Map<string, CacheEntry<CompleteFundAnalysis>>();
  private portfolioCache = new Map<string, CacheEntry<LookThroughPortfolioAnalysis>>();

  private stats = {
    factsheet: { hits: 0, misses: 0, accessTimes: [] as number[] },
    fund: { hits: 0, misses: 0, accessTimes: [] as number[] },
    portfolio: { hits: 0, misses: 0, accessTimes: [] as number[] }
  };

  private performanceMetrics = new Map<string, PerformanceMetrics>();

  /**
   * Cache-Management für Factsheet-Analysen
   */
  async getCachedFactsheetAnalysis(
    key: FundCacheKey,
    analyzeFunction: () => Promise<FactsheetAnalysisResult>
  ): Promise<FactsheetAnalysisResult> {
    const startTime = Date.now();
    const cacheKey = this.generateFactsheetCacheKey(key);

    try {
      // Prüfe Cache
      const cached = this.factsheetCache.get(cacheKey);
      if (cached && this.isCacheEntryValid(cached)) {
        this.updateCacheAccess(cached);
        this.stats.factsheet.hits++;
        this.stats.factsheet.accessTimes.push(Date.now() - startTime);

        console.log(`✅ Factsheet cache hit for ${key.fundName}`);
        return cached.data;
      }

      // Cache miss - führe Analyse durch
      console.log(`🔍 Factsheet cache miss for ${key.fundName}, performing analysis...`);
      this.stats.factsheet.misses++;

      const result = await this.executeWithErrorHandling(
        analyzeFunction,
        'factsheet_analysis',
        key
      );

      // Speichere im Cache
      this.setFactsheetCache(cacheKey, result);
      this.stats.factsheet.accessTimes.push(Date.now() - startTime);

      return result;

    } catch (error) {
      console.error(`Error in factsheet cache for ${key.fundName}:`, error);
      throw error;
    }
  }

  /**
   * Cache-Management für Fund-Analysen
   */
  async getCachedFundAnalysis(
    key: FundCacheKey,
    analyzeFunction: () => Promise<CompleteFundAnalysis>
  ): Promise<CompleteFundAnalysis> {
    const startTime = Date.now();
    const cacheKey = this.generateFundCacheKey(key);

    try {
      const cached = this.fundAnalysisCache.get(cacheKey);
      if (cached && this.isCacheEntryValid(cached)) {
        this.updateCacheAccess(cached);
        this.stats.fund.hits++;
        this.stats.fund.accessTimes.push(Date.now() - startTime);

        console.log(`✅ Fund analysis cache hit for ${key.fundName}`);
        return cached.data;
      }

      console.log(`🔍 Fund analysis cache miss for ${key.fundName}, performing analysis...`);
      this.stats.fund.misses++;

      const result = await this.executeWithErrorHandling(
        analyzeFunction,
        'fund_analysis',
        key
      );

      this.setFundAnalysisCache(cacheKey, result);
      this.stats.fund.accessTimes.push(Date.now() - startTime);

      return result;

    } catch (error) {
      console.error(`Error in fund analysis cache for ${key.fundName}:`, error);
      throw error;
    }
  }

  /**
   * Cache-Management für Portfolio-Analysen
   */
  async getCachedPortfolioAnalysis(
    portfolioId: string,
    analyzeFunction: () => Promise<LookThroughPortfolioAnalysis>
  ): Promise<LookThroughPortfolioAnalysis> {
    const startTime = Date.now();

    try {
      const cached = this.portfolioCache.get(portfolioId);
      if (cached && this.isCacheEntryValid(cached)) {
        this.updateCacheAccess(cached);
        this.stats.portfolio.hits++;
        this.stats.portfolio.accessTimes.push(Date.now() - startTime);

        console.log(`✅ Portfolio analysis cache hit for ${portfolioId}`);
        return cached.data;
      }

      console.log(`🔍 Portfolio analysis cache miss for ${portfolioId}, performing analysis...`);
      this.stats.portfolio.misses++;

      const result = await this.executeWithErrorHandling(
        analyzeFunction,
        'portfolio_analysis',
        { portfolioId }
      );

      this.setPortfolioCache(portfolioId, result);
      this.stats.portfolio.accessTimes.push(Date.now() - startTime);

      return result;

    } catch (error) {
      console.error(`Error in portfolio analysis cache for ${portfolioId}:`, error);
      throw error;
    }
  }

  /**
   * Führe Funktion mit Error Handling aus
   */
  private async executeWithErrorHandling<T>(
    func: () => Promise<T>,
    operationType: string,
    context: any
  ): Promise<T> {
    const maxRetries = 3;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await func();
      } catch (error) {
        lastError = error as Error;

        console.warn(`Attempt ${attempt}/${maxRetries} failed for ${operationType}:`, error.message);

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));

          // Versuche Error Recovery
          const recovery = await ErrorHandlingService.handleCalculationError(
            lastError,
            attempt,
            operationType,
            context,
            1 // Nur ein Recovery-Versuch pro Attempt
          );

          if (recovery.success) {
            console.log(`✅ Error recovery successful for ${operationType}`);
            return recovery.data;
          }
        }
      }
    }

    // Alle Versuche fehlgeschlagen
    console.error(`❌ All ${maxRetries} attempts failed for ${operationType}`);
    throw lastError!;
  }

  /**
   * Performance-Monitoring
   */
  startPerformanceMonitoring(analysisId: string): void {
    this.performanceMetrics.set(analysisId, {
      analysisId,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      cacheHits: 0,
      cacheMisses: 0,
      fundAnalysisCount: 0,
      errors: []
    });
  }

  endPerformanceMonitoring(analysisId: string, fundCount: number): PerformanceMetrics | null {
    const metrics = this.performanceMetrics.get(analysisId);
    if (!metrics) return null;

    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.fundAnalysisCount = fundCount;

    // Berechne Cache-Statistiken für diesen Zeitraum
    const recentHits = this.stats.factsheet.hits + this.stats.fund.hits + this.stats.portfolio.hits;
    const recentMisses = this.stats.factsheet.misses + this.stats.fund.misses + this.stats.portfolio.misses;

    metrics.cacheHits = recentHits;
    metrics.cacheMisses = recentMisses;

    return metrics;
  }

  /**
   * Cache-Validierung
   */
  private isCacheEntryValid<T>(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < entry.ttl;
  }

  /**
   * Update Cache-Zugriff
   */
  private updateCacheAccess<T>(entry: CacheEntry<T>): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();
  }

  /**
   * Cache-Schlüssel generieren
   */
  private generateFactsheetCacheKey(key: FundCacheKey): string {
    const baseKey = `factsheet_${key.fundName}_${key.isin || 'NO_ISIN'}`;
    return key.factsheetHash ? `${baseKey}_${key.factsheetHash}` : baseKey;
  }

  private generateFundCacheKey(key: FundCacheKey): string {
    return `fund_${key.fundName}_${key.isin || 'NO_ISIN'}`;
  }

  /**
   * Cache setzen mit automatischem Cleanup
   */
  private setFactsheetCache(key: string, data: FactsheetAnalysisResult): void {
    this.cleanupCacheIfNeeded(this.factsheetCache, this.MAX_CACHE_SIZE.factsheetCache);

    this.factsheetCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.DEFAULT_TTL.factsheetAnalysis,
      accessCount: 1,
      lastAccessed: Date.now(),
      version: '1.0'
    });
  }

  private setFundAnalysisCache(key: string, data: CompleteFundAnalysis): void {
    this.cleanupCacheIfNeeded(this.fundAnalysisCache, this.MAX_CACHE_SIZE.fundCache);

    this.fundAnalysisCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.DEFAULT_TTL.fundAnalysis,
      accessCount: 1,
      lastAccessed: Date.now(),
      version: '1.0'
    });
  }

  private setPortfolioCache(key: string, data: LookThroughPortfolioAnalysis): void {
    this.cleanupCacheIfNeeded(this.portfolioCache, this.MAX_CACHE_SIZE.portfolioCache);

    this.portfolioCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.DEFAULT_TTL.portfolioAnalysis,
      accessCount: 1,
      lastAccessed: Date.now(),
      version: '1.0'
    });
  }

  /**
   * Cache-Cleanup wenn nötig
   */
  private cleanupCacheIfNeeded<T>(cache: Map<string, CacheEntry<T>>, maxSize: number): void {
    if (cache.size >= maxSize) {
      // Entferne die ältesten 20% der Einträge
      const removeCount = Math.floor(maxSize * 0.2);
      const entries = Array.from(cache.entries())
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

      for (let i = 0; i < removeCount; i++) {
        cache.delete(entries[i][0]);
      }

      console.log(`🧹 Cache cleanup: Removed ${removeCount} entries`);
    }
  }

  /**
   * Cache-Statistiken abrufen
   */
  getCacheStats(): Record<string, CacheStats> {
    return {
      factsheet: this.calculateCacheStats(this.factsheetCache, this.stats.factsheet),
      fund: this.calculateCacheStats(this.fundAnalysisCache, this.stats.fund),
      portfolio: this.calculateCacheStats(this.portfolioCache, this.stats.portfolio)
    };
  }

  private calculateCacheStats<T>(
    cache: Map<string, CacheEntry<T>>,
    stats: { hits: number; misses: number; accessTimes: number[] }
  ): CacheStats {
    const entries = Array.from(cache.values());
    const totalRequests = stats.hits + stats.misses;

    return {
      totalEntries: cache.size,
      hitRate: totalRequests > 0 ? stats.hits / totalRequests : 0,
      totalHits: stats.hits,
      totalMisses: stats.misses,
      averageAccessTime: stats.accessTimes.length > 0 ?
        stats.accessTimes.reduce((sum, time) => sum + time, 0) / stats.accessTimes.length : 0,
      memoryUsage: this.estimateMemoryUsage(entries),
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0
    };
  }

  /**
   * Schätze Speicherverbrauch
   */
  private estimateMemoryUsage<T>(entries: CacheEntry<T>[]): number {
    // Vereinfachte Schätzung: ~5KB pro Eintrag
    return entries.length * 5120;
  }

  /**
   * Cache komplett leeren
   */
  clearAllCaches(): void {
    this.factsheetCache.clear();
    this.fundAnalysisCache.clear();
    this.portfolioCache.clear();

    // Reset Statistiken
    this.stats = {
      factsheet: { hits: 0, misses: 0, accessTimes: [] },
      fund: { hits: 0, misses: 0, accessTimes: [] },
      portfolio: { hits: 0, misses: 0, accessTimes: [] }
    };

    console.log('🧹 All caches cleared');
  }

  /**
   * Spezifische Cache-Einträge invalidieren
   */
  invalidateFactsheetCache(fundName: string, isin?: string): boolean {
    const key = this.generateFactsheetCacheKey({ fundName, isin });
    return this.factsheetCache.delete(key);
  }

  invalidateFundCache(fundName: string, isin?: string): boolean {
    const key = this.generateFundCacheKey({ fundName, isin });
    return this.fundAnalysisCache.delete(key);
  }

  invalidatePortfolioCache(portfolioId: string): boolean {
    return this.portfolioCache.delete(portfolioId);
  }

  /**
   * Cache-Report generieren
   */
  generateCacheReport(): string {
    const stats = this.getCacheStats();

    let report = '# Look-Through Cache Performance Report\n\n';
    report += `**Generiert:** ${new Date().toLocaleString('de-DE')}\n\n`;

    Object.entries(stats).forEach(([type, stat]) => {
      report += `## ${type.charAt(0).toUpperCase() + type.slice(1)} Cache\n`;
      report += `- **Einträge:** ${stat.totalEntries}\n`;
      report += `- **Hit Rate:** ${(stat.hitRate * 100).toFixed(1)}%\n`;
      report += `- **Total Hits:** ${stat.totalHits}\n`;
      report += `- **Total Misses:** ${stat.totalMisses}\n`;
      report += `- **Durchschnittliche Zugriffszeit:** ${stat.averageAccessTime.toFixed(2)}ms\n`;
      report += `- **Speicherverbrauch:** ${(stat.memoryUsage / 1024).toFixed(1)} KB\n\n`;
    });

    // Performance-Empfehlungen
    report += '## Empfehlungen\n';
    if (stats.factsheet.hitRate < 0.5) {
      report += '- Factsheet Cache Hit Rate niedrig - TTL oder Cache-Größe anpassen\n';
    }
    if (stats.fund.hitRate < 0.6) {
      report += '- Fund Analysis Cache Hit Rate niedrig - Cache-Strategie überprüfen\n';
    }

    return report;
  }
}