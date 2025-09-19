import * as fs from 'fs/promises';
import * as path from 'path';
import { Buffer } from 'buffer';
import XLSX from 'xlsx';
import pdf from 'pdf-parse';
import { detectEncoding } from 'chardet';

// Types for document processing
export interface DocumentProcessingResult {
  positions: ParsedPosition[];
  metadata: DocumentMetadata;
  warnings: string[];
  processingTime: number;
  dataQuality: DataQualityIndicators;
}

export interface ParsedPosition {
  name: string;
  isin?: string;
  value: number;
  rawData?: any; // Original data for debugging
  confidence?: number; // Confidence in parsing accuracy
}

export interface DocumentMetadata {
  fileType: DocumentType;
  encoding?: string;
  size: number;
  pageCount?: number;
  sheetNames?: string[];
  detectedFormat: DetectedFormat;
  processingStrategy: string;
}

export interface DataQualityIndicators {
  completeness: number; // 0-1 score for data completeness
  consistency: number; // 0-1 score for data consistency
  accuracy: number; // 0-1 score for parsing accuracy
  issues: DataQualityIssue[];
}

export interface DataQualityIssue {
  severity: 'low' | 'medium' | 'high';
  type: 'missing_data' | 'format_inconsistency' | 'parsing_error' | 'validation_warning';
  message: string;
  affectedRows?: number[];
}

export enum DocumentType {
  CSV = 'csv',
  EXCEL = 'excel', 
  PDF = 'pdf',
  TXT = 'txt',
  UNKNOWN = 'unknown'
}

export interface DetectedFormat {
  delimiter?: string;
  decimalSeparator: ',' | '.';
  thousandsSeparator?: ',' | '.' | ' ';
  dateFormat?: string;
  headerRow?: number;
  dataStartRow?: number;
  columnMapping: ColumnMapping;
}

export interface ColumnMapping {
  name: number | null;
  isin: number | null;
  value: number | null;
  currency?: number | null;
  percentage?: number | null;
  confidence: number; // How confident we are in this mapping
}

/**
 * Central Multi-Format Document Processor
 * Handles automatic format detection and intelligent parsing
 */
export class DocumentProcessor {
  
  constructor() {}

  /**
   * Main entry point for document processing
   */
  async processDocument(
    buffer: Buffer,
    filename: string,
    options: ProcessingOptions = {}
  ): Promise<DocumentProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Auto-detect file type
      const documentType = this.detectDocumentType(buffer, filename);
      
      // Step 2: Auto-detect encoding for text-based files
      const encoding = await this.detectEncoding(buffer, documentType);
      
      // Step 3: Choose appropriate processing strategy
      const strategy = this.selectProcessingStrategy(documentType, buffer.length, options);
      
      // Step 4: Process document using selected strategy
      const result = await this.executeProcessingStrategy(
        buffer, 
        documentType, 
        encoding, 
        strategy, 
        options
      );
      
      // Step 5: Calculate processing time
      const processingTime = Date.now() - startTime;
      
      // Step 6: Assess data quality
      const dataQuality = this.assessDataQuality(result.positions, result.metadata);
      
      return {
        positions: result.positions,
        metadata: {
          ...result.metadata,
          fileType: documentType,
          encoding,
          size: buffer.length,
          processingStrategy: strategy
        },
        warnings: result.warnings,
        processingTime,
        dataQuality
      };
      
    } catch (error) {
      console.error('Document processing failed:', error);
      throw new Error(`Document processing failed: ${error.message}`);
    }
  }

  /**
   * Intelligent document type detection
   */
  private detectDocumentType(buffer: Buffer, filename: string): DocumentType {
    const ext = path.extname(filename).toLowerCase();
    
    // Primary detection by extension
    switch (ext) {
      case '.csv': return DocumentType.CSV;
      case '.xlsx': case '.xls': return DocumentType.EXCEL;
      case '.pdf': return DocumentType.PDF;
      case '.txt': return DocumentType.TXT;
    }
    
    // Secondary detection by content analysis
    if (this.isPDFBuffer(buffer)) return DocumentType.PDF;
    if (this.isExcelBuffer(buffer)) return DocumentType.EXCEL;
    if (this.isCSVBuffer(buffer)) return DocumentType.CSV;
    
    return DocumentType.UNKNOWN;
  }

  /**
   * Encoding detection for text-based files
   */
  private async detectEncoding(buffer: Buffer, documentType: DocumentType): Promise<string | undefined> {
    if (documentType === DocumentType.PDF || documentType === DocumentType.EXCEL) {
      return undefined; // Binary formats don't need encoding detection
    }
    
    try {
      const detected = detectEncoding(buffer);
      return detected || 'utf-8';
    } catch (error) {
      console.warn('Encoding detection failed, defaulting to utf-8:', error);
      return 'utf-8';
    }
  }

  /**
   * Select optimal processing strategy based on file characteristics
   */
  private selectProcessingStrategy(
    documentType: DocumentType, 
    fileSize: number, 
    options: ProcessingOptions
  ): string {
    // For large files, use streaming/chunked processing
    if (fileSize > 50 * 1024 * 1024) { // 50MB
      return 'streaming';
    }
    
    // For PDF files with many pages, use progressive processing
    if (documentType === DocumentType.PDF && fileSize > 5 * 1024 * 1024) {
      return 'progressive_pdf';
    }
    
    // For complex Excel files, use sheet-by-sheet processing
    if (documentType === DocumentType.EXCEL && fileSize > 10 * 1024 * 1024) {
      return 'sheet_by_sheet';
    }
    
    // Default to in-memory processing for smaller files
    return 'in_memory';
  }

  /**
   * Execute the selected processing strategy
   */
  private async executeProcessingStrategy(
    buffer: Buffer,
    documentType: DocumentType,
    encoding: string | undefined,
    strategy: string,
    options: ProcessingOptions
  ): Promise<{positions: ParsedPosition[], metadata: DocumentMetadata, warnings: string[]}> {
    
    switch (documentType) {
      case DocumentType.CSV:
        return this.processCSV(buffer, encoding, strategy, options);
      case DocumentType.EXCEL:
        return this.processExcel(buffer, strategy, options);
      case DocumentType.PDF:
        return this.processPDF(buffer, strategy, options);
      case DocumentType.TXT:
        return this.processText(buffer, encoding, options);
      default:
        throw new Error(`Unsupported document type: ${documentType}`);
    }
  }

  /**
   * Enhanced CSV processing with intelligent format detection
   */
  private async processCSV(
    buffer: Buffer, 
    encoding: string, 
    strategy: string, 
    options: ProcessingOptions
  ): Promise<{positions: ParsedPosition[], metadata: DocumentMetadata, warnings: string[]}> {
    
    const content = buffer.toString(encoding);
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV muss mindestens eine Kopfzeile und eine Datenzeile enthalten');
    }

    // Auto-detect delimiter and format
    const detectedFormat = this.detectCSVFormat(lines);
    const positions: ParsedPosition[] = [];
    const warnings: string[] = [];
    
    // Validate column mapping
    if (detectedFormat.columnMapping.confidence < 0.7) {
      warnings.push('Unsichere Spaltenzuordnung erkannt. Überprüfen Sie die Ergebnisse.');
    }

    // Process data rows
    for (let i = detectedFormat.dataStartRow || 1; i < lines.length; i++) {
      try {
        const position = this.parseCSVRow(lines[i], detectedFormat, i);
        if (position) {
          positions.push(position);
        }
      } catch (error) {
        warnings.push(`Fehler in Zeile ${i + 1}: ${error.message}`);
      }
    }

    return {
      positions,
      metadata: {
        detectedFormat,
        sheetNames: ['CSV Data']
      } as DocumentMetadata,
      warnings
    };
  }

  /**
   * Enhanced Excel processing with multi-sheet support
   */
  private async processExcel(
    buffer: Buffer, 
    strategy: string, 
    options: ProcessingOptions
  ): Promise<{positions: ParsedPosition[], metadata: DocumentMetadata, warnings: string[]}> {
    
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const positions: ParsedPosition[] = [];
    const warnings: string[] = [];
    const processedSheets: string[] = [];

    // Process each worksheet
    for (const sheetName of workbook.SheetNames) {
      try {
        const worksheet = workbook.Sheets[sheetName];
        const sheetPositions = this.processExcelSheet(worksheet, sheetName);
        
        if (sheetPositions.length > 0) {
          positions.push(...sheetPositions);
          processedSheets.push(sheetName);
        }
      } catch (error) {
        warnings.push(`Fehler in Arbeitsblatt '${sheetName}': ${error.message}`);
      }
    }

    if (positions.length === 0 && workbook.SheetNames.length > 0) {
      warnings.push('Keine gültigen Portfolio-Daten in Excel-Datei gefunden');
    }

    return {
      positions,
      metadata: {
        sheetNames: workbook.SheetNames,
        detectedFormat: { decimalSeparator: '.', columnMapping: { name: null, isin: null, value: null, confidence: 0 } }
      } as DocumentMetadata,
      warnings
    };
  }

  /**
   * Enhanced PDF processing with layout detection
   */
  private async processPDF(
    buffer: Buffer, 
    strategy: string, 
    options: ProcessingOptions
  ): Promise<{positions: ParsedPosition[], metadata: DocumentMetadata, warnings: string[]}> {
    
    try {
      const pdfData = await pdf(buffer);
      const positions: ParsedPosition[] = [];
      const warnings: string[] = [];

      // Use pattern-based extraction for structured PDFs
      const extractedPositions = this.extractPositionsFromPDFText(pdfData.text);
      positions.push(...extractedPositions);

      if (positions.length === 0) {
        warnings.push('Keine erkennbaren Portfolio-Positionen in PDF gefunden');
      }

      return {
        positions,
        metadata: {
          pageCount: pdfData.numpages,
          detectedFormat: { decimalSeparator: ',', columnMapping: { name: null, isin: null, value: null, confidence: 0.5 } }
        } as DocumentMetadata,
        warnings
      };
    } catch (error) {
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  /**
   * Text file processing
   */
  private async processText(
    buffer: Buffer, 
    encoding: string, 
    options: ProcessingOptions
  ): Promise<{positions: ParsedPosition[], metadata: DocumentMetadata, warnings: string[]}> {
    
    const content = buffer.toString(encoding);
    
    // Try to detect if it's actually a CSV with different extension
    if (this.looksLikeCSV(content)) {
      return this.processCSV(buffer, encoding, 'in_memory', options);
    }

    // Otherwise treat as structured text
    const positions = this.extractPositionsFromText(content);
    
    return {
      positions,
      metadata: {
        detectedFormat: { decimalSeparator: ',', columnMapping: { name: null, isin: null, value: null, confidence: 0.3 } }
      } as DocumentMetadata,
      warnings: positions.length === 0 ? ['Keine erkennbaren Portfolio-Positionen gefunden'] : []
    };
  }

  // Helper methods for format detection and parsing
  private detectCSVFormat(lines: string[]): DetectedFormat {
    const headerLine = lines[0];
    
    // Detect delimiter
    const delimiters = [';', ',', '\t', '|'];
    let bestDelimiter = ';';
    let maxColumns = 0;
    
    for (const delimiter of delimiters) {
      const columns = headerLine.split(delimiter).length;
      if (columns > maxColumns) {
        maxColumns = columns;
        bestDelimiter = delimiter;
      }
    }

    // Parse headers
    const headers = headerLine.split(bestDelimiter).map(h => h.trim().toLowerCase());
    
    // Map columns
    const columnMapping = this.mapCSVColumns(headers);
    
    // Detect number format by examining sample data
    const numberFormat = this.detectNumberFormat(lines.slice(1, 10), bestDelimiter, columnMapping.value);

    return {
      delimiter: bestDelimiter,
      decimalSeparator: numberFormat.decimalSeparator,
      thousandsSeparator: numberFormat.thousandsSeparator,
      headerRow: 0,
      dataStartRow: 1,
      columnMapping
    };
  }

  private mapCSVColumns(headers: string[]): ColumnMapping {
    let nameIndex = -1;
    let isinIndex = -1;
    let valueIndex = -1;
    let confidence = 0;

    // Enhanced column mapping with multiple patterns
    const namePatterns = [
      'name', 'bezeichnung', 'titel', 'instrument', 'security', 'wertpapier', 
      'fond', 'etf', 'aktie', 'position', 'description'
    ];
    const isinPatterns = [
      'isin', 'wkn', 'symbol', 'code', 'id', 'identifier', 'kennung'
    ];
    const valuePatterns = [
      'wert', 'betrag', 'value', 'amount', 'marktwert', 'market value', 
      'kurswert', 'volumen', 'volume', 'sum', 'summe', 'total'
    ];

    // Find best matches
    nameIndex = this.findBestColumnMatch(headers, namePatterns);
    isinIndex = this.findBestColumnMatch(headers, isinPatterns);  
    valueIndex = this.findBestColumnMatch(headers, valuePatterns);

    // Calculate confidence based on matches found
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

  private findBestColumnMatch(headers: string[], patterns: string[]): number {
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

  private detectNumberFormat(sampleLines: string[], delimiter: string, valueColumnIndex: number | null): {decimalSeparator: ',' | '.', thousandsSeparator?: string} {
    if (valueColumnIndex === null) {
      return { decimalSeparator: ',' }; // Default German format
    }

    const sampleValues: string[] = [];
    for (const line of sampleLines) {
      const columns = line.split(delimiter);
      if (columns[valueColumnIndex]) {
        const cleanValue = columns[valueColumnIndex].trim().replace(/[€$£¥\s]/g, '');
        sampleValues.push(cleanValue);
      }
    }

    // Analyze patterns
    const hasCommaDecimal = sampleValues.some(v => /^\d{1,3}(\.\d{3})*,\d+$/.test(v));
    const hasDotDecimal = sampleValues.some(v => /^\d{1,3}(,\d{3})*\.\d+$/.test(v));
    const hasSimpleComma = sampleValues.some(v => /^\d+,\d+$/.test(v));
    const hasSimpleDot = sampleValues.some(v => /^\d+\.\d+$/.test(v));

    // German format detection
    if (hasCommaDecimal || (hasSimpleComma && !hasDotDecimal)) {
      return { decimalSeparator: ',', thousandsSeparator: '.' };
    }
    
    // English format detection  
    if (hasDotDecimal || hasSimpleDot) {
      return { decimalSeparator: '.', thousandsSeparator: ',' };
    }

    // Default to German format
    return { decimalSeparator: ',' };
  }

  private parseCSVRow(line: string, format: DetectedFormat, rowIndex: number): ParsedPosition | null {
    const columns = line.split(format.delimiter || ';').map(col => col.trim().replace(/^"|"$/g, ''));
    
    if (!format.columnMapping.name || !format.columnMapping.value) {
      return null;
    }

    const name = columns[format.columnMapping.name];
    const isin = format.columnMapping.isin !== null ? columns[format.columnMapping.isin] : undefined;
    const valueStr = columns[format.columnMapping.value];

    if (!name || !valueStr) {
      return null;
    }

    // Parse value according to detected format
    const value = this.parseNumber(valueStr, format.decimalSeparator, format.thousandsSeparator);
    
    if (isNaN(value) || value <= 0) {
      return null;
    }

    return {
      name: name.trim(),
      isin: isin ? isin.trim() : undefined,
      value,
      confidence: format.columnMapping.confidence,
      rawData: { rowIndex, originalLine: line }
    };
  }

  private parseNumber(valueStr: string, decimalSeparator: ',' | '.', thousandsSeparator?: string): number {
    // Remove currency symbols and whitespace
    let cleaned = valueStr.replace(/[€$£¥\s]/g, '');
    
    if (decimalSeparator === ',') {
      // German format: 1.234.567,89
      if (thousandsSeparator === '.') {
        cleaned = cleaned.replace(/\./g, ''); // Remove thousands separators
      }
      cleaned = cleaned.replace(',', '.'); // Convert decimal separator
    } else {
      // English format: 1,234,567.89
      if (thousandsSeparator === ',') {
        cleaned = cleaned.replace(/,/g, ''); // Remove thousands separators  
      }
    }

    return parseFloat(cleaned);
  }

  private processExcelSheet(worksheet: XLSX.WorkSheet, sheetName: string): ParsedPosition[] {
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    
    if (jsonData.length < 2) {
      return [];
    }

    // Find header row and map columns
    const headerRowIndex = this.findExcelHeaderRow(jsonData);
    if (headerRowIndex === -1) {
      return [];
    }

    const headers = jsonData[headerRowIndex].map((h: any) => String(h).toLowerCase().trim());
    const columnMapping = this.mapCSVColumns(headers);
    
    if (!columnMapping.name || !columnMapping.value) {
      return [];
    }

    const positions: ParsedPosition[] = [];
    
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const name = String(row[columnMapping.name] || '').trim();
      const isin = columnMapping.isin !== null ? String(row[columnMapping.isin] || '').trim() : undefined;
      const value = this.parseExcelValue(row[columnMapping.value]);

      if (name && !isNaN(value) && value > 0) {
        positions.push({
          name,
          isin: isin || undefined,
          value,
          confidence: columnMapping.confidence,
          rawData: { sheetName, rowIndex: i }
        });
      }
    }

    return positions;
  }

  private findExcelHeaderRow(data: any[][]): number {
    // Look for row with the most non-empty string values (likely headers)
    let bestRowIndex = -1;
    let maxStringColumns = 0;

    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      const stringColumns = row.filter(cell => 
        typeof cell === 'string' && cell.trim().length > 0
      ).length;
      
      if (stringColumns > maxStringColumns && stringColumns >= 2) {
        maxStringColumns = stringColumns;
        bestRowIndex = i;
      }
    }

    return bestRowIndex;
  }

  private parseExcelValue(value: any): number {
    if (typeof value === 'number') {
      return value;
    }
    
    if (typeof value === 'string') {
      return this.parseNumber(value, ',', '.');
    }

    return NaN;
  }

  private extractPositionsFromPDFText(text: string): ParsedPosition[] {
    const positions: ParsedPosition[] = [];
    
    // Enhanced PDF pattern matching
    const patterns = [
      // Pattern for German depot statements: Name ISIN Value
      /^(.+?)\s+([A-Z]{2}[A-Z0-9]{10})\s+(?:EUR\s+)?([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})$/gm,
      
      // Pattern for international formats: Name ISIN Value  
      /^(.+?)\s+([A-Z]{2}[A-Z0-9]{10})\s+([0-9]{1,3}(?:,[0-9]{3})*\.\d{2})$/gm,
      
      // Fallback pattern without ISIN
      /^(.+?)\s+(?:EUR\s+)?([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})$/gm
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1].trim();
        const isin = match[2]?.match(/^[A-Z]{2}[A-Z0-9]{10}$/) ? match[2] : undefined;
        const valueStr = isin ? match[3] : match[2];
        
        const value = this.parseNumber(valueStr, ',', '.');
        
        if (name && !isNaN(value) && value > 0) {
          positions.push({
            name,
            isin,
            value,
            confidence: isin ? 0.8 : 0.6,
            rawData: { extractedText: match[0] }
          });
        }
      }
    }

    return positions;
  }

  private extractPositionsFromText(text: string): ParsedPosition[] {
    // Simple text extraction - can be enhanced based on specific text formats
    return this.extractPositionsFromPDFText(text);
  }

  private assessDataQuality(positions: ParsedPosition[], metadata: DocumentMetadata): DataQualityIndicators {
    const issues: DataQualityIssue[] = [];
    
    // Check completeness
    const totalPositions = positions.length;
    const positionsWithISIN = positions.filter(p => p.isin).length;
    const completeness = totalPositions > 0 ? positionsWithISIN / totalPositions : 0;
    
    // Check consistency 
    const avgConfidence = positions.reduce((sum, p) => sum + (p.confidence || 0), 0) / Math.max(totalPositions, 1);
    const consistency = avgConfidence;

    // Check accuracy based on parsing confidence
    const accuracy = metadata.detectedFormat.columnMapping.confidence;

    // Generate issues
    if (completeness < 0.5) {
      issues.push({
        severity: 'medium',
        type: 'missing_data',
        message: `${Math.round((1 - completeness) * 100)}% der Positionen haben keine ISIN`
      });
    }

    if (accuracy < 0.7) {
      issues.push({
        severity: 'high',
        type: 'format_inconsistency', 
        message: 'Unsichere Spaltenzuordnung erkannt'
      });
    }

    return {
      completeness,
      consistency,
      accuracy,
      issues
    };
  }

  // Content type detection helpers
  private isPDFBuffer(buffer: Buffer): boolean {
    return buffer.length > 4 && 
           buffer[0] === 0x25 && buffer[1] === 0x50 && 
           buffer[2] === 0x44 && buffer[3] === 0x46; // %PDF
  }

  private isExcelBuffer(buffer: Buffer): boolean {
    // Excel files start with PK (ZIP format) or specific OLE signatures
    return (buffer.length > 2 && buffer[0] === 0x50 && buffer[1] === 0x4B) || // XLSX (ZIP)
           (buffer.length > 8 && buffer[0] === 0xD0 && buffer[1] === 0xCF); // XLS (OLE)
  }

  private isCSVBuffer(buffer: Buffer): boolean {
    try {
      const sample = buffer.slice(0, 1024).toString('utf-8');
      return this.looksLikeCSV(sample);
    } catch {
      return false;
    }
  }

  private looksLikeCSV(content: string): boolean {
    const lines = content.split(/\r?\n/).slice(0, 5);
    if (lines.length < 2) return false;
    
    const delimiters = [';', ',', '\t'];
    for (const delimiter of delimiters) {
      const firstLineCount = (lines[0].match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
      if (firstLineCount > 0) {
        const consistentDelimiters = lines.slice(1).every(line => {
          const count = (line.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
          return Math.abs(count - firstLineCount) <= 1; // Allow slight variation
        });
        if (consistentDelimiters) return true;
      }
    }
    
    return false;
  }
}

export interface ProcessingOptions {
  preferredDelimiter?: string;
  preferredEncoding?: string;
  maxFileSize?: number;
  enableProgressTracking?: boolean;
  customColumnMapping?: Partial<ColumnMapping>;
}

export const documentProcessor = new DocumentProcessor();