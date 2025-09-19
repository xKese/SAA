import { hybridSearchEngine, SearchResult, InstrumentInfo, DataSource, SearchStrategy } from './hybrid-search-engine';
import { investmentUniverseService, FactsheetData } from './investment-universe';
import { ParsedPosition } from './document-processor';

/**
 * Multi-Source Instrument Resolver
 * Coordinates resolution of instruments across multiple data sources with conflict resolution
 */

export interface ResolvedInstrument {
  originalInput: ParsedPosition;
  resolved: InstrumentInfo;
  resolvedBy: ResolutionMethod;
  confidence: number;
  dataQuality: DataQuality;
  alternativeSources: AlternativeSource[];
  conflicts?: DataConflict[];
  processingTime: number;
}

export interface ResolutionMethod {
  primary: DataSource;
  fallbacks: DataSource[];
  strategy: SearchStrategy;
  iterations: number;
}

export interface DataQuality {
  completeness: number; // 0-1 score
  accuracy: number; // 0-1 score  
  consistency: number; // 0-1 score
  freshness: number; // 0-1 score based on data age
  reliability: number; // 0-1 score based on source reliability
  overall: number; // Combined score
}

export interface AlternativeSource {
  source: DataSource;
  data: Partial<InstrumentInfo>;
  confidence: number;
  conflicts: string[];
}

export interface DataConflict {
  field: keyof InstrumentInfo;
  sources: Array<{
    source: DataSource;
    value: any;
    confidence: number;
  }>;
  resolvedValue: any;
  resolutionReason: string;
}

export interface ResolutionOptions {
  enableConflictResolution?: boolean;
  requireMinimumConfidence?: number;
  maxResolutionAttempts?: number;
  prioritizeDataSources?: DataSource[];
  allowPartialResolution?: boolean;
  enableDataEnrichment?: boolean;
  timeoutPerInstrument?: number;
}

export interface BulkResolutionResult {
  resolved: ResolvedInstrument[];
  unresolved: ParsedPosition[];
  summary: ResolutionSummary;
  processingTime: number;
  performance: PerformanceMetrics;
}

export interface ResolutionSummary {
  totalInstruments: number;
  successfullyResolved: number;
  partiallyResolved: number;
  unresolvedCount: number;
  avgConfidence: number;
  avgDataQuality: number;
  conflictsDetected: number;
  conflictsResolved: number;
  dataSourceBreakdown: Record<DataSource, number>;
}

export interface PerformanceMetrics {
  totalTime: number;
  avgTimePerInstrument: number;
  cacheHitRate: number;
  localSourceUsage: number;
  webSearchUsage: number;
  claudeApiUsage: number;
}

/**
 * Multi-Source Instrument Resolver Implementation
 */
export class InstrumentResolver {
  private resolutionCache = new Map<string, ResolvedInstrument>();
  private cacheExpiry = 2 * 60 * 60 * 1000; // 2 hours
  
  private defaultOptions: Required<ResolutionOptions> = {
    enableConflictResolution: true,
    requireMinimumConfidence: 0.7,
    maxResolutionAttempts: 3,
    prioritizeDataSources: [
      DataSource.LOCAL_FACTSHEET,
      DataSource.LOCAL_INDEX, 
      DataSource.WEB_SEARCH,
      DataSource.CLAUDE_API,
      DataSource.FALLBACK
    ],
    allowPartialResolution: true,
    enableDataEnrichment: true,
    timeoutPerInstrument: 10000 // 10 seconds
  };

  /**
   * Resolve single instrument with comprehensive source checking
   */
  async resolveInstrument(
    position: ParsedPosition, 
    options: ResolutionOptions = {}
  ): Promise<ResolvedInstrument | null> {
    const resolveOptions = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(position);
      if (this.resolutionCache.has(cacheKey)) {
        const cached = this.resolutionCache.get(cacheKey)!;
        if (Date.now() - cached.processingTime < this.cacheExpiry) {
          return cached;
        }
      }

      const alternativeSources: AlternativeSource[] = [];
      let bestResult: ResolvedInstrument | null = null;
      let attempts = 0;

      // Try resolution with different strategies
      while (attempts < resolveOptions.maxResolutionAttempts && !bestResult) {
        attempts++;
        
        // Primary search using hybrid engine
        const searchResult = await hybridSearchEngine.searchInstrument(
          position.name,
          position.isin,
          {
            minConfidence: Math.max(0.5, resolveOptions.requireMinimumConfidence - (attempts * 0.1)),
            enableWebSearch: attempts >= 2, // Enable web search in later attempts
            enableClaudeAssist: attempts >= 3, // Claude assist as last resort
            timeoutMs: resolveOptions.timeoutPerInstrument
          }
        );

        if (searchResult) {
          // Collect data from all sources for conflict detection
          if (resolveOptions.enableConflictResolution) {
            await this.collectAlternativeSources(position, alternativeSources, searchResult.source);
          }

          // Create resolved instrument
          const resolved = await this.createResolvedInstrument(
            position,
            searchResult,
            alternativeSources,
            resolveOptions,
            startTime
          );

          // Check if resolution meets requirements
          if (this.meetResolutionRequirements(resolved, resolveOptions)) {
            bestResult = resolved;
          }
        }
      }

      // Try partial resolution if allowed
      if (!bestResult && resolveOptions.allowPartialResolution) {
        bestResult = await this.attemptPartialResolution(
          position,
          alternativeSources,
          resolveOptions,
          startTime
        );
      }

      // Cache result if found
      if (bestResult) {
        this.resolutionCache.set(cacheKey, bestResult);
      }

      return bestResult;

    } catch (error) {
      console.error(`Failed to resolve instrument ${position.name}:`, error);
      return null;
    }
  }

  /**
   * Bulk resolution with intelligent batching and optimization
   */
  async resolveBulkInstruments(
    positions: ParsedPosition[],
    options: ResolutionOptions = {}
  ): Promise<BulkResolutionResult> {
    const startTime = Date.now();
    const resolveOptions = { ...this.defaultOptions, ...options };
    
    const resolved: ResolvedInstrument[] = [];
    const unresolved: ParsedPosition[] = [];
    const performanceStats = {
      cacheHits: 0,
      localSearches: 0,
      webSearches: 0,
      claudeApiCalls: 0
    };

    console.log(`Starting bulk resolution of ${positions.length} instruments`);

    // Phase 1: Check cache and local sources (fast)
    const { cachedResults, uncachedPositions } = await this.checkCacheAndLocal(positions);
    resolved.push(...cachedResults);
    performanceStats.cacheHits = cachedResults.length;

    // Phase 2: Batch process remaining positions
    if (uncachedPositions.length > 0) {
      const batchResults = await this.processBatchResolution(
        uncachedPositions,
        resolveOptions,
        performanceStats
      );
      resolved.push(...batchResults.resolved);
      unresolved.push(...batchResults.unresolved);
    }

    // Calculate summary statistics
    const summary = this.calculateResolutionSummary(positions, resolved, unresolved);
    const performance = this.calculatePerformanceMetrics(
      startTime,
      positions.length,
      performanceStats
    );

    console.log(`Bulk resolution completed: ${resolved.length}/${positions.length} resolved`);

    return {
      resolved,
      unresolved,
      summary,
      processingTime: Date.now() - startTime,
      performance
    };
  }

  /**
   * Collect alternative data sources for conflict resolution
   */
  private async collectAlternativeSources(
    position: ParsedPosition,
    alternatives: AlternativeSource[],
    primarySource: DataSource
  ): Promise<void> {
    const sources: DataSource[] = [
      DataSource.LOCAL_FACTSHEET,
      DataSource.LOCAL_INDEX,
      DataSource.WEB_SEARCH
    ];

    for (const source of sources) {
      if (source === primarySource) continue;

      try {
        let data: Partial<InstrumentInfo> = {};
        let confidence = 0;

        switch (source) {
          case DataSource.LOCAL_FACTSHEET:
          case DataSource.LOCAL_INDEX:
            const localResult = await investmentUniverseService.getEnhancedInstrumentDetails(
              position.name,
              position.isin
            );
            if (localResult) {
              data = {
                name: localResult.name,
                isin: localResult.isin,
                assetClass: localResult.assetClass,
                factsheetData: localResult.factsheetData
              };
              confidence = localResult.confidence || 0.8;
            }
            break;

          case DataSource.WEB_SEARCH:
            // Would implement web search alternative
            break;
        }

        if (Object.keys(data).length > 0) {
          alternatives.push({
            source,
            data,
            confidence,
            conflicts: []
          });
        }
      } catch (error) {
        console.warn(`Failed to collect data from ${source} for ${position.name}:`, error);
      }
    }
  }

  /**
   * Create resolved instrument with conflict resolution
   */
  private async createResolvedInstrument(
    originalInput: ParsedPosition,
    searchResult: SearchResult,
    alternativeSources: AlternativeSource[],
    options: Required<ResolutionOptions>,
    startTime: number
  ): Promise<ResolvedInstrument> {
    
    let resolved = searchResult.instrument;
    const conflicts: DataConflict[] = [];

    // Detect and resolve conflicts
    if (options.enableConflictResolution && alternativeSources.length > 0) {
      const conflictResolution = await this.resolveDataConflicts(
        searchResult,
        alternativeSources
      );
      resolved = conflictResolution.resolvedData;
      conflicts.push(...conflictResolution.conflicts);
    }

    // Enrich data if enabled
    if (options.enableDataEnrichment) {
      resolved = await this.enrichInstrumentData(resolved, alternativeSources);
    }

    // Calculate data quality
    const dataQuality = this.calculateDataQuality(
      resolved,
      searchResult.source,
      alternativeSources
    );

    return {
      originalInput,
      resolved,
      resolvedBy: {
        primary: searchResult.source,
        fallbacks: alternativeSources.map(alt => alt.source),
        strategy: searchResult.searchStrategy,
        iterations: 1
      },
      confidence: searchResult.confidence,
      dataQuality,
      alternativeSources,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Resolve conflicts between different data sources
   */
  private async resolveDataConflicts(
    primary: SearchResult,
    alternatives: AlternativeSource[]
  ): Promise<{ resolvedData: InstrumentInfo; conflicts: DataConflict[] }> {
    const conflicts: DataConflict[] = [];
    const resolved: InstrumentInfo = { ...primary.instrument };

    // Define fields to check for conflicts
    const fieldsToCheck: (keyof InstrumentInfo)[] = [
      'name', 'isin', 'type', 'sector', 'geography', 'currency', 'assetClass'
    ];

    for (const field of fieldsToCheck) {
      const sources = [
        {
          source: primary.source,
          value: primary.instrument[field],
          confidence: primary.confidence
        }
      ];

      // Collect values from alternative sources
      for (const alt of alternatives) {
        if (alt.data[field] !== undefined) {
          sources.push({
            source: alt.source,
            value: alt.data[field],
            confidence: alt.confidence
          });
        }
      }

      // Check for conflicts
      if (sources.length > 1) {
        const uniqueValues = [...new Set(sources.map(s => s.value))].filter(v => v);
        
        if (uniqueValues.length > 1) {
          // Resolve conflict by choosing highest confidence source
          const bestSource = sources.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
          );

          conflicts.push({
            field,
            sources,
            resolvedValue: bestSource.value,
            resolutionReason: `Chose value from ${bestSource.source} (confidence: ${bestSource.confidence})`
          });

          // Update resolved data with best value
          (resolved as any)[field] = bestSource.value;
        }
      }
    }

    return { resolvedData: resolved, conflicts };
  }

  /**
   * Enrich instrument data from multiple sources
   */
  private async enrichInstrumentData(
    instrument: InstrumentInfo,
    alternatives: AlternativeSource[]
  ): Promise<InstrumentInfo> {
    const enriched = { ...instrument };

    // Fill in missing fields from alternative sources
    for (const alt of alternatives) {
      for (const [key, value] of Object.entries(alt.data)) {
        if (value && !enriched[key as keyof InstrumentInfo]) {
          (enriched as any)[key] = value;
        }
      }
    }

    // Merge factsheet data
    if (!enriched.factsheetData && alternatives.length > 0) {
      const bestFactsheetSource = alternatives
        .filter(alt => alt.data.factsheetData)
        .reduce((best, current) => 
          current.confidence > (best?.confidence || 0) ? current : best, 
          null as AlternativeSource | null
        );
      
      if (bestFactsheetSource) {
        enriched.factsheetData = bestFactsheetSource.data.factsheetData;
      }
    }

    return enriched;
  }

  /**
   * Calculate comprehensive data quality score
   */
  private calculateDataQuality(
    instrument: InstrumentInfo,
    source: DataSource,
    alternatives: AlternativeSource[]
  ): DataQuality {
    // Completeness: How many fields are populated
    const totalFields = 7; // name, isin, type, sector, geography, currency, assetClass
    const populatedFields = [
      instrument.name,
      instrument.isin,
      instrument.type,
      instrument.sector,
      instrument.geography,
      instrument.currency,
      instrument.assetClass
    ].filter(field => field).length;
    
    const completeness = populatedFields / totalFields;

    // Accuracy: Based on source reliability
    const sourceReliability: Record<DataSource, number> = {
      [DataSource.LOCAL_FACTSHEET]: 0.95,
      [DataSource.LOCAL_INDEX]: 0.85,
      [DataSource.WEB_SEARCH]: 0.75,
      [DataSource.CLAUDE_API]: 0.80,
      [DataSource.FALLBACK]: 0.60
    };
    
    const accuracy = sourceReliability[source] || 0.5;

    // Consistency: How well different sources agree
    const consistency = alternatives.length > 0 ? 
      alternatives.reduce((sum, alt) => sum + (1 - alt.conflicts.length * 0.1), 0) / alternatives.length :
      1.0;

    // Freshness: How recent the data is
    const freshness = instrument.factsheetData?.lastUpdated ? 
      this.calculateFreshness(instrument.factsheetData.lastUpdated) : 0.8;

    // Reliability: Based on factsheet data quality if available
    const reliability = instrument.factsheetData?.dataQuality || accuracy;

    // Overall score
    const overall = (
      completeness * 0.3 + 
      accuracy * 0.25 + 
      consistency * 0.2 + 
      freshness * 0.15 + 
      reliability * 0.1
    );

    return {
      completeness,
      accuracy,
      consistency,
      freshness,
      reliability,
      overall
    };
  }

  /**
   * Calculate freshness score based on data age
   */
  private calculateFreshness(lastUpdated: Date): number {
    const now = Date.now();
    const ageMs = now - lastUpdated.getTime();
    const ageDays = ageMs / (24 * 60 * 60 * 1000);
    
    if (ageDays <= 1) return 1.0;
    if (ageDays <= 7) return 0.9;
    if (ageDays <= 30) return 0.8;
    if (ageDays <= 90) return 0.6;
    if (ageDays <= 365) return 0.4;
    
    return 0.2;
  }

  /**
   * Check if resolution meets requirements
   */
  private meetResolutionRequirements(
    resolved: ResolvedInstrument,
    options: Required<ResolutionOptions>
  ): boolean {
    if (resolved.confidence < options.requireMinimumConfidence) {
      return false;
    }

    if (resolved.dataQuality.overall < 0.5) {
      return false;
    }

    // Must have at least name and either ISIN or asset class
    if (!resolved.resolved.name) {
      return false;
    }

    if (!resolved.resolved.isin && !resolved.resolved.assetClass) {
      return false;
    }

    return true;
  }

  /**
   * Attempt partial resolution for instruments that don't meet full requirements
   */
  private async attemptPartialResolution(
    position: ParsedPosition,
    alternatives: AlternativeSource[],
    options: Required<ResolutionOptions>,
    startTime: number
  ): Promise<ResolvedInstrument | null> {
    
    // Create minimal resolved instrument from available data
    const resolved: InstrumentInfo = {
      name: position.name
    };

    let confidence = 0.3; // Low confidence for partial resolution
    let bestSource = DataSource.FALLBACK;

    // Use any available data from alternatives
    for (const alt of alternatives) {
      if (alt.confidence > confidence) {
        Object.assign(resolved, alt.data);
        confidence = alt.confidence * 0.7; // Reduce confidence for partial
        bestSource = alt.source;
      }
    }

    // Add ISIN if available from original position
    if (position.isin) {
      resolved.isin = position.isin;
      confidence += 0.1;
    }

    return {
      originalInput: position,
      resolved,
      resolvedBy: {
        primary: bestSource,
        fallbacks: alternatives.map(alt => alt.source),
        strategy: SearchStrategy.MULTI_IDENTIFIER_SEARCH,
        iterations: 1
      },
      confidence,
      dataQuality: {
        completeness: 0.3,
        accuracy: 0.5,
        consistency: 0.5,
        freshness: 0.5,
        reliability: 0.4,
        overall: 0.4
      },
      alternativeSources: alternatives,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Check cache and perform fast local searches
   */
  private async checkCacheAndLocal(
    positions: ParsedPosition[]
  ): Promise<{ cachedResults: ResolvedInstrument[]; uncachedPositions: ParsedPosition[] }> {
    const cachedResults: ResolvedInstrument[] = [];
    const uncachedPositions: ParsedPosition[] = [];

    for (const position of positions) {
      const cacheKey = this.generateCacheKey(position);
      
      if (this.resolutionCache.has(cacheKey)) {
        const cached = this.resolutionCache.get(cacheKey)!;
        if (Date.now() - cached.processingTime < this.cacheExpiry) {
          cachedResults.push(cached);
          continue;
        }
      }

      uncachedPositions.push(position);
    }

    return { cachedResults, uncachedPositions };
  }

  /**
   * Process batch resolution with optimizations
   */
  private async processBatchResolution(
    positions: ParsedPosition[],
    options: Required<ResolutionOptions>,
    stats: any
  ): Promise<{ resolved: ResolvedInstrument[]; unresolved: ParsedPosition[] }> {
    const resolved: ResolvedInstrument[] = [];
    const unresolved: ParsedPosition[] = [];

    // Process in parallel batches for performance
    const batchSize = 5;
    for (let i = 0; i < positions.length; i += batchSize) {
      const batch = positions.slice(i, i + batchSize);
      
      const batchPromises = batch.map(position => 
        this.resolveInstrument(position, options)
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        if (result) {
          resolved.push(result);
          // Track performance stats
          if (result.resolvedBy.primary === DataSource.LOCAL_FACTSHEET || 
              result.resolvedBy.primary === DataSource.LOCAL_INDEX) {
            stats.localSearches++;
          } else if (result.resolvedBy.primary === DataSource.WEB_SEARCH) {
            stats.webSearches++;
          } else if (result.resolvedBy.primary === DataSource.CLAUDE_API) {
            stats.claudeApiCalls++;
          }
        } else {
          unresolved.push(batch[j]);
        }
      }

      // Add small delay between batches to prevent overwhelming external APIs
      if (i + batchSize < positions.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return { resolved, unresolved };
  }

  /**
   * Generate cache key for position
   */
  private generateCacheKey(position: ParsedPosition): string {
    return `${position.name}:${position.isin || ''}:${position.value}`;
  }

  /**
   * Calculate resolution summary statistics
   */
  private calculateResolutionSummary(
    original: ParsedPosition[],
    resolved: ResolvedInstrument[],
    unresolved: ParsedPosition[]
  ): ResolutionSummary {
    const dataSourceBreakdown: Record<DataSource, number> = {} as any;
    Object.values(DataSource).forEach(source => {
      dataSourceBreakdown[source] = 0;
    });

    let totalConfidence = 0;
    let totalDataQuality = 0;
    let conflictsDetected = 0;
    let conflictsResolved = 0;

    for (const item of resolved) {
      dataSourceBreakdown[item.resolvedBy.primary]++;
      totalConfidence += item.confidence;
      totalDataQuality += item.dataQuality.overall;
      
      if (item.conflicts) {
        conflictsDetected += item.conflicts.length;
        conflictsResolved += item.conflicts.length; // All detected conflicts are resolved
      }
    }

    const partiallyResolved = resolved.filter(r => r.dataQuality.overall < 0.7).length;

    return {
      totalInstruments: original.length,
      successfullyResolved: resolved.length - partiallyResolved,
      partiallyResolved,
      unresolvedCount: unresolved.length,
      avgConfidence: resolved.length > 0 ? totalConfidence / resolved.length : 0,
      avgDataQuality: resolved.length > 0 ? totalDataQuality / resolved.length : 0,
      conflictsDetected,
      conflictsResolved,
      dataSourceBreakdown
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(
    startTime: number,
    totalInstruments: number,
    stats: any
  ): PerformanceMetrics {
    const totalTime = Date.now() - startTime;
    
    return {
      totalTime,
      avgTimePerInstrument: totalInstruments > 0 ? totalTime / totalInstruments : 0,
      cacheHitRate: totalInstruments > 0 ? stats.cacheHits / totalInstruments : 0,
      localSourceUsage: totalInstruments > 0 ? stats.localSearches / totalInstruments : 0,
      webSearchUsage: totalInstruments > 0 ? stats.webSearches / totalInstruments : 0,
      claudeApiUsage: totalInstruments > 0 ? stats.claudeApiCalls / totalInstruments : 0
    };
  }

  /**
   * Get resolver performance statistics
   */
  getPerformanceStats(): {
    cacheSize: number;
    cacheHitRate: number;
    avgResolutionTime: number;
    successRate: number;
  } {
    // This would track actual performance metrics over time
    return {
      cacheSize: this.resolutionCache.size,
      cacheHitRate: 0.75, // Would be tracked
      avgResolutionTime: 1500, // ms, would be tracked
      successRate: 0.85 // Would be tracked
    };
  }

  /**
   * Clear resolution cache
   */
  clearCache(): void {
    this.resolutionCache.clear();
    console.log('Resolution cache cleared');
  }
}

export const instrumentResolver = new InstrumentResolver();