import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-temp";
import { portfolioSecurity } from "./services/portfolio-security";
import { investmentUniverseService } from "./services/investment-universe";
import { claudeService } from "./services/claude";
// ❌ REMOVED: PortfolioMathematics import - only Claude AI calculations allowed
import { type RiskMetrics } from "./utils/portfolio-mathematics";
import { 
  insertPortfolioSchema, 
  insertPortfolioPositionSchema,
  SystemHealthResponse,
  ValidationSummaryResponse,
  PortfolioValidationResponse,
  ErrorStatisticsResponse,
  ApiResponse,
  ErrorResponse,
  portfolioChangeRequestSchema,
  scenarioAnalysisRequestSchema,
  PortfolioChangeRequest
} from "@shared/schema";
import multer from 'multer';
import XLSX from 'xlsx';
import { z } from "zod";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv') || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls') || file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, Excel, and PDF files are allowed.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

interface ParsedPosition {
  name: string;
  isin?: string;
  value: number;
}

function parseCSV(buffer: Buffer): ParsedPosition[] {
  const content = buffer.toString('utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV muss mindestens eine Kopfzeile und eine Datenzeile enthalten');
  }
  
  const headers = lines[0].split(/[,;]/).map(h => h.trim().toLowerCase());
  const positions: ParsedPosition[] = [];
  
  // Find column indices
  const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('bezeichnung') || h.includes('titel'));
  const isinIndex = headers.findIndex(h => h.includes('isin') || h.includes('wkn'));
  const valueIndex = headers.findIndex(h => h.includes('wert') || h.includes('betrag') || h.includes('value') || h.includes('amount'));
  
  if (nameIndex === -1 || valueIndex === -1) {
    throw new Error('CSV muss Spalten für Name/Bezeichnung und Wert/Betrag enthalten');
  }
  
  // Detect decimal separator by checking all value entries
  let useCommaAsDecimal = false;
  const sampleValues: string[] = [];
  for (let i = 1; i < Math.min(lines.length, 10); i++) {
    const values = lines[i].split(/[,;]/).map(v => v.trim());
    if (values[valueIndex]) {
      sampleValues.push(values[valueIndex]);
    }
  }
  
  // Check if values contain comma as decimal (e.g., "1.234,56" or "123,45")
  const germanPattern = sampleValues.some(v => /^\d{1,3}(\.\d{3})*,\d+/.test(v.replace(/[€$£¥\s]/g, '')));
  const commaDecimalPattern = sampleValues.some(v => /^\d+,\d+$/.test(v.replace(/[€$£¥\s]/g, '')));
  const dotDecimalPattern = sampleValues.some(v => /^\d+\.\d+$/.test(v.replace(/[€$£¥\s]/g, '')));
  
  if (germanPattern || (commaDecimalPattern && !dotDecimalPattern)) {
    useCommaAsDecimal = true;
    console.log('Detected German number format (comma as decimal separator)');
  } else {
    console.log('Detected English number format (dot as decimal separator)');
  }
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/[,;]/).map(v => v.trim());
    
    if (values.length > Math.max(nameIndex, valueIndex, isinIndex)) {
      const name = values[nameIndex]?.replace(/"/g, '');
      const isin = isinIndex !== -1 ? values[isinIndex]?.replace(/"/g, '') : undefined;
      let valueStr = values[valueIndex]?.replace(/[€$£¥\s]/g, '');
      
      if (name && valueStr) {
        // Convert to standard format based on detected separator
        if (useCommaAsDecimal) {
          // German format: 1.234,56 -> 1234.56
          valueStr = valueStr.replace(/\./g, '').replace(',', '.');
        } else {
          // English format: 1,234.56 -> 1234.56
          valueStr = valueStr.replace(/,/g, '');
        }
        
        const value = parseFloat(valueStr);
        if (!isNaN(value) && value > 0) {
          positions.push({ name, isin: isin || undefined, value });
        }
      }
    }
  }
  
  return positions;
}

function parseExcel(buffer: Buffer): ParsedPosition[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
  
  if (jsonData.length < 2) {
    throw new Error('Excel-Datei muss mindestens eine Kopfzeile und eine Datenzeile enthalten');
  }
  
  const headers = jsonData[0].map((h: any) => String(h).trim().toLowerCase());
  const positions: ParsedPosition[] = [];
  
  // Find column indices
  const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('bezeichnung') || h.includes('titel'));
  const isinIndex = headers.findIndex(h => h.includes('isin') || h.includes('wkn'));
  const valueIndex = headers.findIndex(h => h.includes('wert') || h.includes('betrag') || h.includes('value') || h.includes('amount'));
  
  if (nameIndex === -1 || valueIndex === -1) {
    throw new Error('Excel-Datei muss Spalten für Name/Bezeichnung und Wert/Betrag enthalten');
  }
  
  // Detect decimal separator from string values
  let useCommaAsDecimal = false;
  const sampleValues: string[] = [];
  for (let i = 1; i < Math.min(jsonData.length, 10); i++) {
    const row = jsonData[i];
    if (row && typeof row[valueIndex] === 'string') {
      sampleValues.push(row[valueIndex]);
    }
  }
  
  if (sampleValues.length > 0) {
    const germanPattern = sampleValues.some(v => /^\d{1,3}(\.\d{3})*,\d+/.test(v.replace(/[€$£¥\s]/g, '')));
    const commaDecimalPattern = sampleValues.some(v => /^\d+,\d+$/.test(v.replace(/[€$£¥\s]/g, '')));
    const dotDecimalPattern = sampleValues.some(v => /^\d+\.\d+$/.test(v.replace(/[€$£¥\s]/g, '')));
    
    if (germanPattern || (commaDecimalPattern && !dotDecimalPattern)) {
      useCommaAsDecimal = true;
      console.log('Excel: Detected German number format (comma as decimal separator)');
    } else {
      console.log('Excel: Detected English number format (dot as decimal separator)');
    }
  }
  
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    
    if (row && row.length > Math.max(nameIndex, valueIndex, isinIndex)) {
      const name = String(row[nameIndex] || '').trim();
      const isin = isinIndex !== -1 ? String(row[isinIndex] || '').trim() : undefined;
      
      let value: number;
      if (typeof row[valueIndex] === 'number') {
        value = row[valueIndex];
      } else {
        let valueStr = String(row[valueIndex] || '0').replace(/[€$£¥\s]/g, '');
        
        // Convert to standard format based on detected separator
        if (useCommaAsDecimal) {
          // German format: 1.234,56 -> 1234.56
          valueStr = valueStr.replace(/\./g, '').replace(',', '.');
        } else {
          // English format: 1,234.56 -> 1234.56
          valueStr = valueStr.replace(/,/g, '');
        }
        
        value = parseFloat(valueStr);
      }
      
      if (name && !isNaN(value) && value > 0) {
        positions.push({ name, isin: isin || undefined, value });
      }
    }
  }
  
  return positions;
}

// Parse PDF for preview - lightweight, no API calls
async function parsePDFPreview(buffer: Buffer): Promise<ParsedPosition[]> {
  let text = '';
  
  try {
    // Dynamic import for ES module compatibility
    const pdfParse = (await import('pdf-parse')).default;
    
    // Parse PDF with buffer directly, avoiding test file issues
    const data = await pdfParse(buffer, {
      // Disable test mode to avoid looking for test files
      max: 0
    });
    
    text = data.text || '';
    console.log('Extracted PDF text length for preview:', text.length);
    
    if (!text || text.length < 10) {
      throw new Error('PDF enthält keinen extrahierbaren Text oder ist beschädigt');
    }
  } catch (error) {
    console.error('Error parsing PDF preview:', error);
    throw new Error(`PDF konnte nicht verarbeitet werden: ${(error as Error).message}`);
  }
  
  // For preview: Return raw text only, no Claude API calls
  console.log('PDF preview: returning raw text for client-side preview');
  const positions: ParsedPosition[] = [{
    name: '__PDF_RAW_TEXT__',
    isin: undefined,
    value: 0
  }];
  
  // Store the raw text for preview display
  (positions[0] as any).rawText = text.substring(0, 5000); // Limit to 5KB for preview
  
  return positions;
}

// Parse PDF for upload - full analysis with API calls
async function parsePDF(buffer: Buffer): Promise<ParsedPosition[]> {
  let text = '';
  
  try {
    // Dynamic import for ES module compatibility
    const pdfParse = (await import('pdf-parse')).default;
    
    // Parse PDF with buffer directly, avoiding test file issues
    const data = await pdfParse(buffer, {
      // Disable test mode to avoid looking for test files
      max: 0
    });
    
    text = data.text || '';
    console.log('Extracted PDF text length:', text.length);
    console.log('PDF text preview (first 500 chars):', text.substring(0, 500));
    
    if (!text || text.length < 10) {
      throw new Error('PDF enthält keinen extrahierbaren Text oder ist beschädigt');
    }
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error(`PDF konnte nicht verarbeitet werden: ${(error as Error).message}`);
  }
  
  try {
    // Enhanced portfolio structure analysis using unified Claude service
    console.log('Starting enhanced PDF portfolio structure analysis...');
    const analysisResults = await claudeService.extractPortfolioStructureFromPDF(text);
    
    // Convert analysis results to ParsedPosition format
    const positions: ParsedPosition[] = analysisResults.map((result: any) => ({
      name: result.name,
      isin: result.isin,
      value: result.value || 0
    }));
    
    // Validate that we have valid positions with explicit values
    if (positions.length === 0) {
      throw new Error('Keine Portfolio-Positionen im PDF erkannt. Das Dokument könnte ein ungeeignetes Format haben.');
    }
    
    const invalidPositions = positions.filter(pos => !pos.value || pos.value <= 0);
    if (invalidPositions.length > 0) {
      throw new Error(`${invalidPositions.length} Position(en) haben keine gültigen Werte. Alle Positionen müssen explizite Werte für genaue Berechnungen haben.`);
    }
    
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
    console.log(`Enhanced PDF analysis completed: ${positions.length} positions, total value: €${totalValue.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`);
    
    return positions;
    
  } catch (analysisError) {
    console.error('Enhanced PDF analysis failed:', analysisError);
    
    // Fallback to raw text method for legacy compatibility
    console.log('Falling back to raw text extraction method...');
    const positions: ParsedPosition[] = [{
      name: '__PDF_RAW_TEXT__',
      isin: undefined,
      value: 0
    }];
    
    // Store the raw text for Claude to parse
    (positions[0] as any).rawText = text;
    
    return positions;
  }
}

// ❌ REMOVED: calculatePortfolioRiskMetrics function 
// All risk metrics must come from Claude AI only

async function analyzePortfolioInPhases(portfolioId: string, positions: ParsedPosition[]) {
  try {
    // Create portfolio snapshot for initial state using storage
    const snapshot = {
      portfolioId,
      snapshotType: 'initial',
      positions,
      createdAt: new Date().toISOString(),
      analysisResults: null
    };
    await storage.createPortfolioSnapshot(snapshot);
    console.log(`📸 Created initial snapshot for portfolio ${portfolioId}`);
    
    // Create analysis phases
    const phases = [
      "Phase 0: Instrumentenidentifikation",
      "Phase 1: Portfolio-Grundlagen-Analyse", 
      "Phase 2: Asset-Allokations-Aufschlüsselung",
      "Phase 3: Geografische Allokations-Analyse",
      "Phase 4: Währungsexposure-Analyse"
    ];
    
    for (let i = 0; i < phases.length; i++) {
      await storage.createAnalysisPhase({
        portfolioId,
        phaseNumber: i,
        phaseName: phases[i],
        status: "pending"
      });
    }

    // Update portfolio status
    await storage.updatePortfolio(portfolioId, {
      analysisStatus: "analyzing",
      analysisProgress: 0,
      currentPhase: phases[0]
    });

    // Phase 0: Instrument identification with Claude
    const phase0 = await storage.getAnalysisPhases(portfolioId);
    const currentPhase = phase0[0];
    
    await storage.updateAnalysisPhase(currentPhase.id, {
      status: "running",
      startedAt: new Date().toISOString()
    });
    
    await storage.updatePortfolio(portfolioId, {
      analysisProgress: 10,
      currentPhase: phases[0]
    });

    // Ensure positions are saved to storage before orchestrated analysis
    // First, check if positions already exist to avoid duplicates
    const existingPositions = await storage.getPortfolioPositions(portfolioId);
    const existingNames = new Set(existingPositions.map(p => p.name.toLowerCase()));
    
    for (const position of positions) {
      // Skip if position already exists (case-insensitive check)
      if (existingNames.has(position.name.toLowerCase())) {
        console.log(`⚠️ Skipping duplicate position: ${position.name}`);
        continue;
      }
      
      // Minimaler Hinweis für Claude - keine eigene Klassifikation (CLAUDE.md konform)
      let instrumentType = position.instrumentType || null;
      // Claude wird die finale Klassifikation durchführen
      
      await storage.createPortfolioPosition({
        portfolioId,
        name: position.name,
        isin: position.isin || null,
        value: position.value,
        instrumentType: instrumentType
      });
      
      existingNames.add(position.name.toLowerCase());
    }
    
    // Use orchestrated portfolio analysis for comprehensive look-through analysis
    const orchestrationResult = await claudeService.orchestratePortfolioAnalysis(
      portfolioId, 
      ['look_through', 'risk_metrics']
    );
    
    // Extract instrument analysis with better fallback logic
    let instrumentAnalysis;
    
    // Try to use fund analysis from lookThrough
    if (orchestrationResult.results.lookThrough?.fundAnalysis?.length > 0) {
      instrumentAnalysis = orchestrationResult.results.lookThrough.fundAnalysis.map((fund: any) => {
        // Claude hat bereits die vollständige Klassifikation durchgeführt
        // Wir übernehmen die Ergebnisse ohne eigene Logik (CLAUDE.md konform)
        return {
          name: fund.fundName,
          isin: fund.isin,
          type: fund.type || 'Fund',
          assetClass: fund.assetClass || 'Sonstiges',
          geography: fund.geography || 'Unbekannt',
          currency: fund.currency || 'EUR',
          sector: fund.sector
        };
      });
    } else {
      // Create basic instrument analysis from positions - let Claude do the classification
      console.log('⚠️ No fund analysis available, creating basic instrument analysis from positions');
      console.log('ℹ️ Classification will be done by Claude AI according to CLAUDE.md requirements');
      
      // CLAUDE.md konform: Keine eigene Klassifikationslogik!
      // Claude AI übernimmt die vollständige Analyse gemäß claudeSAA.md
      instrumentAnalysis = positions.map(pos => {
        const nameLower = pos.name.toLowerCase();
        
        // Minimale Cash-Markierung als Hinweis für Claude
        // Claude trifft die finale Entscheidung
        let instrumentHint = 'Unknown';
        if (nameLower === 'euro' || nameLower === 'eur' ||
            nameLower.includes('devisenkonto') ||
            nameLower.includes('kontokorrent')) {
          instrumentHint = 'Cash_Hint'; // Nur als Hinweis, keine finale Klassifikation
        }
        
        return {
          name: pos.name,
          isin: pos.isin,
          type: instrumentHint,
          assetClass: 'Pending_Claude_Analysis', // Claude wird dies bestimmen
          geography: 'Pending_Claude_Analysis', // Claude wird dies bestimmen  
          currency: 'EUR', // Standard-Annahme
          sector: null
        };
      });
    }
    
    console.log(`📊 Instrument analysis created for ${instrumentAnalysis.length} positions`);
    // Extract allocations from look-through analysis results (true underlying exposure)
    const lookThroughResults = orchestrationResult.results.lookThrough;
    const assetAllocation = lookThroughResults?.assetAllocation || {};
    const geographicAllocation = lookThroughResults?.geoAllocation || {};
    const currencyAllocation = lookThroughResults?.currencyAllocation || {}; // ✅ This should now be populated
    
    // Enhanced debug logging
    console.log('🔍 Look-through Analysis Results:', {
      hasLookThrough: !!lookThroughResults,
      assetAllocation: assetAllocation,
      assetAllocKeys: Object.keys(assetAllocation).length,
      geoAllocation: geographicAllocation,
      geoAllocKeys: Object.keys(geographicAllocation).length,
      currencyAllocation: currencyAllocation,
      currencyAllocKeys: Object.keys(currencyAllocation).length,
      orchestrationSuccess: orchestrationResult.status,
      errors: orchestrationResult.errors || []
    });

    // Debug: Log detailed allocation data
    console.log('📊 Detailed Allocation Data:', {
      assetAllocationDetails: Object.entries(assetAllocation).map(([category, value]) => ({
        category,
        value,
        type: typeof value
      })),
      geoAllocationDetails: Object.entries(geographicAllocation).map(([region, value]) => ({
        region,
        value,
        type: typeof value
      })),
      currencyAllocationDetails: Object.entries(currencyAllocation).map(([currency, value]) => ({
        currency,
        value,
        type: typeof value
      }))
    });
    
    // Helper function to map geography to German standard categories
    const mapGeographicCategory = (originalGeography: string): string => {
      const geography = originalGeography?.toLowerCase() || '';
      
      // USA/Nordamerika
      if (geography.includes('usa') || geography.includes('us ') || 
          geography.includes('america') || geography.includes('nordamerika') ||
          geography.includes('north america') || geography.includes('vereinigte staaten') ||
          geography.includes('kanada') || geography.includes('canada')) {
        return 'USA/Nordamerika';
      }
      
      // Europa (inkl. UK) - includes Deutschland
      if (geography.includes('deutschland') || geography.includes('germany') ||
          geography.includes('europa') || geography.includes('europe') ||
          geography.includes('uk') || geography.includes('united kingdom') ||
          geography.includes('britain') || geography.includes('schweiz') ||
          geography.includes('switzerland') || geography.includes('frankreich') ||
          geography.includes('france') || geography.includes('italien') || geography.includes('italy') ||
          geography.includes('spain') || geography.includes('spanien') ||
          geography.includes('netherlands') || geography.includes('niederlande') ||
          geography.includes('österreich') || geography.includes('austria') ||
          geography.includes('belgien') || geography.includes('belgium') ||
          geography.includes('portugal') || geography.includes('norwegen') || geography.includes('norway') ||
          geography.includes('schweden') || geography.includes('sweden') ||
          geography.includes('dänemark') || geography.includes('denmark') ||
          geography.includes('finnland') || geography.includes('finland')) {
        return 'Europa (inkl. UK)';
      }
      
      // Emerging Markets
      if (geography.includes('emerging') || geography.includes('em ') ||
          geography.includes('schwellenländer') || geography.includes('china') ||
          geography.includes('indien') || geography.includes('india') ||
          geography.includes('brasilien') || geography.includes('brazil') ||
          geography.includes('russland') || geography.includes('russia') ||
          geography.includes('südafrika') || geography.includes('south africa') ||
          geography.includes('mexiko') || geography.includes('mexico') ||
          geography.includes('türkei') || geography.includes('turkey') ||
          geography.includes('thailand') || geography.includes('malaysia') ||
          geography.includes('indonesien') || geography.includes('indonesia') ||
          geography.includes('taiwan') || geography.includes('vietnam')) {
        return 'Emerging Markets';
      }
      
      // Asien-Pazifik (entwickelte Märkte)
      if (geography.includes('asien') || geography.includes('asia') ||
          geography.includes('pazifik') || geography.includes('pacific') ||
          geography.includes('japan') || geography.includes('korea') ||
          geography.includes('südkorea') || geography.includes('south korea') ||
          geography.includes('australien') || geography.includes('australia') ||
          geography.includes('neuseeland') || geography.includes('new zealand') ||
          geography.includes('singapur') || geography.includes('singapore') ||
          geography.includes('hongkong') || geography.includes('hong kong')) {
        return 'Asien-Pazifik';
      }
      
      // Lateinamerika
      if (geography.includes('lateinamerika') || geography.includes('latin america') ||
          geography.includes('südamerika') || geography.includes('south america') ||
          geography.includes('mittelamerika') || geography.includes('central america') ||
          geography.includes('argentinien') || geography.includes('argentina') ||
          geography.includes('chile') || geography.includes('peru') ||
          geography.includes('kolumbien') || geography.includes('colombia')) {
        return 'Lateinamerika';
      }
      
      // Afrika & Naher Osten
      if (geography.includes('afrika') || geography.includes('africa') ||
          geography.includes('naher osten') || geography.includes('middle east') ||
          geography.includes('israel') || geography.includes('saudi') ||
          geography.includes('vae') || geography.includes('uae') || geography.includes('dubai') ||
          geography.includes('ägypten') || geography.includes('egypt')) {
        return 'Afrika & Naher Osten';
      }
      
      // Global/Diversifiziert
      if (geography.includes('global') || geography.includes('world') ||
          geography.includes('international') || geography.includes('weltweit') ||
          geography.includes('diversified') || geography.includes('mixed') ||
          geography.includes('multi') || geography.includes('various')) {
        return 'Global/Diversifiziert';
      }
      
      // Debug: Log unknown geography for analysis
      console.log(`🌍 Unknown geography mapped to Global: "${originalGeography}"`);
      
      // Default fallback - changed from Europa to Global
      return 'Global/Diversifiziert'; // More neutral default for unknown regions
    };

    // ❌ REMOVED: All fallback allocation logic
    // Only use data from Claude AI, no fallbacks
    
    console.log('📈 Claude AI allocation data check:', { 
      hasLookThrough: !!lookThroughResults, 
      assetKeys: Object.keys(assetAllocation).length, 
      geoKeys: Object.keys(geographicAllocation).length,
      currencyKeys: Object.keys(currencyAllocation).length 
    });
    
    if (!lookThroughResults || Object.keys(assetAllocation).length === 0) {
      console.warn('⚠️ No allocation data from Claude AI - analysis may be incomplete');
    }

    // Sanitize and map geographic allocation to German standard categories even if look-through data exists
    const standardGeographicAllocation: Record<string, number> = {};
    Object.entries(geographicAllocation).forEach(([region, value]) => {
      const mappedRegion = mapGeographicCategory(region);
      
      // Handle malformed string values from Claude service 
      let numericValue: number = 0;
      if (typeof value === 'string') {
        // If it's a concatenated string like "050000.0045000.00...", try to extract the first valid number
        const firstNumberMatch = value.match(/^(\d+(?:\.\d+)?)/);
        if (firstNumberMatch) {
          numericValue = parseFloat(firstNumberMatch[1]);
        } else {
          console.warn(`Could not parse geographic allocation value: ${value} for region: ${region}`);
          numericValue = 0;
        }
      } else if (typeof value === 'number') {
        numericValue = value;
      }
      
      standardGeographicAllocation[mappedRegion] = (standardGeographicAllocation[mappedRegion] || 0) + numericValue;
    });
    
    // Replace with mapped categories
    Object.keys(geographicAllocation).forEach(key => delete geographicAllocation[key]);
    Object.assign(geographicAllocation, standardGeographicAllocation);

    // Calculate total value from positions
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);

    const analysisResult = {
      status: 'completed',
      instrumentCount: instrumentAnalysis.length,
      totalValue: totalValue,
      analysisType: 'orchestrated_look_through',
      timestamp: new Date().toISOString(),
      assetAllocation,
      geographicAllocation,
      currencyAllocation,
      riskMetrics: orchestrationResult.results.riskMetrics || null, // ❌ REMOVED: Non-Claude calculation
      rawAnalysis: orchestrationResult.results,
      lookThroughValidation: {
        isValid: lookThroughResults?.overallQualityScore ? lookThroughResults.overallQualityScore > 70 : null,
        overallScore: lookThroughResults?.overallQualityScore || null, // ❌ REMOVED: Mock score 85
        validationResults: {
          totalValueDifference: 0, 
          decompositionAccuracy: lookThroughResults?.overallQualityScore || null, // ❌ REMOVED: Mock score 85
          doubleCounting: {
            detected: false,
            affectedAssets: [],
            overlapValue: 0
          },
          currencyExposure: {
            isConsistent: lookThroughResults?.overallQualityScore ? lookThroughResults.overallQualityScore > 70 : null, // ❌ REMOVED: Mock true
            exposures: typeof currencyAllocation === 'object' && currencyAllocation 
              ? currencyAllocation 
              : {},
            hedgingStatus: {}
          },
          geographicIntegrity: {
            isValid: lookThroughResults?.overallQualityScore ? lookThroughResults.overallQualityScore > 70 : null, // ❌ REMOVED: Mock true
            totalAllocation: Array.isArray(geographicAllocation) 
              ? geographicAllocation.reduce((sum, geo) => sum + geo.percentage, 0)
              : null, // ❌ REMOVED: Mock 100%
            missingAllocations: []
          },
          issues: [],
          errors: [],
          warnings: lookThroughResults?.warnings || []
        },
        complianceResults: {
          overallRating: null, // ❌ REMOVED: Mock "konform" rating  
          checks: [],
          recommendations: [],
          riskLevel: null // ❌ REMOVED: Mock "niedrig" rating
        } as any,
        fundValidations: []
      }
    };
    
    // If Claude extracted values from PDF, update positions
    if (positions.length === 1 && positions[0].name === '__PDF_RAW_TEXT__') {
      positions = instrumentAnalysis.map((inst: any) => ({
        name: inst.name,
        isin: inst.isin,
        value: inst.value || 0
      }));
    }
    
    await storage.updateAnalysisPhase(currentPhase.id, {
      status: "completed",
      completedAt: new Date().toISOString(),
      results: { instruments: instrumentAnalysis }
    });

    // Phase 1: Update existing portfolio positions with enriched data
    await storage.updatePortfolio(portfolioId, {
      analysisProgress: 30,
      currentPhase: phases[1]
    });
    
    // Get all existing positions for this portfolio
    const storedPositions = await storage.getPortfolioPositions(portfolioId);
    const positionMap = new Map(storedPositions.map(p => [p.name.toLowerCase(), p]));
    
    for (let i = 0; i < instrumentAnalysis.length; i++) {
      const analysis = instrumentAnalysis[i];
      const position = positions.find(p => p.name.toLowerCase() === analysis.name.toLowerCase());
      
      if (!position) {
        console.warn(`⚠️ No matching position found for analysis: ${analysis.name}`);
        continue;
      }
      
      // Find the stored position to update
      const existingPos = positionMap.get(analysis.name.toLowerCase());
      if (!existingPos) {
        console.warn(`⚠️ Position ${analysis.name} not found in storage, skipping update`);
        continue;
      }
      
      const percentage = (position.value / totalValue) * 100;
      
      // Claude hat bereits die Klassifikation durchgeführt - keine eigene Logik (CLAUDE.md konform)
      let finalInstrumentType = analysis.type || 'Sonstiges';
      
      // Update the existing position with enriched data
      await storage.updatePortfolioPosition(existingPos.id, {
        isin: analysis.isin || position.isin || existingPos.isin,
        value: position.value.toString(),
        percentage: percentage.toString(),
        instrumentType: finalInstrumentType,
        sector: analysis.sector || null,
        geography: analysis.geography || null,
        currency: analysis.currency || 'EUR',
        assetClass: analysis.assetClass || null, // Claude bestimmt die Asset-Klasse
        analysisStatus: "completed"
      });
    }

    // Update portfolio with basic info
    await storage.updatePortfolio(portfolioId, {
      totalValue: totalValue.toString(),
      positionCount: positions.length,
      analysisProgress: 60,
      currentPhase: phases[2]
    });

    // Phase 2-4: Use new Claude Portfolio Analyst for detailed analytics
    await storage.updatePortfolio(portfolioId, {
      analysisProgress: 80,
      currentPhase: phases[3]
    });

    // Convert analysis result to frontend-compatible format with improved parsing
    const convertToAllocationArray = (allocation: Record<string, number> | null | undefined, totalValue: number, keyField: 'category' | 'region' | 'currency') => {
      if (!allocation || typeof allocation !== 'object') {
        return [];
      }
      return Object.entries(allocation)
        .map(([key, value]) => {
          // Handle corrupted string concatenations from Claude AI
          let numericValue = 0;
          if (typeof value === 'string') {
            // Try to extract first valid number from concatenated strings like "025000.0025000.00"
            const firstNumberMatch = value.match(/(\d+(?:\.\d+)?)/);
            if (firstNumberMatch) {
              numericValue = parseFloat(firstNumberMatch[1]);
            } else {
              console.warn(`Could not parse allocation value: ${value} for ${keyField}: ${key}`);
              numericValue = 0;
            }
          } else {
            numericValue = Number(value) || 0;
          }
          
          return {
            value: numericValue,
            percentage: totalValue > 0 ? (numericValue / totalValue) * 100 : 0,
            [keyField]: key
          };
        })
        .filter(item => item.value > 0); // Filter out zero values after parsing
    };

    // ❌ REMOVED: calculateCurrencyExposure fallback function
    // Only use Claude AI currency data
    const currencyExposureData = analysisResult.currencyAllocation || {};

    // Fix asset allocation - use rawAnalysis data if main allocation is empty
    const finalAssetAllocation = Object.keys(analysisResult.assetAllocation).length > 0 
      ? analysisResult.assetAllocation 
      : (orchestrationResult.results.lookThrough?.assetAllocation || {});

    // Debug: Log what data is being sent to frontend
    console.log('🎯 Final Allocation Data being sent to Frontend:', {
      assetAllocation: finalAssetAllocation,
      assetKeys: Object.keys(finalAssetAllocation),
      assetEntries: Object.entries(finalAssetAllocation),
      geographicAllocation: standardGeographicAllocation,
      geoKeys: Object.keys(standardGeographicAllocation),
      geoEntries: Object.entries(standardGeographicAllocation),
      currencyExposureData: currencyExposureData,
      currencyKeys: Object.keys(currencyExposureData),
      currencyEntries: Object.entries(currencyExposureData),
      totalValue: totalValue
    });
      
    console.log('🎯 Final Asset Allocation Data:', {
      mainAllocation: analysisResult.assetAllocation,
      rawAllocation: orchestrationResult.results.lookThrough?.assetAllocation,
      finalUsed: finalAssetAllocation
    });

    const geographicAllocationArray = convertToAllocationArray(analysisResult.geographicAllocation, totalValue, 'region');
    
    // ❌ REMOVED: Guaranteed asset allocation logic
    // Only use Claude AI data
    const finalAssetAllocationArray = convertToAllocationArray(finalAssetAllocation, totalValue, 'category');
    
    if (finalAssetAllocationArray.length === 0) {
      console.warn('⚠️ No asset allocation from Claude AI - frontend will show empty');
    }

    // Perform SAA analysis using specialized prompt
    console.log('\n🎯 ===== ROUTES: SAA INTEGRATION START =====');
    let saaAnalysisResults = null;
    try {
      console.log(`🚀 Calling SAA analysis for portfolio ${portfolioId}`);
      console.log(`Input positions for SAA: ${positions.length} items`);
      
      saaAnalysisResults = await claudeService.analyzePortfolioWithSAAPrompt(portfolioId, positions);
      
      console.log('✅ SAA analysis returned successfully');
      console.log('SAA result preview:', {
        hasData: !!saaAnalysisResults,
        hasError: !!saaAnalysisResults?.error,
        hasPhases: !!(saaAnalysisResults?.phase1 || saaAnalysisResults?.phase2),
        resultKeys: saaAnalysisResults ? Object.keys(saaAnalysisResults) : []
      });
      
    } catch (saaError) {
      console.error('💥 SAA analysis integration failed:', saaError);
      console.error('SAA error stack:', saaError.stack);
      
      // Preserve any partial results that may have been returned
      const partialResults = saaError.partialResults || {};
      
      saaAnalysisResults = {
        ...partialResults, // Preserve any partial analysis data
        error: 'SAA analysis partially failed',
        message: saaError.message,
        timestamp: new Date().toISOString(),
        portfolioId,
        fallbackAnalysis: {
          summary: 'SAA-Analyse teilweise durchgeführt - Vollständige Analyse war nicht möglich',
          reason: saaError.message,
          preservedData: Object.keys(partialResults).length > 0
        },
        // Preserve metadata if available
        metadata: partialResults.metadata || {
          analysisDate: new Date().toISOString(),
          portfolioId,
          status: 'partial_failure'
        }
      };
      console.log('🔄 Created fallback SAA results with preserved partial data:', {
        hasPartialData: Object.keys(partialResults).length > 0,
        preservedKeys: Object.keys(partialResults)
      });
    }
    
    console.log('📊 SAA integration result ready for analytics object');
    console.log(`🎯 ===== ROUTES: SAA INTEGRATION END =====\n`);

    console.log('🔧 Building final analytics object...');
    
    // Convert Claude SAA tables to Frontend-compatible phase structure
    const convertSAAToPhases = (saaData: any, totalValue: number) => {
      if (!saaData?.portfolioAnalysis) return saaData;
      
      console.log('🔄 Converting Claude SAA tables to Frontend phases...');
      const analysis = saaData.portfolioAnalysis;
      
      // Create phase structure from Claude tables
      const phases = {
        ...saaData,
        phase2: {
          assetAllocation: {
            summary: {},
            detailTable: []
          }
        },
        phase3: {
          geographicAllocation: {
            summary: {}
          }
        },
        phase4: {
          currencyExposure: {
            summary: {}
          }
        },
        phase5: {
          riskAssessment: {}
        }
      };
      
      // Convert Anlagekategorie-Tabelle to Asset Allocation
      if (analysis.anlagekategorieTabelle?.rows) {
        analysis.anlagekategorieTabelle.rows.forEach((row: any) => {
          if (row[0] && row[1] && row[0] !== 'Gesamtvermögen') {
            const valueStr = row[1].replace(/[€\s.]/g, '').replace(',', '.');
            const value = parseFloat(valueStr) || 0;
            const percentage = (value / totalValue) * 100;
            
            if (value > 0) {
              phases.phase2.assetAllocation.summary[row[0]] = percentage;
              phases.phase2.assetAllocation.detailTable.push({
                assetClass: row[0],
                value: value,
                weight: percentage,
                instruments: 1
              });
            }
          }
        });
      }
      
      // Convert Regional-Tabelle to Geographic Allocation
      if (analysis.regionalTabelle?.rows) {
        analysis.regionalTabelle.rows.forEach((row: any) => {
          if (row[0] && row[1] && !row[0].includes('Gesamt')) {
            const valueStr = row[1].replace(/[€\s.]/g, '').replace(',', '.');
            const value = parseFloat(valueStr) || 0;
            const percentage = (value / totalValue) * 100;
            
            if (value > 0) {
              phases.phase3.geographicAllocation.summary[row[0]] = percentage;
            }
          }
        });
      }
      
      // Convert Währungs-Tabelle to Currency Exposure
      if (analysis.waehrungsTabelle?.rows) {
        analysis.waehrungsTabelle.rows.forEach((row: any) => {
          if (row[0] && row[1] && row[0] !== 'Gesamt') {
            const valueStr = row[1].replace(/[€\s.]/g, '').replace(',', '.');
            const value = parseFloat(valueStr) || 0;
            const percentage = (value / totalValue) * 100;
            
            if (value > 0) {
              // Extract currency code from name like "Euro (EUR)" -> "EUR"
              const currencyMatch = row[0].match(/\(([A-Z]{3})\)/) || [null, row[0]];
              const currency = currencyMatch[1] || row[0];
              phases.phase4.currencyExposure.summary[currency] = percentage;
            }
          }
        });
      }
      
      // Convert Kennzahlen-Tabelle to Risk Assessment
      if (analysis.kennzahlenTabelle?.rows) {
        analysis.kennzahlenTabelle.rows.forEach((row: any) => {
          if (row[0] && row[1]) {
            const valueStr = row[1].replace(/[%,]/g, '.').replace('-', '');
            const value = parseFloat(valueStr) || 0;
            
            switch (row[0]) {
              case 'Renditeerwartung p.a.':
                phases.phase5.riskAssessment.expectedReturn = value;
                break;
              case 'Portfolio-Volatilität p.a.':
                phases.phase5.riskAssessment.portfolioVolatility = value;
                break;
              case 'Value-at-Risk (95% 1 Jahr)':
                phases.phase5.riskAssessment.valueAtRisk = Math.abs(value);
                break;
            }
          }
        });
      }
      
      console.log('✅ SAA phases conversion completed:', {
        hasPhase2: !!phases.phase2.assetAllocation.summary,
        hasPhase3: !!phases.phase3.geographicAllocation.summary,
        hasPhase4: !!phases.phase4.currencyExposure.summary,
        hasPhase5: !!phases.phase5.riskAssessment.expectedReturn
      });
      
      return phases;
    };
    
    // Apply SAA conversion
    const enhancedSAAAnalysis = convertSAAToPhases(saaAnalysisResults, totalValue);
    
    // Enhanced asset allocation from Claude SAA tables
    const createEnhancedAssetAllocation = () => {
      console.log('🔄 Creating enhanced asset allocation from Claude SAA data...');
      
      // Debug: Check if SAA data is available
      console.error('📊 ENHANCED LOGIC - SAA Analysis Results available:', !!saaAnalysisResults);
      if (saaAnalysisResults) {
        console.error('📊 ENHANCED LOGIC - SAA Results structure:', Object.keys(saaAnalysisResults));
        console.error('📊 ENHANCED LOGIC - Full SAA data:', JSON.stringify(saaAnalysisResults, null, 2));
      }
      
      // Start with existing array - convert to proper format
      let enhancedAssetAllocation = assetAllocationArray.length > 0 
        ? assetAllocationArray 
        : Object.entries(assetAllocation).map(([category, value]) => ({
            category,
            value: typeof value === 'number' ? value : 0,
            percentage: totalValue > 0 ? ((typeof value === 'number' ? value : 0) / totalValue) * 100 : 0
          }));
      
      console.log('📊 Initial enhancedAssetAllocation:', enhancedAssetAllocation);
      
      // SOLUTION: Extract asset allocation from actual SAA data structure
      if (saaAnalysisResults) {
        console.error('📊 ENHANCED LOGIC - Processing actual SAA data structure');
        
        const analysis = saaAnalysisResults.analysis;
        if (analysis?.instrumentAnalysis) {
          console.error('📊 ENHANCED LOGIC - Found instrumentAnalysis, extracting asset allocation');
          
          const instrumentAnalysis = analysis.instrumentAnalysis;
          const totalValue = analysis.totalValue || finalAssetAllocation.totalValue || 0;
          const processedAssetAllocation: Record<string, number> = {};
          
          // Sum up allocations from all instruments
          Object.entries(instrumentAnalysis).forEach(([instrumentName, instrumentData]: [string, any]) => {
            console.error(`📊 ENHANCED LOGIC - Processing instrument: ${instrumentName}`);
            
            if (instrumentData.underlyingAssets) {
              const portfolioPosition = saaAnalysisResults.analysis?.portfolioPositions?.find(
                (pos: any) => pos.name === instrumentName
              );
              const instrumentValue = portfolioPosition?.value || 0;
              
              Object.entries(instrumentData.underlyingAssets).forEach(([assetClass, percentage]: [string, any]) => {
                const assetValue = (instrumentValue * percentage) / 100;
                
                // Map to German asset class names
                let germanAssetClass = assetClass;
                if (assetClass === 'aktien' || assetClass === 'equity') germanAssetClass = 'Aktien';
                else if (assetClass === 'anleihen' || assetClass === 'bonds') germanAssetClass = 'Anleihen';
                else if (assetClass === 'immobilien' || assetClass === 'realestate') germanAssetClass = 'Alternative Investments';
                else if (assetClass === 'liquidität' || assetClass === 'cash') germanAssetClass = 'Liquidität/Cash';
                
                processedAssetAllocation[germanAssetClass] = (processedAssetAllocation[germanAssetClass] || 0) + assetValue;
                
                console.error(`📊 ENHANCED LOGIC - Added ${assetValue} to ${germanAssetClass} from ${instrumentName}`);
              });
            }
          });
          
          console.error('📊 ENHANCED LOGIC - Final processed SAA allocation:', processedAssetAllocation);
          
          if (Object.keys(processedAssetAllocation).length > 0) {
            // Convert to the format expected by frontend
            const saaAssets = Object.entries(processedAssetAllocation).map(([category, value]) => ({
              category,
              value,
              percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
            }));
            
            console.error(`📊 ENHANCED LOGIC - Using SAA data (${saaAssets.length} categories) instead of look-through data`);
            enhancedAssetAllocation = saaAssets;
          }
        }
        
        // Fallback: try to find direct allocation tables (legacy support)
        if (enhancedAssetAllocation.length <= 1) {
          console.error('📊 ENHANCED LOGIC - Trying fallback table extraction');
          const saaAnlageTable = saaAnalysisResults?.portfolioAnalysis?.anlagekategorieTabelle?.rows || 
                                 saaAnalysisResults?.analysis?.outputTables?.anlagekategorie?.rows ||
                                 saaAnalysisResults?.output?.anlagekategorie_tabelle?.rows ||
                                 saaAnalysisResults?.analysis?.assetAllocation?.table?.rows;
      
          if (saaAnlageTable) {
            const saaAssets: any[] = [];
        
        console.log('✅ Found SAA Anlagekategorie-Tabelle with', saaAnlageTable.length, 'rows');
        console.log('🔍 Processing SAA Anlagekategorie-Tabelle:', saaAnlageTable);
        
        saaAnlageTable.forEach((row: any) => {
          let category: string | null = null;
          let valueStr: string | null = null;
          
          // Handle different row formats
          if (typeof row === 'string' && row.includes(' | ')) {
            // New pipe-separated string format: "Aktien | 518.572"
            const parts = row.split(' | ');
            if (parts.length >= 2) {
              category = parts[0].trim();
              valueStr = parts[1].trim();
            }
          } else if (Array.isArray(row) && row[0] && row[1]) {
            // Original array format: ["Aktien", "518.572"]
            category = row[0];
            valueStr = row[1];
          }
          
          if (category && valueStr && category !== 'Gesamtvermögen' && category !== 'Gesamt') {
            // Improved German number parsing
            const parseGermanNumber = (str: string): number => {
              // Remove currency symbols and spaces
              const cleaned = str.replace(/[€\s]/g, '');
              // Handle German decimal format: "518.572" = 518572, "15.094" = 15094
              if (cleaned.includes('.') && !cleaned.includes(',')) {
                // If only dots, treat as thousands separators
                return parseFloat(cleaned.replace(/\./g, ''));
              }
              // Handle mixed format: "1.380.587,50" -> 1380587.50
              return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
            };
            
            const value = parseGermanNumber(valueStr);
            const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
            
            console.log(`📊 SAA Asset: ${category} = ${valueStr} -> Value: ${value}, Percentage: ${percentage.toFixed(2)}%`);
            
            // Include ALL categories, even 0€ ones (for completeness)
            saaAssets.push({
              category: category,
              value: value,
              percentage: percentage
            });
          }
        });
        
            // ALWAYS use SAA data if available (Claude AI is authoritative)
            if (saaAssets.length > 0) {
              console.error(`✅ FALLBACK - Using SAA table data (${saaAssets.length} categories)`);
              console.log('📊 SAA Assets structure:', saaAssets);
              enhancedAssetAllocation = saaAssets;
            } else {
              console.error('⚠️ FALLBACK - No valid SAA assets found in table format');
            }
          } else {
            console.error('❌ FALLBACK - No SAA table found in any format');
          }
        }
      }
      
      // Ensure the return format is correct
      console.log('📊 Final enhancedAssetAllocation before return:', enhancedAssetAllocation);
      console.log('📊 Type check:', {
        isArray: Array.isArray(enhancedAssetAllocation),
        length: enhancedAssetAllocation.length,
        firstItem: enhancedAssetAllocation[0]
      });
      
      return enhancedAssetAllocation;
    };
    
    // Enhanced geographic allocation from Claude SAA tables
    const createEnhancedGeographicAllocation = () => {
      console.log('🔄 Creating enhanced geographic allocation from Claude SAA data...');
      
      let enhancedGeoAllocation = [...geographicAllocationArray];
      
      // Support multiple SAA format structures
      const saaRegionalTable = saaAnalysisResults?.portfolioAnalysis?.regionalTabelle?.rows || 
                               saaAnalysisResults?.analysis?.outputTables?.regional?.rows ||
                               saaAnalysisResults?.output?.regional_tabelle?.rows;
      
      if (saaRegionalTable) {
        const saaRegions: any[] = [];
        
        console.log('🔍 Processing SAA Regional-Tabelle:', saaRegionalTable);
        
        saaRegionalTable.forEach((row: any) => {
          let region: string | null = null;
          let valueStr: string | null = null;
          
          // Handle different row formats
          if (typeof row === 'string' && row.includes(' | ')) {
            // New pipe-separated string format
            const parts = row.split(' | ');
            if (parts.length >= 2) {
              region = parts[0].trim();
              valueStr = parts[1].trim();
            }
          } else if (Array.isArray(row) && row[0] && row[1]) {
            // Original array format
            region = row[0];
            valueStr = row[1];
          }
          
          if (region && valueStr && !region.includes('Gesamt')) {
            const cleanValueStr = valueStr.replace(/[€\s.]/g, '').replace(',', '.');
            const value = parseFloat(cleanValueStr) || 0;
            const percentage = (value / totalValue) * 100;
            
            if (value > 0) {
              saaRegions.push({
                region: region,
                value: value,
                percentage: percentage
              });
            }
          }
        });
        
        if (saaRegions.length > enhancedGeoAllocation.length) {
          console.log(`✅ Using enhanced SAA geographic allocation (${saaRegions.length} vs ${enhancedGeoAllocation.length} regions)`);
          enhancedGeoAllocation = saaRegions;
        }
      }
      
      return enhancedGeoAllocation;
    };
    
    // Enhanced currency exposure from Claude SAA tables
    const createEnhancedCurrencyExposure = () => {
      console.log('🔄 Creating enhanced currency exposure from Claude SAA data...');
      
      let enhancedCurrencyExposure = convertToAllocationArray(currencyExposureData, totalValue, 'currency');
      
      // Support multiple SAA format structures  
      const saaCurrencyTable = saaAnalysisResults?.portfolioAnalysis?.waehrungsTabelle?.rows || 
                               saaAnalysisResults?.analysis?.outputTables?.waehrung?.rows ||
                               saaAnalysisResults?.output?.waehrungs_tabelle?.rows;
      
      if (saaCurrencyTable) {
        const saaCurrencies: any[] = [];
        
        console.log('🔍 Processing SAA Currency-Tabelle:', saaCurrencyTable);
        
        saaCurrencyTable.forEach((row: any) => {
          let currencyName: string | null = null;
          let valueStr: string | null = null;
          
          // Handle different row formats
          if (typeof row === 'string' && row.includes(' | ')) {
            // New pipe-separated string format
            const parts = row.split(' | ');
            if (parts.length >= 2) {
              currencyName = parts[0].trim();
              valueStr = parts[1].trim();
            }
          } else if (Array.isArray(row) && row[0] && row[1]) {
            // Original array format
            currencyName = row[0];
            valueStr = row[1];
          }
          
          if (currencyName && valueStr && currencyName !== 'Gesamt') {
            const cleanValueStr = valueStr.replace(/[€\s.]/g, '').replace(',', '.');
            const value = parseFloat(cleanValueStr) || 0;
            const percentage = (value / totalValue) * 100;
            
            if (value > 0) {
              // Extract currency code from name like "Euro (EUR)" -> "EUR"
              const currencyMatch = currencyName.match(/\(([A-Z]{3})\)/) || [null, currencyName];
              const currency = currencyMatch[1] || currencyName.split(' ')[0] || currencyName;
              
              saaCurrencies.push({
                currency: currency,
                value: value,
                percentage: percentage
              });
            }
          }
        });
        
        if (saaCurrencies.length > enhancedCurrencyExposure.length) {
          console.log(`✅ Using enhanced SAA currency exposure (${saaCurrencies.length} vs ${enhancedCurrencyExposure.length} currencies)`);
          enhancedCurrencyExposure = saaCurrencies;
        }
      }
      
      return enhancedCurrencyExposure;
    };
    
    const analytics = {
      assetAllocation: createEnhancedAssetAllocation(),
      geographicAllocation: createEnhancedGeographicAllocation(), 
      currencyExposure: createEnhancedCurrencyExposure(),
      saaAnalysis: enhancedSAAAnalysis, // Enhanced SAA analysis with phases
      riskMetrics: (() => {
        console.log('🔍 Mapping risk metrics from multiple sources...');
        
        // Priority 1: Use orchestration result if available
        const orchestrationRiskMetrics = orchestrationResult.results.riskMetrics;
        const hasValidRiskMetrics = orchestrationRiskMetrics && 
          (orchestrationRiskMetrics.expectedReturn || orchestrationRiskMetrics.volatility || orchestrationRiskMetrics.sharpeRatio);
        
        if (hasValidRiskMetrics) {
          console.log('✅ Using orchestration risk metrics');
          return {
            expectedReturn: (orchestrationRiskMetrics?.expectedReturn || 0) * 100,
            volatility: (orchestrationRiskMetrics?.volatility || 0) * 100,
            sharpeRatio: orchestrationRiskMetrics?.sharpeRatio || 0,
            valueAtRisk: (orchestrationRiskMetrics?.valueAtRisk || 0) * 100,
            expectedShortfall: (orchestrationRiskMetrics?.expectedShortfall || 0) * 100,
            maxDrawdown: (orchestrationRiskMetrics?.maxDrawdown || 0) * 100,
            diversificationRatio: orchestrationRiskMetrics?.diversificationRatio || 0
          };
        }
        
        // Priority 2: Use detailed raw analysis risk metrics
        const rawRiskMetrics = analysisResult?.rawAnalysis?.riskMetrics;
        if (rawRiskMetrics) {
          console.log('✅ Using detailed raw analysis risk metrics');
          const traditional = rawRiskMetrics.traditionalRisk || {};
          const monteCarlo = rawRiskMetrics.monteCarloRisk || {};
          
          return {
            expectedReturn: traditional.averageReturn ? (traditional.averageReturn * 100) : 0,
            volatility: traditional.standardDeviation ? (traditional.standardDeviation * 100) : 0,
            sharpeRatio: traditional.sharpeRatio || 0,
            valueAtRisk: monteCarlo.confidenceLevels?.['95%']?.var ? 
              (monteCarlo.confidenceLevels['95%'].var / totalValue * 100) : 0,
            expectedShortfall: monteCarlo.confidenceLevels?.['95%']?.cvar ? 
              (monteCarlo.confidenceLevels['95%'].cvar / totalValue * 100) : 0,
            maxDrawdown: traditional.maxDrawdown ? (Math.abs(traditional.maxDrawdown) * 100) : 0,
            diversificationRatio: 1.0 // Default for single asset analysis
          };
        }
        
        // Priority 3: Extract from SAA Kennzahlen-Tabelle
        const saaKennzahlen = enhancedSAAAnalysis?.portfolioAnalysis?.kennzahlenTabelle?.rows;
        if (saaKennzahlen) {
          console.log('✅ Using SAA Kennzahlen-Tabelle for risk metrics');
          const riskMetrics: any = {};
          
          saaKennzahlen.forEach((row: any) => {
            if (row[0] && row[1]) {
              const valueStr = row[1].replace(/[%,-]/g, '.');
              const value = parseFloat(valueStr) || 0;
              
              switch (row[0]) {
                case 'Renditeerwartung p.a.':
                  riskMetrics.expectedReturn = Math.abs(value);
                  break;
                case 'Portfolio-Volatilität p.a.':
                  riskMetrics.volatility = Math.abs(value);
                  break;
                case 'Sharpe Ratio':
                  riskMetrics.sharpeRatio = value;
                  break;
                case 'Value-at-Risk (95% 1 Jahr)':
                  riskMetrics.valueAtRisk = Math.abs(value);
                  break;
                case 'Expected Shortfall (95% 1 Jahr)':
                  riskMetrics.expectedShortfall = Math.abs(value);
                  break;
                case 'Maximum Drawdown (erwartet)':
                  riskMetrics.maxDrawdown = Math.abs(value);
                  break;
                case 'Diversifikationsquotient':
                  riskMetrics.diversificationRatio = value;
                  break;
              }
            }
          });
          
          if (Object.keys(riskMetrics).length > 0) {
            return riskMetrics;
          }
        }
        
        console.log('⚠️ No risk metrics available from any source');
        return null;
      })(),
      lookThroughValidation: analysisResult.lookThroughValidation,
      rawAnalysis: analysisResult.rawAnalysis
    };
    
    console.log('📦 Final analytics object created');
    console.log('Analytics structure:', {
      hasAssetAllocation: !!analytics.assetAllocation?.length,
      hasGeographicAllocation: !!analytics.geographicAllocation?.length,
      hasCurrencyExposure: !!analytics.currencyExposure?.length,
      hasSaaAnalysis: !!analytics.saaAnalysis,
      saaAnalysisType: analytics.saaAnalysis?.error ? 'error' : 'success',
      hasRiskMetrics: !!analytics.riskMetrics,
      hasLookThroughValidation: !!analytics.lookThroughValidation
    });
    
    // Store knowledge and create final snapshot BEFORE completing analysis
    const volatilityText = analytics.riskMetrics?.volatility ? 
      `Risiko-Bewertung: ${analytics.riskMetrics.volatility.toFixed(1)}% Volatilität.` : 
      'Risiko-Bewertung: Volatilität konnte nicht berechnet werden.';
    
    await claudeService.storeKnowledge(
      portfolioId,
      'portfolio_analysis',
      analytics,
      `Portfolio-Analyse abgeschlossen. ${positions.length} Positionen analysiert. ${volatilityText}`,
      0.95
    );
    
    // Create analysis completion snapshot
    await claudeService.createPortfolioSnapshot(portfolioId, 'analysis_completed', positions, analytics);
    
    // Detect and store analysis patterns
    const patterns = await claudeService.detectAnalysisPatterns(portfolioId);
    console.log(`🔬 Detected ${patterns.length} analysis patterns for portfolio ${portfolioId}`);
    
    // Complete analysis
    await storage.updatePortfolio(portfolioId, {
      analysisStatus: "completed",
      analysisProgress: 100,
      currentPhase: "Analyse abgeschlossen",
      analysisResults: analytics
    });

    // Mark remaining phases as completed
    const allPhases = await storage.getAnalysisPhases(portfolioId);
    for (const phase of allPhases.slice(1)) {
      await storage.updateAnalysisPhase(phase.id, {
        status: "completed",
        completedAt: new Date().toISOString()
      });
    }
    
    console.log(`🧠 Portfolio ${portfolioId} analysis completed with knowledge storage`);
    console.log(`📚 Knowledge base enriched with comprehensive analysis data`);

  } catch (error) {
    console.error('Error in portfolio analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    
    await storage.updatePortfolio(portfolioId, {
      analysisStatus: "failed",
      currentPhase: "Fehler bei der Analyse",
      analysisResults: {
        error: true,
        errorMessage,
        timestamp: new Date().toISOString()
      }
    });
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Note: Using unified claudeService instead of separate portfolio analyst
  
  // Get all portfolios
  app.get("/api/portfolios", async (req, res) => {
    try {
      const portfolios = await storage.getAllPortfolios();
      res.json(portfolios);
    } catch (error) {
      console.error('Error fetching portfolios:', error);
      res.status(500).json({ error: "Fehler beim Laden der Portfolios" });
    }
  });

  // Get portfolio by ID
  app.get("/api/portfolios/:id", async (req, res) => {
    try {
      const portfolio = await storage.getPortfolio(req.params.id);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio nicht gefunden" });
      }
      
      // ❌ REMOVED: Non-Claude currency exposure calculation
      // Currency exposure must only come from Claude AI
      
      res.json(portfolio);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      res.status(500).json({ error: "Fehler beim Laden des Portfolios" });
    }
  });

  // Get portfolio positions
  app.get("/api/portfolios/:id/positions", async (req, res) => {
    try {
      const positions = await storage.getPortfolioPositions(req.params.id);
      res.json(positions);
    } catch (error) {
      console.error('Error fetching positions:', error);
      res.status(500).json({ error: "Fehler beim Laden der Positionen" });
    }
  });

  // Get analysis phases
  app.get("/api/portfolios/:id/phases", async (req, res) => {
    try {
      const phases = await storage.getAnalysisPhases(req.params.id);
      res.json(phases);
    } catch (error) {
      console.error('Error fetching phases:', error);
      res.status(500).json({ error: "Fehler beim Laden der Analyse-Phasen" });
    }
  });

  // Get portfolio knowledge base entries
  app.get("/api/portfolios/:id/knowledge", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      
      // Fallback implementation for empty knowledge base
      try {
        const knowledge = await storage.getKnowledgeEntries({
          portfolioId,
          limit: parseInt(req.query.limit as string) || 50,
          sortBy: req.query.sortBy as 'createdAt' | 'confidence' || 'createdAt',
          sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
        });
        res.json({ data: knowledge || [] });
      } catch (storageError) {
        console.error("Storage error for knowledge entries:", storageError);
        // Return empty array as fallback for now
        res.json({ data: [] });
      }
    } catch (error) {
      console.error("Error fetching knowledge entries:", error);
      res.json({ data: [] }); // Return empty instead of error to prevent UI crashes
    }
  });

  // Get portfolio snapshots
  app.get("/api/portfolios/:id/snapshots", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      
      try {
        const snapshots = await storage.getPortfolioSnapshots({
          portfolioId,
          limit: parseInt(req.query.limit as string) || 20,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        });
        res.json({ data: snapshots || [] });
      } catch (storageError) {
        console.error("Storage error for snapshots:", storageError);
        res.json({ data: [] });
      }
    } catch (error) {
      console.error("Error fetching portfolio snapshots:", error);
      res.json({ data: [] });
    }
  });

  // Get detailed validation results for a portfolio
  app.get("/api/portfolios/:id/validation", async (req, res) => {
    try {
      const portfolio = await storage.getPortfolio(req.params.id);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio nicht gefunden" });
      }

      // Check if portfolio has been analyzed
      if (portfolio.analysisStatus !== 'completed' || !portfolio.analysisResults) {
        return res.status(400).json({ 
          error: "Portfolio-Analyse noch nicht abgeschlossen",
          message: "Die Validierung ist nur für vollständig analysierte Portfolios verfügbar."
        });
      }

      // Extract validation results from analytics
      const analytics = portfolio.analysisResults as any;
      const validationResults = analytics.lookThroughValidation;

      if (!validationResults) {
        // Perform validation if not already done
        const positions = await storage.getPortfolioPositions(req.params.id);
        const totalValue = parseFloat(portfolio.totalValue || '0');
        
        // Convert positions to analysis format
        const instrumentAnalysis = positions.map(pos => ({
          name: pos.name,
          isin: pos.isin,
          type: pos.instrumentType as any,
          sector: pos.sector,
          geography: pos.geography,
          currency: pos.currency,
          assetClass: pos.assetClass,
          confidence: 1.0,
          value: parseFloat(pos.value)
        }));

        // Run validation using unified claudeService
        const lookThroughValidation = await claudeService.performLookThroughValidation(
          req.params.id,
          instrumentAnalysis,
          analytics
        );

        // Return validation-focused response
        return res.json({
          portfolioId: req.params.id,
          validationTimestamp: new Date().toISOString(),
          lookThroughValidation: {
            overallScore: lookThroughValidation.overallScore,
            isValid: lookThroughValidation.isValid,
            validationResults: lookThroughValidation,
            complianceResults: null, // Would need full compliance check
            fundValidations: [] // Simplified for direct endpoint
          }
        });
      }

      // Return existing validation results
      res.json({
        portfolioId: req.params.id,
        validationTimestamp: new Date().toISOString(),
        lookThroughValidation: validationResults
      });

    } catch (error) {
      console.error('Error fetching validation results:', error);
      res.status(500).json({ 
        error: "Fehler beim Laden der Validierungsergebnisse",
        message: "Die Validierungsergebnisse konnten nicht geladen werden. Bitte versuchen Sie es später erneut."
      });
    }
  });

  // Trigger re-validation of a portfolio
  app.post("/api/portfolios/:id/revalidate", async (req, res) => {
    try {
      const portfolio = await storage.getPortfolio(req.params.id);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio nicht gefunden" });
      }

      if (portfolio.analysisStatus !== 'completed') {
        return res.status(400).json({ 
          error: "Portfolio-Analyse noch nicht abgeschlossen",
          message: "Die Validierung ist nur für vollständig analysierte Portfolios verfügbar."
        });
      }

      // Get portfolio positions and re-run validation
      const positions = await storage.getPortfolioPositions(req.params.id);
      const totalValue = parseFloat(portfolio.totalValue || '0');
      
      const instrumentAnalysis = positions.map(pos => ({
        name: pos.name,
        isin: pos.isin,
        type: pos.instrumentType as any,
        sector: pos.sector,
        geography: pos.geography,
        currency: pos.currency,
        assetClass: pos.assetClass,
        confidence: 1.0,
        value: parseFloat(pos.value)
      }));

      // Clear validation cache and run fresh validation using unified claudeService
      const lookThroughValidation = await claudeService.performLookThroughValidation(
        req.params.id + '_revalidate_' + Date.now(), // Force new validation
        instrumentAnalysis,
        portfolio.analysisResults as any
      );

      res.json({
        portfolioId: req.params.id,
        revalidationTimestamp: new Date().toISOString(),
        lookThroughValidation: {
          overallScore: lookThroughValidation.overallScore,
          isValid: lookThroughValidation.isValid,
          validationResults: lookThroughValidation,
          message: "Validierung erfolgreich durchgeführt"
        }
      });

    } catch (error) {
      console.error('Error during re-validation:', error);
      res.status(500).json({ 
        error: "Fehler bei der erneuten Validierung",
        message: "Die erneute Validierung konnte nicht durchgeführt werden. Bitte versuchen Sie es später erneut."
      });
    }
  });

  // Get validation summary for multiple portfolios
  app.get("/api/portfolios/validation/summary", async (req, res) => {
    try {
      const portfolios = await storage.getAllPortfolios();
      const validationSummary = [];

      for (const portfolio of portfolios) {
        if (portfolio.analysisStatus === 'completed' && portfolio.analysisResults) {
          const analytics = portfolio.analysisResults as any;
          const validationResults = analytics.lookThroughValidation;
          
          validationSummary.push({
            portfolioId: portfolio.id,
            portfolioName: portfolio.name,
            validationStatus: validationResults ? 
              (validationResults.isValid ? 'valid' : 'invalid') : 'not_validated',
            overallScore: validationResults?.overallScore || 0,
            lastUpdated: portfolio.updatedAt || portfolio.createdAt,
            issueCount: validationResults?.validationResults?.issues?.length || 0,
            criticalIssues: validationResults?.validationResults?.issues?.filter(
              (issue: any) => issue.severity === 'critical'
            ).length || 0
          });
        } else {
          validationSummary.push({
            portfolioId: portfolio.id,
            portfolioName: portfolio.name,
            validationStatus: 'pending_analysis',
            overallScore: 0,
            lastUpdated: portfolio.updatedAt || portfolio.createdAt,
            issueCount: 0,
            criticalIssues: 0
          });
        }
      }

      const summaryResponse: ValidationSummaryResponse = {
        timestamp: new Date().toISOString(),
        totalPortfolios: portfolios.length,
        validatedPortfolios: validationSummary.filter(p => p.validationStatus !== 'pending_analysis').length,
        validPortfolios: validationSummary.filter(p => p.validationStatus === 'valid').length,
        invalidPortfolios: validationSummary.filter(p => p.validationStatus === 'invalid').length,
        averageScore: validationSummary.reduce((sum, p) => sum + p.overallScore, 0) / Math.max(1, validationSummary.length),
        portfolios: validationSummary
      };
      
      res.json(summaryResponse);

    } catch (error) {
      console.error('Error generating validation summary:', error);
      res.status(500).json({ 
        error: "Fehler beim Erstellen der Validierungsübersicht",
        message: "Die Validierungsübersicht konnte nicht erstellt werden."
      });
    }
  });

  // Get system health and performance metrics
  app.get("/api/system/health", async (req, res) => {
    try {
      const performanceMetrics = claudeService.getPerformanceMetrics();
      const errorStatistics = claudeService.getErrorStatistics();
      const cacheStatistics = claudeService.getCacheStatistics();
      
      // Calculate system health score
      let healthScore = 100;
      
      // Deduct points for high error rate
      const errorRate = performanceMetrics.validationCount > 0 ? 
        (performanceMetrics.errorCount / performanceMetrics.validationCount) * 100 : 0;
      if (errorRate > 10) healthScore -= 20;
      else if (errorRate > 5) healthScore -= 10;
      
      // Deduct points for low cache hit rate
      if (performanceMetrics.cacheHitRate < 50) healthScore -= 15;
      else if (performanceMetrics.cacheHitRate < 70) healthScore -= 5;
      
      // Deduct points for circuit breaker issues
      const openCircuitBreakers = errorStatistics.circuitBreakerStates
        .filter(cb => cb.state.state === 'open').length;
      if (openCircuitBreakers > 0) healthScore -= openCircuitBreakers * 10;
      
      // Deduct points for high queue length
      if (cacheStatistics.queueLength > 10) healthScore -= 10;
      else if (cacheStatistics.queueLength > 5) healthScore -= 5;
      
      const healthStatus = healthScore >= 90 ? 'healthy' :
                          healthScore >= 70 ? 'warning' : 'critical';
      
      const healthResponse: SystemHealthResponse = {
        timestamp: new Date().toISOString(),
        status: healthStatus,
        healthScore: Math.max(0, healthScore),
        performance: {
          ...performanceMetrics,
          errorRate: Math.round(errorRate * 100) / 100,
          averageValidationTimeMs: Math.round(performanceMetrics.averageValidationTime)
        },
        errors: {
          totalErrors: errorStatistics.totalErrors,
          errorsByType: errorStatistics.errorsByType,
          recentErrorCount: errorStatistics.recentErrors.length,
          openCircuitBreakers
        },
        cache: {
          ...cacheStatistics,
          memoryUsageEstimate: {
            validationCache: cacheStatistics.validationCache * 50, // Rough estimate in KB
            factsheetCache: cacheStatistics.factsheetCache * 100,
            fundHoldingsCache: cacheStatistics.fundHoldingsCache * 75
          }
        },
        recommendations: {
          clearCache: cacheStatistics.validationCache + cacheStatistics.factsheetCache > 100,
          reduceLoad: cacheStatistics.queueLength > 5,
          checkCircuitBreakers: openCircuitBreakers > 0,
          monitorErrors: errorRate > 5
        }
      };
      
      res.json(healthResponse);

    } catch (error) {
      console.error('Error generating health report:', error);
      res.status(500).json({ 
        status: 'critical',
        error: "Gesundheitscheck fehlgeschlagen",
        message: "Der Systemgesundheitscheck konnte nicht durchgeführt werden."
      });
    }
  });

  // Get detailed error information (for debugging)
  app.get("/api/system/errors", async (req, res) => {
    try {
      const errorStatistics = claudeService.getErrorStatistics();
      
      res.json({
        timestamp: new Date().toISOString(),
        summary: {
          totalErrors: errorStatistics.totalErrors,
          errorsByType: errorStatistics.errorsByType,
          recentErrorCount: errorStatistics.recentErrors.length
        },
        recentErrors: errorStatistics.recentErrors.map(error => ({
          ...error,
          timestamp: new Date(error.timestamp).toISOString(),
          // Remove potentially sensitive data from stack traces
          stack: error.stack?.split('\n').slice(0, 3).join('\n') + '...'
        })),
        circuitBreakers: errorStatistics.circuitBreakerStates.map((cb: any) => ({
          ...cb,
          lastFailureTime: cb.state.lastFailureTime ? 
            new Date(cb.state.lastFailureTime).toISOString() : null
        }))
      });

    } catch (error) {
      console.error('Error retrieving error information:', error);
      res.status(500).json({ 
        error: "Fehler beim Abrufen der Fehlerinformationen",
        message: "Die Fehlerinformationen konnten nicht abgerufen werden."
      });
    }
  });

  // Analyze portfolio change impact (Vorher-Nachher-Vergleich)
  app.post("/api/portfolios/:id/analyze-change", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const changeRequest = portfolioChangeRequestSchema.parse(req.body);
      
      const portfolio = await storage.getPortfolio(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio nicht gefunden" });
      }
      
      if (portfolio.analysisStatus !== "completed") {
        return res.status(400).json({ 
          error: "Portfolio-Analyse nicht abgeschlossen",
          message: "Das Portfolio muss erst vollständig analysiert werden, bevor Änderungen simuliert werden können."
        });
      }

      const startTime = Date.now();
      
      // Perform impact analysis using unified claudeService
      const impactAnalysis = await claudeService.analyzePortfolioImpact(portfolioId, changeRequest);
      
      const processingTime = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          ...impactAnalysis,
          processingTime
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in portfolio change analysis:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Ungültige Eingabedaten",
          validationErrors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      
      res.status(500).json({ 
        error: "Fehler bei der Änderungsanalyse",
        message: error instanceof Error ? error.message : "Unbekannter Fehler"
      });
    }
  });

  // Analyze multiple scenarios for portfolio
  app.post("/api/portfolios/:id/scenarios", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const scenarioRequest = scenarioAnalysisRequestSchema.parse(req.body);
      
      const portfolio = await storage.getPortfolio(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio nicht gefunden" });
      }
      
      if (portfolio.analysisStatus !== "completed") {
        return res.status(400).json({ 
          error: "Portfolio-Analyse nicht abgeschlossen"
        });
      }

      const startTime = Date.now();
      
      // Analyze all scenarios using unified claudeService
      const scenarioAnalyses = await Promise.all(
        scenarioRequest.scenarios.map(async (scenario) => {
          const changeRequest: PortfolioChangeRequest = {
            changeType: 'rebalance',
            changes: scenario.changes,
            scenarioName: scenario.name
          };
          
          return {
            scenarioName: scenario.name,
            description: scenario.description,
            analysis: await claudeService.analyzePortfolioImpact(portfolioId, changeRequest)
          };
        })
      );
      
      const processingTime = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          portfolioId,
          baselinePortfolio: scenarioRequest.compareToBaseline ? portfolio.analysisResults : undefined,
          scenarios: scenarioAnalyses,
          processingTime,
          analysisDate: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in scenario analysis:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Ungültige Szenario-Daten",
          validationErrors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      
      res.status(500).json({ 
        error: "Fehler bei der Szenario-Analyse",
        message: error instanceof Error ? error.message : "Unbekannter Fehler"
      });
    }
  });

  // Preview portfolio file without saving - optimized to avoid API calls
  app.post("/api/portfolios/preview", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Keine Datei hochgeladen" });
      }
      
      console.log(`📋 Preview request for file: ${req.file.originalname} (${req.file.size} bytes)`);

      const fileName = req.file.originalname;
      let positions: ParsedPosition[] = [];
      let validationErrors: Array<{ row: number; field: string; error: string }> = [];
      let warnings: string[] = [];

      try {
        if (fileName.endsWith('.csv')) {
          positions = parseCSV(req.file.buffer);
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          positions = parseExcel(req.file.buffer);
        } else if (fileName.endsWith('.pdf')) {
          // Use lightweight preview parsing - no API calls
          positions = await parsePDFPreview(req.file.buffer);
          
          // PDF preview always returns raw text
          warnings.push("PDF-Inhalt erkannt. Die vollständige Analyse erfolgt nach dem Upload.");
          warnings.push("Vorschau zeigt Roh-PDF-Text. Portfolio-Strukturerkennung erfolgt beim Upload.");
        } else {
          return res.status(400).json({ error: "Unsupported file format" });
        }
      } catch (parseError) {
        console.error('File parsing error:', parseError);
        
        // Check if it's a rate limiting error and provide fallback
        const isRateLimitError = (parseError as Error).message?.includes('rate') || 
                                (parseError as Error).message?.includes('Too many') ||
                                (parseError as Error).message?.includes('429');
        
        if (isRateLimitError) {
          // Fallback: Basic file info without full parsing
          return res.status(200).json({
            fileName,
            fileType: fileName.split('.').pop()?.toLowerCase() || 'unknown',
            totalPositions: 0,
            totalValue: 0,
            validPositions: 0,
            invalidPositions: 0,
            positions: [],
            validationErrors: [],
            warnings: [
              "Service vorübergehend überlastet - vereinfachte Vorschau",
              "Vollständige Analyse nach Upload verfügbar",
              "Bitte versuchen Sie den Upload in wenigen Sekunden"
            ],
            canProceed: true, // Allow upload despite preview limitation
            isRateLimited: true
          });
        }
        
        return res.status(400).json({ 
          error: "Fehler beim Verarbeiten der Datei: " + (parseError as Error).message,
          validationErrors: [{ row: 0, field: "file", error: (parseError as Error).message }]
        });
      }

      // Validate positions and collect detailed errors
      const validPositions: (ParsedPosition & { validation: { isValid: boolean; errors: string[] } })[] = [];
      const totalValue = positions.reduce((sum, pos) => sum + (pos.value || 0), 0);

      positions.forEach((position, index) => {
        const errors: string[] = [];
        
        // Validate name
        if (!position.name || position.name.trim().length === 0) {
          errors.push("Name ist erforderlich");
          validationErrors.push({ row: index + 1, field: "name", error: "Name ist erforderlich" });
        }
        
        // Validate value
        if (position.value === undefined || position.value === null || isNaN(position.value)) {
          errors.push("Wert ist erforderlich und muss eine gültige Zahl sein");
          validationErrors.push({ row: index + 1, field: "value", error: "Ungültiger oder fehlender Wert" });
        } else if (position.value <= 0) {
          errors.push("Wert muss größer als 0 sein");
          validationErrors.push({ row: index + 1, field: "value", error: "Wert muss größer als 0 sein" });
        }
        
        // Validate ISIN format if provided
        if (position.isin && !/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(position.isin)) {
          warnings.push(`Position "${position.name}": ISIN-Format könnte ungültig sein`);
        }

        const percentage = totalValue > 0 ? (position.value / totalValue) * 100 : 0;
        
        validPositions.push({
          ...position,
          validation: {
            isValid: errors.length === 0,
            errors
          }
        });
      });

      // Add general warnings
      if (positions.length === 0) {
        warnings.push("Keine Positionen in der Datei gefunden");
      }
      
      if (totalValue === 0) {
        warnings.push("Gesamtwert des Portfolios ist 0");
      }

      const fileType = fileName.split('.').pop()?.toLowerCase() || 'unknown';
      
      res.json({
        fileName,
        fileType,
        totalPositions: positions.length,
        totalValue,
        validPositions: validPositions.filter(p => p.validation.isValid).length,
        invalidPositions: validPositions.filter(p => !p.validation.isValid).length,
        positions: validPositions,
        validationErrors,
        warnings,
        canProceed: validationErrors.length === 0 && positions.length > 0
      });
      
    } catch (error) {
      console.error('Error previewing file:', error);
      res.status(500).json({ error: "Fehler bei der Dateivorschau: " + (error as Error).message });
    }
  });

  // Upload and analyze portfolio
  app.post("/api/portfolios/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Keine Datei hochgeladen" });
      }

      const fileName = req.file.originalname;
      let positions: ParsedPosition[] = [];

      try {
        if (fileName.endsWith('.csv')) {
          positions = parseCSV(req.file.buffer);
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          positions = parseExcel(req.file.buffer);
        } else if (fileName.endsWith('.pdf')) {
          positions = await parsePDF(req.file.buffer);
        } else {
          return res.status(400).json({ error: "Unsupported file format" });
        }
      } catch (parseError) {
        console.error('File parsing error:', parseError);
        return res.status(400).json({ error: "Fehler beim Verarbeiten der Datei: " + (parseError as Error).message });
      }

      if (positions.length === 0) {
        return res.status(400).json({ error: "Keine gültigen Positionen in der Datei gefunden" });
      }

      // Create portfolio
      const portfolioData = insertPortfolioSchema.parse({
        name: `Portfolio ${fileName}`,
        fileName: fileName,
        analysisStatus: "pending"
      });

      const portfolio = await storage.createPortfolio(portfolioData);

      // Start analysis in background
      analyzePortfolioInPhases(portfolio.id, positions).catch(error => {
        console.error('Background analysis error:', error);
      });

      res.json({ portfolio, positionCount: positions.length });
    } catch (error) {
      console.error('Error uploading portfolio:', error);
      res.status(500).json({ error: "Fehler beim Hochladen: " + (error as Error).message });
    }
  });

  // Delete portfolio - idempotent operation
  app.delete("/api/portfolios/:id", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      console.log(`Attempting to delete portfolio: ${portfolioId}`);
      
      const deleted = await storage.deletePortfolio(portfolioId);
      
      if (!deleted) {
        // For idempotency, treat "not found" as successful deletion
        console.log(`Portfolio ${portfolioId} not found - treating as already deleted`);
        return res.status(200).json({ 
          success: true, 
          message: "Portfolio bereits gelöscht oder nicht gefunden",
          wasAlreadyDeleted: true 
        });
      }
      
      console.log(`Portfolio ${portfolioId} successfully deleted`);
      res.json({ 
        success: true,
        message: "Portfolio erfolgreich gelöscht",
        wasAlreadyDeleted: false
      });
    } catch (error) {
      console.error(`Error deleting portfolio ${req.params.id}:`, error);
      res.status(500).json({ error: "Fehler beim Löschen des Portfolios" });
    }
  });

  // Investment Universe API Endpoints
  // Get complete investment universe
  app.get("/api/investment-universe", async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === 'true';
      const universe = await investmentUniverseService.getInvestmentUniverse(forceRefresh);
      
      res.json({
        success: true,
        data: universe,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching investment universe:', error);
      res.status(500).json({
        error: 'Fehler beim Laden des Investment Universe',
        message: (error as Error).message
      });
    }
  });

  // Search instruments in investment universe
  app.get("/api/investment-universe/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.status(400).json({
          error: 'Suchbegriff zu kurz',
          message: 'Bitte geben Sie mindestens 2 Zeichen ein'
        });
      }

      const instruments = await investmentUniverseService.searchInstruments(query);
      
      res.json({
        success: true,
        data: {
          instruments,
          totalFound: instruments.length,
          query
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error searching investment universe:', error);
      res.status(500).json({
        error: 'Fehler bei der Suche',
        message: (error as Error).message
      });
    }
  });

  // Get instruments by asset class
  app.get("/api/investment-universe/asset-class/:assetClass", async (req, res) => {
    try {
      const { assetClass } = req.params;
      const instruments = await investmentUniverseService.getInstrumentsByAssetClass(assetClass);
      
      res.json({
        success: true,
        data: {
          instruments,
          assetClass,
          totalFound: instruments.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching instruments by asset class:', error);
      res.status(500).json({
        error: 'Fehler beim Laden der Asset-Klasse',
        message: (error as Error).message
      });
    }
  });

  // Get instruments by category
  app.get("/api/investment-universe/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const instruments = await investmentUniverseService.getInstrumentsByCategory(category);
      
      res.json({
        success: true,
        data: {
          instruments,
          category,
          totalFound: instruments.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching instruments by category:', error);
      res.status(500).json({
        error: 'Fehler beim Laden der Kategorie',
        message: (error as Error).message
      });
    }
  });

  // Validate if instrument exists in universe
  app.post("/api/investment-universe/validate", async (req, res) => {
    try {
      const { name, isin } = req.body;
      
      if (!name) {
        return res.status(400).json({
          error: 'Instrumentenname erforderlich',
          message: 'Bitte geben Sie einen Instrumentennamen an'
        });
      }

      const exists = await investmentUniverseService.validateInstrument(name, isin);
      const details = exists ? await investmentUniverseService.getInstrumentDetails(name, isin) : null;
      
      res.json({
        success: true,
        data: {
          exists,
          instrument: details,
          name,
          isin
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error validating instrument:', error);
      res.status(500).json({
        error: 'Fehler bei der Validierung',
        message: (error as Error).message
      });
    }
  });

  // Get instrument details
  app.get("/api/investment-universe/instrument/:identifier", async (req, res) => {
    try {
      const { identifier } = req.params;
      const isIsin = identifier.length === 12 && /^[A-Z]{2}[A-Z0-9]{10}$/.test(identifier);
      
      const details = isIsin 
        ? await investmentUniverseService.getInstrumentDetails('', identifier)
        : await investmentUniverseService.getInstrumentDetails(identifier);
      
      if (!details) {
        return res.status(404).json({
          error: 'Instrument nicht gefunden',
          message: `Das Instrument "${identifier}" wurde im Investment Universe nicht gefunden`
        });
      }
      
      res.json({
        success: true,
        data: details,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching instrument details:', error);
      res.status(500).json({
        error: 'Fehler beim Laden der Instrumentendetails',
        message: (error as Error).message
      });
    }
  });

  // Force refresh investment universe cache (admin endpoint)
  app.post("/api/investment-universe/refresh", async (req, res) => {
    try {
      await investmentUniverseService.refreshCache();
      const universe = await investmentUniverseService.getInvestmentUniverse();
      
      res.json({
        success: true,
        message: 'Investment Universe Cache wurde erneuert',
        data: {
          totalInstruments: universe.totalCount,
          assetClasses: universe.assetClasses.length,
          categories: universe.categories.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error refreshing investment universe:', error);
      res.status(500).json({
        error: 'Fehler beim Aktualisieren des Cache',
        message: (error as Error).message
      });
    }
  });

  // Portfolio Chat API Endpoints
  // MIGRATED: Now using unified claudeService instead of separate PortfolioChat instance

  // Initialize or get chat session for a portfolio
  app.post("/api/portfolios/:id/chat/session", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const { userId, sessionName } = req.body;

      // Check if portfolio exists
      const portfolio = await storage.getPortfolio(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio nicht gefunden" });
      }

      const session = await claudeService.initializeChatSession(portfolioId, userId);
      
      // Log security event for new session creation
      await portfolioSecurity.logSecurityEvent('session_created', session.id, portfolioId, { userId, sessionName });
      
      res.json({
        success: true,
        data: session,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error creating chat session:', error);
      res.status(500).json({ 
        error: "Fehler beim Erstellen der Chat-Session",
        message: error instanceof Error ? error.message : "Unbekannter Fehler"
      });
    }
  });

  // Get chat sessions for a portfolio
  app.get("/api/portfolios/:id/chat/sessions", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      
      const sessions = await storage.getChatSessions(portfolioId);
      
      res.json({
        success: true,
        data: sessions,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      res.status(500).json({ 
        error: "Fehler beim Abrufen der Chat-Sessions"
      });
    }
  });

  // Send message to chat session
  app.post("/api/chat/:sessionId/message", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const { message } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({ 
          error: "Nachricht darf nicht leer sein" 
        });
      }

      // Get session and build context
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Chat-Session nicht gefunden" });
      }

      // Security: Validate session access to portfolio
      const hasAccess = await portfolioSecurity.validateSessionAccess(sessionId, session.portfolioId!);
      if (!hasAccess) {
        await portfolioSecurity.logSecurityEvent('unauthorized_message_attempt', sessionId, session.portfolioId!, { message: message.substring(0, 50) });
        return res.status(403).json({ 
          error: "Zugriff verweigert",
          message: "Sie haben keinen Zugriff auf dieses Portfolio" 
        });
      }

      const previousMessages = await claudeService.getChatHistory(sessionId);
      const portfolioKnowledge = await claudeService.getPortfolioInsights(session.portfolioId!);

      const context = {
        portfolioId: session.portfolioId!,
        sessionId,
        previousMessages,
        portfolioKnowledge
      };

      // Process message using unified claudeService
      const result = await claudeService.processMessage(message, context);
      
      // Update session last message time
      await storage.updateChatSession(sessionId, {
        lastMessageAt: new Date().toISOString()
      });

      res.json({
        success: true,
        data: {
          response: result.response,
          intent: result.intent,
          actions: result.actions,
          analysisData: result.analysisData
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error processing chat message:', error);
      res.status(500).json({ 
        error: "Fehler bei der Nachrichtenverarbeitung",
        message: error instanceof Error ? error.message : "Unbekannter Fehler"
      });
    }
  });

  // Get chat history
  app.get("/api/chat/:sessionId/history", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const limit = parseInt(req.query.limit as string) || 50;

      // Get session to validate access
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Chat-Session nicht gefunden" });
      }

      // Security: Validate session access
      const hasAccess = await portfolioSecurity.validateSessionAccess(sessionId, session.portfolioId!);
      if (!hasAccess) {
        return res.status(403).json({ 
          error: "Zugriff verweigert",
          message: "Sie haben keinen Zugriff auf diese Chat-Historie" 
        });
      }

      const messages = await claudeService.getChatHistory(sessionId);
      const limitedMessages = messages.slice(-limit);

      res.json({
        success: true,
        data: {
          messages: limitedMessages,
          totalCount: messages.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error fetching chat history:', error);
      res.status(500).json({ 
        error: "Fehler beim Abrufen des Chat-Verlaufs"
      });
    }
  });

  // Apply portfolio changes suggested in chat
  app.post("/api/chat/:sessionId/apply-changes", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const { changeRequest } = req.body;

      // Get session to find portfolio ID
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Chat-Session nicht gefunden" });
      }

      // Security: Validate session access to portfolio
      const hasAccess = await portfolioSecurity.validateSessionAccess(sessionId, session.portfolioId!);
      if (!hasAccess) {
        await portfolioSecurity.logSecurityEvent('unauthorized_change_attempt', sessionId, session.portfolioId!, { changeRequest });
        return res.status(403).json({ 
          error: "Zugriff verweigert",
          message: "Sie haben keinen Zugriff auf dieses Portfolio" 
        });
      }

      // Validate change request
      const validatedRequest = portfolioChangeRequestSchema.parse(changeRequest);
      
      // Apply changes using unified claudeService
      const analysis = await claudeService.applyChanges(session.portfolioId!, validatedRequest);
      
      // Trigger portfolio re-analysis orchestration after changes
      console.log(`🎯 Orchestrating post-change analysis for portfolio ${session.portfolioId}`);
      try {
        const orchestrationResult = await claudeService.orchestratePortfolioAnalysis(
          session.portfolioId!, 
          ['look_through', 'risk_metrics', 'compliance']
        );
        console.log(`✅ Post-change orchestration completed: ${orchestrationResult.orchestrationId}`);
      } catch (orchestrationError) {
        console.error('⚠️ Post-change orchestration failed:', orchestrationError);
        // Continue with the response even if orchestration fails
      }
      
      // Log the action in chat
      await claudeService.addChatMessage(
        sessionId, 
        'assistant', 
        'Portfolio-Änderungen wurden angewendet und analysiert. Die Auswirkungen werden automatisch berechnet.',
        { 
          action: 'changes_applied',
          analysis,
          orchestrationTriggered: true
        }
      );

      res.json({
        success: true,
        data: analysis,
        orchestrationTriggered: true,
        message: "Portfolio-Änderungen angewendet. Vollständige Neuanalyse läuft im Hintergrund.",
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error applying chat changes:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Ungültige Änderungsanfrage",
          validationErrors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      
      res.status(500).json({ 
        error: "Fehler beim Anwenden der Änderungen",
        message: error instanceof Error ? error.message : "Unbekannter Fehler"
      });
    }
  });

  // Delete chat session
  app.delete("/api/chat/:sessionId", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      
      // Get session before deletion for security logging
      const session = await storage.getChatSession(sessionId);
      if (session) {
        // Clear security context
        portfolioSecurity.clearSessionContext(sessionId);
        await portfolioSecurity.logSecurityEvent('session_deleted', sessionId, session.portfolioId!, {});
      }
      
      const deleted = await storage.deleteChatSession(sessionId);
      
      if (!deleted) {
        return res.status(404).json({ 
          error: "Chat-Session nicht gefunden oder bereits gelöscht" 
        });
      }

      res.json({
        success: true,
        message: "Chat-Session erfolgreich gelöscht",
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error deleting chat session:', error);
      res.status(500).json({ 
        error: "Fehler beim Löschen der Chat-Session"
      });
    }
  });

  // ===== PHASE 11: NEW ADVANCED ANALYSIS ENDPOINTS (UNIFIED CLAUDE.TS) =====

  // Multi-Level Look-Through Analysis
  app.post("/api/portfolios/:id/look-through-analysis", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      
      // Get portfolio positions
      const positions = await storage.getPortfolioPositions(portfolioId);
      if (!positions || positions.length === 0) {
        return res.status(404).json({ error: "Portfolio oder Positionen nicht gefunden" });
      }

      // Perform look-through analysis using unified Claude service
      console.log(`🔍 Performing look-through analysis for portfolio ${portfolioId}`);
      const lookThroughResults = await claudeService.performMultiLevelLookThrough(
        positions.map(pos => ({
          name: pos.name,
          isin: pos.isin || undefined,
          value: pos.value,
          instrumentType: pos.instrumentType || undefined
        }))
      );

      res.json({
        success: true,
        data: lookThroughResults,
        portfolioId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in look-through analysis:', error);
      res.status(500).json({ 
        error: "Fehler bei Look-Through-Analyse",
        message: error instanceof Error ? error.message : "Unbekannter Fehler"
      });
    }
  });

  // Hybrid Risk Metrics Calculation
  app.post("/api/portfolios/:id/risk-metrics", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const { includeLookThrough = false } = req.body;
      
      // Get portfolio positions
      const positions = await storage.getPortfolioPositions(portfolioId);
      if (!positions || positions.length === 0) {
        return res.status(404).json({ error: "Portfolio oder Positionen nicht gefunden" });
      }

      const positionsData = positions.map(pos => ({
        name: pos.name,
        isin: pos.isin || undefined,
        value: pos.value,
        instrumentType: pos.instrumentType || undefined
      }));

      // Optionally include look-through analysis
      let lookThroughResults;
      if (includeLookThrough) {
        lookThroughResults = await claudeService.performMultiLevelLookThrough(positionsData);
      }

      // Calculate hybrid risk metrics using unified Claude service
      console.log(`📊 Calculating risk metrics for portfolio ${portfolioId}`);
      const riskMetrics = await claudeService.calculateHybridRiskMetrics(positionsData, lookThroughResults);

      res.json({
        success: true,
        data: riskMetrics,
        portfolioId,
        includedLookThrough: includeLookThrough,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in risk metrics calculation:', error);
      res.status(500).json({ 
        error: "Fehler bei Risikometriken-Berechnung",
        message: error instanceof Error ? error.message : "Unbekannter Fehler"
      });
    }
  });

  // German Compliance Reporting
  app.post("/api/portfolios/:id/compliance-report", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const { 
        reportType = 'full_compliance',
        includeLookThrough = false,
        includeRiskMetrics = false 
      } = req.body;

      // Validate report type
      const validReportTypes = ['mifid_ii', 'wphg', 'bafin_srep', 'tax_optimization', 'full_compliance'];
      if (!validReportTypes.includes(reportType)) {
        return res.status(400).json({ 
          error: "Ungültiger Report-Typ",
          validTypes: validReportTypes 
        });
      }

      // Get portfolio data
      const portfolio = await storage.getPortfolio(portfolioId);
      const positions = await storage.getPortfolioPositions(portfolioId);
      
      if (!portfolio || !positions || positions.length === 0) {
        return res.status(404).json({ error: "Portfolio oder Positionen nicht gefunden" });
      }

      const portfolioData = {
        ...portfolio,
        positions: positions,
        totalValue: portfolio.totalValue
      };

      // Optional analyses
      let lookThroughResults, riskMetrics;
      
      if (includeLookThrough || reportType === 'full_compliance') {
        lookThroughResults = await claudeService.performMultiLevelLookThrough(
          positions.map(pos => ({
            name: pos.name,
            isin: pos.isin || undefined,
            value: pos.value,
            instrumentType: pos.instrumentType || undefined
          }))
        );
      }

      if (includeRiskMetrics || reportType === 'bafin_srep' || reportType === 'full_compliance') {
        riskMetrics = await claudeService.calculateHybridRiskMetrics(
          positions.map(pos => ({
            name: pos.name,
            isin: pos.isin || undefined,
            value: pos.value,
            instrumentType: pos.instrumentType || undefined
          })),
          lookThroughResults
        );
      }

      // Generate compliance report using unified Claude service
      console.log(`📋 Generating ${reportType} compliance report for portfolio ${portfolioId}`);
      const complianceReport = await claudeService.generateGermanComplianceReport(
        portfolioId,
        reportType as any,
        portfolioData,
        lookThroughResults,
        riskMetrics
      );

      res.json({
        success: true,
        data: complianceReport,
        portfolioId,
        reportType,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error generating compliance report:', error);
      res.status(500).json({ 
        error: "Fehler bei Compliance-Report-Generierung",
        message: error instanceof Error ? error.message : "Unbekannter Fehler"
      });
    }
  });

  // Investment Universe Maintenance Status
  app.get("/api/portfolios/:id/maintenance-status", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      
      // Get portfolio to verify it exists
      const portfolio = await storage.getPortfolio(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio nicht gefunden" });
      }

      // Get maintenance status using unified Claude service
      console.log(`🔧 Getting maintenance status for portfolio ${portfolioId}`);
      const maintenanceResults = await claudeService.performInvestmentUniverseMaintenance();

      res.json({
        success: true,
        data: maintenanceResults,
        portfolioId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error getting maintenance status:', error);
      res.status(500).json({ 
        error: "Fehler beim Abrufen des Maintenance-Status",
        message: error instanceof Error ? error.message : "Unbekannter Fehler"
      });
    }
  });

  // Combined Advanced Analysis Endpoint (Orchestrated)
  app.post("/api/portfolios/:id/advanced-analysis", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const { 
        includeLookThrough = true,
        includeRiskMetrics = true,
        includeCompliance = false,
        complianceReportType = 'mifid_ii'
      } = req.body;

      // Get portfolio data
      const portfolio = await storage.getPortfolio(portfolioId);
      const positions = await storage.getPortfolioPositions(portfolioId);
      
      if (!portfolio || !positions || positions.length === 0) {
        return res.status(404).json({ error: "Portfolio oder Positionen nicht gefunden" });
      }

      const positionsData = positions.map(pos => ({
        name: pos.name,
        isin: pos.isin || undefined,
        value: pos.value,
        instrumentType: pos.instrumentType || undefined
      }));

      // Orchestrated analysis using unified Claude service
      console.log(`🎯 Performing orchestrated advanced analysis for portfolio ${portfolioId}`);
      
      const results: any = {
        portfolioId,
        timestamp: new Date().toISOString(),
        analyses: {}
      };

      // Look-through analysis
      if (includeLookThrough) {
        results.analyses.lookThrough = await claudeService.performMultiLevelLookThrough(positionsData);
      }

      // Risk metrics
      if (includeRiskMetrics) {
        results.analyses.riskMetrics = await claudeService.calculateHybridRiskMetrics(
          positionsData, 
          results.analyses.lookThrough
        );
      }

      // Compliance reporting
      if (includeCompliance) {
        const portfolioData = { ...portfolio, positions, totalValue: portfolio.totalValue };
        results.analyses.compliance = await claudeService.generateGermanComplianceReport(
          portfolioId,
          complianceReportType as any,
          portfolioData,
          results.analyses.lookThrough,
          results.analyses.riskMetrics
        );
      }

      res.json({
        success: true,
        data: results,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in advanced analysis:', error);
      res.status(500).json({ 
        error: "Fehler bei erweiterter Analyse",
        message: error instanceof Error ? error.message : "Unbekannter Fehler"
      });
    }
  });

  // ===== PHASE 12: HIGH-PERFORMANCE ORCHESTRATION ENDPOINTS =====

  // Orchestrated Portfolio Analysis
  app.post("/api/portfolios/:id/orchestrate", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const { analysisTypes = ['look_through', 'risk_metrics'] } = req.body;

      // Validate analysis types
      const validTypes = ['look_through', 'risk_metrics', 'compliance', 'maintenance'];
      const invalidTypes = analysisTypes.filter((type: string) => !validTypes.includes(type));
      if (invalidTypes.length > 0) {
        return res.status(400).json({
          error: "Ungültige Analyse-Typen",
          invalidTypes,
          validTypes
        });
      }

      // Orchestrate portfolio analysis using unified Claude service
      console.log(`🎯 Orchestrating portfolio analysis for ${portfolioId}: ${analysisTypes.join(', ')}`);
      const orchestrationResult = await claudeService.orchestratePortfolioAnalysis(portfolioId, analysisTypes);

      res.json({
        success: true,
        data: orchestrationResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in portfolio orchestration:', error);
      res.status(500).json({
        error: "Fehler bei Portfolio-Orchestrierung",
        message: error instanceof Error ? error.message : "Unbekannter Fehler"
      });
    }
  });

  // Orchestrated Compliance Reporting
  app.post("/api/portfolios/:id/orchestrate-compliance", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const { reportTypes = ['mifid_ii'] } = req.body;

      // Validate report types
      const validTypes = ['mifid_ii', 'wphg', 'bafin_srep', 'tax_optimization'];
      const invalidTypes = reportTypes.filter((type: string) => !validTypes.includes(type));
      if (invalidTypes.length > 0) {
        return res.status(400).json({
          error: "Ungültige Report-Typen",
          invalidTypes,
          validTypes
        });
      }

      // Orchestrate compliance reporting using unified Claude service
      console.log(`📋 Orchestrating compliance reporting for ${portfolioId}: ${reportTypes.join(', ')}`);
      const orchestrationResult = await claudeService.orchestrateComplianceReporting(portfolioId, reportTypes);

      res.json({
        success: true,
        data: orchestrationResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in compliance orchestration:', error);
      res.status(500).json({
        error: "Fehler bei Compliance-Orchestrierung",
        message: error instanceof Error ? error.message : "Unbekannter Fehler"
      });
    }
  });

  // Orchestrated Maintenance Tasks
  app.post("/api/system/orchestrate-maintenance", async (req, res) => {
    try {
      const { scheduleType = 'daily' } = req.body;

      // Validate schedule type
      const validTypes = ['daily', 'weekly', 'monthly'];
      if (!validTypes.includes(scheduleType)) {
        return res.status(400).json({
          error: "Ungültiger Schedule-Typ",
          provided: scheduleType,
          validTypes
        });
      }

      // Orchestrate maintenance tasks using unified Claude service
      console.log(`🔧 Orchestrating maintenance tasks: ${scheduleType}`);
      const orchestrationResult = await claudeService.orchestrateMaintenanceTasks(scheduleType);

      res.json({
        success: true,
        data: orchestrationResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in maintenance orchestration:', error);
      res.status(500).json({
        error: "Fehler bei Maintenance-Orchestrierung",
        message: error instanceof Error ? error.message : "Unbekannter Fehler"
      });
    }
  });

  // ===== PORTFOLIO COMPARISON ENDPOINTS (VORHER-NACHHER-VERGLEICH) =====
  // All comparison endpoints use the unified Claude AI service

  // Create portfolio scenario for comparison
  app.post("/api/portfolios/:id/scenarios/create", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const { changeRequest, scenarioName } = req.body;
      
      if (!changeRequest || !scenarioName) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'changeRequest and scenarioName are required',
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`🔄 Creating scenario "${scenarioName}" for portfolio ${portfolioId}`);
      
      // Use unified Claude AI service for scenario creation
      const scenario = await claudeService.createPortfolioScenario(
        portfolioId,
        changeRequest,
        scenarioName
      );
      
      res.json({
        success: true,
        data: scenario,
        message: `Portfolio-Szenario "${scenarioName}" wurde erfolgreich erstellt`,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error creating portfolio scenario:', error);
      res.status(500).json({
        error: 'Scenario creation failed',
        message: 'Portfolio-Szenario konnte nicht erstellt werden: ' + (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Calculate portfolio comparison (before/after analysis)
  app.post("/api/portfolios/:id/compare/:scenarioId", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const scenarioId = req.params.scenarioId;
      const { includeRiskMetrics = true, includeCompliance = true } = req.body;
      
      console.log(`📊 Calculating comparison for portfolio ${portfolioId} vs scenario ${scenarioId}`);
      
      // Use unified Claude AI service for comprehensive comparison
      const comparison = await claudeService.calculatePortfolioComparison(
        portfolioId,
        scenarioId,
        { includeRiskMetrics, includeCompliance }
      );
      
      res.json({
        success: true,
        data: comparison,
        message: 'Portfolio-Vergleichsanalyse erfolgreich abgeschlossen',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error calculating portfolio comparison:', error);
      res.status(500).json({
        error: 'Comparison calculation failed',
        message: 'Portfolio-Vergleich konnte nicht berechnet werden: ' + (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Analyze scenario impact with Claude AI
  app.post("/api/portfolios/:id/scenarios/:scenarioId/impact", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const scenarioId = req.params.scenarioId;
      const { focusAreas = ['risk', 'allocation', 'compliance'] } = req.body;
      
      console.log(`🔍 Analyzing impact for scenario ${scenarioId} - Focus: ${focusAreas.join(', ')}`);
      
      // Use unified Claude AI for intelligent impact analysis
      const impactAnalysis = await claudeService.analyzeScenarioImpact(
        portfolioId,
        scenarioId,
        focusAreas
      );
      
      res.json({
        success: true,
        data: impactAnalysis,
        message: 'Szenario-Auswirkungsanalyse erfolgreich abgeschlossen',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error analyzing scenario impact:', error);
      res.status(500).json({
        error: 'Impact analysis failed',
        message: 'Szenario-Auswirkungsanalyse fehlgeschlagen: ' + (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Validate scenario changes for German banking compliance
  app.post("/api/portfolios/:id/scenarios/validate", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const { changeRequest, complianceStandards = ['bafin', 'mifid_ii', 'wphg'] } = req.body;
      
      if (!changeRequest) {
        return res.status(400).json({
          error: 'Missing change request',
          message: 'changeRequest ist erforderlich für Compliance-Validierung',
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`✅ Validating changes against: ${complianceStandards.join(', ')}`);
      
      // Use unified Claude AI for German banking compliance validation
      const validation = await claudeService.validateScenarioChanges(
        portfolioId,
        changeRequest,
        complianceStandards
      );
      
      res.json({
        success: true,
        data: validation,
        message: `Compliance-Validierung abgeschlossen - Status: ${validation.isCompliant ? 'KONFORM' : 'PRÜFUNG ERFORDERLICH'}`,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error validating scenario changes:', error);
      res.status(500).json({
        error: 'Compliance validation failed',
        message: 'Compliance-Validierung fehlgeschlagen: ' + (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get scenario list for a portfolio
  app.get("/api/portfolios/:id/scenarios", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      
      console.log(`📋 Getting scenarios for portfolio ${portfolioId}`);
      
      // Get all scenarios (snapshots with type 'change_simulation')
      const snapshots = await storage.getPortfolioSnapshots(portfolioId);
      const scenarios = snapshots.filter(snapshot => snapshot.snapshotType === 'change_simulation');
      
      const scenarioList = scenarios.map(scenario => ({
        scenarioId: scenario.id,
        scenarioName: scenario.metadata?.scenarioName || 'Unnamed Scenario',
        description: scenario.description,
        createdAt: scenario.createdAt,
        totalValue: scenario.totalValue,
        positionCount: Array.isArray(scenario.positions) ? scenario.positions.length : 0,
        changeType: scenario.metadata?.changeRequest?.changeType || 'unknown',
        metadata: scenario.metadata
      }));
      
      res.json({
        success: true,
        data: scenarioList,
        message: `${scenarios.length} Portfolio-Szenarien gefunden`,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error getting scenarios:', error);
      res.status(500).json({
        error: 'Failed to get scenarios',
        message: 'Szenarien konnten nicht geladen werden: ' + (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Delete a scenario
  app.delete("/api/portfolios/:id/scenarios/:scenarioId", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const scenarioId = req.params.scenarioId;
      
      console.log(`🗑️ Deleting scenario ${scenarioId} for portfolio ${portfolioId}`);
      
      // Delete scenario snapshot
      const deleted = await storage.deletePortfolioSnapshot(scenarioId);
      
      if (deleted) {
        res.json({
          success: true,
          message: 'Portfolio-Szenario erfolgreich gelöscht',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          error: 'Scenario not found',
          message: 'Das angegebene Portfolio-Szenario wurde nicht gefunden',
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Error deleting scenario:', error);
      res.status(500).json({
        error: 'Failed to delete scenario',
        message: 'Szenario konnte nicht gelöscht werden: ' + (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Quick comparison endpoint (simplified for UI)
  app.post("/api/portfolios/:id/compare/preview", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const { changes, scenarioName = 'Quick Preview' } = req.body;
      
      if (!changes || !Array.isArray(changes) || changes.length === 0) {
        return res.status(400).json({
          error: 'Missing changes',
          message: 'changes array ist erforderlich für Vorschau-Vergleich',
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`⚡ Quick comparison preview for portfolio ${portfolioId}`);
      
      // Create temporary scenario for quick preview
      const changeRequest = {
        changeType: 'preview',
        changes,
        scenarioName,
        analysisDate: new Date().toISOString()
      };
      
      // Create scenario and immediately run comparison
      const scenario = await claudeService.createPortfolioScenario(
        portfolioId,
        changeRequest,
        `Preview: ${scenarioName}`
      );
      
      const comparison = await claudeService.calculatePortfolioComparison(
        portfolioId,
        scenario.scenarioId,
        { includeRiskMetrics: true, includeCompliance: false }
      );
      
      // Clean up temporary scenario after comparison
      await storage.deletePortfolioSnapshot(scenario.scenarioId);
      
      res.json({
        success: true,
        data: {
          comparison,
          preview: true,
          changes: changes.length,
          timestamp: new Date().toISOString()
        },
        message: 'Vorschau-Vergleich erfolgreich erstellt',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error creating comparison preview:', error);
      res.status(500).json({
        error: 'Preview comparison failed',
        message: 'Vorschau-Vergleich fehlgeschlagen: ' + (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Enhanced error handling middleware with rate limiting support
  app.use((error: Error, req: any, res: any, next: any) => {
    console.error('Unhandled error in request:', error);
    
    if (res.headersSent) {
      return next(error);
    }
    
    // Handle specific error types
    let statusCode = 500;
    let errorResponse: any = {
      error: 'Interner Serverfehler',
      message: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
      requestId: req.headers['x-request-id'] || 'unknown'
    };
    
    // Rate limiting errors
    if (error.message?.includes('rate') || error.message?.includes('Too many')) {
      statusCode = 429;
      errorResponse = {
        error: 'Anfragen-Limit erreicht',
        message: 'Sie haben zu viele Anfragen gestellt. Bitte warten Sie einen Moment und versuchen Sie es erneut.',
        retryAfter: '15 Minuten',
        requestId: req.headers['x-request-id'] || 'unknown',
        tips: [
          'Portfolio-Analysen benötigen mehrere API-Aufrufe - bitte haben Sie Geduld',
          'Vermeiden Sie gleichzeitige Uploads mehrerer Portfolios',
          'Der Cache reduziert wiederholte Anfragen automatisch'
        ]
      };
    }
    
    // Claude API errors
    if (error.message?.includes('Claude') || error.message?.includes('Anthropic')) {
      statusCode = 503;
      errorResponse = {
        error: 'KI-Service vorübergehend nicht verfügbar',
        message: 'Der Analyse-Service ist momentan überlastet. Bitte versuchen Sie es in wenigen Minuten erneut.',
        requestId: req.headers['x-request-id'] || 'unknown',
        tips: [
          'Das System versucht automatisch mehrere Male, die Anfrage zu verarbeiten',
          'Bereits verarbeitete Daten werden zwischengespeichert',
          'Bei wiederholten Problemen prüfen Sie die Systemgesundheit unter /api/system/health'
        ]
      };
    }
    
    // Validation errors  
    if (error.message?.includes('validation') || error.message?.includes('invalid')) {
      statusCode = 400;
      errorResponse = {
        error: 'Validierungsfehler',
        message: 'Die eingegebenen Daten konnten nicht validiert werden.',
        details: error.message,
        requestId: req.headers['x-request-id'] || 'unknown'
      };
    }
    
    res.status(statusCode).json(errorResponse);
  });

  const httpServer = createServer(app);
  
  // Handle uncaught errors gracefully
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't crash the process, but log the error
  });
  
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Log the error but don't crash immediately - allow graceful shutdown
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
  
  return httpServer;
}
