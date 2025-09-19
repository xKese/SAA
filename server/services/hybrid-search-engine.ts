import { investmentUniverseService, InvestmentUniverseItem, FactsheetData } from './investment-universe';
import { claudeService } from './claude';

/**
 * Hybrid Search Engine for Intelligent Multi-Source Instrument Resolution
 * Prioritizes local factsheets before falling back to web searches
 */

export interface SearchResult {
  instrument: InstrumentInfo;
  source: DataSource;
  confidence: number;
  processingTime: number;
  searchStrategy: SearchStrategy;
}

export interface InstrumentInfo {
  name: string;
  isin?: string;
  type?: string;
  sector?: string;
  geography?: string;
  currency?: string;
  assetClass?: string;
  factsheetData?: FactsheetData;
  alternativeIdentifiers?: AlternativeIdentifier[];
}

export interface AlternativeIdentifier {
  type: 'WKN' | 'CUSIP' | 'SEDOL' | 'TICKER' | 'NAME_VARIANT';
  value: string;
  confidence: number;
}

export enum DataSource {
  LOCAL_FACTSHEET = 'local_factsheet',
  LOCAL_INDEX = 'local_index',
  WEB_SEARCH = 'web_search',
  CLAUDE_API = 'claude_api',
  FALLBACK = 'fallback'
}

export enum SearchStrategy {
  EXACT_ISIN_MATCH = 'exact_isin_match',
  FUZZY_NAME_MATCH = 'fuzzy_name_match',
  ENHANCED_NAME_SEARCH = 'enhanced_name_search',
  MULTI_IDENTIFIER_SEARCH = 'multi_identifier_search',
  CLAUDE_ASSISTED_SEARCH = 'claude_assisted_search',
  BULK_BATCH_SEARCH = 'bulk_batch_search'
}

export interface SearchOptions {
  maxResults?: number;
  minConfidence?: number;
  timeoutMs?: number;
  enableWebSearch?: boolean;
  enableClaudeAssist?: boolean;
  prioritizeLocal?: boolean;
  batchSize?: number;
}

export interface BulkSearchRequest {
  instruments: Array<{
    name: string;
    isin?: string;
    value?: number;
    context?: string;
  }>;
  options?: SearchOptions;
}

export interface BulkSearchResult {
  results: SearchResult[];
  summary: SearchSummary;
  processingTime: number;
  strategies: Record<SearchStrategy, number>;
}

export interface SearchSummary {
  total: number;
  resolved: number;
  localMatches: number;
  webSearches: number;
  failures: number;
  avgConfidence: number;
  dataQualityScore: number;
}

/**
 * Hybrid Search Engine Implementation
 */
export class HybridSearchEngine {
  private searchCache = new Map<string, SearchResult>();
  private cacheExpiry = 60 * 60 * 1000; // 1 hour
  private defaultOptions: Required<SearchOptions> = {
    maxResults: 10,
    minConfidence: 0.6,
    timeoutMs: 30000,
    enableWebSearch: true,
    enableClaudeAssist: true,
    prioritizeLocal: true,
    batchSize: 20
  };

  /**
   * Main search method - intelligently resolves instruments
   */
  async searchInstrument(
    name: string, 
    isin?: string, 
    options: SearchOptions = {}
  ): Promise<SearchResult | null> {
    const searchOptions = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(name, isin, searchOptions);
    
    // Check cache first
    if (this.searchCache.has(cacheKey)) {
      const cached = this.searchCache.get(cacheKey)!;
      if (Date.now() - cached.processingTime < this.cacheExpiry) {
        return cached;
      }
    }

    try {
      let result: SearchResult | null = null;

      // Strategy 1: Exact ISIN match in local universe
      if (isin) {
        result = await this.exactISINSearch(isin, name);
        if (result && result.confidence >= searchOptions.minConfidence) {
          result.processingTime = Date.now() - startTime;
          this.cacheResult(cacheKey, result);
          return result;
        }
      }

      // Strategy 2: Fuzzy name match in local universe  
      if (searchOptions.prioritizeLocal) {
        result = await this.fuzzyNameSearch(name, isin);
        if (result && result.confidence >= searchOptions.minConfidence) {
          result.processingTime = Date.now() - startTime;
          this.cacheResult(cacheKey, result);
          return result;
        }
      }

      // Strategy 3: Enhanced name search with variants
      result = await this.enhancedNameSearch(name, isin);
      if (result && result.confidence >= searchOptions.minConfidence) {
        result.processingTime = Date.now() - startTime;
        this.cacheResult(cacheKey, result);
        return result;
      }

      // Strategy 4: Web search (if enabled)
      if (searchOptions.enableWebSearch) {
        result = await this.webSearch(name, isin, searchOptions.timeoutMs);
        if (result && result.confidence >= searchOptions.minConfidence) {
          result.processingTime = Date.now() - startTime;
          this.cacheResult(cacheKey, result);
          return result;
        }
      }

      // Strategy 5: Claude-assisted search (if enabled)
      if (searchOptions.enableClaudeAssist) {
        result = await this.claudeAssistedSearch(name, isin, searchOptions.timeoutMs);
        if (result && result.confidence >= searchOptions.minConfidence) {
          result.processingTime = Date.now() - startTime;
          this.cacheResult(cacheKey, result);
          return result;
        }
      }

      // If we have any result but below confidence threshold, return it anyway
      if (result) {
        result.processingTime = Date.now() - startTime;
        this.cacheResult(cacheKey, result);
        return result;
      }

      return null;
      
    } catch (error) {
      console.error(`Search failed for ${name} (${isin}):`, error);
      return null;
    }
  }

  /**
   * Bulk search for multiple instruments with intelligent batching
   */
  async bulkSearchInstruments(request: BulkSearchRequest): Promise<BulkSearchResult> {
    const startTime = Date.now();
    const options = { ...this.defaultOptions, ...request.options };
    const results: SearchResult[] = [];
    const strategies: Record<SearchStrategy, number> = {} as any;
    
    // Initialize strategy counters
    Object.values(SearchStrategy).forEach(strategy => {
      strategies[strategy] = 0;
    });

    // Phase 1: Batch local searches (most efficient)
    const localBatchResults = await this.batchLocalSearch(request.instruments, options);
    results.push(...localBatchResults.resolved);
    
    // Track resolved instruments
    const resolved = new Set(localBatchResults.resolved.map(r => 
      `${r.instrument.name}:${r.instrument.isin || ''}`
    ));

    // Phase 2: Web search for unresolved instruments
    if (options.enableWebSearch && localBatchResults.unresolved.length > 0) {
      const webBatchResults = await this.batchWebSearch(
        localBatchResults.unresolved, 
        options
      );
      results.push(...webBatchResults);
      
      webBatchResults.forEach(result => {
        resolved.add(`${result.instrument.name}:${result.instrument.isin || ''}`);
      });
    }

    // Calculate strategy usage
    results.forEach(result => {
      strategies[result.searchStrategy]++;
    });

    const summary: SearchSummary = {
      total: request.instruments.length,
      resolved: results.length,
      localMatches: results.filter(r => r.source === DataSource.LOCAL_FACTSHEET || r.source === DataSource.LOCAL_INDEX).length,
      webSearches: results.filter(r => r.source === DataSource.WEB_SEARCH).length,
      failures: request.instruments.length - results.length,
      avgConfidence: results.length > 0 ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length : 0,
      dataQualityScore: this.calculateDataQualityScore(results)
    };

    return {
      results,
      summary,
      processingTime: Date.now() - startTime,
      strategies
    };
  }

  /**
   * Exact ISIN search in local investment universe
   */
  private async exactISINSearch(isin: string, name?: string): Promise<SearchResult | null> {
    try {
      const instrument = await investmentUniverseService.getEnhancedInstrumentDetails('', isin);
      
      if (instrument) {
        return {
          instrument: {
            name: instrument.name,
            isin: instrument.isin,
            assetClass: instrument.assetClass,
            factsheetData: instrument.factsheetData,
            type: instrument.factsheetData?.fundType
          },
          source: DataSource.LOCAL_FACTSHEET,
          confidence: instrument.confidence || 0.95,
          processingTime: 0,
          searchStrategy: SearchStrategy.EXACT_ISIN_MATCH
        };
      }
      
      return null;
    } catch (error) {
      console.error('Exact ISIN search failed:', error);
      return null;
    }
  }

  /**
   * Fuzzy name matching in local universe
   */
  private async fuzzyNameSearch(name: string, isin?: string): Promise<SearchResult | null> {
    try {
      const searchResults = await investmentUniverseService.searchInstruments(name);
      
      if (searchResults.length === 0) return null;
      
      // Score results by name similarity
      const scoredResults = searchResults.map(instrument => ({
        instrument,
        score: this.calculateNameSimilarity(name, instrument.name)
      }));
      
      // Get best match
      const bestMatch = scoredResults.reduce((best, current) => 
        current.score > best.score ? current : best
      );
      
      if (bestMatch.score < 0.6) return null;
      
      // Get enhanced details
      const enhanced = await investmentUniverseService.getEnhancedInstrumentDetails(
        bestMatch.instrument.name, 
        bestMatch.instrument.isin
      );
      
      if (enhanced) {
        return {
          instrument: {
            name: enhanced.name,
            isin: enhanced.isin,
            assetClass: enhanced.assetClass,
            factsheetData: enhanced.factsheetData,
            type: enhanced.factsheetData?.fundType
          },
          source: DataSource.LOCAL_INDEX,
          confidence: bestMatch.score * (enhanced.confidence || 0.8),
          processingTime: 0,
          searchStrategy: SearchStrategy.FUZZY_NAME_MATCH
        };
      }
      
      return null;
    } catch (error) {
      console.error('Fuzzy name search failed:', error);
      return null;
    }
  }

  /**
   * Enhanced name search with variants and alternatives
   */
  private async enhancedNameSearch(name: string, isin?: string): Promise<SearchResult | null> {
    try {
      // Generate name variants
      const variants = this.generateNameVariants(name);
      
      for (const variant of variants) {
        const result = await this.fuzzyNameSearch(variant, isin);
        if (result && result.confidence >= 0.7) {
          result.searchStrategy = SearchStrategy.ENHANCED_NAME_SEARCH;
          return result;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Enhanced name search failed:', error);
      return null;
    }
  }

  /**
   * Web search fallback using Claude API
   */
  private async webSearch(name: string, isin?: string, timeoutMs: number): Promise<SearchResult | null> {
    try {
      // Use Claude's existing web search capability
      const searchQuery = isin ? `${name} ISIN:${isin}` : name;
      
      // This would use Claude's web search - simplified for now
      const result = await this.simulateWebSearch(searchQuery, timeoutMs);
      
      if (result) {
        return {
          instrument: result,
          source: DataSource.WEB_SEARCH,
          confidence: 0.7, // Web search confidence
          processingTime: 0,
          searchStrategy: SearchStrategy.MULTI_IDENTIFIER_SEARCH
        };
      }
      
      return null;
    } catch (error) {
      console.error('Web search failed:', error);
      return null;
    }
  }

  /**
   * Claude-assisted search for complex cases
   */
  private async claudeAssistedSearch(name: string, isin?: string, timeoutMs: number): Promise<SearchResult | null> {
    try {
      // Use Claude to analyze and enhance search terms
      const enhancedQuery = await this.generateClaudeEnhancedQuery(name, isin);
      
      // Try enhanced search
      if (enhancedQuery !== name) {
        const result = await this.enhancedNameSearch(enhancedQuery, isin);
        if (result) {
          result.searchStrategy = SearchStrategy.CLAUDE_ASSISTED_SEARCH;
          result.confidence *= 0.9; // Slightly reduce confidence for AI-assisted
          return result;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Claude-assisted search failed:', error);
      return null;
    }
  }

  /**
   * Batch local search for efficiency
   */
  private async batchLocalSearch(
    instruments: BulkSearchRequest['instruments'],
    options: Required<SearchOptions>
  ): Promise<{ resolved: SearchResult[], unresolved: BulkSearchRequest['instruments'] }> {
    const resolved: SearchResult[] = [];
    const unresolved: BulkSearchRequest['instruments'] = [];

    // Process in batches for memory efficiency
    for (let i = 0; i < instruments.length; i += options.batchSize) {
      const batch = instruments.slice(i, i + options.batchSize);
      
      for (const instrument of batch) {
        const result = await this.searchInstrument(
          instrument.name, 
          instrument.isin, 
          { ...options, enableWebSearch: false }
        );
        
        if (result && result.confidence >= options.minConfidence) {
          resolved.push(result);
        } else {
          unresolved.push(instrument);
        }
      }
    }

    return { resolved, unresolved };
  }

  /**
   * Batch web search for unresolved instruments
   */
  private async batchWebSearch(
    instruments: BulkSearchRequest['instruments'],
    options: Required<SearchOptions>
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    // Process in smaller batches for web searches
    const webBatchSize = Math.min(options.batchSize, 5);
    
    for (let i = 0; i < instruments.length; i += webBatchSize) {
      const batch = instruments.slice(i, i + webBatchSize);
      
      // Process batch concurrently but with limit
      const batchPromises = batch.map(async (instrument) => {
        try {
          return await this.webSearch(instrument.name, instrument.isin, options.timeoutMs);
        } catch (error) {
          console.error(`Web search failed for ${instrument.name}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(r => r !== null));
      
      // Add delay between batches to be respectful to web APIs
      if (i + webBatchSize < instruments.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Generate name variants for enhanced matching
   */
  private generateNameVariants(name: string): string[] {
    const variants: string[] = [name];
    
    // Common transformations
    const cleaned = name
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (cleaned !== name) variants.push(cleaned);
    
    // Remove common prefixes/suffixes
    const withoutPrefixes = cleaned
      .replace(/^(ETF|Fund|Fonds|Index)\s+/gi, '')
      .replace(/\s+(ETF|Fund|Fonds|Index)$/gi, '');
    
    if (withoutPrefixes !== cleaned) variants.push(withoutPrefixes);
    
    // Abbreviation expansion
    const expanded = cleaned
      .replace(/\bETF\b/g, 'Exchange Traded Fund')
      .replace(/\bUSD\b/g, 'US Dollar')
      .replace(/\bEUR\b/g, 'Euro');
    
    if (expanded !== cleaned) variants.push(expanded);
    
    // Common German-English translations
    const translations = {
      'Aktien': 'Equity',
      'Anleihen': 'Bond',
      'Fonds': 'Fund',
      'Welt': 'World',
      'Europa': 'Europe',
      'Amerika': 'America'
    };
    
    let translated = cleaned;
    for (const [german, english] of Object.entries(translations)) {
      translated = translated.replace(new RegExp(german, 'gi'), english);
    }
    
    if (translated !== cleaned) variants.push(translated);
    
    return [...new Set(variants)]; // Remove duplicates
  }

  /**
   * Calculate name similarity score
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const clean1 = name1.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    const clean2 = name2.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    
    // Exact match
    if (clean1 === clean2) return 1.0;
    
    // Levenshtein distance based similarity
    const distance = this.levenshteinDistance(clean1, clean2);
    const maxLength = Math.max(clean1.length, clean2.length);
    const similarity = 1 - (distance / maxLength);
    
    // Boost score if one name contains the other
    if (clean1.includes(clean2) || clean2.includes(clean1)) {
      return Math.max(similarity, 0.8);
    }
    
    // Token-based similarity for better matching
    const tokens1 = clean1.split(' ');
    const tokens2 = clean2.split(' ');
    const commonTokens = tokens1.filter(token => 
      tokens2.some(t2 => t2.includes(token) || token.includes(t2))
    );
    
    const tokenSimilarity = commonTokens.length / Math.max(tokens1.length, tokens2.length);
    
    return Math.max(similarity, tokenSimilarity * 0.9);
  }

  /**
   * Levenshtein distance calculation
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator  // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(name: string, isin?: string, options?: SearchOptions): string {
    const optionsHash = options ? 
      JSON.stringify({ ...options, timeoutMs: undefined }) : 
      'default';
    return `${name}:${isin || ''}:${optionsHash}`;
  }

  /**
   * Cache search result
   */
  private cacheResult(key: string, result: SearchResult): void {
    this.searchCache.set(key, result);
    
    // Periodically clean cache
    if (this.searchCache.size > 1000) {
      this.cleanCache();
    }
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, result] of this.searchCache.entries()) {
      if (now - result.processingTime > this.cacheExpiry) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.searchCache.delete(key));
    console.log(`Cleaned ${keysToDelete.length} expired cache entries`);
  }

  /**
   * Calculate data quality score for bulk results
   */
  private calculateDataQualityScore(results: SearchResult[]): number {
    if (results.length === 0) return 0;
    
    let totalScore = 0;
    
    for (const result of results) {
      let score = result.confidence * 0.4; // Base confidence
      
      if (result.instrument.isin) score += 0.2;
      if (result.instrument.factsheetData) score += 0.3;
      if (result.source === DataSource.LOCAL_FACTSHEET) score += 0.1;
      
      totalScore += Math.min(1, score);
    }
    
    return totalScore / results.length;
  }

  /**
   * Simulate web search (placeholder for real implementation)
   */
  private async simulateWebSearch(query: string, timeoutMs: number): Promise<InstrumentInfo | null> {
    // This would integrate with actual web search APIs
    // For now, return null to indicate no results
    return null;
  }

  /**
   * Generate Claude-enhanced search query
   */
  private async generateClaudeEnhancedQuery(name: string, isin?: string): Promise<string> {
    // This would use Claude to analyze and improve search terms
    // For now, return cleaned version
    return name.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    oldestEntry: Date | null;
  } {
    const now = Date.now();
    let oldestTime = now;
    let totalHits = 0;
    
    for (const result of this.searchCache.values()) {
      if (result.processingTime < oldestTime) {
        oldestTime = result.processingTime;
      }
    }
    
    return {
      size: this.searchCache.size,
      hitRate: 0, // Would need to track hits vs misses
      oldestEntry: oldestTime < now ? new Date(oldestTime) : null
    };
  }
}

export const hybridSearchEngine = new HybridSearchEngine();