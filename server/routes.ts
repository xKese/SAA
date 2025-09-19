import { Express, Request, Response } from "express";
import multer from "multer";
import { Server } from "http";
import { storage } from "./storage";
import { claudeService } from "./services/claude-simple";
import { parseCSV } from "./services/csv-parser";
import { InvestmentUniverseService } from "./services/investment-universe";
import {
  liquidityOptimizationSchema,
  tradeExecutionSchema,
  optimizationProposals,
  tradeExecutions
} from "../shared/schema";
import { performanceMiddleware, performanceMonitor } from "./utils/performance-monitor";
import { setupPerformanceRoutes } from "./routes/performance";

// Rate limiting and caching for factsheet operations
const factsheetCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const lastRequestTimes = new Map<string, number>();
const RATE_LIMIT_DELAY = 1000; // 1 second between requests per IP

// Middleware for rate limiting factsheet requests
const factsheetRateLimit = (req: any, res: any, next: any) => {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const lastRequest = lastRequestTimes.get(clientIp);

  if (lastRequest && (now - lastRequest) < RATE_LIMIT_DELAY) {
    return res.status(429).json({ error: "Zu viele Anfragen. Bitte warten Sie einen Moment." });
  }

  lastRequestTimes.set(clientIp, now);
  next();
};

// Cache helper functions
const getCachedData = (key: string) => {
  const cached = factsheetCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  factsheetCache.delete(key);
  return null;
};

const setCachedData = (key: string, data: any) => {
  factsheetCache.set(key, { data, timestamp: Date.now() });
};

// Performance monitoring
const performanceMonitor = {
  requestTimes: new Map<string, number[]>(),
  logRequest: (endpoint: string, duration: number) => {
    if (!performanceMonitor.requestTimes.has(endpoint)) {
      performanceMonitor.requestTimes.set(endpoint, []);
    }
    const times = performanceMonitor.requestTimes.get(endpoint)!;
    times.push(duration);
    // Keep only last 100 requests
    if (times.length > 100) {
      times.shift();
    }
  },
  getStats: () => {
    const stats: any = {};
    for (const [endpoint, times] of performanceMonitor.requestTimes) {
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const max = Math.max(...times);
        const min = Math.min(...times);
        stats[endpoint] = { avg, max, min, requests: times.length };
      }
    }
    return stats;
  }
};

// Security headers middleware for factsheet endpoints
const securityHeaders = (req: any, res: any, next: any) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

const investmentUniverseService = new InvestmentUniverseService();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString() 
    });
  });

  // Get all portfolios (just basic info, no analysis)
  app.get("/api/portfolios", async (req, res) => {
    try {
      const portfolios = await storage.getAllPortfolios();
      res.json(portfolios);
    } catch (error) {
      console.error("Error fetching portfolios:", error);
      res.status(500).json({ error: "Fehler beim Laden der Portfolios" });
    }
  });

  // Get single portfolio by ID
  app.get("/api/portfolios/:id", async (req, res) => {
    try {
      const portfolio = await storage.getPortfolio(req.params.id);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio nicht gefunden" });
      }
      res.json(portfolio);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      res.status(500).json({ error: "Fehler beim Laden des Portfolios" });
    }
  });

  // Upload new portfolio (just parse and store, no analysis)
  app.post("/api/portfolios/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Keine Datei hochgeladen" });
      }

      const fileContent = req.file.buffer.toString("utf-8");
      const { positions, totalValue } = await parseCSV(fileContent);

      // Create portfolio record
      const portfolio = await storage.createPortfolio({
        name: req.file.originalname,
        fileName: req.file.originalname,
        totalValue: totalValue.toString(),
        positionCount: positions.length,
        analysisStatus: "pending"
      });

      // Store positions
      for (const position of positions) {
        await storage.createPortfolioPosition({
          portfolioId: portfolio.id,
          name: position.name,
          isin: position.isin || null,
          value: position.value.toString(),
          percentage: ((position.value / totalValue) * 100).toString()
        });
      }

      res.json({
        success: true,
        portfolio,
        positionCount: positions.length
      });
    } catch (error) {
      console.error("Error uploading portfolio:", error);
      res.status(500).json({ error: "Fehler beim Hochladen des Portfolios" });
    }
  });

  // Start Claude analysis (delegate everything to Claude)
  app.post("/api/portfolios/:id/analyze", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const portfolio = await storage.getPortfolio(portfolioId);
      
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio nicht gefunden" });
      }

      // Get positions
      const positions = await storage.getPortfolioPositions(portfolioId);
      
      // Update status
      await storage.updatePortfolio(portfolioId, {
        analysisStatus: "analyzing"
      });

      // Convert positions to format expected by Claude
      const claudePositions = positions.map(p => ({
        name: p.name,
        isin: p.isin,
        value: parseFloat(p.value)
      }));

      // Send to Claude for analysis
      const analysisResults = await claudeService.analyzePortfolio(claudePositions, {
        portfolioId,
        totalValue: parseFloat(portfolio.totalValue || "0")
      });

      // Store results
      await storage.updatePortfolio(portfolioId, {
        analysisStatus: "completed",
        analysisResults
      });

      res.json({
        success: true,
        analysisResults
      });
    } catch (error) {
      console.error("Error analyzing portfolio:", error);
      
      await storage.updatePortfolio(req.params.id, {
        analysisStatus: "failed"
      });
      
      res.status(500).json({ error: "Fehler bei der Analyse" });
    }
  });

  // Get portfolio positions
  app.get("/api/portfolios/:id/positions", async (req, res) => {
    try {
      const positions = await storage.getPortfolioPositions(req.params.id);
      res.json(positions);
    } catch (error) {
      console.error("Error fetching positions:", error);
      res.status(500).json({ error: "Fehler beim Laden der Positionen" });
    }
  });

  // Delete portfolio
  app.delete("/api/portfolios/:id", async (req, res) => {
    try {
      await storage.deletePortfolio(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting portfolio:", error);
      res.status(500).json({ error: "Fehler beim Löschen des Portfolios" });
    }
  });

  // Portfolio Target Structure Endpoints
  
  // Create or update portfolio target structure
  app.post("/api/portfolios/:id/targets", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const { name, description, targets, constraints } = req.body;

      // Validate that percentages sum to ~100% for each category
      const validatePercentages = (allocations: any[]) => {
        if (!allocations || allocations.length === 0) return true;
        const sum = allocations.reduce((total, item) => total + (item.targetPercentage || 0), 0);
        return Math.abs(sum - 100) <= 1; // Allow 1% tolerance
      };

      if (targets.assetClasses && !validatePercentages(targets.assetClasses)) {
        return res.status(400).json({ error: "Asset-Klassen müssen in der Summe 100% ergeben" });
      }
      if (targets.regions && !validatePercentages(targets.regions)) {
        return res.status(400).json({ error: "Regionen müssen in der Summe 100% ergeben" });
      }
      if (targets.currencies && !validatePercentages(targets.currencies)) {
        return res.status(400).json({ error: "Währungen müssen in der Summe 100% ergeben" });
      }

      // Store target structure using database
      const targetStructure = {
        portfolioId,
        name,
        description,
        targets: JSON.stringify(targets),
        constraints: JSON.stringify(constraints || {}),
        isActive: 'true'
      };

      // Note: This would need proper portfolio targets table implementation
      // For now, store the structure info and handle position targets separately
      const createdTargetStructure = {
        id: Date.now().toString(),
        ...targetStructure,
        targets: targets,
        constraints: constraints || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save individual position targets to the position_targets table
      if (targets.positions && Array.isArray(targets.positions)) {
        console.log(`💾 Saving ${targets.positions.length} position targets...`);
        
        for (const position of targets.positions) {
          if (position.identifier && position.targetPercentage > 0) {
            try {
              await storage.createPositionTarget({
                portfolioId,
                targetStructureId: createdTargetStructure.id,
                positionName: position.identifier,
                isin: position.isin || null,
                targetPercentage: position.targetPercentage.toString(),
                priority: 'medium',
                isActive: 'true'
              });
              console.log(`✅ Saved position target: ${position.identifier} -> ${position.targetPercentage}%`);
            } catch (error) {
              console.error(`❌ Failed to save position target for ${position.identifier}:`, error);
            }
          }
        }
      }

      console.log(`📊 Created target structure "${name}" for portfolio ${portfolioId}`);
      res.json(createdTargetStructure);
    } catch (error) {
      console.error("Error creating target structure:", error);
      res.status(500).json({ error: "Fehler beim Erstellen der Zielstruktur" });
    }
  });

  // Get portfolio target structures
  app.get("/api/portfolios/:id/targets", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      
      // For now, return empty array as we haven't implemented database storage yet
      res.json([]);
    } catch (error) {
      console.error("Error fetching target structures:", error);
      res.status(500).json({ error: "Fehler beim Laden der Zielstrukturen" });
    }
  });

  // Reallokation analysis endpoint
  app.post("/api/portfolios/:id/reallocation", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const { targetStructureId, targetStructure } = req.body;

      if (!targetStructure) {
        return res.status(400).json({ error: "Zielstruktur erforderlich" });
      }

      // Get portfolio data
      const portfolio = await storage.getPortfolio(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio nicht gefunden" });
      }

      const positions = await storage.getPortfolioPositions(portfolioId);
      if (!positions || positions.length === 0) {
        return res.status(400).json({ error: "Portfolio hat keine Positionen" });
      }

      // Get current analysis (if available)
      let currentAnalysis = portfolio.analysisResults;
      if (!currentAnalysis) {
        // If no analysis exists, create a basic one for comparison
        currentAnalysis = {
          assetAllocation: [],
          geographicAllocation: [],
          currencyExposure: [],
          summary: "Keine detaillierte Analyse verfügbar"
        };
      }

      // Get saved position targets if targetStructureId is provided
      let enhancedTargetStructure = targetStructure;
      if (targetStructureId) {
        try {
          const positionTargets = await storage.getPositionTargetsByStructure(targetStructureId);
          if (positionTargets && positionTargets.length > 0) {
            // Add position targets to the target structure
            enhancedTargetStructure = {
              ...targetStructure,
              targets: {
                ...targetStructure.targets,
                positions: positionTargets.map(pt => ({
                  identifier: pt.positionName,
                  isin: pt.isin,
                  targetPercentage: parseFloat(pt.targetPercentage as string),
                  priority: pt.priority
                }))
              }
            };
            console.log(`📍 Found ${positionTargets.length} position targets for reallocation analysis`);
          }
        } catch (error) {
          console.warn("Could not load position targets:", error);
          // Continue with original target structure
        }
      }

      // Perform Claude reallocation analysis
      const claudePositions = positions.map(p => ({
        name: p.name,
        isin: p.isin || null,
        value: parseFloat(p.value as string)
      }));

      console.log(`🔄 Starting reallocation analysis for portfolio ${portfolioId}...`);
      const reallocationResults = await claudeService.analyzeReallocation(
        claudePositions,
        currentAnalysis,
        enhancedTargetStructure,
        portfolioId
      );

      // Create reallocation analysis record
      const analysisRecord = {
        id: Date.now().toString(),
        portfolioId,
        targetStructureId: targetStructureId || 'manual',
        totalPortfolioValue: parseFloat(portfolio.totalValue || '0'),
        recommendations: reallocationResults.recommendations || [],
        summary: reallocationResults.summary || {},
        deviationAnalysis: reallocationResults.deviationAnalysis || {},
        claudeAnalysis: reallocationResults.claudeAnalysis || {},
        status: 'draft',
        analysisDate: new Date()
      };

      console.log(`✅ Reallokation analysis completed for portfolio ${portfolioId}`);
      res.json(analysisRecord);

    } catch (error) {
      console.error("Error performing reallocation analysis:", error);
      res.status(500).json({ 
        error: "Fehler bei der Reallokation-Analyse",
        details: error.message 
      });
    }
  });

  // Position Targets Endpoints
  
  // Create position target
  app.post("/api/portfolios/:portfolioId/position-targets", async (req, res) => {
    try {
      const portfolioId = req.params.portfolioId;
      const { positionName, isin, targetPercentage, targetStructureId, priority } = req.body;

      // Validate required fields
      if (!positionName || !targetPercentage) {
        return res.status(400).json({ 
          error: "Positionsname und Zielpercentage sind erforderlich" 
        });
      }

      // Validate percentage range
      if (targetPercentage < 0 || targetPercentage > 100) {
        return res.status(400).json({ 
          error: "Zielpercentage muss zwischen 0 und 100 liegen" 
        });
      }

      const positionTarget = await storage.createPositionTarget({
        portfolioId,
        targetStructureId: targetStructureId || null,
        positionName,
        isin: isin || null,
        targetPercentage: targetPercentage.toString(),
        priority: priority || 'medium',
        isActive: 'true'
      });

      res.json({ success: true, positionTarget });
    } catch (error) {
      console.error("Error creating position target:", error);
      res.status(500).json({ error: "Fehler beim Erstellen des Positionsziels" });
    }
  });

  // Get all position targets for a portfolio
  app.get("/api/portfolios/:portfolioId/position-targets", async (req, res) => {
    try {
      const portfolioId = req.params.portfolioId;
      const positionTargets = await storage.getPositionTargets(portfolioId);
      res.json({ success: true, positionTargets });
    } catch (error) {
      console.error("Error fetching position targets:", error);
      res.status(500).json({ error: "Fehler beim Laden der Positionsziele" });
    }
  });

  // Update position target
  app.put("/api/portfolios/:portfolioId/position-targets/:targetId", async (req, res) => {
    try {
      const targetId = req.params.targetId;
      const updates = req.body;

      // Validate percentage if provided
      if (updates.targetPercentage !== undefined) {
        const percentage = parseFloat(updates.targetPercentage);
        if (percentage < 0 || percentage > 100) {
          return res.status(400).json({ 
            error: "Zielpercentage muss zwischen 0 und 100 liegen" 
          });
        }
        updates.targetPercentage = percentage.toString();
      }

      const updatedTarget = await storage.updatePositionTarget(targetId, updates);
      
      if (!updatedTarget) {
        return res.status(404).json({ error: "Positionsziel nicht gefunden" });
      }

      res.json({ success: true, positionTarget: updatedTarget });
    } catch (error) {
      console.error("Error updating position target:", error);
      res.status(500).json({ error: "Fehler beim Aktualisieren des Positionsziels" });
    }
  });

  // Delete position target
  app.delete("/api/portfolios/:portfolioId/position-targets/:targetId", async (req, res) => {
    try {
      const targetId = req.params.targetId;
      const deleted = await storage.deletePositionTarget(targetId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Positionsziel nicht gefunden" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting position target:", error);
      res.status(500).json({ error: "Fehler beim Löschen des Positionsziels" });
    }
  });

  // Get position targets by target structure
  app.get("/api/target-structures/:structureId/position-targets", async (req, res) => {
    try {
      const structureId = req.params.structureId;
      const positionTargets = await storage.getPositionTargetsByStructure(structureId);
      res.json({ success: true, positionTargets });
    } catch (error) {
      console.error("Error fetching position targets by structure:", error);
      res.status(500).json({ error: "Fehler beim Laden der Positionsziele" });
    }
  });

  // Portfolio Optimization Endpoint
  app.post("/api/portfolios/:id/optimize", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const { method, constraints, parameters } = req.body;

      // Get portfolio data
      const portfolio = await storage.getPortfolio(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio nicht gefunden" });
      }

      // Prepare optimization request for Claude
      const optimizationPrompt = `
        Führe eine Portfolio-Optimierung mit folgenden Parametern durch:

        Methode: ${method}

        Portfolio-Daten: ${JSON.stringify(portfolio.analysisResults)}

        Constraints: ${JSON.stringify(constraints)}

        Parameter:
        - Risikoaversion: ${parameters.riskAversion}
        - Erwartete Renditen: ${JSON.stringify(parameters.expectedReturns)}
        - Konfidenzniveau: ${parameters.confidenceLevel}
        - Transaktionskosten: ${parameters.transactionCosts}%
        - Rebalancing-Frequenz: ${parameters.rebalancingFrequency}

        Bitte berechne:
        1. Das optimierte Portfolio mit Asset-Allokationen
        2. Erwartete Rendite und Risiko für aktuelles und optimiertes Portfolio
        3. Sharpe Ratio für beide Portfolios
        4. Die Efficient Frontier (20 Punkte)
        5. Erforderliche Umschichtungen mit Beträgen

        Gib die Ergebnisse im folgenden JSON-Format zurück:
        {
          "status": "completed",
          "currentPortfolio": {
            "expectedReturn": number,
            "risk": number,
            "sharpeRatio": number,
            "allocations": { "AssetClass": percentage }
          },
          "optimizedPortfolio": {
            "expectedReturn": number,
            "risk": number,
            "sharpeRatio": number,
            "allocations": { "AssetClass": percentage },
            "improvements": {
              "returnImprovement": number,
              "riskReduction": number,
              "sharpeImprovement": number
            }
          },
          "efficientFrontier": [{ "risk": number, "return": number, "sharpeRatio": number }],
          "rebalancingActions": [{
            "assetClass": string,
            "currentAllocation": number,
            "targetAllocation": number,
            "action": "buy" | "sell" | "hold",
            "amount": number
          }]
        }
      `;

      // Call Claude for optimization
      const optimizationResult = await claudeService.analyzePortfolio(
        optimizationPrompt,
        { requireJsonResponse: true }
      );

      res.json(optimizationResult);
    } catch (error) {
      console.error("Error optimizing portfolio:", error);
      res.status(500).json({ error: "Fehler bei der Portfolio-Optimierung" });
    }
  });

  // Investment Universe Endpoints

  // Get complete investment universe
  app.get("/api/investment-universe", async (req, res) => {
    try {
      const { assetClass, category, search, limit, offset } = req.query;
      
      let universe = await investmentUniverseService.getInvestmentUniverse();
      
      // Apply filters
      let instruments = universe.instruments;
      
      if (assetClass) {
        instruments = instruments.filter(instrument => 
          instrument.assetClass.toLowerCase() === (assetClass as string).toLowerCase()
        );
      }
      
      if (category) {
        instruments = instruments.filter(instrument => 
          instrument.category.toLowerCase() === (category as string).toLowerCase()
        );
      }
      
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        instruments = instruments.filter(instrument => 
          instrument.name.toLowerCase().includes(searchTerm) ||
          (instrument.isin && instrument.isin.toLowerCase().includes(searchTerm))
        );
      }
      
      // Apply pagination
      const startIndex = offset ? parseInt(offset as string) : 0;
      const pageSize = limit ? parseInt(limit as string) : 50;
      const paginatedInstruments = instruments.slice(startIndex, startIndex + pageSize);
      
      res.json({
        success: true,
        instruments: paginatedInstruments,
        totalCount: instruments.length,
        categories: universe.categories,
        assetClasses: universe.assetClasses,
        pagination: {
          offset: startIndex,
          limit: pageSize,
          hasMore: startIndex + pageSize < instruments.length
        }
      });
    } catch (error) {
      console.error("Error fetching investment universe:", error);
      res.status(500).json({ error: "Fehler beim Laden des Investment Universe" });
    }
  });

  // Search investment universe
  app.get("/api/investment-universe/search", async (req, res) => {
    try {
      const { query, limit } = req.query;
      
      if (!query) {
        return res.status(400).json({ error: "Suchbegriff erforderlich" });
      }
      
      const searchResults = await investmentUniverseService.searchInstruments(query as string);
      const limitedResults = limit ? searchResults.slice(0, parseInt(limit as string)) : searchResults;
      
      res.json({
        success: true,
        instruments: limitedResults,
        totalCount: searchResults.length
      });
    } catch (error) {
      console.error("Error searching investment universe:", error);
      res.status(500).json({ error: "Fehler bei der Suche im Investment Universe" });
    }
  });

  // Get instruments by asset class
  app.get("/api/investment-universe/asset-class/:assetClass", async (req, res) => {
    try {
      const assetClass = req.params.assetClass;
      const instruments = await investmentUniverseService.getInstrumentsByAssetClass(assetClass);
      
      res.json({
        success: true,
        instruments,
        totalCount: instruments.length,
        assetClass
      });
    } catch (error) {
      console.error("Error fetching instruments by asset class:", error);
      res.status(500).json({ error: "Fehler beim Laden der Instrumente nach Asset-Klasse" });
    }
  });

  // Get instrument details
  app.get("/api/investment-universe/instrument", async (req, res) => {
    try {
      const { name, isin } = req.query;
      
      if (!name && !isin) {
        return res.status(400).json({ error: "Name oder ISIN erforderlich" });
      }
      
      const instrument = await investmentUniverseService.getInstrumentDetails(
        name as string || "", 
        isin as string || undefined
      );
      
      if (!instrument) {
        return res.status(404).json({ error: "Instrument nicht gefunden" });
      }
      
      res.json({
        success: true,
        instrument
      });
    } catch (error) {
      console.error("Error fetching instrument details:", error);
      res.status(500).json({ error: "Fehler beim Laden der Instrumentendetails" });
    }
  });

  // Factsheet PDF serving endpoints

  // Serve factsheet PDF files
  app.get("/api/factsheets/:filename", factsheetRateLimit, securityHeaders, async (req, res) => {
    const startTime = Date.now();
    try {
      const filename = decodeURIComponent(req.params.filename);

      // Security: Validate filename to prevent path traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: "Ungültiger Dateiname" });
      }

      // Find the factsheet in investment universe
      const universe = await investmentUniverseService.getInvestmentUniverse();
      const instrument = universe.instruments.find(i => i.fileName === filename);

      if (!instrument || !instrument.hasFactsheet) {
        return res.status(404).json({ error: "Factsheet nicht gefunden" });
      }

      const fs = await import('fs/promises');
      const path = await import('path');

      try {
        await fs.access(instrument.factsheetPath);

        // Set appropriate headers for PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

        // Stream the PDF file
        const readStream = require('fs').createReadStream(instrument.factsheetPath);
        readStream.pipe(res);

      } catch (error) {
        console.error("Error accessing factsheet file:", error);
        res.status(404).json({ error: "Factsheet-Datei nicht gefunden" });
      }

    } catch (error) {
      console.error("Error serving factsheet:", error);
      res.status(500).json({ error: "Fehler beim Laden des Factsheets" });
    } finally {
      performanceMonitor.logRequest('/api/factsheets/:filename', Date.now() - startTime);
    }
  });

  // Get factsheet content and metadata
  app.get("/api/factsheets/:filename/content", factsheetRateLimit, securityHeaders, async (req, res) => {
    const startTime = Date.now();
    try {
      const filename = decodeURIComponent(req.params.filename);

      // Security: Validate filename
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: "Ungültiger Dateiname" });
      }

      // Check cache first
      const cacheKey = `content_${filename}`;
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

      // Find the factsheet in investment universe
      const universe = await investmentUniverseService.getInvestmentUniverse();
      const instrument = universe.instruments.find(i => i.fileName === filename);

      if (!instrument || !instrument.hasFactsheet) {
        return res.status(404).json({ error: "Factsheet nicht gefunden" });
      }

      const fs = await import('fs/promises');
      const pdf = await import('pdf-parse');

      try {
        // Read and parse PDF
        const buffer = await fs.readFile(instrument.factsheetPath);
        const pdfData = await pdf.default(buffer);

        // Extract basic metadata
        const metadata = {
          pages: pdfData.numpages,
          title: pdfData.info?.Title,
          author: pdfData.info?.Author,
          subject: pdfData.info?.Subject,
          creator: pdfData.info?.Creator,
          producer: pdfData.info?.Producer,
          creationDate: pdfData.info?.CreationDate,
          modificationDate: pdfData.info?.ModDate,
        };

        // Return extracted content
        const result = {
          success: true,
          text: pdfData.text,
          metadata,
          analysis: {
            assetAllocation: instrument.factsheetData?.assetAllocation,
            geographicAllocation: instrument.factsheetData?.geographicAllocation,
            // Additional analysis could be added here
          }
        };

        // Cache the result
        setCachedData(cacheKey, result);
        res.json(result);

      } catch (error) {
        console.error("Error parsing factsheet PDF:", error);
        res.status(500).json({ error: "Fehler beim Analysieren des Factsheets" });
      }

    } catch (error) {
      console.error("Error processing factsheet content:", error);
      res.status(500).json({ error: "Fehler beim Verarbeiten des Factsheet-Inhalts" });
    } finally {
      performanceMonitor.logRequest('/api/factsheets/:filename/content', Date.now() - startTime);
    }
  });

  // Enhanced factsheet analysis endpoint
  app.post("/api/factsheets/:filename/analyze", factsheetRateLimit, securityHeaders, async (req, res) => {
    const startTime = Date.now();
    try {
      const filename = decodeURIComponent(req.params.filename);

      // Security: Validate filename
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: "Ungültiger Dateiname" });
      }

      // Check cache first
      const cacheKey = `analysis_${filename}`;
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

      // Find the factsheet in investment universe
      const universe = await investmentUniverseService.getInvestmentUniverse();
      const instrument = universe.instruments.find(i => i.fileName === filename);

      if (!instrument || !instrument.hasFactsheet) {
        return res.status(404).json({ error: "Factsheet nicht gefunden" });
      }

      // Use Claude AI to analyze the factsheet
      try {
        const fs = await import('fs/promises');
        const pdf = await import('pdf-parse');

        // Read and parse PDF first
        const buffer = await fs.readFile(instrument.factsheetPath);
        const pdfData = await pdf.default(buffer);

        // Check if ClaudeFactsheetAnalyzer is available
        let claudeAnalysis = null;
        try {
          const { ClaudeFactsheetAnalyzer } = await import('./services/claudeFactsheetAnalyzer');
          const analyzer = new ClaudeFactsheetAnalyzer();
          claudeAnalysis = await analyzer.analyzeFactsheet(
            pdfData.text,
            instrument.name,
            instrument.isin || ''
          );
        } catch (error) {
          console.warn("Claude factsheet analyzer not available:", error.message);
        }

        const result = {
          success: true,
          instrument: {
            name: instrument.name,
            isin: instrument.isin,
            assetClass: instrument.assetClass
          },
          analysis: claudeAnalysis || {
            message: "Claude AI Factsheet-Analyse nicht verfügbar"
          }
        };

        // Cache the result
        setCachedData(cacheKey, result);
        res.json(result);
      } catch (error) {
        console.error("Error in factsheet analysis:", error);
        res.status(500).json({ error: "Fehler bei der Factsheet-Analyse" });
      }

    } catch (error) {
      console.error("Error analyzing factsheet:", error);
      res.status(500).json({ error: "Fehler bei der Factsheet-Analyse" });
    } finally {
      performanceMonitor.logRequest('/api/factsheets/:filename/analyze', Date.now() - startTime);
    }
  });

  // Performance monitoring endpoint (dev mode only)
  app.get("/api/factsheets/performance/stats", (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json({ error: "Nicht verfügbar" });
    }

    const stats = performanceMonitor.getStats();
    const cacheStats = {
      size: factsheetCache.size,
      hitRate: '(would need hit counter implementation)',
      entries: Array.from(factsheetCache.keys()).slice(0, 10) // Show first 10 keys
    };

    res.json({
      performanceStats: stats,
      cacheStats,
      rateLimitStats: {
        activeIPs: lastRequestTimes.size,
        recentRequests: Array.from(lastRequestTimes.entries())
          .map(([ip, time]) => ({ ip, secondsAgo: Math.floor((Date.now() - time) / 1000) }))
          .slice(0, 10)
      }
    });
  });

  // === SAA (Strategic Asset Allocation) Endpoints ===

  // SAA Portfolio Creation
  app.post('/api/saa/portfolios/create', async (req, res) => {
    try {
      // SCHRITT 1: Extrahiere und validiere Daten
      const { riskProfile, amount, constraints } = req.body;

      if (!riskProfile || !amount) {
        return res.status(400).json({ error: "Risikoprofil und Betrag sind erforderlich" });
      }

      // SCHRITT 2: Rufe Claude für SAA auf
      const saaRequest = {
        riskProfile,
        amount,
        constraints: constraints || {},
        userId: req.user?.id // Falls Authentifizierung implementiert
      };

      const saaResult = await claudeService.createStrategicAssetAllocation(saaRequest);

      // SCHRITT 3: Sende strukturierte Response
      res.json({
        success: true,
        portfolioId: saaResult.portfolioId,
        strategy: saaResult.strategy,
        allocation: saaResult.allocation,
        nextSteps: ['review', 'adjust', 'execute']
      });
    } catch (error) {
      console.error("Error creating SAA portfolio:", error);
      res.status(500).json({ error: "Fehler bei der SAA Portfolio-Erstellung" });
    }
  });

  // Universe Management
  app.get('/api/saa/universe/instruments', async (req, res) => {
    try {
      const { assetClass, minQuality, maxTer, limit = 50 } = req.query;

      // Check cache first (5 minutes)
      const cacheKey = `universe_${assetClass}_${minQuality}_${maxTer}_${limit}`;
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

      const universe = await investmentUniverseService.getInvestmentUniverse();
      let instruments = universe.instruments;

      // Apply filters
      if (assetClass) {
        instruments = instruments.filter(i =>
          i.assetClass.toLowerCase() === (assetClass as string).toLowerCase()
        );
      }

      if (minQuality) {
        instruments = instruments.filter(i =>
          i.qualityScore >= parseInt(minQuality as string)
        );
      }

      if (maxTer) {
        instruments = instruments.filter(i =>
          i.ter <= parseFloat(maxTer as string)
        );
      }

      // Limit results for performance
      const limitedInstruments = instruments.slice(0, parseInt(limit as string));

      const result = {
        success: true,
        instruments: limitedInstruments.map(i => ({
          isin: i.isin,
          name: i.name,
          assetClass: i.assetClass,
          subAssetClass: i.subAssetClass,
          metrics: {
            ter: i.ter,
            aum: i.aum,
            liquidityScore: i.liquidityScore,
            qualityScore: i.qualityScore
          }
        })),
        totalCount: instruments.length,
        filters: { assetClass, minQuality, maxTer }
      };

      // Cache result
      setCachedData(cacheKey, result);
      res.json(result);
    } catch (error) {
      console.error("Error fetching SAA universe instruments:", error);
      res.status(500).json({ error: "Fehler beim Laden der SAA Instrumente" });
    }
  });

  // Portfolio Optimization
  app.post('/api/saa/portfolios/:id/optimize', async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const optimizationParams = req.body;

      // Get portfolio data
      const portfolio = await storage.getPortfolio(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio nicht gefunden" });
      }

      // WICHTIG: Lange Berechnungen - erstelle Job ID für Polling
      const jobId = `opt_${portfolioId}_${Date.now()}`;

      // Starte Optimierung asynchron über Claude
      const optimizationPromise = claudeService.optimizePortfolio({
        portfolioId,
        parameters: optimizationParams,
        portfolioData: portfolio
      });

      // Speichere Job Status (vereinfacht ohne echte Queue)
      const jobStatus = {
        jobId,
        status: 'processing',
        startTime: new Date(),
        portfolioId
      };

      // Simuliere Job Queue Response
      res.json({
        jobId,
        status: 'processing',
        estimatedTime: 30, // Sekunden
        pollEndpoint: `/api/saa/jobs/${jobId}/status`
      });

      // Führe Optimierung aus und speichere Ergebnis
      optimizationPromise.then(async (result) => {
        await storage.updatePortfolio(portfolioId, {
          optimizationResults: result,
          lastOptimization: new Date()
        });
      }).catch(error => {
        console.error("Optimization failed:", error);
      });

    } catch (error) {
      console.error("Error starting portfolio optimization:", error);
      res.status(500).json({ error: "Fehler beim Starten der Portfolio-Optimierung" });
    }
  });

  // Rebalancing Calculation
  app.post('/api/saa/portfolios/:id/rebalancing/calculate', async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const { method = 'threshold', constraints } = req.body;

      const portfolio = await storage.getPortfolio(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio nicht gefunden" });
      }

      const positions = await storage.getPortfolioPositions(portfolioId);

      // Delegiere ALLES an Claude
      const rebalancingResult = await claudeService.calculateRebalancing({
        portfolioId,
        method,
        constraints: constraints || {},
        currentPositions: positions,
        totalValue: parseFloat(portfolio.totalValue || "0")
      });

      res.json({
        success: true,
        rebalancing: rebalancingResult.rebalancing,
        summary: {
          trades: rebalancingResult.trades?.length || 0,
          turnover: rebalancingResult.turnover || 0,
          costs: rebalancingResult.estimatedCosts || 0
        },
        analysis: rebalancingResult.analysis
      });
    } catch (error) {
      console.error("Error calculating rebalancing:", error);
      res.status(500).json({ error: "Fehler bei der Rebalancing-Berechnung" });
    }
  });

  // === LIQUIDITÄTS-OPTIMIERUNG ENDPOINTS ===

  // Performance monitoring middleware für Liquidity-Optimierung
  app.use('/api/portfolios/:id/liquidity/*', performanceMiddleware);

  // Liquiditäts-Optimierung
  app.post('/api/portfolios/:id/liquidity/optimize', async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const { amount, strategy, constraints } = req.body;

      // Validiere Request
      const validationResult = liquidityOptimizationSchema.safeParse({ amount, strategy, constraints });
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Ungültige Request-Parameter",
          details: validationResult.error.issues
        });
      }

      // Importiere LiquidityOptimizer (dynamisch um Circular Dependencies zu vermeiden)
      const { LiquidityOptimizer } = await import('./services/liquidity-optimizer');
      const optimizer = new LiquidityOptimizer();

      // Führe Optimierung durch
      const result = await optimizer.optimizeLiquidityAllocation({
        portfolioId,
        additionalLiquidity: amount,
        optimizationTarget: strategy,
        constraints
      });

      // IMMER Drizzle ORM verwenden für Datenbank-Operationen
      const { optimizationProposals } = await import('../shared/schema');
      const { db } = await import('./db');

      // Speichere Optimierungsvorschlag
      const [savedProposal] = await db.insert(optimizationProposals).values({
        portfolioId,
        liquidityAmount: amount.toString(),
        strategy,
        constraints: constraints || null,
        proposalData: result,
        status: 'draft'
      }).returning();

      res.json({
        success: true,
        optimization: result,
        proposalId: savedProposal.id,
        message: 'Optimierungsvorschlag erstellt'
      });
    } catch (error) {
      console.error("Error optimizing liquidity:", error);
      res.status(500).json({ error: "Fehler bei der Liquiditäts-Optimierung" });
    }
  });

  // Szenario-Simulation
  app.post('/api/portfolios/:id/liquidity/simulate', async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const { amount, scenarios } = req.body;

      // Validiere Parameter
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Ungültiger Liquiditätsbetrag" });
      }

      const { LiquidityOptimizer } = await import('./services/liquidity-optimizer');
      const optimizer = new LiquidityOptimizer();

      const results = await optimizer.simulateMultipleScenarios({
        portfolioId,
        additionalLiquidity: amount,
        scenarios: scenarios || ['conservative', 'balanced', 'aggressive']
      });

      res.json({
        success: true,
        simulations: results.scenarios,
        comparison: results.comparison,
        recommendation: results.recommendation,
        analysisDate: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error simulating scenarios:", error);
      res.status(500).json({ error: "Fehler bei der Szenario-Simulation" });
    }
  });

  // Trade-Ausführung
  app.post('/api/portfolios/:id/liquidity/execute', async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const { proposalId, trades, executionMode = 'immediate' } = req.body;

      // Validiere Request
      const validationResult = tradeExecutionSchema.safeParse({ proposalId, trades, executionMode });
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Ungültige Trade-Parameter",
          details: validationResult.error.issues
        });
      }

      // Validiere finale Trades über Claude
      const validation = await validateTradesForExecution(trades);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Trade-Validierung fehlgeschlagen',
          details: validation.errors
        });
      }

      // Erstelle Ausführungsplan
      const executionPlan = await createExecutionPlan(portfolioId, trades, executionMode);

      // IMMER Drizzle ORM verwenden
      const { tradeExecutions } = await import('../shared/schema');
      const { db } = await import('./db');

      // Speichere Trade-Execution
      const [execution] = await db.insert(tradeExecutions).values({
        portfolioId,
        proposalId,
        tradeData: trades,
        executionPlan,
        status: 'pending'
      }).returning();

      // Aktualisiere Portfolio (simuliert - echte Implementierung würde Broker-Integration nutzen)
      await updatePortfolioWithNewPositions(portfolioId, executionPlan);

      res.json({
        success: true,
        executionId: execution.id,
        executionPlan,
        message: 'Portfolio wurde erfolgreich erweitert'
      });
    } catch (error) {
      console.error("Error executing trades:", error);
      res.status(500).json({ error: "Fehler bei der Trade-Ausführung" });
    }
  });

  // Optimierungsvorschläge abrufen
  app.get('/api/portfolios/:id/liquidity/proposals', async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const { status, limit = 10 } = req.query;

      const { optimizationProposals } = await import('../shared/schema');
      const { db } = await import('./db');
      const { eq, and, desc } = await import('drizzle-orm');

      let query = db.select().from(optimizationProposals)
        .where(eq(optimizationProposals.portfolioId, portfolioId))
        .orderBy(desc(optimizationProposals.createdAt))
        .limit(parseInt(limit as string));

      if (status) {
        query = db.select().from(optimizationProposals)
          .where(and(
            eq(optimizationProposals.portfolioId, portfolioId),
            eq(optimizationProposals.status, status as string)
          ))
          .orderBy(desc(optimizationProposals.createdAt))
          .limit(parseInt(limit as string));
      }

      const proposals = await query;

      res.json({
        success: true,
        proposals,
        count: proposals.length
      });
    } catch (error) {
      console.error("Error fetching proposals:", error);
      res.status(500).json({ error: "Fehler beim Laden der Optimierungsvorschläge" });
    }
  });

  // Setup Performance Monitoring Routes
  setupPerformanceRoutes(app);

  // Return a placeholder server - the actual server is started in index.ts
  return {} as Server;
}

// === HELPER FUNCTIONS ===

async function validateTradesForExecution(trades: any[]): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  try {
    // IMMER Claude für Validierung verwenden - NIEMALS eigene Logik
    const validation = await claudeService.validateTradeCompliance({
      tradeProposals: trades,
      checkRegulatoryCompliance: true,
      checkLiquidityRequirements: true,
      checkRiskLimits: true
    });

    return {
      valid: validation.isValid,
      errors: validation.errors || [],
      warnings: validation.warnings || []
    };
  } catch (error) {
    console.error('Error validating trades:', error);
    return {
      valid: false,
      errors: ['Validierung fehlgeschlagen: ' + error.message],
      warnings: []
    };
  }
}

async function createExecutionPlan(
  portfolioId: string,
  trades: any[],
  executionMode: string = 'immediate'
): Promise<any> {
  try {
    // IMMER Claude für Execution Plan verwenden
    const executionPlan = await claudeService.createExecutionPlan({
      portfolioId,
      trades,
      executionMode,
      includeTimingStrategy: true,
      includeCostOptimization: true,
      includeRiskAssessment: true
    });

    return executionPlan;
  } catch (error) {
    console.error('Error creating execution plan:', error);

    // Fallback execution plan
    return {
      trades: trades.map((trade, index) => ({
        ...trade,
        executionOrder: index + 1,
        timing: executionMode === 'immediate' ? 'now' : 'staged',
        estimatedExecutionTime: executionMode === 'immediate' ? '1-2 minutes' : '1-2 hours'
      })),
      totalEstimatedTime: executionMode === 'immediate' ? '5 minutes' : '4 hours',
      totalCosts: trades.reduce((sum, trade) => sum + (trade.estimatedCosts || 0), 0),
      riskLevel: 'medium',
      recommendation: 'Proceed with execution plan'
    };
  }
}

async function updatePortfolioWithNewPositions(
  portfolioId: string,
  executionPlan: any
): Promise<void> {
  try {
    // IMMER Drizzle ORM verwenden für Datenbank-Operationen
    const { portfolioPositions } = await import('../shared/schema');
    const { db } = await import('./db');
    const { eq } = await import('drizzle-orm');

    // Simuliere Portfolio-Update basierend auf Execution Plan
    // In echter Implementierung würde dies über Broker-API erfolgen

    for (const trade of executionPlan.trades) {
      if (trade.action === 'buy') {
        // Neue Position hinzufügen oder bestehende erhöhen
        const existingPosition = await db
          .select()
          .from(portfolioPositions)
          .where(eq(portfolioPositions.portfolioId, portfolioId))
          .where(eq(portfolioPositions.isin, trade.isin || ''))
          .limit(1);

        if (existingPosition.length > 0) {
          // Erhöhe bestehende Position
          const newValue = parseFloat(existingPosition[0].value) + trade.amount;
          await db
            .update(portfolioPositions)
            .set({
              value: newValue.toString(),
              percentage: ((newValue / (parseFloat(existingPosition[0].value) * 100)) * 100).toString()
            })
            .where(eq(portfolioPositions.id, existingPosition[0].id));
        } else {
          // Neue Position erstellen
          await db.insert(portfolioPositions).values({
            portfolioId,
            name: trade.name,
            isin: trade.isin || null,
            value: trade.amount.toString(),
            percentage: trade.percentage.toString(),
            instrumentType: 'ETF', // Default
            assetClass: 'Multi-Asset' // Default
          });
        }
      } else if (trade.action === 'sell') {
        // Position reduzieren oder entfernen
        const existingPosition = await db
          .select()
          .from(portfolioPositions)
          .where(eq(portfolioPositions.portfolioId, portfolioId))
          .where(eq(portfolioPositions.name, trade.name))
          .limit(1);

        if (existingPosition.length > 0) {
          const currentValue = parseFloat(existingPosition[0].value);
          const newValue = Math.max(0, currentValue - trade.amount);

          if (newValue === 0) {
            // Position komplett verkaufen
            await db
              .delete(portfolioPositions)
              .where(eq(portfolioPositions.id, existingPosition[0].id));
          } else {
            // Position reduzieren
            await db
              .update(portfolioPositions)
              .set({
                value: newValue.toString(),
                percentage: ((newValue / currentValue) * parseFloat(existingPosition[0].percentage || '0')).toString()
              })
              .where(eq(portfolioPositions.id, existingPosition[0].id));
          }
        }
      }
    }

    // Aktualisiere Portfolio-Metadaten
    const { portfolios } = await import('../shared/schema');
    const updatedPositions = await db
      .select()
      .from(portfolioPositions)
      .where(eq(portfolioPositions.portfolioId, portfolioId));

    const newTotalValue = updatedPositions.reduce((sum, pos) => sum + parseFloat(pos.value), 0);

    await db
      .update(portfolios)
      .set({
        totalValue: newTotalValue.toString(),
        positionCount: updatedPositions.length
      })
      .where(eq(portfolios.id, portfolioId));

    console.log(`✅ Portfolio ${portfolioId} updated with ${executionPlan.trades.length} trades`);
  } catch (error) {
    console.error('Error updating portfolio with new positions:', error);
    throw new Error(`Failed to update portfolio: ${error.message}`);
  }
}