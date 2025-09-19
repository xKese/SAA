var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/services/claudeFactsheetAnalyzer.ts
var claudeFactsheetAnalyzer_exports = {};
__export(claudeFactsheetAnalyzer_exports, {
  ClaudeFactsheetAnalyzer: () => ClaudeFactsheetAnalyzer
});
import Anthropic2 from "@anthropic-ai/sdk";
var anthropic, ClaudeFactsheetAnalyzer;
var init_claudeFactsheetAnalyzer = __esm({
  "server/services/claudeFactsheetAnalyzer.ts"() {
    "use strict";
    anthropic = new Anthropic2({
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || ""
    });
    ClaudeFactsheetAnalyzer = class {
      /**
       * Hauptanalyse-Methode für Factsheets
       */
      async analyzeFactsheet(factsheetContent, fundName, isin) {
        console.log(`Starting Claude AI analysis for ${fundName}`);
        try {
          const basicInfo = await this.extractBasicInfo(factsheetContent, fundName, isin);
          const assetAllocation = await this.extractAssetAllocation(factsheetContent);
          const geographicAllocation = await this.extractGeographicAllocation(factsheetContent);
          const currencyExposure = await this.extractCurrencyExposure(factsheetContent);
          const topHoldings = await this.extractTopHoldings(factsheetContent);
          const sectorAllocation = await this.extractSectorAllocation(factsheetContent);
          const riskMetrics = await this.extractRiskMetrics(factsheetContent);
          const qualityIndicators = this.assessAnalysisQuality({
            basicInfo,
            assetAllocation,
            geographicAllocation,
            currencyExposure,
            topHoldings,
            sectorAllocation,
            riskMetrics
          });
          return {
            fundBasicInfo: basicInfo,
            assetAllocation,
            geographicAllocation,
            currencyExposure,
            sectorAllocation,
            topHoldings,
            riskMetrics,
            qualityIndicators
          };
        } catch (error) {
          console.error(`Error analyzing factsheet for ${fundName}:`, error);
          throw new Error(`Factsheet analysis failed: ${error.message}`);
        }
      }
      /**
       * Extrahiere Grundinformationen des Fonds
       */
      async extractBasicInfo(content, fundName, isin) {
        const prompt = `
Analysiere dieses Factsheet und extrahiere Grundinformationen:

Factsheet: ${content.substring(0, 2e3)}

Erstelle JSON-Antwort mit folgender Struktur:
{
  "fundName": "${fundName}",
  "isin": "${isin || ""}",
  "fundType": "equity|bond|mixed|real_estate|commodity|money_market",
  "investmentStrategy": "Beschreibung der Anlagestrategie",
  "currency": "EUR|USD|GBP|etc",
  "totalExpenseRatio": 0.75,
  "aum": 1000000000
}

Achte besonders auf:
- Fondstyp aus dem Namen und der Beschreibung
- Basis-W\xE4hrung des Fonds
- TER/Ongoing Charges
- Assets under Management
- Anlagestrategie und -ziele

Nur JSON zur\xFCckgeben!
`;
        try {
          const response = await this.callClaude(prompt, 1e3);
          return this.parseJSON(response, {
            fundName,
            isin,
            fundType: "mixed",
            investmentStrategy: "Nicht verf\xFCgbar",
            currency: "EUR"
          });
        } catch (error) {
          console.error("Error extracting basic info:", error);
          return {
            fundName,
            isin,
            fundType: "mixed",
            investmentStrategy: "Nicht verf\xFCgbar",
            currency: "EUR"
          };
        }
      }
      /**
       * Extrahiere Asset-Allokation
       */
      async extractAssetAllocation(content) {
        const prompt = `
Analysiere die Asset-Allokation in diesem Factsheet:

${content.substring(0, 3e3)}

Erstelle JSON mit prozentualen Allokationen (Summe muss 100% ergeben):
{
  "equities": 0.65,
  "bonds": 0.25,
  "realEstate": 0.05,
  "commodities": 0.02,
  "cash": 0.03,
  "alternatives": 0.00,
  "derivatives": 0.00
}

Suche nach:
- Asset Allocation Tabellen
- Portfolio Composition
- Investment Breakdown
- "Aktien", "Anleihen", "Immobilien", "Rohstoffe"
- Equity/Bond Ratios

Falls keine genauen Daten: sch\xE4tze basierend auf Fondsbeschreibung.
Nur JSON zur\xFCckgeben!
`;
        try {
          const response = await this.callClaude(prompt, 1e3);
          const allocation = this.parseJSON(response, {});
          this.normalizeToSum(allocation, 1);
          return allocation;
        } catch (error) {
          console.error("Error extracting asset allocation:", error);
          return { equities: 0.6, bonds: 0.3, cash: 0.1 };
        }
      }
      /**
       * Extrahiere geografische Allokation
       */
      async extractGeographicAllocation(content) {
        const prompt = `
Analysiere die geografische Verteilung in diesem Factsheet:

${content.substring(0, 3e3)}

Erstelle JSON mit regionalen Allokationen (Summe 100%):
{
  "usa": 0.40,
  "europe": 0.30,
  "asiaPacific": 0.15,
  "emergingMarkets": 0.10,
  "germany": 0.05,
  "uk": 0.00,
  "japan": 0.00,
  "china": 0.00,
  "other": 0.00
}

Suche nach:
- Geographic/Regional Allocation
- Country Breakdown
- Regional Exposure
- "USA", "Europa", "Asien", "Schwellenl\xE4nder"
- Top Countries

Achte auf \xDCberschneidungen (Deutschland ist Teil von Europa).
Nur JSON zur\xFCckgeben!
`;
        try {
          const response = await this.callClaude(prompt, 1e3);
          const allocation = this.parseJSON(response, {});
          this.normalizeToSum(allocation, 1);
          return allocation;
        } catch (error) {
          console.error("Error extracting geographic allocation:", error);
          return { usa: 0.4, europe: 0.4, asiaPacific: 0.1, emergingMarkets: 0.1 };
        }
      }
      /**
       * Extrahiere Währungsexposure
       */
      async extractCurrencyExposure(content) {
        const prompt = `
Analysiere die W\xE4hrungsverteilung in diesem Factsheet:

${content.substring(0, 3e3)}

Erstelle JSON mit W\xE4hrungsallokationen (Summe 100%):
{
  "usd": 0.40,
  "eur": 0.35,
  "jpy": 0.10,
  "gbp": 0.08,
  "chf": 0.02,
  "cad": 0.02,
  "aud": 0.01,
  "other": 0.02,
  "hedgingRatio": 0.50
}

Suche nach:
- Currency Exposure/Allocation
- W\xE4hrungsverteilung
- Currency Hedging Status
- "USD", "EUR", "JPY", "GBP", "CHF"
- Hedged/Unhedged Positionen

hedgingRatio = Anteil der W\xE4hrungsrisiken, die abgesichert sind.
Nur JSON zur\xFCckgeben!
`;
        try {
          const response = await this.callClaude(prompt, 1e3);
          const exposure = this.parseJSON(response, {});
          const hedgingRatio = exposure.hedgingRatio;
          delete exposure.hedgingRatio;
          this.normalizeToSum(exposure, 1);
          if (hedgingRatio !== void 0) {
            exposure.hedgingRatio = hedgingRatio;
          }
          return exposure;
        } catch (error) {
          console.error("Error extracting currency exposure:", error);
          return { usd: 0.4, eur: 0.4, other: 0.2 };
        }
      }
      /**
       * Extrahiere Top Holdings
       */
      async extractTopHoldings(content) {
        const prompt = `
Extrahiere die Top Holdings aus diesem Factsheet:

${content.substring(0, 4e3)}

Erstelle JSON-Array mit den gr\xF6\xDFten Positionen:
[
  {
    "name": "Apple Inc",
    "isin": "US0378331005",
    "weight": 0.045,
    "instrumentType": "Aktie",
    "sector": "Technologie",
    "country": "USA"
  },
  {
    "name": "Microsoft Corp",
    "isin": "US5949181045",
    "weight": 0.038,
    "instrumentType": "Aktie",
    "sector": "Technologie",
    "country": "USA"
  }
]

Regeln:
- Nur Holdings >1% Gewichtung
- weight als Dezimalzahl (0.045 = 4.5%)
- Deutsche Begriffe f\xFCr instrumentType
- Maximal 20 Holdings

Suche nach:
- Top Holdings/Largest Positions
- Portfolio Holdings
- Major Investments
- Holdings Tabellen

Nur JSON-Array zur\xFCckgeben!
`;
        try {
          const response = await this.callClaude(prompt, 2e3);
          const holdings = this.parseJSON(response, []);
          return Array.isArray(holdings) ? holdings : [];
        } catch (error) {
          console.error("Error extracting top holdings:", error);
          return [];
        }
      }
      /**
       * Extrahiere Sektor-Allokation
       */
      async extractSectorAllocation(content) {
        const prompt = `
Analysiere die Sektorverteilung in diesem Factsheet:

${content.substring(0, 3e3)}

Erstelle JSON mit Sektorallokationen (Summe 100%):
{
  "technology": 0.25,
  "financials": 0.15,
  "healthcare": 0.12,
  "industrials": 0.10,
  "consumerDiscretionary": 0.08,
  "consumerStaples": 0.06,
  "energy": 0.05,
  "materials": 0.04,
  "utilities": 0.03,
  "telecommunications": 0.02,
  "realEstate": 0.02,
  "other": 0.08
}

Suche nach:
- Sector Allocation/Breakdown
- Industry Classification
- Sektoren-Verteilung
- GICS Sectors

Falls keine Sektor-Daten gefunden: antworte mit "null".
Nur JSON zur\xFCckgeben!
`;
        try {
          const response = await this.callClaude(prompt, 1e3);
          if (response.trim() === "null") {
            return void 0;
          }
          const allocation = this.parseJSON(response, null);
          if (allocation) {
            this.normalizeToSum(allocation, 1);
            return allocation;
          }
          return void 0;
        } catch (error) {
          console.error("Error extracting sector allocation:", error);
          return void 0;
        }
      }
      /**
       * Extrahiere Risikometriken
       */
      async extractRiskMetrics(content) {
        const prompt = `
Extrahiere Risikokennzahlen aus diesem Factsheet:

${content.substring(0, 3e3)}

Erstelle JSON mit verf\xFCgbaren Risikometriken:
{
  "volatility": 0.16,
  "sharpeRatio": 0.85,
  "maxDrawdown": -0.23,
  "beta": 0.95
}

Suche nach:
- Volatility/Volatilit\xE4t
- Sharpe Ratio
- Maximum Drawdown
- Beta
- Risk Metrics
- Performance Statistics

Falls keine Risikodaten gefunden: antworte mit "null".
Werte als Dezimalzahlen (16% = 0.16).
Nur JSON zur\xFCckgeben!
`;
        try {
          const response = await this.callClaude(prompt, 800);
          if (response.trim() === "null") {
            return void 0;
          }
          const metrics = this.parseJSON(response, null);
          return metrics || void 0;
        } catch (error) {
          console.error("Error extracting risk metrics:", error);
          return void 0;
        }
      }
      /**
       * Claude API-Aufruf mit Retry-Logik
       */
      async callClaude(prompt, maxTokens = 1e3) {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }]
        });
        const content = response.content[0];
        if (content.type !== "text") {
          throw new Error("Unexpected response format from Claude");
        }
        return content.text;
      }
      /**
       * Parse JSON-Response mit Fallback
       */
      parseJSON(jsonString, fallback) {
        try {
          const jsonMatch = jsonString.match(/[\{\[][\s\S]*[\}\]]/);
          if (!jsonMatch) {
            console.warn("No JSON found in response, using fallback");
            return fallback;
          }
          return JSON.parse(jsonMatch[0]);
        } catch (error) {
          console.error("JSON parsing failed:", error);
          return fallback;
        }
      }
      /**
       * Normalisiere Object-Werte auf gewünschte Summe
       */
      normalizeToSum(obj, targetSum) {
        const currentSum = Object.values(obj).reduce((sum, val) => sum + (val || 0), 0);
        if (currentSum > 0 && Math.abs(currentSum - targetSum) > 1e-3) {
          const factor = targetSum / currentSum;
          Object.keys(obj).forEach((key) => {
            if (typeof obj[key] === "number") {
              obj[key] = obj[key] * factor;
            }
          });
        }
      }
      /**
       * Bewerte die Qualität der Analyse
       */
      assessAnalysisQuality(results) {
        let completenessScore = 0;
        const warnings = [];
        if (results.basicInfo.fundType && results.basicInfo.currency) {
          completenessScore += 0.2;
        } else {
          warnings.push("Unvollst\xE4ndige Grundinformationen");
        }
        const assetSum = Object.values(results.assetAllocation).reduce((s, v) => s + (v || 0), 0);
        if (Math.abs(assetSum - 1) < 0.05) {
          completenessScore += 0.3;
        } else {
          warnings.push("Asset-Allokation summiert nicht zu 100%");
        }
        const geoSum = Object.values(results.geographicAllocation).reduce((s, v) => s + (v || 0), 0);
        if (Math.abs(geoSum - 1) < 0.05) {
          completenessScore += 0.2;
        } else {
          warnings.push("Geografische Allokation unvollst\xE4ndig");
        }
        if (results.topHoldings.length >= 5) {
          completenessScore += 0.15;
        } else if (results.topHoldings.length > 0) {
          completenessScore += 0.1;
          warnings.push("Wenige Top Holdings gefunden");
        } else {
          warnings.push("Keine Top Holdings identifiziert");
        }
        const currencySum = Object.values(results.currencyExposure).filter((_, i, arr) => i < arr.length - 1).reduce((s, v) => s + (v || 0), 0);
        if (Math.abs(currencySum - 1) < 0.05) {
          completenessScore += 0.1;
        }
        if (results.sectorAllocation) completenessScore += 0.025;
        if (results.riskMetrics) completenessScore += 0.025;
        const confidence = Math.min(1, completenessScore);
        const sourceQuality = confidence > 0.8 ? "high" : confidence > 0.5 ? "medium" : "low";
        return {
          dataCompleteness: completenessScore,
          confidence,
          sourceQuality,
          warnings
        };
      }
    };
  }
});

// server/index.ts
import "dotenv/config";
import express2 from "express";
import compression from "compression";
import rateLimit from "express-rate-limit";

// server/routes.ts
import multer from "multer";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  analysisPatterns: () => analysisPatterns,
  analysisPhases: () => analysisPhases,
  chatMessages: () => chatMessages,
  chatSessions: () => chatSessions,
  errorQuerySchema: () => errorQuerySchema,
  healthCheckQuerySchema: () => healthCheckQuerySchema,
  insertAnalysisPatternSchema: () => insertAnalysisPatternSchema,
  insertAnalysisPhaseSchema: () => insertAnalysisPhaseSchema,
  insertChatMessageSchema: () => insertChatMessageSchema,
  insertChatSessionSchema: () => insertChatSessionSchema,
  insertKnowledgeBaseSchema: () => insertKnowledgeBaseSchema,
  insertPortfolioPositionSchema: () => insertPortfolioPositionSchema,
  insertPortfolioSchema: () => insertPortfolioSchema,
  insertPortfolioSnapshotSchema: () => insertPortfolioSnapshotSchema,
  insertPortfolioTargetSchema: () => insertPortfolioTargetSchema,
  insertPositionTargetSchema: () => insertPositionTargetSchema,
  insertReallocationAnalysisSchema: () => insertReallocationAnalysisSchema,
  insertUserPreferenceSchema: () => insertUserPreferenceSchema,
  insertUserSchema: () => insertUserSchema,
  knowledgeBase: () => knowledgeBase,
  portfolioChangeRequestSchema: () => portfolioChangeRequestSchema,
  portfolioPositions: () => portfolioPositions,
  portfolioSnapshots: () => portfolioSnapshots,
  portfolioTargets: () => portfolioTargets,
  portfolios: () => portfolios,
  positionTargets: () => positionTargets,
  reallocationAnalyses: () => reallocationAnalyses,
  revalidationRequestSchema: () => revalidationRequestSchema,
  scenarioAnalysisRequestSchema: () => scenarioAnalysisRequestSchema,
  updatePortfolioSchema: () => updatePortfolioSchema,
  userPreferences: () => userPreferences,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, json, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  fileName: text("file_name").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  analysisStatus: text("analysis_status").notNull().default("pending"),
  // pending, analyzing, completed, failed
  analysisProgress: integer("analysis_progress").default(0),
  // 0-100
  currentPhase: text("current_phase").default("Phase 0: Instrumentenidentifikation"),
  totalValue: decimal("total_value", { precision: 15, scale: 2 }),
  positionCount: integer("position_count"),
  analysisResults: json("analysis_results")
  // Store complete analysis results
});
var portfolioPositions = pgTable("portfolio_positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id),
  name: text("name").notNull(),
  isin: text("isin"),
  value: decimal("value", { precision: 15, scale: 2 }).notNull(),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  instrumentType: text("instrument_type"),
  // Aktie, ETF, Fonds, Anleihe, ETC, etc.
  sector: text("sector"),
  geography: text("geography"),
  currency: text("currency"),
  assetClass: text("asset_class"),
  // Aktien, Anleihen, Alternative Investments, etc.
  analysisStatus: text("analysis_status").default("pending")
  // pending, analyzing, completed, failed
});
var analysisPhases = pgTable("analysis_phases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id),
  phaseNumber: integer("phase_number").notNull(),
  // 0-4
  phaseName: text("phase_name").notNull(),
  status: text("status").notNull().default("pending"),
  // pending, running, completed, failed
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  results: json("results")
});
var insertPortfolioSchema = createInsertSchema(portfolios).omit({
  id: true,
  uploadedAt: true
});
var insertPortfolioPositionSchema = createInsertSchema(portfolioPositions).omit({
  id: true
});
var insertAnalysisPhaseSchema = createInsertSchema(analysisPhases).omit({
  id: true
});
var updatePortfolioSchema = z.object({
  name: z.string().optional(),
  analysisStatus: z.enum(["pending", "analyzing", "completed", "failed"]).optional(),
  analysisProgress: z.number().min(0).max(100).optional(),
  currentPhase: z.string().optional(),
  totalValue: z.string().optional(),
  // Decimal as string
  positionCount: z.number().optional(),
  analysisResults: z.any().optional()
  // JSON object
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var revalidationRequestSchema = z.object({
  force: z.boolean().optional().default(false),
  includeDetails: z.boolean().optional().default(true)
});
var healthCheckQuerySchema = z.object({
  includeDetails: z.boolean().optional().default(true),
  includeRecommendations: z.boolean().optional().default(true)
});
var errorQuerySchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20),
  errorType: z.enum(["validation", "factsheet", "extraction", "cache", "system"]).optional(),
  since: z.string().datetime().optional()
  // ISO date string
});
var portfolioChangeRequestSchema = z.object({
  changeType: z.enum(["buy", "sell", "rebalance", "swap"]),
  changes: z.array(z.object({
    instrumentName: z.string().min(1, "Instrumentenname darf nicht leer sein"),
    isin: z.string().optional(),
    currentValue: z.number().optional(),
    newValue: z.number(),
    changeAmount: z.number(),
    instrumentType: z.enum(["Aktien", "ETF", "Fonds", "Anleihen", "ETC", "Cash"]).optional()
  })).min(1, "Mindestens eine \xC4nderung erforderlich"),
  scenarioName: z.string().min(1, "Szenario-Name darf nicht leer sein"),
  analysisDate: z.string().datetime().optional()
});
var scenarioAnalysisRequestSchema = z.object({
  scenarios: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    changes: portfolioChangeRequestSchema.shape.changes
  })),
  compareToBaseline: z.boolean().default(true),
  includeRiskMetrics: z.boolean().default(true)
});
var knowledgeBase = pgTable("knowledge_base", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id),
  analysisType: text("analysis_type").notNull(),
  // 'portfolio_analysis', 'risk_assessment', 'market_insight'
  data: json("data").notNull(),
  // Structured analysis results
  insights: text("insights"),
  // Human-readable insights
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  // 0.00-1.00
  tags: text("tags").array(),
  // Searchable tags
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isValid: text("is_valid").default("true")
  // For data validation
});
var chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id),
  userId: varchar("user_id").references(() => users.id),
  sessionName: text("session_name").default("New Chat"),
  context: json("context"),
  // Current conversation context
  createdAt: timestamp("created_at").defaultNow(),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  isActive: text("is_active").default("true")
});
var chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => chatSessions.id),
  sender: text("sender").notNull(),
  // 'user' or 'assistant'
  messageType: text("message_type").default("text"),
  // 'text', 'analysis_request', 'change_proposal'
  content: text("content").notNull(),
  metadata: json("metadata"),
  // Additional data like analysis results
  timestamp: timestamp("timestamp").defaultNow(),
  isDeleted: text("is_deleted").default("false")
});
var portfolioSnapshots = pgTable("portfolio_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id),
  snapshotType: text("snapshot_type").notNull(),
  // 'analysis', 'change_simulation', 'historical'
  positions: json("positions").notNull(),
  // Portfolio positions at time of snapshot
  analysisResults: json("analysis_results"),
  // Full analysis results
  totalValue: decimal("total_value", { precision: 15, scale: 2 }),
  metadata: json("metadata"),
  // Additional snapshot context
  createdAt: timestamp("created_at").defaultNow(),
  description: text("description")
});
var analysisPatterns = pgTable("analysis_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patternType: text("pattern_type").notNull(),
  // 'risk_profile', 'allocation_preference', 'market_sentiment'
  patternData: json("pattern_data").notNull(),
  // Pattern definition and parameters
  frequency: integer("frequency").default(1),
  // How often this pattern has been observed
  reliability: decimal("reliability", { precision: 3, scale: 2 }).default("0.50"),
  // Pattern reliability score
  lastObserved: timestamp("last_observed").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  isActive: text("is_active").default("true")
});
var userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  preferenceType: text("preference_type").notNull(),
  // 'risk_tolerance', 'analysis_depth', 'notification_settings'
  preferenceValue: json("preference_value").notNull(),
  // Preference data
  portfolioId: varchar("portfolio_id").references(() => portfolios.id),
  // Portfolio-specific preferences
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var portfolioTargets = pgTable("portfolio_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  targets: json("targets").notNull(),
  // TargetAllocation arrays for positions, assets, regions, currencies
  constraints: json("constraints"),
  // Reallocation constraints
  isActive: text("is_active").default("true"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var reallocationAnalyses = pgTable("reallocation_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id).notNull(),
  targetStructureId: varchar("target_structure_id").references(() => portfolioTargets.id).notNull(),
  totalPortfolioValue: decimal("total_portfolio_value", { precision: 15, scale: 2 }),
  recommendations: json("recommendations").notNull(),
  // Array of ReallocationRecommendation
  summary: json("summary").notNull(),
  // Reallocation summary
  deviationAnalysis: json("deviation_analysis"),
  // Deviation metrics
  claudeAnalysis: json("claude_analysis"),
  // Claude AI detailed analysis
  status: text("status").default("draft"),
  // draft, reviewed, approved, executed
  analysisDate: timestamp("analysis_date").defaultNow()
});
var positionTargets = pgTable("position_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id).notNull(),
  targetStructureId: varchar("target_structure_id").references(() => portfolioTargets.id),
  positionName: text("position_name").notNull(),
  isin: text("isin"),
  // Optional ISIN for exact matching
  targetPercentage: decimal("target_percentage", { precision: 5, scale: 2 }).notNull(),
  // 0.00-100.00
  targetValue: decimal("target_value", { precision: 15, scale: 2 }),
  // Calculated target value in EUR
  priority: text("priority").default("medium"),
  // high, medium, low
  isActive: text("is_active").default("true"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true
});
var insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true
});
var insertPortfolioSnapshotSchema = createInsertSchema(portfolioSnapshots).omit({
  id: true,
  createdAt: true
});
var insertAnalysisPatternSchema = createInsertSchema(analysisPatterns).omit({
  id: true,
  createdAt: true,
  lastObserved: true
});
var insertUserPreferenceSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertPortfolioTargetSchema = createInsertSchema(portfolioTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertReallocationAnalysisSchema = createInsertSchema(reallocationAnalyses).omit({
  id: true,
  analysisDate: true
});
var insertPositionTargetSchema = createInsertSchema(positionTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// server/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq } from "drizzle-orm";
function sanitizeDateFields(updates) {
  const sanitized = { ...updates };
  const dateFields = ["createdAt", "updatedAt", "startedAt", "completedAt", "lastMessageAt", "lastObserved", "identifiedAt"];
  for (const field of dateFields) {
    if (sanitized[field] !== void 0) {
      if (sanitized[field] instanceof Date) {
        sanitized[field] = sanitized[field].toISOString();
      } else if (sanitized[field] === null) {
        sanitized[field] = null;
      }
    }
  }
  return sanitized;
}
var DatabaseStorage = class {
  // User methods
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || void 0;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  // Portfolio methods
  async createPortfolio(insertPortfolio) {
    const [portfolio] = await db.insert(portfolios).values({
      ...insertPortfolio,
      analysisProgress: 0,
      currentPhase: "Phase 0: Instrumentenidentifikation"
    }).returning();
    return portfolio;
  }
  async getPortfolio(id) {
    const [portfolio] = await db.select().from(portfolios).where(eq(portfolios.id, id));
    return portfolio || void 0;
  }
  async getAllPortfolios() {
    const result = await db.select().from(portfolios).orderBy(portfolios.uploadedAt);
    return result.reverse();
  }
  async updatePortfolio(id, updates) {
    const [portfolio] = await db.update(portfolios).set(updates).where(eq(portfolios.id, id)).returning();
    return portfolio || void 0;
  }
  async deletePortfolio(id) {
    try {
      console.log(`\u{1F5D1}\uFE0F Starting cascade delete for portfolio ${id}`);
      const sessionsToDelete = await db.select({ id: chatSessions.id }).from(chatSessions).where(eq(chatSessions.portfolioId, id));
      let totalMessagesDeleted = 0;
      for (const session of sessionsToDelete) {
        const messagesResult = await db.delete(chatMessages).where(eq(chatMessages.sessionId, session.id));
        totalMessagesDeleted += messagesResult.rowCount || 0;
      }
      console.log(`   Deleted ${totalMessagesDeleted} chat messages`);
      const chatResult = await db.delete(chatSessions).where(eq(chatSessions.portfolioId, id));
      console.log(`   Deleted ${chatResult.rowCount || 0} chat sessions`);
      const knowledgeResult = await db.delete(knowledgeBase).where(eq(knowledgeBase.portfolioId, id));
      console.log(`   Deleted ${knowledgeResult.rowCount || 0} knowledge base entries`);
      const snapshotsResult = await db.delete(portfolioSnapshots).where(eq(portfolioSnapshots.portfolioId, id));
      console.log(`   Deleted ${snapshotsResult.rowCount || 0} portfolio snapshots`);
      const phasesResult = await db.delete(analysisPhases).where(eq(analysisPhases.portfolioId, id));
      console.log(`   Deleted ${phasesResult.rowCount || 0} analysis phases`);
      const positionsResult = await db.delete(portfolioPositions).where(eq(portfolioPositions.portfolioId, id));
      console.log(`   Deleted ${positionsResult.rowCount || 0} portfolio positions`);
      const preferencesResult = await db.delete(userPreferences).where(eq(userPreferences.portfolioId, id));
      console.log(`   Deleted ${preferencesResult.rowCount || 0} user preferences`);
      const portfolioResult = await db.delete(portfolios).where(eq(portfolios.id, id));
      console.log(`   Deleted ${portfolioResult.rowCount || 0} portfolios`);
      const success = portfolioResult.rowCount ? portfolioResult.rowCount > 0 : false;
      console.log(`\u2705 Portfolio ${id} deletion ${success ? "successful" : "failed"}`);
      return success;
    } catch (error) {
      console.error(`\u274C Error during cascade delete for portfolio ${id}:`, error);
      throw error;
    }
  }
  // Portfolio position methods
  async createPortfolioPosition(insertPosition) {
    const [position] = await db.insert(portfolioPositions).values(insertPosition).returning();
    return position;
  }
  async getPortfolioPositions(portfolioId) {
    const result = await db.select().from(portfolioPositions).where(eq(portfolioPositions.portfolioId, portfolioId));
    return result.sort((a, b) => Number(b.value) - Number(a.value));
  }
  async updatePortfolioPosition(id, updates) {
    const [position] = await db.update(portfolioPositions).set(updates).where(eq(portfolioPositions.id, id)).returning();
    return position || void 0;
  }
  // Analysis phase methods
  async createAnalysisPhase(insertPhase) {
    const [phase] = await db.insert(analysisPhases).values(insertPhase).returning();
    return phase;
  }
  async getAnalysisPhases(portfolioId) {
    const result = await db.select().from(analysisPhases).where(eq(analysisPhases.portfolioId, portfolioId));
    return result.sort((a, b) => a.phaseNumber - b.phaseNumber);
  }
  async updateAnalysisPhase(id, updates) {
    const [phase] = await db.update(analysisPhases).set(sanitizeDateFields(updates)).where(eq(analysisPhases.id, id)).returning();
    return phase || void 0;
  }
  // Knowledge Base methods
  async createKnowledgeEntry(insertEntry) {
    const [entry] = await db.insert(knowledgeBase).values(insertEntry).returning();
    return entry;
  }
  async getKnowledgeEntries(query) {
    let dbQuery = db.select().from(knowledgeBase);
    const result = await dbQuery;
    let filtered = result;
    if (query.portfolioId) {
      filtered = filtered.filter((e) => e.portfolioId === query.portfolioId);
    }
    if (query.analysisType) {
      filtered = filtered.filter((e) => query.analysisType.includes(e.analysisType));
    }
    if (query.confidenceMin !== void 0) {
      filtered = filtered.filter((e) => e.confidence && parseFloat(e.confidence) >= query.confidenceMin);
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, query.limit || 50);
  }
  async updateKnowledgeEntry(id, updates) {
    const [entry] = await db.update(knowledgeBase).set(sanitizeDateFields({ ...updates, updatedAt: /* @__PURE__ */ new Date() })).where(eq(knowledgeBase.id, id)).returning();
    return entry || void 0;
  }
  async deleteKnowledgeEntry(id) {
    const result = await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  // Chat Session methods
  async createChatSession(insertSession) {
    const [session] = await db.insert(chatSessions).values(insertSession).returning();
    return session;
  }
  async getChatSession(id) {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session || void 0;
  }
  async getChatSessions(portfolioId) {
    const result = await db.select().from(chatSessions).where(eq(chatSessions.portfolioId, portfolioId));
    return result.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }
  async updateChatSession(id, updates) {
    const [session] = await db.update(chatSessions).set(sanitizeDateFields(updates)).where(eq(chatSessions.id, id)).returning();
    return session || void 0;
  }
  async deleteChatSession(id) {
    await db.delete(chatMessages).where(eq(chatMessages.sessionId, id));
    const result = await db.delete(chatSessions).where(eq(chatSessions.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  // Chat Message methods
  async createChatMessage(insertMessage) {
    const [message] = await db.insert(chatMessages).values(insertMessage).returning();
    return message;
  }
  async getChatMessages(sessionId) {
    const result = await db.select().from(chatMessages).where(eq(chatMessages.sessionId, sessionId));
    return result.filter((m) => m.isDeleted === "false").sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
  async updateChatMessage(id, updates) {
    const [message] = await db.update(chatMessages).set(updates).where(eq(chatMessages.id, id)).returning();
    return message || void 0;
  }
  async deleteChatMessage(id) {
    const result = await db.delete(chatMessages).where(eq(chatMessages.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  // Portfolio Snapshot methods
  async createPortfolioSnapshot(insertSnapshot) {
    const [snapshot] = await db.insert(portfolioSnapshots).values(insertSnapshot).returning();
    return snapshot;
  }
  // This method was moved to the end of the class - removing duplicate
  async getPortfolioSnapshot(id) {
    const [snapshot] = await db.select().from(portfolioSnapshots).where(eq(portfolioSnapshots.id, id));
    return snapshot || void 0;
  }
  async deletePortfolioSnapshot(id) {
    const result = await db.delete(portfolioSnapshots).where(eq(portfolioSnapshots.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  // Analysis Pattern methods
  async createAnalysisPattern(insertPattern) {
    const [pattern] = await db.insert(analysisPatterns).values(insertPattern).returning();
    return pattern;
  }
  async getAnalysisPatterns(patternType) {
    const result = await db.select().from(analysisPatterns);
    let filtered = result.filter((p) => p.isActive === "true");
    if (patternType) {
      filtered = filtered.filter((p) => p.patternType === patternType);
    }
    return filtered.sort((a, b) => parseFloat(b.reliability) - parseFloat(a.reliability));
  }
  async updateAnalysisPattern(id, updates) {
    const [pattern] = await db.update(analysisPatterns).set(updates).where(eq(analysisPatterns.id, id)).returning();
    return pattern || void 0;
  }
  async deleteAnalysisPattern(id) {
    const result = await db.delete(analysisPatterns).where(eq(analysisPatterns.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  // User Preference methods
  async createUserPreference(insertPreference) {
    const [preference] = await db.insert(userPreferences).values(insertPreference).returning();
    return preference;
  }
  async getUserPreferences(userId, portfolioId) {
    const result = await db.select().from(userPreferences);
    let filtered = result.filter((p) => p.userId === userId);
    if (portfolioId) {
      filtered = filtered.filter((p) => p.portfolioId === portfolioId);
    }
    return filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
  async updateUserPreference(id, updates) {
    const [preference] = await db.update(userPreferences).set(sanitizeDateFields({ ...updates, updatedAt: /* @__PURE__ */ new Date() })).where(eq(userPreferences.id, id)).returning();
    return preference || void 0;
  }
  async deleteUserPreference(id) {
    const result = await db.delete(userPreferences).where(eq(userPreferences.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  // Portfolio Snapshot methods
  async createPortfolioSnapshot(insertSnapshot) {
    const [snapshot] = await db.insert(portfolioSnapshots).values(insertSnapshot).returning();
    return snapshot;
  }
  async getPortfolioSnapshots(query) {
    let dbQuery = db.select().from(portfolioSnapshots);
    const result = await dbQuery;
    let filtered = result.filter((s) => s.portfolioId === query.portfolioId);
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, query.limit || 20);
  }
  async getPortfolioSnapshot(id) {
    const [snapshot] = await db.select().from(portfolioSnapshots).where(eq(portfolioSnapshots.id, id));
    return snapshot || void 0;
  }
  async updatePortfolioSnapshot(id, updates) {
    const [snapshot] = await db.update(portfolioSnapshots).set(updates).where(eq(portfolioSnapshots.id, id)).returning();
    return snapshot || void 0;
  }
  async deletePortfolioSnapshot(id) {
    const result = await db.delete(portfolioSnapshots).where(eq(portfolioSnapshots.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  // Analysis Pattern methods
  async createAnalysisPattern(insertPattern) {
    const [pattern] = await db.insert(analysisPatterns).values(insertPattern).returning();
    return pattern;
  }
  async getAnalysisPatterns(query) {
    const result = await db.select().from(analysisPatterns);
    let filtered = result;
    if (query.portfolioId) {
      filtered = filtered.filter((p) => p.portfolioId === query.portfolioId);
    }
    return filtered.sort((a, b) => new Date(b.identifiedAt).getTime() - new Date(a.identifiedAt).getTime()).slice(0, query.limit || 50);
  }
  async updateAnalysisPattern(id, updates) {
    const [pattern] = await db.update(analysisPatterns).set(sanitizeDateFields({ ...updates, identifiedAt: /* @__PURE__ */ new Date() })).where(eq(analysisPatterns.id, id)).returning();
    return pattern || void 0;
  }
  async deleteAnalysisPattern(id) {
    const result = await db.delete(analysisPatterns).where(eq(analysisPatterns.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  // Position Target methods
  async createPositionTarget(target) {
    const [positionTarget] = await db.insert(positionTargets).values(target).returning();
    return positionTarget;
  }
  async getPositionTargets(portfolioId) {
    const targets = await db.select().from(positionTargets).where(eq(positionTargets.portfolioId, portfolioId));
    return targets;
  }
  async getPositionTargetsByStructure(targetStructureId) {
    const targets = await db.select().from(positionTargets).where(eq(positionTargets.targetStructureId, targetStructureId));
    return targets;
  }
  async updatePositionTarget(id, updates) {
    const sanitizedUpdates = sanitizeDateFields(updates);
    const [target] = await db.update(positionTargets).set({
      ...sanitizedUpdates,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }).where(eq(positionTargets.id, id)).returning();
    return target || void 0;
  }
  async deletePositionTarget(id) {
    const result = await db.delete(positionTargets).where(eq(positionTargets.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  async deletePositionTargetsByPortfolio(portfolioId) {
    const result = await db.delete(positionTargets).where(eq(positionTargets.portfolioId, portfolioId));
    return result.rowCount ? result.rowCount > 0 : false;
  }
};
var storage = new DatabaseStorage();

// server/services/claude-simple.ts
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs/promises";
import * as path from "path";
var ClaudeAnalysisService = class {
  anthropic;
  saaPrompt = null;
  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    this.anthropic = new Anthropic({ apiKey });
    this.loadSAAPrompt();
  }
  async loadSAAPrompt() {
    try {
      const promptPath = path.join(process.cwd(), "server", "services", "claudeSAA.md");
      console.log("Looking for prompt at:", promptPath);
      this.saaPrompt = await fs.readFile(promptPath, "utf-8");
      console.log("\u2705 Claude SAA prompt loaded successfully");
    } catch (error) {
      console.error("\u274C Failed to load Claude SAA prompt:", error);
      this.saaPrompt = this.getDefaultPrompt();
    }
  }
  getDefaultPrompt() {
    return `Du bist ein Portfolio-Analyst. Analysiere das folgende Portfolio und gib eine strukturierte Analyse zur\xFCck.
    
    Bitte analysiere:
    1. Asset-Allokation (Aktien, Anleihen, etc.)
    2. Geografische Verteilung
    3. W\xE4hrungsexposition
    4. Risikometriken
    
    Gib die Ergebnisse als strukturiertes JSON zur\xFCck.`;
  }
  async analyzePortfolio(positions, options) {
    try {
      const prompt = this.saaPrompt || this.getDefaultPrompt();
      const portfolioData = {
        totalValue: options.totalValue,
        positionCount: positions.length,
        positions: positions.map((p) => ({
          name: p.name,
          isin: p.isin || "N/A",
          value: p.value,
          percentage: (p.value / options.totalValue * 100).toFixed(2) + "%"
        }))
      };
      const userMessage = `
${prompt}

Portfolio-Daten:
${JSON.stringify(portfolioData, null, 2)}

Bitte analysiere dieses Portfolio vollst\xE4ndig und gib die Ergebnisse als strukturiertes JSON zur\xFCck mit:
- assetAllocation: Array von {category: string, value: number, percentage: number, assignedPositions: [{name: string, isin: string, value: number, percentage: number}]}
- geographicAllocation: Array von {region: string, value: number, percentage: number, assignedPositions: [{name: string, isin: string, value: number, percentage: number}]}
- currencyExposure: Array von {currency: string, value: number, percentage: number, assignedPositions: [{name: string, isin: string, value: number, percentage: number}]}
- riskMetrics: Objekt mit expectedReturn, volatility, sharpeRatio, etc.
- summary: Textuelle Zusammenfassung der Analyse

WICHTIG: F\xFCr jede Kategorie (Asset-Klasse, geografische Region, W\xE4hrung) zeige in assignedPositions auf, welche konkreten Portfolio-Positionen du dieser Kategorie zugeordnet hast. Dies erm\xF6glicht Transparenz \xFCber deine Kategorisierungslogik.
`;
      console.log(`\u{1F916} Sending portfolio with ${positions.length} positions to Claude for analysis...`);
      const response = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        temperature: 0.2,
        messages: [{
          role: "user",
          content: userMessage
        }]
      });
      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude");
      }
      let analysisResults;
      try {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResults = JSON.parse(jsonMatch[0]);
        } else {
          analysisResults = {
            rawAnalysis: content.text,
            error: "Could not parse structured JSON from response"
          };
        }
      } catch (parseError) {
        console.warn("Failed to parse JSON from Claude response:", parseError);
        analysisResults = {
          rawAnalysis: content.text,
          error: "JSON parsing failed"
        };
      }
      console.log("\u2705 Claude analysis completed");
      return analysisResults;
    } catch (error) {
      console.error("\u274C Claude analysis failed:", error);
      throw error;
    }
  }
  async analyzeReallocation(positions, currentAnalysis, targetStructure, portfolioId) {
    try {
      const reallocationPrompt = `Du bist ein erfahrener Portfolio-Analyst f\xFCr Reallokation-Analysen. 

Analysiere das folgende Portfolio und erstelle eine detaillierte Reallokation-Empfehlung zur Erreichung der Zielstruktur.

AKTUELLES PORTFOLIO:
${JSON.stringify({
        portfolioId,
        positions: positions.map((p) => ({
          name: p.name,
          isin: p.isin || "N/A",
          value: p.value,
          percentage: (p.value / positions.reduce((sum, pos) => sum + pos.value, 0) * 100).toFixed(2) + "%"
        })),
        totalValue: positions.reduce((sum, pos) => sum + pos.value, 0),
        currentStructure: currentAnalysis
      }, null, 2)}

GEW\xDCNSCHTE ZIELSTRUKTUR:
${JSON.stringify(targetStructure, null, 2)}

Erstelle eine strukturierte Reallokation-Analyse als JSON mit folgender Struktur:

{
  "recommendations": [
    {
      "action": "buy|sell|hold|adjust",
      "positionName": "Name der Position",
      "isin": "ISIN falls verf\xFCgbar",
      "category": "position|assetClass|region|currency",
      "currentAmount": 0,
      "currentPercentage": 0,
      "targetAmount": 0,
      "targetPercentage": 0,
      "changeAmount": 0,
      "changePercentage": 0,
      "priority": "high|medium|low",
      "reasoning": "Detaillierte Begr\xFCndung f\xFCr diese Empfehlung",
      "estimatedCost": 0,
      "taxImplication": "Steuerliche Auswirkungen"
    }
  ],
  "summary": {
    "totalBuyAmount": 0,
    "totalSellAmount": 0,
    "estimatedTotalCost": 0,
    "numberOfTransactions": 0,
    "reallocationEfficiency": 85,
    "riskImpact": "positive|negative|neutral",
    "expectedImprovement": ["Liste der erwarteten Verbesserungen"]
  },
  "deviationAnalysis": {
    "assetClassDeviation": 0,
    "regionDeviation": 0,
    "currencyDeviation": 0,
    "overallDeviation": 0
  },
  "claudeAnalysis": {
    "detailedRecommendations": "Ausf\xFChrliche deutsche Analyse",
    "riskAssessment": "Risikobewertung der Umschichtungen",
    "taxConsiderations": "Steuerliche \xDCberlegungen",
    "alternativeStrategies": ["Alternative Reallokation-Strategien"]
  }
}

WICHTIGE REALLOKATIONS-PRIORIT\xC4TEN:

1. **Position-spezifische Ziele haben h\xF6chste Priorit\xE4t**: Wenn Zielstruktur explizite Position-Targets (positions Array) enth\xE4lt, haben diese Vorrang vor kategorialen Targets.

2. **Multi-Level-Ansatz**: 
   - Prim\xE4r: Erf\xFClle spezifische Positionsziele (falls definiert)
   - Sekund\xE4r: Erf\xFClle Asset-Klassen, Regions- und W\xE4hrungsziele
   - Balance zwischen beiden bei Konflikten

3. **Position-Target-Logik**:
   - Jede Position mit targetPercentage > 0 soll auf genau diesen Wert rebalanced werden
   - Positions ohne explizite Targets k\xF6nnen zur Erf\xFCllung kategorialer Ziele verwendet werden
   - Bei partieller Positionsabdeckung (<100% der Targets): Verbleibende Allokation nach kategorialen Zielen

Ber\xFCcksichtige zus\xE4tzlich:
- Deutsche Steuergesetze (Abgeltungssteuer, Verlustt\xF6pfe)
- Transaktionskosten (ca. 0,25-1% je Trade)
- Minimale Handelsgr\xF6\xDFen
- Liquidit\xE4t der Positionen
- Risiko-Auswirkungen der Umschichtungen
- Effiziente Reihenfolge der Trades
- Priorit\xE4tshierarchie: Position-Targets \u2192 Kategoriale Targets \u2192 Portfolio-Balance`;
      console.log(`\u{1F916} Starting Claude reallocation analysis for portfolio ${portfolioId}...`);
      const response = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        temperature: 0.2,
        messages: [{
          role: "user",
          content: reallocationPrompt
        }]
      });
      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude");
      }
      let reallocationResults;
      try {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          reallocationResults = JSON.parse(jsonMatch[0]);
        } else {
          reallocationResults = {
            rawAnalysis: content.text,
            error: "Could not parse structured JSON from response"
          };
        }
      } catch (parseError) {
        console.warn("Failed to parse JSON from Claude reallocation response:", parseError);
        reallocationResults = {
          rawAnalysis: content.text,
          error: "JSON parsing failed"
        };
      }
      console.log("\u2705 Claude reallocation analysis completed");
      return reallocationResults;
    } catch (error) {
      console.error("\u274C Claude reallocation analysis failed:", error);
      throw error;
    }
  }
};
var claudeService = new ClaudeAnalysisService();

// server/services/csv-parser.ts
import Papa from "papaparse";
async function parseCSV(fileContent) {
  return new Promise((resolve, reject) => {
    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        try {
          const positions = [];
          let totalValue = 0;
          for (const row of result.data) {
            const name = row.Name || row.Ticker || row.Symbol || row.Bezeichnung || row.Position || "";
            const isin = row.ISIN || row.WKN || row.Wertpapierkennnummer || "";
            let value = 0;
            const valueStr = row.Value || row.Wert || row["Market Value"] || row.Marktwert || row.Betrag || "0";
            if (typeof valueStr === "string") {
              let cleanValue = valueStr.replace(/[€$£¥]/g, "").trim();
              if (cleanValue.includes(",") && cleanValue.includes(".")) {
                const lastComma = cleanValue.lastIndexOf(",");
                const lastDot = cleanValue.lastIndexOf(".");
                if (lastComma > lastDot) {
                  cleanValue = cleanValue.replace(/\./g, "").replace(",", ".");
                } else {
                  cleanValue = cleanValue.replace(/,/g, "");
                }
              } else if (cleanValue.includes(",")) {
                const parts = cleanValue.split(",");
                if (parts[parts.length - 1].length === 3) {
                  cleanValue = cleanValue.replace(/,/g, "");
                } else {
                  cleanValue = cleanValue.replace(",", ".");
                }
              }
              value = parseFloat(cleanValue) || 0;
            } else if (typeof valueStr === "number") {
              value = valueStr;
            }
            if (name && value > 0) {
              positions.push({
                name: name.trim(),
                isin: isin ? isin.trim() : void 0,
                value
              });
              totalValue += value;
            }
          }
          if (positions.length === 0) {
            throw new Error("Keine g\xFCltigen Positionen in der CSV-Datei gefunden");
          }
          resolve({
            positions,
            totalValue
          });
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`CSV-Parse-Fehler: ${error.message}`));
      }
    });
  });
}

// server/services/investment-universe.ts
import * as fs2 from "fs/promises";
import * as path2 from "path";
var InvestmentUniverseService = class {
  cacheExpiry = 5 * 60 * 1e3;
  // 5 minutes
  lastCacheTime = 0;
  cachedUniverse = null;
  /**
   * Get complete investment universe from local factsheet directory
   */
  async getInvestmentUniverse(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this.cachedUniverse && now - this.lastCacheTime < this.cacheExpiry) {
      console.log("Returning cached investment universe");
      return this.cachedUniverse;
    }
    console.log("Scanning investment universe directory...");
    const investmentDir = path2.join(process.cwd(), "investment_universe");
    try {
      await fs2.access(investmentDir);
    } catch (error) {
      console.error("Investment universe directory not found:", investmentDir);
      return {
        instruments: [],
        categories: [],
        assetClasses: [],
        totalCount: 0
      };
    }
    const instruments = [];
    const categories = /* @__PURE__ */ new Set();
    const assetClasses = /* @__PURE__ */ new Set();
    await this.scanDirectoryRecursively(investmentDir, instruments, categories, assetClasses, "");
    const result = {
      instruments: instruments.sort((a, b) => a.name.localeCompare(b.name, "de")),
      categories: Array.from(categories).sort(),
      assetClasses: Array.from(assetClasses).sort(),
      totalCount: instruments.length
    };
    this.cachedUniverse = result;
    this.lastCacheTime = now;
    console.log(`Investment universe loaded: ${result.totalCount} instruments, ${result.assetClasses.length} asset classes, ${result.categories.length} categories`);
    return result;
  }
  /**
   * Search instruments by name or ISIN
   */
  async searchInstruments(query) {
    const universe = await this.getInvestmentUniverse();
    const searchTerm = query.toLowerCase();
    return universe.instruments.filter(
      (instrument) => instrument.name.toLowerCase().includes(searchTerm) || instrument.isin && instrument.isin.toLowerCase().includes(searchTerm)
    );
  }
  /**
   * Get instruments by asset class
   */
  async getInstrumentsByAssetClass(assetClass) {
    const universe = await this.getInvestmentUniverse();
    return universe.instruments.filter((instrument) => instrument.assetClass === assetClass);
  }
  /**
   * Get instruments by category
   */
  async getInstrumentsByCategory(category) {
    const universe = await this.getInvestmentUniverse();
    return universe.instruments.filter((instrument) => instrument.category === category);
  }
  /**
   * Recursively scan directory for factsheet PDFs
   */
  async scanDirectoryRecursively(dirPath, instruments, categories, assetClasses, parentPath) {
    try {
      const entries = await fs2.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path2.join(dirPath, entry.name);
        const relativePath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          categories.add(entry.name);
          await this.scanDirectoryRecursively(fullPath, instruments, categories, assetClasses, relativePath);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
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
  extractInstrumentInfoFromFilename(fileName, relativePath, fullPath) {
    try {
      const pathParts = relativePath.split("/");
      let assetClass = "Sonstiges";
      let category = "Unbekannt";
      const assetClassDir = pathParts.find(
        (part) => ["Aktien", "Anleihen", "Alternative", "Geldmarkt", "Rohstoffe", "Immobilien"].includes(part)
      );
      if (assetClassDir) {
        assetClass = assetClassDir;
      }
      const categoryDir = pathParts.find((part) => part.startsWith("Stufe"));
      if (categoryDir) {
        category = categoryDir;
      }
      let name = fileName.replace(".pdf", "");
      let isin;
      const isinMatch = fileName.match(/([A-Z]{2}[A-Z0-9]{10})/);
      if (isinMatch) {
        isin = isinMatch[1];
      }
      return {
        name,
        // Use filename directly as requested
        isin,
        assetClass,
        category,
        factsheetPath: fullPath,
        hasFactsheet: true,
        fileName,
        confidence: isin ? 0.8 : 0.6
        // Higher confidence if ISIN found
      };
    } catch (error) {
      console.error(`Error extracting info from filename ${fileName}:`, error);
      return null;
    }
  }
  /**
   * Get asset class for a specific instrument by name or ISIN
   */
  async getAssetClassForInstrument(name, isin) {
    const universe = await this.getInvestmentUniverse();
    if (isin) {
      const instrumentByISIN = universe.instruments.find(
        (inst) => inst.isin && inst.isin.toUpperCase() === isin.toUpperCase()
      );
      if (instrumentByISIN) {
        return instrumentByISIN.assetClass;
      }
    }
    const nameLower = name.toLowerCase();
    const instrumentByName = universe.instruments.find(
      (inst) => inst.name.toLowerCase().includes(nameLower) || nameLower.includes(inst.name.toLowerCase())
    );
    if (instrumentByName) {
      return instrumentByName.assetClass;
    }
    if (nameLower === "euro" || nameLower === "eur" || nameLower.includes("devisenkonto") || nameLower.includes("kontokorrent") || nameLower.includes("cash") || nameLower.includes("liquidit\xE4t")) {
      return "Liquidit\xE4t";
    }
    return null;
  }
  /**
   * Validate if an instrument exists in the investment universe
   */
  async validateInstrument(name, isin) {
    const universe = await this.getInvestmentUniverse();
    return universe.instruments.some(
      (instrument) => instrument.name.toLowerCase() === name.toLowerCase() || isin && instrument.isin === isin
    );
  }
  /**
   * Get instrument details by name or ISIN
   */
  async getInstrumentDetails(name, isin) {
    const universe = await this.getInvestmentUniverse();
    return universe.instruments.find(
      (instrument) => instrument.name.toLowerCase() === name.toLowerCase() || isin && instrument.isin === isin
    ) || null;
  }
  /**
   * Force refresh cache (useful for administration)
   */
  async refreshCache() {
    console.log("Forcing investment universe cache refresh...");
    await this.getInvestmentUniverse(true);
  }
  /**
   * Get factsheet for a specific instrument by name and ISIN
   * This method is called by claude.ts for look-through analysis
   */
  async getFactsheetForInstrument(name, isin) {
    try {
      const instrument = await this.getInstrumentDetails(name, isin || void 0);
      if (!instrument || !instrument.factsheetPath) {
        console.log(`No factsheet found for instrument: ${name} (ISIN: ${isin})`);
        return null;
      }
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
};
var investmentUniverseService = new InvestmentUniverseService();

// server/routes.ts
var factsheetCache = /* @__PURE__ */ new Map();
var CACHE_TTL = 5 * 60 * 1e3;
var lastRequestTimes = /* @__PURE__ */ new Map();
var RATE_LIMIT_DELAY = 1e3;
var factsheetRateLimit = (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress || "unknown";
  const now = Date.now();
  const lastRequest = lastRequestTimes.get(clientIp);
  if (lastRequest && now - lastRequest < RATE_LIMIT_DELAY) {
    return res.status(429).json({ error: "Zu viele Anfragen. Bitte warten Sie einen Moment." });
  }
  lastRequestTimes.set(clientIp, now);
  next();
};
var getCachedData = (key) => {
  const cached = factsheetCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  factsheetCache.delete(key);
  return null;
};
var setCachedData = (key, data) => {
  factsheetCache.set(key, { data, timestamp: Date.now() });
};
var performanceMonitor = {
  requestTimes: /* @__PURE__ */ new Map(),
  logRequest: (endpoint, duration) => {
    if (!performanceMonitor.requestTimes.has(endpoint)) {
      performanceMonitor.requestTimes.set(endpoint, []);
    }
    const times = performanceMonitor.requestTimes.get(endpoint);
    times.push(duration);
    if (times.length > 100) {
      times.shift();
    }
  },
  getStats: () => {
    const stats = {};
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
var securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
};
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB limit
  }
});
var investmentUniverseService2 = new InvestmentUniverseService();
async function registerRoutes(app2) {
  app2.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.get("/api/portfolios", async (req, res) => {
    try {
      const portfolios2 = await storage.getAllPortfolios();
      res.json(portfolios2);
    } catch (error) {
      console.error("Error fetching portfolios:", error);
      res.status(500).json({ error: "Fehler beim Laden der Portfolios" });
    }
  });
  app2.get("/api/portfolios/:id", async (req, res) => {
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
  app2.post("/api/portfolios/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Keine Datei hochgeladen" });
      }
      const fileContent = req.file.buffer.toString("utf-8");
      const { positions, totalValue } = await parseCSV(fileContent);
      const portfolio = await storage.createPortfolio({
        name: req.file.originalname,
        fileName: req.file.originalname,
        totalValue: totalValue.toString(),
        positionCount: positions.length,
        analysisStatus: "pending"
      });
      for (const position of positions) {
        await storage.createPortfolioPosition({
          portfolioId: portfolio.id,
          name: position.name,
          isin: position.isin || null,
          value: position.value.toString(),
          percentage: (position.value / totalValue * 100).toString()
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
  app2.post("/api/portfolios/:id/analyze", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const portfolio = await storage.getPortfolio(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio nicht gefunden" });
      }
      const positions = await storage.getPortfolioPositions(portfolioId);
      await storage.updatePortfolio(portfolioId, {
        analysisStatus: "analyzing"
      });
      const claudePositions = positions.map((p) => ({
        name: p.name,
        isin: p.isin,
        value: parseFloat(p.value)
      }));
      const analysisResults = await claudeService.analyzePortfolio(claudePositions, {
        portfolioId,
        totalValue: parseFloat(portfolio.totalValue || "0")
      });
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
  app2.get("/api/portfolios/:id/positions", async (req, res) => {
    try {
      const positions = await storage.getPortfolioPositions(req.params.id);
      res.json(positions);
    } catch (error) {
      console.error("Error fetching positions:", error);
      res.status(500).json({ error: "Fehler beim Laden der Positionen" });
    }
  });
  app2.delete("/api/portfolios/:id", async (req, res) => {
    try {
      await storage.deletePortfolio(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting portfolio:", error);
      res.status(500).json({ error: "Fehler beim L\xF6schen des Portfolios" });
    }
  });
  app2.post("/api/portfolios/:id/targets", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const { name, description, targets, constraints } = req.body;
      const validatePercentages = (allocations) => {
        if (!allocations || allocations.length === 0) return true;
        const sum = allocations.reduce((total, item) => total + (item.targetPercentage || 0), 0);
        return Math.abs(sum - 100) <= 1;
      };
      if (targets.assetClasses && !validatePercentages(targets.assetClasses)) {
        return res.status(400).json({ error: "Asset-Klassen m\xFCssen in der Summe 100% ergeben" });
      }
      if (targets.regions && !validatePercentages(targets.regions)) {
        return res.status(400).json({ error: "Regionen m\xFCssen in der Summe 100% ergeben" });
      }
      if (targets.currencies && !validatePercentages(targets.currencies)) {
        return res.status(400).json({ error: "W\xE4hrungen m\xFCssen in der Summe 100% ergeben" });
      }
      const targetStructure = {
        portfolioId,
        name,
        description,
        targets: JSON.stringify(targets),
        constraints: JSON.stringify(constraints || {}),
        isActive: "true"
      };
      const createdTargetStructure = {
        id: Date.now().toString(),
        ...targetStructure,
        targets,
        constraints: constraints || {},
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      if (targets.positions && Array.isArray(targets.positions)) {
        console.log(`\u{1F4BE} Saving ${targets.positions.length} position targets...`);
        for (const position of targets.positions) {
          if (position.identifier && position.targetPercentage > 0) {
            try {
              await storage.createPositionTarget({
                portfolioId,
                targetStructureId: createdTargetStructure.id,
                positionName: position.identifier,
                isin: position.isin || null,
                targetPercentage: position.targetPercentage.toString(),
                priority: "medium",
                isActive: "true"
              });
              console.log(`\u2705 Saved position target: ${position.identifier} -> ${position.targetPercentage}%`);
            } catch (error) {
              console.error(`\u274C Failed to save position target for ${position.identifier}:`, error);
            }
          }
        }
      }
      console.log(`\u{1F4CA} Created target structure "${name}" for portfolio ${portfolioId}`);
      res.json(createdTargetStructure);
    } catch (error) {
      console.error("Error creating target structure:", error);
      res.status(500).json({ error: "Fehler beim Erstellen der Zielstruktur" });
    }
  });
  app2.get("/api/portfolios/:id/targets", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      res.json([]);
    } catch (error) {
      console.error("Error fetching target structures:", error);
      res.status(500).json({ error: "Fehler beim Laden der Zielstrukturen" });
    }
  });
  app2.post("/api/portfolios/:id/reallocation", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const { targetStructureId, targetStructure } = req.body;
      if (!targetStructure) {
        return res.status(400).json({ error: "Zielstruktur erforderlich" });
      }
      const portfolio = await storage.getPortfolio(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio nicht gefunden" });
      }
      const positions = await storage.getPortfolioPositions(portfolioId);
      if (!positions || positions.length === 0) {
        return res.status(400).json({ error: "Portfolio hat keine Positionen" });
      }
      let currentAnalysis = portfolio.analysisResults;
      if (!currentAnalysis) {
        currentAnalysis = {
          assetAllocation: [],
          geographicAllocation: [],
          currencyExposure: [],
          summary: "Keine detaillierte Analyse verf\xFCgbar"
        };
      }
      let enhancedTargetStructure = targetStructure;
      if (targetStructureId) {
        try {
          const positionTargets2 = await storage.getPositionTargetsByStructure(targetStructureId);
          if (positionTargets2 && positionTargets2.length > 0) {
            enhancedTargetStructure = {
              ...targetStructure,
              targets: {
                ...targetStructure.targets,
                positions: positionTargets2.map((pt) => ({
                  identifier: pt.positionName,
                  isin: pt.isin,
                  targetPercentage: parseFloat(pt.targetPercentage),
                  priority: pt.priority
                }))
              }
            };
            console.log(`\u{1F4CD} Found ${positionTargets2.length} position targets for reallocation analysis`);
          }
        } catch (error) {
          console.warn("Could not load position targets:", error);
        }
      }
      const claudePositions = positions.map((p) => ({
        name: p.name,
        isin: p.isin || null,
        value: parseFloat(p.value)
      }));
      console.log(`\u{1F504} Starting reallocation analysis for portfolio ${portfolioId}...`);
      const reallocationResults = await claudeService.analyzeReallocation(
        claudePositions,
        currentAnalysis,
        enhancedTargetStructure,
        portfolioId
      );
      const analysisRecord = {
        id: Date.now().toString(),
        portfolioId,
        targetStructureId: targetStructureId || "manual",
        totalPortfolioValue: parseFloat(portfolio.totalValue || "0"),
        recommendations: reallocationResults.recommendations || [],
        summary: reallocationResults.summary || {},
        deviationAnalysis: reallocationResults.deviationAnalysis || {},
        claudeAnalysis: reallocationResults.claudeAnalysis || {},
        status: "draft",
        analysisDate: /* @__PURE__ */ new Date()
      };
      console.log(`\u2705 Reallokation analysis completed for portfolio ${portfolioId}`);
      res.json(analysisRecord);
    } catch (error) {
      console.error("Error performing reallocation analysis:", error);
      res.status(500).json({
        error: "Fehler bei der Reallokation-Analyse",
        details: error.message
      });
    }
  });
  app2.post("/api/portfolios/:portfolioId/position-targets", async (req, res) => {
    try {
      const portfolioId = req.params.portfolioId;
      const { positionName, isin, targetPercentage, targetStructureId, priority } = req.body;
      if (!positionName || !targetPercentage) {
        return res.status(400).json({
          error: "Positionsname und Zielpercentage sind erforderlich"
        });
      }
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
        priority: priority || "medium",
        isActive: "true"
      });
      res.json({ success: true, positionTarget });
    } catch (error) {
      console.error("Error creating position target:", error);
      res.status(500).json({ error: "Fehler beim Erstellen des Positionsziels" });
    }
  });
  app2.get("/api/portfolios/:portfolioId/position-targets", async (req, res) => {
    try {
      const portfolioId = req.params.portfolioId;
      const positionTargets2 = await storage.getPositionTargets(portfolioId);
      res.json({ success: true, positionTargets: positionTargets2 });
    } catch (error) {
      console.error("Error fetching position targets:", error);
      res.status(500).json({ error: "Fehler beim Laden der Positionsziele" });
    }
  });
  app2.put("/api/portfolios/:portfolioId/position-targets/:targetId", async (req, res) => {
    try {
      const targetId = req.params.targetId;
      const updates = req.body;
      if (updates.targetPercentage !== void 0) {
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
  app2.delete("/api/portfolios/:portfolioId/position-targets/:targetId", async (req, res) => {
    try {
      const targetId = req.params.targetId;
      const deleted = await storage.deletePositionTarget(targetId);
      if (!deleted) {
        return res.status(404).json({ error: "Positionsziel nicht gefunden" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting position target:", error);
      res.status(500).json({ error: "Fehler beim L\xF6schen des Positionsziels" });
    }
  });
  app2.get("/api/target-structures/:structureId/position-targets", async (req, res) => {
    try {
      const structureId = req.params.structureId;
      const positionTargets2 = await storage.getPositionTargetsByStructure(structureId);
      res.json({ success: true, positionTargets: positionTargets2 });
    } catch (error) {
      console.error("Error fetching position targets by structure:", error);
      res.status(500).json({ error: "Fehler beim Laden der Positionsziele" });
    }
  });
  app2.post("/api/portfolios/:id/optimize", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const { method, constraints, parameters } = req.body;
      const portfolio = await storage.getPortfolio(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio nicht gefunden" });
      }
      const optimizationPrompt = `
        F\xFChre eine Portfolio-Optimierung mit folgenden Parametern durch:

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
        2. Erwartete Rendite und Risiko f\xFCr aktuelles und optimiertes Portfolio
        3. Sharpe Ratio f\xFCr beide Portfolios
        4. Die Efficient Frontier (20 Punkte)
        5. Erforderliche Umschichtungen mit Betr\xE4gen

        Gib die Ergebnisse im folgenden JSON-Format zur\xFCck:
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
  app2.get("/api/investment-universe", async (req, res) => {
    try {
      const { assetClass, category, search, limit, offset } = req.query;
      let universe = await investmentUniverseService2.getInvestmentUniverse();
      let instruments = universe.instruments;
      if (assetClass) {
        instruments = instruments.filter(
          (instrument) => instrument.assetClass.toLowerCase() === assetClass.toLowerCase()
        );
      }
      if (category) {
        instruments = instruments.filter(
          (instrument) => instrument.category.toLowerCase() === category.toLowerCase()
        );
      }
      if (search) {
        const searchTerm = search.toLowerCase();
        instruments = instruments.filter(
          (instrument) => instrument.name.toLowerCase().includes(searchTerm) || instrument.isin && instrument.isin.toLowerCase().includes(searchTerm)
        );
      }
      const startIndex = offset ? parseInt(offset) : 0;
      const pageSize = limit ? parseInt(limit) : 50;
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
  app2.get("/api/investment-universe/search", async (req, res) => {
    try {
      const { query, limit } = req.query;
      if (!query) {
        return res.status(400).json({ error: "Suchbegriff erforderlich" });
      }
      const searchResults = await investmentUniverseService2.searchInstruments(query);
      const limitedResults = limit ? searchResults.slice(0, parseInt(limit)) : searchResults;
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
  app2.get("/api/investment-universe/asset-class/:assetClass", async (req, res) => {
    try {
      const assetClass = req.params.assetClass;
      const instruments = await investmentUniverseService2.getInstrumentsByAssetClass(assetClass);
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
  app2.get("/api/investment-universe/instrument", async (req, res) => {
    try {
      const { name, isin } = req.query;
      if (!name && !isin) {
        return res.status(400).json({ error: "Name oder ISIN erforderlich" });
      }
      const instrument = await investmentUniverseService2.getInstrumentDetails(
        name || "",
        isin || void 0
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
  app2.get("/api/factsheets/:filename", factsheetRateLimit, securityHeaders, async (req, res) => {
    const startTime = Date.now();
    try {
      const filename = decodeURIComponent(req.params.filename);
      if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
        return res.status(400).json({ error: "Ung\xFCltiger Dateiname" });
      }
      const universe = await investmentUniverseService2.getInvestmentUniverse();
      const instrument = universe.instruments.find((i) => i.fileName === filename);
      if (!instrument || !instrument.hasFactsheet) {
        return res.status(404).json({ error: "Factsheet nicht gefunden" });
      }
      const fs4 = await import("fs/promises");
      const path5 = await import("path");
      try {
        await fs4.access(instrument.factsheetPath);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
        res.setHeader("Cache-Control", "public, max-age=3600");
        const readStream = __require("fs").createReadStream(instrument.factsheetPath);
        readStream.pipe(res);
      } catch (error) {
        console.error("Error accessing factsheet file:", error);
        res.status(404).json({ error: "Factsheet-Datei nicht gefunden" });
      }
    } catch (error) {
      console.error("Error serving factsheet:", error);
      res.status(500).json({ error: "Fehler beim Laden des Factsheets" });
    } finally {
      performanceMonitor.logRequest("/api/factsheets/:filename", Date.now() - startTime);
    }
  });
  app2.get("/api/factsheets/:filename/content", factsheetRateLimit, securityHeaders, async (req, res) => {
    const startTime = Date.now();
    try {
      const filename = decodeURIComponent(req.params.filename);
      if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
        return res.status(400).json({ error: "Ung\xFCltiger Dateiname" });
      }
      const cacheKey = `content_${filename}`;
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }
      const universe = await investmentUniverseService2.getInvestmentUniverse();
      const instrument = universe.instruments.find((i) => i.fileName === filename);
      if (!instrument || !instrument.hasFactsheet) {
        return res.status(404).json({ error: "Factsheet nicht gefunden" });
      }
      const fs4 = await import("fs/promises");
      const pdf = await import("pdf-parse");
      try {
        const buffer = await fs4.readFile(instrument.factsheetPath);
        const pdfData = await pdf.default(buffer);
        const metadata = {
          pages: pdfData.numpages,
          title: pdfData.info?.Title,
          author: pdfData.info?.Author,
          subject: pdfData.info?.Subject,
          creator: pdfData.info?.Creator,
          producer: pdfData.info?.Producer,
          creationDate: pdfData.info?.CreationDate,
          modificationDate: pdfData.info?.ModDate
        };
        const result = {
          success: true,
          text: pdfData.text,
          metadata,
          analysis: {
            assetAllocation: instrument.factsheetData?.assetAllocation,
            geographicAllocation: instrument.factsheetData?.geographicAllocation
            // Additional analysis could be added here
          }
        };
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
      performanceMonitor.logRequest("/api/factsheets/:filename/content", Date.now() - startTime);
    }
  });
  app2.post("/api/factsheets/:filename/analyze", factsheetRateLimit, securityHeaders, async (req, res) => {
    const startTime = Date.now();
    try {
      const filename = decodeURIComponent(req.params.filename);
      if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
        return res.status(400).json({ error: "Ung\xFCltiger Dateiname" });
      }
      const cacheKey = `analysis_${filename}`;
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }
      const universe = await investmentUniverseService2.getInvestmentUniverse();
      const instrument = universe.instruments.find((i) => i.fileName === filename);
      if (!instrument || !instrument.hasFactsheet) {
        return res.status(404).json({ error: "Factsheet nicht gefunden" });
      }
      try {
        const fs4 = await import("fs/promises");
        const pdf = await import("pdf-parse");
        const buffer = await fs4.readFile(instrument.factsheetPath);
        const pdfData = await pdf.default(buffer);
        let claudeAnalysis = null;
        try {
          const { ClaudeFactsheetAnalyzer: ClaudeFactsheetAnalyzer2 } = await Promise.resolve().then(() => (init_claudeFactsheetAnalyzer(), claudeFactsheetAnalyzer_exports));
          const analyzer = new ClaudeFactsheetAnalyzer2();
          claudeAnalysis = await analyzer.analyzeFactsheet(
            pdfData.text,
            instrument.name,
            instrument.isin || ""
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
            message: "Claude AI Factsheet-Analyse nicht verf\xFCgbar"
          }
        };
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
      performanceMonitor.logRequest("/api/factsheets/:filename/analyze", Date.now() - startTime);
    }
  });
  app2.get("/api/factsheets/performance/stats", (req, res) => {
    if (process.env.NODE_ENV !== "development") {
      return res.status(404).json({ error: "Nicht verf\xFCgbar" });
    }
    const stats = performanceMonitor.getStats();
    const cacheStats = {
      size: factsheetCache.size,
      hitRate: "(would need hit counter implementation)",
      entries: Array.from(factsheetCache.keys()).slice(0, 10)
      // Show first 10 keys
    };
    res.json({
      performanceStats: stats,
      cacheStats,
      rateLimitStats: {
        activeIPs: lastRequestTimes.size,
        recentRequests: Array.from(lastRequestTimes.entries()).map(([ip, time]) => ({ ip, secondsAgo: Math.floor((Date.now() - time) / 1e3) })).slice(0, 10)
      }
    });
  });
  return {};
}

// server/vite.ts
import express from "express";
import fs3 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path3 from "path";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    // runtimeErrorOverlay(), // Disabled to fix runtime errors
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path3.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-select", "@radix-ui/react-accordion"],
          charts: ["recharts"],
          query: ["@tanstack/react-query"]
        }
      }
    },
    chunkSizeWarningLimit: 1e3
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true
      }
    },
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(compression({
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024
  // Only compress responses > 1KB
}));
var isDevelopment = process.env.NODE_ENV === "development";
var skipRateLimit = (req, res) => {
  if (isDevelopment) return true;
  const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
  const isLocalhost = ["127.0.0.1", "::1", "::ffff:127.0.0.1", "localhost"].includes(ip);
  const isReplit = ip && (ip.startsWith("10.") || // Private network
  ip.startsWith("172.") || // Private network  
  ip.startsWith("192.168.") || // Private network
  ip.includes("replit") || // Replit-specific
  ip.includes("internal") || // Internal network
  ip.includes("127.0.0") || // Any localhost variation
  !ip || ip === "undefined");
  return isLocalhost || isReplit;
};
var previewLimiter = rateLimit({
  windowMs: 5 * 60 * 1e3,
  // 5 minutes
  max: isDevelopment ? 1e3 : 100,
  // High limits for preview - just file parsing
  message: {
    error: "Zu viele Datei-Vorschauen",
    message: "Bitte warten Sie einen Moment vor der n\xE4chsten Datei-Vorschau.",
    retryAfter: "5 Minuten"
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit
});
var uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes  
  max: isDevelopment ? 100 : 30,
  // Moderate limits for upload processing
  message: {
    error: "Zu viele Portfolio-Uploads",
    message: "Portfolio-Analysen ben\xF6tigen Zeit. Bitte warten Sie vor dem n\xE4chsten Upload.",
    retryAfter: "15 Minuten",
    tip: "Jede Analyse ben\xF6tigt mehrere KI-Aufrufe - bitte haben Sie Geduld"
  },
  skip: skipRateLimit
});
var validationLimiter = rateLimit({
  windowMs: 10 * 60 * 1e3,
  // 10 minutes
  max: isDevelopment ? 200 : 50,
  // Allow frequent validations
  message: {
    error: "Zu viele Validierungsanfragen",
    message: "Validierungsdienst vor\xFCbergehend \xFCberlastet. Bitte versuchen Sie es in wenigen Minuten erneut.",
    retryAfter: "10 Minuten"
  },
  skip: skipRateLimit
});
var healthLimiter = rateLimit({
  windowMs: 5 * 60 * 1e3,
  // 5 minutes
  max: isDevelopment ? 500 : 100,
  // Frequent health checks allowed  
  message: {
    error: "Zu viele Gesundheitspr\xFCfungen",
    message: "Bitte reduzieren Sie die H\xE4ufigkeit der System-Abfragen.",
    retryAfter: "5 Minuten"
  },
  skip: skipRateLimit
});
var generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: isDevelopment ? 1e3 : 300,
  // High limits for general API usage
  message: {
    error: "Zu viele API-Anfragen",
    message: "Bitte warten Sie einen Moment und versuchen Sie es erneut.",
    retryAfter: "15 Minuten"
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit
});
app.use("/api/portfolios/preview", previewLimiter);
app.use("/api/portfolios/upload", uploadLimiter);
app.use(["/api/portfolios/*/validation", "/api/portfolios/*/revalidate", "/api/portfolios/validation/summary"], validationLimiter);
app.use(["/api/system/health", "/api/system/errors"], healthLimiter);
app.use("/api/", generalLimiter);
console.log("\u{1F6E1}\uFE0F  Rate Limiter Configuration:");
console.log(`   Development Mode: ${isDevelopment}`);
console.log(`   Preview Limit: ${isDevelopment ? "1000" : "100"}/5min`);
console.log(`   Upload Limit: ${isDevelopment ? "100" : "30"}/15min`);
console.log(`   Validation Limit: ${isDevelopment ? "200" : "50"}/10min`);
console.log(`   Health Limit: ${isDevelopment ? "500" : "100"}/5min`);
console.log(`   General API Limit: ${isDevelopment ? "1000" : "300"}/15min`);
if (isDevelopment) {
  app.use("/api/", (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
    const shouldSkip = skipRateLimit(req, res);
    console.log(`\u{1F50D} API Request: ${req.method} ${req.path} from ${ip} (Skip: ${shouldSkip})`);
    next();
  });
}
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    res.setHeader("Cache-Control", "public, max-age=31536000");
  } else if (req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  }
  next();
});
app.use(express2.json({ limit: "10mb" }));
app.use(express2.urlencoded({ extended: false, limit: "10mb" }));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  const port = parseInt(process.env.PORT || "5000", 10);
  if (app.get("env") === "development") {
    const server = app.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
    });
    await setupVite(app, server);
  } else {
    serveStatic(app);
    app.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
    });
  }
})();
