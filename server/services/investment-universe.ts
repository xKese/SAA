import * as fs from 'fs/promises';
import * as path from 'path';
import pdf from 'pdf-parse';

export interface InvestmentUniverseItem {
  name: string;
  isin?: string;
  assetClass: string;
  category: string;
  factsheetPath: string;
  hasFactsheet: boolean;
  fileName: string;
  confidence: number;
  factsheetData?: {
    fullName?: string;
    ter?: number;
    assetAllocation?: Record<string, number>;
    geographicAllocation?: Record<string, number>;
  };
}


export interface InvestmentUniverseResponse {
  instruments: InvestmentUniverseItem[];
  categories: string[];
  assetClasses: string[];
  totalCount: number;
}

export class InvestmentUniverseService {
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private lastCacheTime = 0;
  private cachedUniverse: InvestmentUniverseResponse | null = null;
  
  /**
   * Get complete investment universe from local factsheet directory
   */
  async getInvestmentUniverse(forceRefresh = false): Promise<InvestmentUniverseResponse> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (!forceRefresh && this.cachedUniverse && (now - this.lastCacheTime) < this.cacheExpiry) {
      console.log('Returning cached investment universe');
      return this.cachedUniverse;
    }

    console.log('Scanning investment universe directory...');
    const investmentDir = path.join(process.cwd(), 'investment_universe');
    
    try {
      await fs.access(investmentDir);
    } catch (error) {
      console.error('Investment universe directory not found:', investmentDir);
      return {
        instruments: [],
        categories: [],
        assetClasses: [],
        totalCount: 0
      };
    }

    const instruments: InvestmentUniverseItem[] = [];
    const categories = new Set<string>();
    const assetClasses = new Set<string>();

    await this.scanDirectoryRecursively(investmentDir, instruments, categories, assetClasses, '');

    const result: InvestmentUniverseResponse = {
      instruments: instruments.sort((a, b) => a.name.localeCompare(b.name, 'de')),
      categories: Array.from(categories).sort(),
      assetClasses: Array.from(assetClasses).sort(),
      totalCount: instruments.length
    };

    // Cache the result
    this.cachedUniverse = result;
    this.lastCacheTime = now;

    console.log(`Investment universe loaded: ${result.totalCount} instruments, ${result.assetClasses.length} asset classes, ${result.categories.length} categories`);
    return result;
  }

  /**
   * Search instruments by name or ISIN
   */
  async searchInstruments(query: string): Promise<InvestmentUniverseItem[]> {
    const universe = await this.getInvestmentUniverse();
    const searchTerm = query.toLowerCase();
    
    return universe.instruments.filter(instrument => 
      instrument.name.toLowerCase().includes(searchTerm) ||
      (instrument.isin && instrument.isin.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Get instruments by asset class
   */
  async getInstrumentsByAssetClass(assetClass: string): Promise<InvestmentUniverseItem[]> {
    const universe = await this.getInvestmentUniverse();
    return universe.instruments.filter(instrument => instrument.assetClass === assetClass);
  }

  /**
   * Get instruments by category
   */
  async getInstrumentsByCategory(category: string): Promise<InvestmentUniverseItem[]> {
    const universe = await this.getInvestmentUniverse();
    return universe.instruments.filter(instrument => instrument.category === category);
  }

  /**
   * Recursively scan directory for factsheet PDFs
   */
  private async scanDirectoryRecursively(
    dirPath: string,
    instruments: InvestmentUniverseItem[],
    categories: Set<string>,
    assetClasses: Set<string>,
    parentPath: string
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
        
        if (entry.isDirectory()) {
          categories.add(entry.name);
          await this.scanDirectoryRecursively(fullPath, instruments, categories, assetClasses, relativePath);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
          const instrumentInfo = this.extractInstrumentInfoFromFilename(entry.name, relativePath, fullPath);
          if (instrumentInfo) {
            instruments.push(instrumentInfo);
            assetClasses.add(instrumentInfo.assetClass);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }
  }

  /**
   * Extract instrument information from PDF filename and path
   */
  private extractInstrumentInfoFromFilename(
    fileName: string,
    relativePath: string,
    fullPath: string
  ): InvestmentUniverseItem | null {
    try {
      // Determine asset class from directory structure
      const pathParts = relativePath.split('/');
      let assetClass = 'Sonstiges';
      let category = 'Unbekannt';

      // Find asset class from path (e.g., "Aktien", "Anleihen")
      const assetClassDir = pathParts.find(part => 
        ['Aktien', 'Anleihen', 'Alternative', 'Geldmarkt', 'Rohstoffe', 'Immobilien'].includes(part)
      );
      if (assetClassDir) {
        assetClass = assetClassDir;
      }

      // Find category from path (e.g., "Stufe 1", "Stufe 2", "Stufe 3")
      const categoryDir = pathParts.find(part => part.startsWith('Stufe'));
      if (categoryDir) {
        category = categoryDir;
      }

      // Use filename as instrument name (original behavior)
      let name = fileName.replace('.pdf', '');
      let isin: string | undefined;

      // Try to extract ISIN from filename (common patterns)
      const isinMatch = fileName.match(/([A-Z]{2}[A-Z0-9]{10})/);
      if (isinMatch) {
        isin = isinMatch[1];
      }

      return {
        name: name, // Use filename directly as requested
        isin,
        assetClass,
        category,
        factsheetPath: fullPath,
        hasFactsheet: true,
        fileName,
        confidence: isin ? 0.8 : 0.6 // Higher confidence if ISIN found
      };
    } catch (error) {
      console.error(`Error extracting info from filename ${fileName}:`, error);
      return null;
    }
  }

  /**
   * Get asset class for a specific instrument by name or ISIN
   */
  async getAssetClassForInstrument(name: string, isin?: string | null): Promise<string | null> {
    const universe = await this.getInvestmentUniverse();
    
    // First try exact ISIN match
    if (isin) {
      const instrumentByISIN = universe.instruments.find(inst => 
        inst.isin && inst.isin.toUpperCase() === isin.toUpperCase()
      );
      if (instrumentByISIN) {
        return instrumentByISIN.assetClass;
      }
    }
    
    // Then try name match (case insensitive, partial match)
    const nameLower = name.toLowerCase();
    const instrumentByName = universe.instruments.find(inst => 
      inst.name.toLowerCase().includes(nameLower) || 
      nameLower.includes(inst.name.toLowerCase())
    );
    
    if (instrumentByName) {
      return instrumentByName.assetClass;
    }
    
    // Special handling for cash positions
    if (nameLower === 'euro' || nameLower === 'eur' ||
        nameLower.includes('devisenkonto') ||
        nameLower.includes('kontokorrent') ||
        nameLower.includes('cash') ||
        nameLower.includes('liquidität')) {
      return 'Liquidität';
    }
    
    return null;
  }



  /**
   * Validate if an instrument exists in the investment universe
   */
  async validateInstrument(name: string, isin?: string): Promise<boolean> {
    const universe = await this.getInvestmentUniverse();
    
    return universe.instruments.some(instrument =>
      instrument.name.toLowerCase() === name.toLowerCase() ||
      (isin && instrument.isin === isin)
    );
  }

  /**
   * Get instrument details by name or ISIN
   */
  async getInstrumentDetails(name: string, isin?: string): Promise<InvestmentUniverseItem | null> {
    const universe = await this.getInvestmentUniverse();
    
    return universe.instruments.find(instrument =>
      instrument.name.toLowerCase() === name.toLowerCase() ||
      (isin && instrument.isin === isin)
    ) || null;
  }

  /**
   * Force refresh cache (useful for administration)
   */
  async refreshCache(): Promise<void> {
    console.log('Forcing investment universe cache refresh...');
    await this.getInvestmentUniverse(true);
  }

  /**
   * Get factsheet for a specific instrument by name and ISIN
   * This method is called by claude.ts for look-through analysis
   */
  async getFactsheetForInstrument(name: string, isin?: string | null): Promise<any | null> {
    try {
      // First try to find the instrument in the universe
      const instrument = await this.getInstrumentDetails(name, isin || undefined);
      
      if (!instrument || !instrument.factsheetPath) {
        console.log(`No factsheet found for instrument: ${name} (ISIN: ${isin})`);
        return null;
      }

      // Simple factsheet data return
      return {
        factsheetPath: instrument.factsheetPath,
        fileName: instrument.fileName,
        name: instrument.name,
        isin: instrument.isin
      };
    } catch (error) {
      console.error(`Error getting factsheet for ${name}:`, error);
      return null;
    }
  }

}

export const investmentUniverseService = new InvestmentUniverseService();