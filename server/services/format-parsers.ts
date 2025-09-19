import * as XLSX from 'xlsx';
import pdf from 'pdf-parse';
import { DocumentProcessor, ParsedPosition, DocumentMetadata, ProcessingOptions } from './document-processor';

/**
 * Enhanced Format-Specific Parsers for German Banking Formats
 * Supports major German banks and financial institutions
 */
export class GermanBankParsers {
  
  /**
   * Parse Comdirect CSV exports
   */
  static parseComdirectCSV(content: string): ParsedPosition[] {
    const lines = content.split(/\r?\n/);
    const positions: ParsedPosition[] = [];
    
    // Comdirect header patterns: "Pos-Nr.;Bezeichnung;ISIN;WKN;Stück/Nominal;Kurs;Kurswert;Aktueller Wert"
    let headerRow = -1;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      if (lines[i].includes('Bezeichnung') && lines[i].includes('ISIN') && lines[i].includes('Kurswert')) {
        headerRow = i;
        break;
      }
    }
    
    if (headerRow === -1) return positions;
    
    const headers = lines[headerRow].split(';').map(h => h.trim().toLowerCase());
    const nameIndex = headers.findIndex(h => h.includes('bezeichnung'));
    const isinIndex = headers.findIndex(h => h.includes('isin'));
    const valueIndex = headers.findIndex(h => h.includes('kurswert') || h.includes('aktueller wert'));
    
    if (nameIndex === -1 || valueIndex === -1) return positions;
    
    for (let i = headerRow + 1; i < lines.length; i++) {
      const cells = lines[i].split(';');
      if (cells.length <= Math.max(nameIndex, valueIndex, isinIndex)) continue;
      
      const name = cells[nameIndex]?.trim().replace(/"/g, '');
      const isin = isinIndex !== -1 ? cells[isinIndex]?.trim().replace(/"/g, '') : undefined;
      const valueStr = cells[valueIndex]?.trim().replace(/"/g, '');
      
      if (name && valueStr) {
        const value = this.parseGermanCurrency(valueStr);
        if (!isNaN(value) && value > 0) {
          positions.push({
            name,
            isin: isin || undefined,
            value,
            confidence: 0.95,
            rawData: { source: 'Comdirect', rowIndex: i }
          });
        }
      }
    }
    
    return positions;
  }

  /**
   * Parse ING DiBa CSV exports
   */
  static parseINGCSV(content: string): ParsedPosition[] {
    const lines = content.split(/\r?\n/);
    const positions: ParsedPosition[] = [];
    
    // ING header pattern: "Produktname;ISIN;Börsenplatz;Verwahrart;Bestand;Durchschnittskurs;Aktueller Kurs;Kursdatum;Wert in EUR"
    let headerRow = -1;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      if (lines[i].includes('Produktname') && lines[i].includes('ISIN') && lines[i].includes('Wert in EUR')) {
        headerRow = i;
        break;
      }
    }
    
    if (headerRow === -1) return positions;
    
    const headers = lines[headerRow].split(';').map(h => h.trim().toLowerCase());
    const nameIndex = headers.findIndex(h => h.includes('produktname'));
    const isinIndex = headers.findIndex(h => h.includes('isin'));
    const valueIndex = headers.findIndex(h => h.includes('wert in eur'));
    
    if (nameIndex === -1 || valueIndex === -1) return positions;
    
    for (let i = headerRow + 1; i < lines.length; i++) {
      const cells = lines[i].split(';');
      if (cells.length <= Math.max(nameIndex, valueIndex, isinIndex)) continue;
      
      const name = cells[nameIndex]?.trim().replace(/"/g, '');
      const isin = isinIndex !== -1 ? cells[isinIndex]?.trim().replace(/"/g, '') : undefined;
      const valueStr = cells[valueIndex]?.trim().replace(/"/g, '');
      
      if (name && valueStr) {
        const value = this.parseGermanCurrency(valueStr);
        if (!isNaN(value) && value > 0) {
          positions.push({
            name,
            isin: isin || undefined,
            value,
            confidence: 0.95,
            rawData: { source: 'ING', rowIndex: i }
          });
        }
      }
    }
    
    return positions;
  }

  /**
   * Parse DKB CSV exports
   */
  static parseDKBCSV(content: string): ParsedPosition[] {
    const lines = content.split(/\r?\n/);
    const positions: ParsedPosition[] = [];
    
    // DKB header pattern varies, but typically includes "Wertpapierbezeichnung;ISIN;WKN;Verwahrart;Gattung;Nominale;Stück;Kurs;Wert"
    let headerRow = -1;
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      const line = lines[i].toLowerCase();
      if ((line.includes('wertpapierbezeichnung') || line.includes('bezeichnung')) && 
          line.includes('isin') && 
          (line.includes('wert') || line.includes('kurswert'))) {
        headerRow = i;
        break;
      }
    }
    
    if (headerRow === -1) return positions;
    
    const headers = lines[headerRow].split(';').map(h => h.trim().toLowerCase());
    const nameIndex = headers.findIndex(h => h.includes('bezeichnung'));
    const isinIndex = headers.findIndex(h => h.includes('isin'));
    const valueIndex = headers.findIndex(h => h.includes('wert') && !h.includes('wertpapier'));
    
    if (nameIndex === -1 || valueIndex === -1) return positions;
    
    for (let i = headerRow + 1; i < lines.length; i++) {
      const cells = lines[i].split(';');
      if (cells.length <= Math.max(nameIndex, valueIndex, isinIndex)) continue;
      
      const name = cells[nameIndex]?.trim().replace(/"/g, '');
      const isin = isinIndex !== -1 ? cells[isinIndex]?.trim().replace(/"/g, '') : undefined;
      const valueStr = cells[valueIndex]?.trim().replace(/"/g, '');
      
      if (name && valueStr) {
        const value = this.parseGermanCurrency(valueStr);
        if (!isNaN(value) && value > 0) {
          positions.push({
            name,
            isin: isin || undefined,
            value,
            confidence: 0.95,
            rawData: { source: 'DKB', rowIndex: i }
          });
        }
      }
    }
    
    return positions;
  }

  /**
   * Parse Consorsbank CSV exports
   */
  static parseConsorsbankCSV(content: string): ParsedPosition[] {
    const lines = content.split(/\r?\n/);
    const positions: ParsedPosition[] = [];
    
    // Consorsbank uses a specific format with account summary at top
    let dataStartRow = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('wertpapierbezeichnung') || 
          (line.includes('bezeichnung') && line.includes('isin'))) {
        dataStartRow = i;
        break;
      }
    }
    
    if (dataStartRow === -1) return positions;
    
    const headers = lines[dataStartRow].split(';').map(h => h.trim().toLowerCase());
    const nameIndex = headers.findIndex(h => h.includes('bezeichnung'));
    const isinIndex = headers.findIndex(h => h.includes('isin'));
    const valueIndex = headers.findIndex(h => 
      h.includes('aktueller wert') || h.includes('marktwert') || h.includes('kurswert')
    );
    
    if (nameIndex === -1 || valueIndex === -1) return positions;
    
    for (let i = dataStartRow + 1; i < lines.length; i++) {
      if (!lines[i].trim()) break; // Stop at empty line (often end of data)
      
      const cells = lines[i].split(';');
      if (cells.length <= Math.max(nameIndex, valueIndex, isinIndex)) continue;
      
      const name = cells[nameIndex]?.trim().replace(/"/g, '');
      const isin = isinIndex !== -1 ? cells[isinIndex]?.trim().replace(/"/g, '') : undefined;
      const valueStr = cells[valueIndex]?.trim().replace(/"/g, '');
      
      if (name && valueStr) {
        const value = this.parseGermanCurrency(valueStr);
        if (!isNaN(value) && value > 0) {
          positions.push({
            name,
            isin: isin || undefined,
            value,
            confidence: 0.95,
            rawData: { source: 'Consorsbank', rowIndex: i }
          });
        }
      }
    }
    
    return positions;
  }

  /**
   * Auto-detect and parse German bank format
   */
  static parseGermanBankCSV(content: string): ParsedPosition[] {
    // Try to identify bank by content patterns
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('comdirect') || lowerContent.includes('pos-nr.')) {
      return this.parseComdirectCSV(content);
    }
    
    if (lowerContent.includes('ing-diba') || lowerContent.includes('produktname')) {
      return this.parseINGCSV(content);
    }
    
    if (lowerContent.includes('dkb') || lowerContent.includes('deutsche kreditbank')) {
      return this.parseDKBCSV(content);
    }
    
    if (lowerContent.includes('consorsbank') || lowerContent.includes('cortal consors')) {
      return this.parseConsorsbankCSV(content);
    }
    
    // Fallback: try generic German format
    return this.parseGenericGermanCSV(content);
  }

  /**
   * Generic German CSV parser for unknown formats
   */
  private static parseGenericGermanCSV(content: string): ParsedPosition[] {
    const lines = content.split(/\r?\n/);
    const positions: ParsedPosition[] = [];
    
    // Find the most likely header row
    let headerRow = -1;
    let maxScore = 0;
    
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i].toLowerCase();
      let score = 0;
      
      // Score based on presence of key German terms
      if (line.includes('bezeichnung') || line.includes('name')) score += 3;
      if (line.includes('isin')) score += 2;
      if (line.includes('wert') || line.includes('betrag')) score += 3;
      if (line.includes('wkn')) score += 1;
      if (line.includes('kurs')) score += 1;
      
      // Prefer rows with semicolon separators (common in German exports)
      if (line.includes(';')) score += 1;
      
      if (score > maxScore && score >= 5) {
        maxScore = score;
        headerRow = i;
      }
    }
    
    if (headerRow === -1) return positions;
    
    const headers = lines[headerRow].split(/[;,\t]/).map(h => h.trim().toLowerCase());
    
    // Enhanced German column detection
    const nameIndex = this.findGermanColumn(headers, [
      'bezeichnung', 'name', 'wertpapierbezeichnung', 'titel', 'produktname', 'instrument'
    ]);
    const isinIndex = this.findGermanColumn(headers, ['isin', 'kennung']);
    const valueIndex = this.findGermanColumn(headers, [
      'wert', 'kurswert', 'marktwert', 'aktueller wert', 'betrag', 'summe', 'volumen'
    ]);
    
    if (nameIndex === -1 || valueIndex === -1) return positions;
    
    const delimiter = lines[headerRow].includes(';') ? ';' : 
                     lines[headerRow].includes('\t') ? '\t' : ',';
    
    for (let i = headerRow + 1; i < lines.length; i++) {
      const cells = lines[i].split(delimiter);
      if (cells.length <= Math.max(nameIndex, valueIndex, isinIndex)) continue;
      
      const name = cells[nameIndex]?.trim().replace(/"/g, '');
      const isin = isinIndex !== -1 ? cells[isinIndex]?.trim().replace(/"/g, '') : undefined;
      const valueStr = cells[valueIndex]?.trim().replace(/"/g, '');
      
      if (name && valueStr && name.length > 1) {
        const value = this.parseGermanCurrency(valueStr);
        if (!isNaN(value) && value > 0) {
          positions.push({
            name,
            isin: isin || undefined,
            value,
            confidence: 0.8, // Lower confidence for generic parsing
            rawData: { source: 'Generic German', rowIndex: i }
          });
        }
      }
    }
    
    return positions;
  }

  private static findGermanColumn(headers: string[], patterns: string[]): number {
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      for (const pattern of patterns) {
        if (header.includes(pattern)) {
          return i;
        }
      }
    }
    return -1;
  }

  /**
   * Enhanced German currency parsing
   */
  private static parseGermanCurrency(valueStr: string): number {
    if (!valueStr) return NaN;
    
    // Remove common German currency formatting
    let cleaned = valueStr
      .replace(/EUR|€|CHF|USD|\$|£|GBP/g, '') // Remove currency symbols
      .replace(/\s+/g, '') // Remove spaces
      .trim();
    
    // Handle German number format: 1.234.567,89
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Check if comma is decimal separator (German format)
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');
      
      if (lastComma > lastDot) {
        // German format: 1.234.567,89
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // English format: 1,234,567.89
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',') && !cleaned.includes('.')) {
      // Only comma - likely German decimal separator
      if (cleaned.match(/^\d+,\d{1,2}$/)) {
        cleaned = cleaned.replace(',', '.');
      }
    }
    
    // Handle negative values in parentheses: (123,45)
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }
    
    return parseFloat(cleaned);
  }
}

/**
 * Enhanced Excel Parser for Complex Workbooks
 */
export class EnhancedExcelParser {
  
  /**
   * Parse multi-sheet Excel with intelligent sheet detection
   */
  static parseExcelWorkbook(buffer: Buffer): { 
    positions: ParsedPosition[], 
    metadata: DocumentMetadata,
    warnings: string[]
  } {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const positions: ParsedPosition[] = [];
    const warnings: string[] = [];
    const processedSheets: string[] = [];

    // Score sheets by likelihood of containing portfolio data
    const sheetScores = this.scoreWorksheets(workbook);
    
    // Process sheets in order of likelihood
    for (const { sheetName, score } of sheetScores) {
      if (score < 0.3) continue; // Skip unlikely sheets
      
      try {
        const sheetPositions = this.parseWorksheet(workbook.Sheets[sheetName], sheetName);
        if (sheetPositions.length > 0) {
          positions.push(...sheetPositions);
          processedSheets.push(sheetName);
        }
      } catch (error) {
        warnings.push(`Fehler in Arbeitsblatt '${sheetName}': ${error.message}`);
      }
    }

    return {
      positions,
      metadata: {
        sheetNames: workbook.SheetNames,
        detectedFormat: {
          decimalSeparator: '.',
          columnMapping: { name: null, isin: null, value: null, confidence: 0.8 }
        }
      } as DocumentMetadata,
      warnings
    };
  }

  /**
   * Score worksheets by likelihood of containing portfolio data
   */
  private static scoreWorksheets(workbook: XLSX.WorkBook): { sheetName: string, score: number }[] {
    const scores: { sheetName: string, score: number }[] = [];
    
    for (const sheetName of workbook.SheetNames) {
      let score = 0;
      const lowerName = sheetName.toLowerCase();
      
      // Score by sheet name
      if (lowerName.includes('portfolio') || lowerName.includes('depot')) score += 0.8;
      if (lowerName.includes('position') || lowerName.includes('bestand')) score += 0.7;
      if (lowerName.includes('wertpapier') || lowerName.includes('investment')) score += 0.6;
      if (lowerName.includes('summary') || lowerName.includes('übersicht')) score += 0.5;
      if (lowerName.includes('data') || lowerName.includes('daten')) score += 0.4;
      
      // Penalize obviously non-data sheets
      if (lowerName.includes('chart') || lowerName.includes('graph')) score -= 0.5;
      if (lowerName.includes('template') || lowerName.includes('vorlage')) score -= 0.3;
      
      // Score by content analysis
      try {
        const worksheet = workbook.Sheets[sheetName];
        const contentScore = this.analyzeWorksheetContent(worksheet);
        score += contentScore;
      } catch (error) {
        score -= 0.2; // Penalize sheets that can't be analyzed
      }
      
      scores.push({ sheetName, score: Math.max(0, Math.min(1, score)) });
    }
    
    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Analyze worksheet content for portfolio data indicators
   */
  private static analyzeWorksheetContent(worksheet: XLSX.WorkSheet): number {
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    
    if (jsonData.length < 2) return 0;
    
    let score = 0;
    const sampleRows = jsonData.slice(0, Math.min(10, jsonData.length));
    
    // Look for portfolio-related headers
    for (const row of sampleRows) {
      const rowStr = row.join(' ').toLowerCase();
      if (rowStr.includes('isin')) score += 0.3;
      if (rowStr.includes('wkn')) score += 0.2;
      if (rowStr.includes('wert') || rowStr.includes('value')) score += 0.2;
      if (rowStr.includes('name') || rowStr.includes('bezeichnung')) score += 0.2;
      if (rowStr.includes('kurs') || rowStr.includes('price')) score += 0.1;
    }
    
    // Look for ISIN patterns in data
    let isinCount = 0;
    for (const row of sampleRows) {
      for (const cell of row) {
        if (typeof cell === 'string' && /^[A-Z]{2}[A-Z0-9]{10}$/.test(cell)) {
          isinCount++;
        }
      }
    }
    
    if (isinCount > 0) score += Math.min(0.4, isinCount * 0.1);
    
    return Math.min(1, score);
  }

  /**
   * Enhanced worksheet parsing with format detection
   */
  private static parseWorksheet(worksheet: XLSX.WorkSheet, sheetName: string): ParsedPosition[] {
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    
    if (jsonData.length < 2) return [];

    // Find header row with smart detection
    const headerRowIndex = this.findHeaderRow(jsonData);
    if (headerRowIndex === -1) return [];

    const headers = jsonData[headerRowIndex].map((h: any) => String(h).toLowerCase().trim());
    
    // Enhanced column mapping
    const columnMapping = this.mapExcelColumns(headers);
    if (!columnMapping.name || !columnMapping.value) return [];

    const positions: ParsedPosition[] = [];
    
    // Process data rows
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // Skip empty rows
      if (row.every((cell: any) => !cell || String(cell).trim() === '')) continue;
      
      const name = String(row[columnMapping.name] || '').trim();
      const isin = columnMapping.isin !== null ? 
        String(row[columnMapping.isin] || '').trim() : undefined;
      const value = this.parseExcelValue(row[columnMapping.value]);

      // Validate ISIN format if present
      if (isin && !/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin)) {
        // Skip invalid ISINs, but continue with position if name and value are valid
      }

      if (name && name.length > 1 && !isNaN(value) && value > 0) {
        positions.push({
          name,
          isin: (isin && /^[A-Z]{2}[A-Z0-9]{10}$/.test(isin)) ? isin : undefined,
          value,
          confidence: columnMapping.confidence,
          rawData: { sheetName, rowIndex: i, originalRow: row }
        });
      }
    }

    return positions;
  }

  /**
   * Smart header row detection
   */
  private static findHeaderRow(data: any[][]): number {
    let bestRowIndex = -1;
    let maxScore = 0;

    for (let i = 0; i < Math.min(15, data.length); i++) {
      const row = data[i];
      let score = 0;
      
      // Count non-empty string cells
      const stringCells = row.filter(cell => 
        typeof cell === 'string' && cell.trim().length > 0
      ).length;
      
      if (stringCells < 2) continue; // Need at least 2 string headers
      
      score += stringCells * 0.2;
      
      // Check for key portfolio terms
      const rowStr = row.join(' ').toLowerCase();
      if (rowStr.includes('name') || rowStr.includes('bezeichnung')) score += 0.3;
      if (rowStr.includes('isin')) score += 0.3;
      if (rowStr.includes('wert') || rowStr.includes('value')) score += 0.3;
      if (rowStr.includes('betrag') || rowStr.includes('amount')) score += 0.2;
      
      // Penalize rows with many numbers (likely data rows)
      const numberCells = row.filter(cell => 
        typeof cell === 'number' || (typeof cell === 'string' && !isNaN(parseFloat(cell)))
      ).length;
      
      if (numberCells > stringCells) score -= 0.3;
      
      if (score > maxScore && score > 0.5) {
        maxScore = score;
        bestRowIndex = i;
      }
    }

    return bestRowIndex;
  }

  /**
   * Enhanced Excel column mapping
   */
  private static mapExcelColumns(headers: string[]): {
    name: number | null,
    isin: number | null, 
    value: number | null,
    confidence: number
  } {
    let nameIndex = -1;
    let isinIndex = -1;
    let valueIndex = -1;
    let confidence = 0;

    // Enhanced German patterns
    const namePatterns = [
      'name', 'bezeichnung', 'titel', 'instrument', 'security', 'wertpapier',
      'produktname', 'wertpapierbezeichnung', 'fond', 'etf', 'aktie', 'position'
    ];
    const isinPatterns = [
      'isin', 'wkn', 'symbol', 'code', 'kennung', 'id', 'identifier'
    ];
    const valuePatterns = [
      'wert', 'betrag', 'value', 'amount', 'marktwert', 'kurswert', 
      'aktueller wert', 'market value', 'current value', 'volumen', 'summe'
    ];

    // Find best matches with fuzzy matching
    nameIndex = this.findBestMatch(headers, namePatterns);
    isinIndex = this.findBestMatch(headers, isinPatterns);
    valueIndex = this.findBestMatch(headers, valuePatterns);

    // Calculate confidence
    if (nameIndex !== -1) confidence += 0.4;
    if (valueIndex !== -1) confidence += 0.5;
    if (isinIndex !== -1) confidence += 0.1;

    return {
      name: nameIndex !== -1 ? nameIndex : null,
      isin: isinIndex !== -1 ? isinIndex : null,
      value: valueIndex !== -1 ? valueIndex : null,
      confidence
    };
  }

  private static findBestMatch(headers: string[], patterns: string[]): number {
    let bestMatch = -1;
    let bestScore = 0;

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      for (const pattern of patterns) {
        // Exact match
        if (header === pattern) return i;
        
        // Partial match
        if (header.includes(pattern)) {
          const score = pattern.length / header.length; // Preference for closer matches
          if (score > bestScore) {
            bestScore = score;
            bestMatch = i;
          }
        }
      }
    }

    return bestScore > 0.5 ? bestMatch : -1;
  }

  /**
   * Enhanced Excel value parsing
   */
  private static parseExcelValue(value: any): number {
    if (typeof value === 'number') {
      return value;
    }
    
    if (typeof value === 'string') {
      return GermanBankParsers['parseGermanCurrency'](value);
    }

    // Handle Excel date values that might be numbers
    if (value instanceof Date) {
      return NaN; // Dates are not monetary values
    }

    return NaN;
  }
}

/**
 * Enhanced PDF Parser with Layout Recognition
 */
export class EnhancedPDFParser {
  
  /**
   * Parse PDF with layout-aware extraction
   */
  static async parsePDFWithLayout(buffer: Buffer): Promise<{
    positions: ParsedPosition[],
    metadata: DocumentMetadata,
    warnings: string[]
  }> {
    const warnings: string[] = [];
    
    try {
      const pdfData = await pdf(buffer);
      
      // Try different extraction strategies
      const strategies = [
        this.extractStructuredDepotStatement(pdfData.text),
        this.extractTableBasedData(pdfData.text),
        this.extractGenericPDFData(pdfData.text)
      ];
      
      // Use the strategy that found the most positions
      let bestPositions: ParsedPosition[] = [];
      let bestStrategy = 'generic';
      
      for (let i = 0; i < strategies.length; i++) {
        const positions = strategies[i];
        if (positions.length > bestPositions.length) {
          bestPositions = positions;
          bestStrategy = ['structured', 'table', 'generic'][i];
        }
      }
      
      if (bestPositions.length === 0) {
        warnings.push('Keine erkennbaren Portfolio-Positionen im PDF gefunden');
      }

      return {
        positions: bestPositions,
        metadata: {
          pageCount: pdfData.numpages,
          detectedFormat: {
            decimalSeparator: ',',
            columnMapping: { name: null, isin: null, value: null, confidence: 0.7 }
          }
        } as DocumentMetadata,
        warnings
      };
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  /**
   * Extract from structured depot statements (banks)
   */
  private static extractStructuredDepotStatement(text: string): ParsedPosition[] {
    const positions: ParsedPosition[] = [];
    
    // Enhanced patterns for German depot statements
    const patterns = [
      // Comdirect pattern: Name ISIN EUR 1.234,56
      /^(.+?)\s+([A-Z]{2}[A-Z0-9]{10})\s+EUR\s+([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})/gm,
      
      // ING pattern: Name (ISIN) 1.234,56 EUR
      /^(.+?)\s+\(([A-Z]{2}[A-Z0-9]{10})\)\s+([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})\s+EUR/gm,
      
      // DKB pattern with more flexible spacing
      /^(.+?)\s{2,}([A-Z]{2}[A-Z0-9]{10})\s{2,}([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})/gm,
      
      // Generic pattern with tabs
      /^(.+?)\t+([A-Z]{2}[A-Z0-9]{10})\t+([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})/gm,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1].trim().replace(/\s+/g, ' ');
        const isin = match[2];
        const valueStr = match[3];
        
        if (name.length > 3 && !name.includes('Summe') && !name.includes('Total')) {
          const value = GermanBankParsers['parseGermanCurrency'](valueStr);
          if (!isNaN(value) && value > 0) {
            positions.push({
              name,
              isin,
              value,
              confidence: 0.9,
              rawData: { 
                source: 'Structured PDF', 
                extractedText: match[0],
                pattern: pattern.source
              }
            });
          }
        }
      }
    }

    return positions;
  }

  /**
   * Extract from table-based PDFs
   */
  private static extractTableBasedData(text: string): ParsedPosition[] {
    const positions: ParsedPosition[] = [];
    const lines = text.split('\n');
    
    // Find table headers
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if ((line.includes('bezeichnung') || line.includes('name')) &&
          (line.includes('isin') || line.includes('wkn')) &&
          (line.includes('wert') || line.includes('betrag'))) {
        headerIndex = i;
        break;
      }
    }
    
    if (headerIndex === -1) return positions;
    
    // Analyze table structure
    const headerLine = lines[headerIndex];
    const columnPositions = this.analyzeTableColumns(headerLine);
    
    // Extract data rows
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const position = this.extractTableRow(line, columnPositions);
      if (position) {
        position.confidence = 0.8;
        position.rawData = { source: 'Table PDF', rowIndex: i, line };
        positions.push(position);
      }
    }

    return positions;
  }

  /**
   * Generic PDF data extraction
   */
  private static extractGenericPDFData(text: string): ParsedPosition[] {
    const positions: ParsedPosition[] = [];
    
    // Look for ISIN patterns with surrounding context
    const isinPattern = /([^\n]{10,80}?)\s*([A-Z]{2}[A-Z0-9]{10})\s*([^\n]{5,50}?)/g;
    
    let match;
    while ((match = isinPattern.exec(text)) !== null) {
      const beforeISIN = match[1].trim();
      const isin = match[2];
      const afterISIN = match[3].trim();
      
      // Look for name in before context
      let name = this.extractNameFromContext(beforeISIN);
      if (!name) name = this.extractNameFromContext(afterISIN);
      
      // Look for value in after context
      let value = this.extractValueFromContext(afterISIN);
      if (isNaN(value)) value = this.extractValueFromContext(beforeISIN);
      
      if (name && !isNaN(value) && value > 0) {
        positions.push({
          name,
          isin,
          value,
          confidence: 0.6, // Lower confidence for generic extraction
          rawData: { 
            source: 'Generic PDF', 
            context: match[0],
            beforeISIN,
            afterISIN
          }
        });
      }
    }

    return positions;
  }

  private static analyzeTableColumns(headerLine: string): any {
    // Simplified table column analysis
    return {
      nameStart: 0,
      nameEnd: headerLine.indexOf('ISIN') || 40,
      isinStart: headerLine.indexOf('ISIN') || 40,
      isinEnd: (headerLine.indexOf('ISIN') || 40) + 12,
      valueStart: headerLine.lastIndexOf('Wert') || headerLine.length - 20
    };
  }

  private static extractTableRow(line: string, columns: any): ParsedPosition | null {
    const name = line.substring(columns.nameStart, columns.nameEnd).trim();
    const isinMatch = line.match(/[A-Z]{2}[A-Z0-9]{10}/);
    const isin = isinMatch ? isinMatch[0] : undefined;
    
    // Extract value from end of line
    const valueMatches = line.match(/([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})/g);
    const value = valueMatches ? 
      GermanBankParsers['parseGermanCurrency'](valueMatches[valueMatches.length - 1]) : NaN;
    
    if (name && name.length > 3 && !isNaN(value) && value > 0) {
      return { name, isin, value };
    }
    
    return null;
  }

  private static extractNameFromContext(context: string): string | null {
    // Remove common prefixes/suffixes and clean up
    let cleaned = context
      .replace(/Stück|Nom\.|Kurs|Price|EUR|USD|\d+,\d+|\d+\.\d+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (cleaned.length > 5 && cleaned.length < 100) {
      return cleaned;
    }
    
    return null;
  }

  private static extractValueFromContext(context: string): number {
    const matches = context.match(/([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]{1,3}(?:,[0-9]{3})*\.\d{2})/g);
    if (matches && matches.length > 0) {
      // Take the largest value found (most likely the portfolio value)
      const values = matches.map(m => GermanBankParsers['parseGermanCurrency'](m))
        .filter(v => !isNaN(v));
      return values.length > 0 ? Math.max(...values) : NaN;
    }
    
    return NaN;
  }
}

export { GermanBankParsers, EnhancedExcelParser, EnhancedPDFParser };