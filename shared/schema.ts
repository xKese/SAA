import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, json, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  fileName: text("file_name").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  analysisStatus: text("analysis_status").notNull().default("pending"), // pending, analyzing, completed, failed
  analysisProgress: integer("analysis_progress").default(0), // 0-100
  currentPhase: text("current_phase").default("Phase 0: Instrumentenidentifikation"),
  totalValue: decimal("total_value", { precision: 15, scale: 2 }),
  positionCount: integer("position_count"),
  analysisResults: json("analysis_results"), // Store complete analysis results
});

export const portfolioPositions = pgTable("portfolio_positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id),
  name: text("name").notNull(),
  isin: text("isin"),
  value: decimal("value", { precision: 15, scale: 2 }).notNull(),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  instrumentType: text("instrument_type"), // Aktie, ETF, Fonds, Anleihe, ETC, etc.
  sector: text("sector"),
  geography: text("geography"),
  currency: text("currency"),
  assetClass: text("asset_class"), // Aktien, Anleihen, Alternative Investments, etc.
  analysisStatus: text("analysis_status").default("pending"), // pending, analyzing, completed, failed
});

export const analysisPhases = pgTable("analysis_phases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id),
  phaseNumber: integer("phase_number").notNull(), // 0-4
  phaseName: text("phase_name").notNull(),
  status: text("status").notNull().default("pending"), // pending, running, completed, failed
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  results: json("results"),
});

export const optimizationProposals = pgTable("optimization_proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id),
  liquidityAmount: decimal("liquidity_amount", { precision: 15, scale: 2 }).notNull(),
  strategy: text("strategy").notNull(), // maintain, rebalance, opportunity
  constraints: json("constraints"),
  proposalData: json("proposal_data").notNull(), // Optimization results
  status: text("status").notNull().default("draft"), // draft, approved, executed, rejected
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  executedAt: timestamp("executed_at"),
  executionResults: json("execution_results"),
});

export const tradeExecutions = pgTable("trade_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id),
  proposalId: varchar("proposal_id").references(() => optimizationProposals.id),
  tradeData: json("trade_data").notNull(), // Trade details
  executionPlan: json("execution_plan").notNull(),
  status: text("status").notNull().default("pending"), // pending, executing, completed, failed
  executedAt: timestamp("executed_at"),
  completedAt: timestamp("completed_at"),
  totalCosts: decimal("total_costs", { precision: 10, scale: 2 }),
  results: json("results"),
});

export const tradeHistory = pgTable("trade_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id),
  proposalId: varchar("proposal_id").references(() => optimizationProposals.id),
  instrumentIsin: varchar("instrument_isin", { length: 12 }),
  instrumentName: text("instrument_name").notNull(),
  tradeType: varchar("trade_type", { length: 10 }).notNull(), // 'BUY' or 'SELL'
  quantity: decimal("quantity", { precision: 20, scale: 8 }).notNull(),
  price: decimal("price", { precision: 20, scale: 4 }).notNull(),
  value: decimal("value", { precision: 20, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  executedAt: timestamp("executed_at").notNull(),
  executionStatus: varchar("execution_status", { length: 20 }).notNull(),
});

// Investment Universe table for storing extracted fund names

// Insert schemas
export const insertPortfolioSchema = createInsertSchema(portfolios).omit({
  id: true,
  uploadedAt: true,
});

export const insertPortfolioPositionSchema = createInsertSchema(portfolioPositions).omit({
  id: true,
});

export const insertAnalysisPhaseSchema = createInsertSchema(analysisPhases).omit({
  id: true,
});

export const insertOptimizationProposalSchema = createInsertSchema(optimizationProposals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTradeExecutionSchema = createInsertSchema(tradeExecutions).omit({
  id: true,
});

export const insertTradeHistorySchema = createInsertSchema(tradeHistory).omit({
  id: true,
});

// Validation schemas for API endpoints
export const liquidityOptimizationSchema = z.object({
  amount: z.number().positive().max(1000000000), // Max 1 billion
  strategy: z.enum(['maintain', 'rebalance', 'opportunity']),
  constraints: z.object({
    maxPositionSize: z.number().min(0).max(1).optional(),
    minOrderSize: z.number().positive().optional(),
    excludedInstruments: z.array(z.string()).optional(),
    preferredAssetClasses: z.array(z.string()).optional(),
    maxTurnover: z.number().min(0).max(1).optional(),
    minTradeAmount: z.number().positive().optional(),
    maxTradeAmount: z.number().positive().optional(),
    transactionCosts: z.number().min(0).max(0.1).optional(),
    taxConsiderations: z.object({
      maxRealizedGains: z.number().optional(),
      preferLossHarvesting: z.boolean().optional(),
    }).optional(),
  }).optional(),
});

export const tradeExecutionSchema = z.object({
  proposalId: z.string().uuid(),
  trades: z.array(z.object({
    isin: z.string().optional(),
    name: z.string(),
    action: z.enum(['buy', 'sell', 'hold']),
    amount: z.number().positive(),
    percentage: z.number().min(0).max(1),
    priority: z.enum(['high', 'medium', 'low']),
    estimatedCosts: z.number().min(0),
  })),
  executionMode: z.enum(['immediate', 'staged', 'market_timing']).optional(),
  approvalRequired: z.boolean().optional(),
});


// Update portfolio schema to include validation fields
export const updatePortfolioSchema = z.object({
  name: z.string().optional(),
  analysisStatus: z.enum(['pending', 'analyzing', 'completed', 'failed']).optional(),
  analysisProgress: z.number().min(0).max(100).optional(),
  currentPhase: z.string().optional(),
  totalValue: z.string().optional(), // Decimal as string
  positionCount: z.number().optional(),
  analysisResults: z.any().optional() // JSON object
});

export type UpdatePortfolio = z.infer<typeof updatePortfolioSchema>;

// Enhanced analysis phase with validation details
export interface EnhancedAnalysisPhase extends AnalysisPhase {
  validationResults?: {
    score: number;
    issues: ValidationIssue[];
    processingTime: number;
  };
}

// Types
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type Portfolio = typeof portfolios.$inferSelect;
export type InsertPortfolioPosition = z.infer<typeof insertPortfolioPositionSchema>;
export type PortfolioPosition = typeof portfolioPositions.$inferSelect;
export type InsertAnalysisPhase = z.infer<typeof insertAnalysisPhaseSchema>;
export type AnalysisPhase = typeof analysisPhases.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertOptimizationProposal = z.infer<typeof insertOptimizationProposalSchema>;
export type OptimizationProposal = typeof optimizationProposals.$inferSelect;
export type InsertTradeExecution = z.infer<typeof insertTradeExecutionSchema>;
export type TradeExecution = typeof tradeExecutions.$inferSelect;
export type InsertTradeHistory = z.infer<typeof insertTradeHistorySchema>;
export type TradeHistory = typeof tradeHistory.$inferSelect;

// Enhanced portfolio type with validation results
export interface EnhancedPortfolio {
  id: string;
  name: string;
  fileName: string;
  uploadedAt: Date | null;
  analysisStatus: string;
  analysisProgress: number | null;
  currentPhase: string | null;
  totalValue: string | null;
  positionCount: number | null;
  analysisResults?: AnalysisResults;
  validationSummary?: {
    isValid: boolean;
    overallScore: number;
    lastValidated?: string;
    criticalIssues: number;
    totalIssues: number;
  };
}

// API response wrapper types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Common error response interface
export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
  validationErrors?: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
}

// Portfolio data types for Claude Portfolio Analyst
export interface PortfolioData {
  holdings: Array<{
    name: string;
    isin: string;
    value: number;
  }>;
  totalValue: number;
}

export interface AnalysisResult {
  assetAllocation: Record<string, number>;
  geographicAllocation: Record<string, number>;
  currencyExposure: Record<string, number>;
  riskMetrics: Record<string, number>;
  rawAnalysis: string;
}

// Portfolio data types for Claude Portfolio Analyst
export interface ClaudeAnalysisResult {
  assetAllocation: Record<string, number>;
  geographicAllocation: Record<string, number>;
  currencyExposure: Record<string, number>;
  riskMetrics: Record<string, number>;
  rawAnalysis: string;
}


export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Validation schemas for API requests
export const revalidationRequestSchema = z.object({
  force: z.boolean().optional().default(false),
  includeDetails: z.boolean().optional().default(true)
});

export const healthCheckQuerySchema = z.object({
  includeDetails: z.boolean().optional().default(true),
  includeRecommendations: z.boolean().optional().default(true)
});

export const errorQuerySchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20),
  errorType: z.enum(['validation', 'factsheet', 'extraction', 'cache', 'system']).optional(),
  since: z.string().datetime().optional() // ISO date string
});

// Export types for these schemas
export type RevalidationRequest = z.infer<typeof revalidationRequestSchema>;
export type HealthCheckQuery = z.infer<typeof healthCheckQuerySchema>;
export type ErrorQuery = z.infer<typeof errorQuerySchema>;

// Portfolio change and comparison schemas
export const portfolioChangeRequestSchema = z.object({
  changeType: z.enum(['buy', 'sell', 'rebalance', 'swap']),
  changes: z.array(z.object({
    instrumentName: z.string().min(1, "Instrumentenname darf nicht leer sein"),
    isin: z.string().optional(),
    currentValue: z.number().optional(),
    newValue: z.number(),
    changeAmount: z.number(),
    instrumentType: z.enum(['Aktien', 'ETF', 'Fonds', 'Anleihen', 'ETC', 'Cash']).optional()
  })).min(1, "Mindestens eine Änderung erforderlich"),
  scenarioName: z.string().min(1, "Szenario-Name darf nicht leer sein"),
  analysisDate: z.string().datetime().optional()
});

export const scenarioAnalysisRequestSchema = z.object({
  scenarios: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    changes: portfolioChangeRequestSchema.shape.changes
  })),
  compareToBaseline: z.boolean().default(true),
  includeRiskMetrics: z.boolean().default(true)
});

export type PortfolioChangeRequest = z.infer<typeof portfolioChangeRequestSchema>;
export type ScenarioAnalysisRequest = z.infer<typeof scenarioAnalysisRequestSchema>;

// Investment Universe types
export interface InvestmentUniverseItem {
  name: string;
  extractedName?: string; // Name extracted by Claude AI from factsheet
  displayName?: string; // The name to display (extractedName or fallback to name)
  isin?: string;
  assetClass: string;
  category: string;
  factsheetPath: string;
  hasFactsheet: boolean;
  fileName: string;
  lastAnalyzed?: Date;
  lastNameExtraction?: Date;
  factsheetData?: any; // Additional extracted data
  confidence?: number; // Confidence in extracted data (0-1)
}

export interface InvestmentUniverseResponse {
  instruments: InvestmentUniverseItem[];
  categories: string[];
  assetClasses: string[];
  totalCount: number;
}

// Enhanced analysis result types with validation
export interface AnalysisResults {
  assetAllocation: AssetAllocation[];
  geographicAllocation: GeographicAllocation[];
  currencyExposure: CurrencyExposure[];
  riskMetrics: RiskMetrics;
  lookThroughAnalysis?: LookThroughAnalysis;
  lookThroughValidation?: LookThroughValidationSummary;
  saaAnalysis?: SAAAnalysisResult; // Strategic Asset Allocation analysis results
}

// Strategic Asset Allocation (SAA) analysis interface
export interface SAAAnalysisResult {
  phase1?: {
    instrumentIdentification?: {
      totalInstruments: number;
      successfullyIdentified: number;
      missingISINs: number;
      summaryTable?: Array<{
        name: string;
        isin?: string;
        type: string;
        assetClass: string;
        weight: number;
      }>;
    };
  };
  phase2?: {
    assetAllocation?: {
      summary?: {
        aktien: number;
        anleihen: number;
        immobilien: number;
        rohstoffe: number;
        liquiditaet: number;
        alternative: number;
        sonstiges: number;
      };
      detailTable?: Array<{
        assetClass: string;
        value: number;
        weight: number;
        instruments: number;
      }>;
    };
  };
  phase3?: {
    geographicAllocation?: {
      summary?: {
        deutschland: number;
        europa: number;
        usa: number;
        schwellenlaender: number;
        asienPazifik: number;
        global: number;
      };
      detailTable?: Array<{
        region: string;
        value: number;
        weight: number;
        instruments: number;
      }>;
    };
  };
  phase4?: {
    currencyExposure?: {
      summary?: {
        eur: number;
        usd: number;
        gbp: number;
        chf: number;
        jpy: number;
        sonstige: number;
      };
      detailTable?: Array<{
        currency: string;
        value: number;
        weight: number;
        hedged: boolean;
      }>;
    };
  };
  phase5?: {
    riskAssessment?: {
      portfolioVolatility: number;
      expectedReturn: number;
      maxDrawdown: number;
      valueAtRisk: number;
      diversificationScore: number;
      concentration?: {
        topHoldingsConcentration: number;
        sectorConcentration: number;
        geographicConcentration: number;
      };
      complianceChecks?: {
        bafin: {
          status: string;
          issues: Array<{
            severity: string;
            description: string;
            recommendation: string;
          }>;
        };
      };
    };
  };
  summary?: {
    overallRating: string;
    keyFindings: string[];
    recommendations: string[];
    complianceStatus: string;
  };
  metadata?: {
    analysisTimestamp: string;
    totalValue: number;
    positionCount: number;
    factsheetsCovered: number;
  };
  error?: string;
  message?: string;
  fallbackAnalysis?: {
    summary: string;
    [key: string]: any;
  };
}

// Look-through analysis interface
export interface LookThroughAnalysis {
  effectiveEquityAllocation: number;
  effectiveBondAllocation: number;
  underlyingInstrumentsCount: number;
  factsheetDataUsed: boolean;
  fundsAnalyzed: number;
}

// Validation summary interface for API responses
export interface LookThroughValidationSummary {
  overallScore: number; // 0-100
  isValid: boolean;
  validationResults: {
    totalValueDifference: number;
    decompositionAccuracy: number;
    doubleCounting: {
      detected: boolean;
      affectedAssets: string[];
      overlapValue: number;
    };
    currencyExposure: {
      isConsistent: boolean;
      exposures: Record<string, number>;
      hedgingStatus: Record<string, boolean>;
    };
    geographicIntegrity: {
      isValid: boolean;
      totalAllocation: number;
      missingAllocations: string[];
    };
    issues: ValidationIssue[];
    errors: string[];
    warnings: string[];
  };
  complianceResults: GermanFinancialComplianceResult;
  fundValidations: Array<{
    fundName: string;
    isin?: string;
    decompositionValid: boolean;
    issues: ValidationIssue[];
  }>;
}

// Validation issue interface
export interface ValidationIssue {
  severity: 'warning' | 'error' | 'critical';
  code: string;
  message: string;
  messageDE?: string; // German language message
  affectedPositions?: string[];
  suggestedAction?: string;
}

// German financial compliance result interface
export interface GermanFinancialComplianceResult {
  isCompliant: boolean;
  bafin: {
    assetClassification: boolean;
    ucitsCompliance: boolean;
    reportingStandards: boolean;
  };
  issues: ValidationIssue[];
  complianceScore: number; // 0-100 compliance score
}

export interface AssetAllocation {
  category: string;
  value: number;
  percentage: number;
}

export interface GeographicAllocation {
  region: string;
  value: number;
  percentage: number;
}

export interface CurrencyExposure {
  currency: string;
  value: number;
  percentage: number;
}

export interface RiskMetrics {
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  valueAtRisk: number;
  expectedShortfall: number;
  maxDrawdown: number;
  diversificationRatio: number;
}

// Before-After comparison interfaces
export interface BeforeAfterAssetAllocation {
  category: string;
  beforeValue: number;
  changeAmount: number;
  afterValue: number;
  beforePercentage: number;
  afterPercentage: number;
  percentageChange: number;
}

export interface BeforeAfterGeographicAllocation {
  region: string;
  beforeValue: number;
  changeAmount: number;
  afterValue: number;
  beforePercentage: number;
  afterPercentage: number;
  percentageChange: number;
}

export interface BeforeAfterCurrencyExposure {
  currency: string;
  beforeValue: number;
  changeAmount: number;
  afterValue: number;
  beforePercentage: number;
  afterPercentage: number;
  percentageChange: number;
}

export interface BeforeAfterRiskMetrics {
  metric: string;
  before: number;
  after: number;
  change: number;
  changePercentage: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface PortfolioComparison {
  portfolioId: string;
  scenarioName: string;
  analysisDate: string;
  totalValueBefore: number;
  totalValueAfter: number;
  totalChangeAmount: number;
  assetAllocation: BeforeAfterAssetAllocation[];
  geographicAllocation: BeforeAfterGeographicAllocation[];
  currencyExposure: BeforeAfterCurrencyExposure[];
  riskMetrics: BeforeAfterRiskMetrics[];
  summary: {
    mainChanges: string[];
    riskImpact: 'lower' | 'higher' | 'similar';
    diversificationImpact: 'improved' | 'reduced' | 'unchanged';
    recommendations: string[];
  };
}

export interface ChangeImpactAnalysis {
  portfolioId: string;
  changeRequest: PortfolioChangeRequest;
  comparison: PortfolioComparison;
  validationResults: {
    isValid: boolean;
    issues: ValidationIssue[];
    warnings: string[];
  };
  processingTime: number;
}

// System health and performance interfaces
export interface SystemHealthResponse {
  timestamp: string;
  status: 'healthy' | 'warning' | 'critical';
  healthScore: number;
  performance: {
    validationCount: number;
    cacheHitRate: number;
    averageValidationTime: number;
    totalProcessingTime: number;
    errorCount: number;
    errorRate: number;
    averageValidationTimeMs: number;
    lastResetTime: number;
  };
  errors: {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrorCount: number;
    openCircuitBreakers: number;
  };
  cache: {
    validationCache: number;
    factsheetCache: number;
    fundHoldingsCache: number;
    queueLength: number;
    activeValidations: number;
    memoryUsageEstimate: {
      validationCache: number; // KB
      factsheetCache: number;
      fundHoldingsCache: number;
    };
  };
  recommendations: {
    clearCache: boolean;
    reduceLoad: boolean;
    checkCircuitBreakers: boolean;
    monitorErrors: boolean;
  };
}

// Validation summary for multiple portfolios
export interface ValidationSummaryResponse {
  timestamp: string;
  totalPortfolios: number;
  validatedPortfolios: number;
  validPortfolios: number;
  invalidPortfolios: number;
  averageScore: number;
  portfolios: Array<{
    portfolioId: string;
    portfolioName: string;
    validationStatus: 'valid' | 'invalid' | 'not_validated' | 'pending_analysis';
    overallScore: number;
    lastUpdated: Date | string;
    issueCount: number;
    criticalIssues: number;
  }>;
}

// Portfolio validation detail response
export interface PortfolioValidationResponse {
  portfolioId: string;
  validationTimestamp: string;
  revalidationTimestamp?: string;
  lookThroughValidation: LookThroughValidationSummary;
  message?: string;
}

// Error statistics response
export interface ErrorStatisticsResponse {
  timestamp: string;
  summary: {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrorCount: number;
  };
  recentErrors: Array<{
    portfolioId: string;
    errorType: 'validation' | 'factsheet' | 'extraction' | 'cache' | 'system';
    message: string;
    stack?: string;
    timestamp: string;
    context: {
      operation: string;
      retryCount?: number;
      inputData?: any;
    };
  }>;
  circuitBreakers: Array<{
    operation: string;
    state: {
      failures: number;
      lastFailureTime: string | null;
      state: 'closed' | 'open' | 'half-open';
      successCount: number;
    };
  }>;
}

// Knowledge Base and Chat System Tables
export const knowledgeBase = pgTable("knowledge_base", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id),
  analysisType: text("analysis_type").notNull(), // 'portfolio_analysis', 'risk_assessment', 'market_insight'
  data: json("data").notNull(), // Structured analysis results
  insights: text("insights"), // Human-readable insights
  confidence: decimal("confidence", { precision: 3, scale: 2 }), // 0.00-1.00
  tags: text("tags").array(), // Searchable tags
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isValid: text("is_valid").default("true"), // For data validation
});

export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id),
  userId: varchar("user_id").references(() => users.id),
  sessionName: text("session_name").default("New Chat"),
  context: json("context"), // Current conversation context
  createdAt: timestamp("created_at").defaultNow(),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  isActive: text("is_active").default("true"),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => chatSessions.id),
  sender: text("sender").notNull(), // 'user' or 'assistant'
  messageType: text("message_type").default("text"), // 'text', 'analysis_request', 'change_proposal'
  content: text("content").notNull(),
  metadata: json("metadata"), // Additional data like analysis results
  timestamp: timestamp("timestamp").defaultNow(),
  isDeleted: text("is_deleted").default("false"),
});

export const portfolioSnapshots = pgTable("portfolio_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id),
  snapshotType: text("snapshot_type").notNull(), // 'analysis', 'change_simulation', 'historical'
  positions: json("positions").notNull(), // Portfolio positions at time of snapshot
  analysisResults: json("analysis_results"), // Full analysis results
  totalValue: decimal("total_value", { precision: 15, scale: 2 }),
  metadata: json("metadata"), // Additional snapshot context
  createdAt: timestamp("created_at").defaultNow(),
  description: text("description"),
});

export const analysisPatterns = pgTable("analysis_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patternType: text("pattern_type").notNull(), // 'risk_profile', 'allocation_preference', 'market_sentiment'
  patternData: json("pattern_data").notNull(), // Pattern definition and parameters
  frequency: integer("frequency").default(1), // How often this pattern has been observed
  reliability: decimal("reliability", { precision: 3, scale: 2 }).default("0.50"), // Pattern reliability score
  lastObserved: timestamp("last_observed").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  isActive: text("is_active").default("true"),
});

export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  preferenceType: text("preference_type").notNull(), // 'risk_tolerance', 'analysis_depth', 'notification_settings'
  preferenceValue: json("preference_value").notNull(), // Preference data
  portfolioId: varchar("portfolio_id").references(() => portfolios.id), // Portfolio-specific preferences
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Portfolio Target Structure Tables
export const portfolioTargets = pgTable("portfolio_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  targets: json("targets").notNull(), // TargetAllocation arrays for positions, assets, regions, currencies
  constraints: json("constraints"), // Reallocation constraints
  isActive: text("is_active").default("true"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reallocationAnalyses = pgTable("reallocation_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id).notNull(),
  targetStructureId: varchar("target_structure_id").references(() => portfolioTargets.id).notNull(),
  totalPortfolioValue: decimal("total_portfolio_value", { precision: 15, scale: 2 }),
  recommendations: json("recommendations").notNull(), // Array of ReallocationRecommendation
  summary: json("summary").notNull(), // Reallocation summary
  deviationAnalysis: json("deviation_analysis"), // Deviation metrics
  claudeAnalysis: json("claude_analysis"), // Claude AI detailed analysis
  status: text("status").default("draft"), // draft, reviewed, approved, executed
  analysisDate: timestamp("analysis_date").defaultNow(),
});

// Individual Position Targets Table
export const positionTargets = pgTable("position_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id).notNull(),
  targetStructureId: varchar("target_structure_id").references(() => portfolioTargets.id),
  positionName: text("position_name").notNull(),
  isin: text("isin"), // Optional ISIN for exact matching
  targetPercentage: decimal("target_percentage", { precision: 5, scale: 2 }).notNull(), // 0.00-100.00
  targetValue: decimal("target_value", { precision: 15, scale: 2 }), // Calculated target value in EUR
  priority: text("priority").default("medium"), // high, medium, low
  isActive: text("is_active").default("true"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for new tables
export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

export const insertPortfolioSnapshotSchema = createInsertSchema(portfolioSnapshots).omit({
  id: true,
  createdAt: true,
});

export const insertAnalysisPatternSchema = createInsertSchema(analysisPatterns).omit({
  id: true,
  createdAt: true,
  lastObserved: true,
});

export const insertUserPreferenceSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// SAA Request Schemas
export const portfolioCreationRequestSchema = z.object({
  name: z.string().min(1, "Portfolio-Name darf nicht leer sein"),
  amount: z.number().positive("Betrag muss positiv sein"),
  riskProfile: z.enum(['conservative', 'moderate', 'aggressive', 'balanced']),
  objectives: z.array(z.string()).optional(),
  constraints: z.object({
    maxPositionSize: z.number().min(0).max(1).optional(),
    excludedInstruments: z.array(z.string()).optional(),
    preferredAssetClasses: z.array(z.string()).optional(),
    timeHorizon: z.string().optional(),
    liquidityRequirements: z.number().min(0).max(1).optional()
  }).optional()
});

export const portfolioOptimizationRequestSchema = z.object({
  portfolioId: z.string().min(1, "Portfolio-ID erforderlich"),
  optimizationType: z.enum(['strategic', 'tactical', 'liquidity', 'rebalancing']),
  targetAllocation: z.record(z.string(), z.number()).optional(),
  constraints: z.object({
    maxTradingCosts: z.number().optional(),
    minTradeSize: z.number().optional(),
    preservePositions: z.array(z.string()).optional(),
    excludeInstruments: z.array(z.string()).optional()
  }).optional()
});

export const rebalancingRequestSchema = z.object({
  portfolioId: z.string().min(1, "Portfolio-ID erforderlich"),
  targetAllocation: z.record(z.string(), z.number()),
  thresholds: z.object({
    minDeviation: z.number().min(0).max(1).default(0.05),
    maxCosts: z.number().optional(),
    minTradeSize: z.number().optional()
  }).optional(),
  constraints: z.object({
    taxOptimized: z.boolean().optional(),
    liquidityPreserving: z.boolean().optional(),
    maxTradingVolume: z.number().optional()
  }).optional()
});

export const complianceCheckRequestSchema = z.object({
  portfolioId: z.string().min(1, "Portfolio-ID erforderlich"),
  rules: z.array(z.string()),
  scope: z.enum(['full', 'positions', 'allocation', 'risk', 'regulatory']).default('full')
});

// Export types for these schemas
export type PortfolioCreationRequest = z.infer<typeof portfolioCreationRequestSchema>;
export type PortfolioOptimizationRequest = z.infer<typeof portfolioOptimizationRequestSchema>;
export type RebalancingRequest = z.infer<typeof rebalancingRequestSchema>;
export type ComplianceCheckRequest = z.infer<typeof complianceCheckRequestSchema>;

export const insertPortfolioTargetSchema = createInsertSchema(portfolioTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReallocationAnalysisSchema = createInsertSchema(reallocationAnalyses).omit({
  id: true,
  analysisDate: true,
});

export const insertPositionTargetSchema = createInsertSchema(positionTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for new tables
export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertPortfolioSnapshot = z.infer<typeof insertPortfolioSnapshotSchema>;
export type PortfolioSnapshot = typeof portfolioSnapshots.$inferSelect;
export type InsertAnalysisPattern = z.infer<typeof insertAnalysisPatternSchema>;
export type AnalysisPattern = typeof analysisPatterns.$inferSelect;
export type InsertUserPreference = z.infer<typeof insertUserPreferenceSchema>;
export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertPortfolioTarget = z.infer<typeof insertPortfolioTargetSchema>;
export type PortfolioTarget = typeof portfolioTargets.$inferSelect;
export type InsertReallocationAnalysis = z.infer<typeof insertReallocationAnalysisSchema>;
export type ReallocationAnalysisTable = typeof reallocationAnalyses.$inferSelect;
export type InsertPositionTarget = z.infer<typeof insertPositionTargetSchema>;
export type PositionTarget = typeof positionTargets.$inferSelect;

// Chat-related interfaces
export interface ChatMessageWithMetadata extends ChatMessage {
  analysisData?: any;
  changeProposal?: PortfolioChangeRequest;
  visualizations?: any[];
}

export interface EnhancedChatSession extends ChatSession {
  messages: ChatMessageWithMetadata[];
  messageCount: number;
  lastMessage?: ChatMessageWithMetadata;
}

// Knowledge management interfaces
export interface KnowledgeQuery {
  portfolioId?: string;
  analysisType?: string[];
  tags?: string[];
  confidenceMin?: number;
  timeRange?: {
    from: Date;
    to: Date;
  };
  limit?: number;
}

// Phase 7: Multi-Level Look-Through Analysis Types
export interface UnderlyingHolding {
  instrumentName: string;
  isin?: string;
  allocation: number;
  value: number;
  instrumentType: string;
  sector?: string;
  country?: string;
  dataSource: 'factsheet' | 'estimated' | 'direct' | 'error';
  confidence: number;
}

export interface LookThroughPositionResult {
  originalPosition: {
    name: string;
    isin?: string;
    value: number;
    instrumentType?: string;
  };
  lookThroughDepth: number;
  underlyingHoldings: UnderlyingHolding[];
  totalUnderlyingCount: number;
  qualityScore: number;
  warnings: string[];
}

export interface FundAnalysis {
  fundName: string;
  fundIsin?: string;
  lookThroughDepth: number;
  underlyingCount: number;
  qualityScore: number;
  warnings: string[];
}

export interface LookThroughAnalysisResult {
  totalPositions: number;
  totalUnderlyingHoldings: number;
  fundAnalysis: FundAnalysis[];
  assetAllocation: { [key: string]: number };
  geoAllocation: { [key: string]: number };
  sectorAllocation: { [key: string]: number };
  overallQualityScore: number;
  warnings: string[];
  analysisTimestamp: string;
}

// Phase 8: Hybrid Risk Metrics Types
export interface TraditionalRiskMetrics {
  standardDeviation: number;
  variance: number;
  sharpeRatio: number;
  maxDrawdown: number;
  averageReturn: number;
  returnsAnalysis: {
    monthlyReturns: number[];
    volatilityTrend: 'increasing' | 'decreasing' | 'stable';
  };
}

export interface MonteCarloRiskMetrics {
  simulationCount: number;
  confidenceLevels: { [key: string]: { var: number; cvar: number } };
  stressTestResults: { [key: string]: number };
  scenarioAnalysis: {
    bestCase: number;
    worstCase: number;
    expectedReturn: number;
  };
}

export interface ConcentrationRiskMetrics {
  herfindahlIndex: number;
  effectiveNumberOfPositions: number;
  top5Concentration: number;
  top10Concentration: number;
  largestPosition: number;
  typeConcentration: { [key: string]: number };
  concentrationScore: number;
}

export interface CurrencyRiskMetrics {
  exposureByError: { [key: string]: number };
  dominantCurrency: string;
  currencyDiversificationScore: number;
  hedgingRecommendations: string[];
}

export interface StructuralRiskMetrics {
  assetClassRisk: {
    concentration: number;
    diversificationScore: number;
    dominantClass: string;
  };
  geographicRisk: {
    concentration: number;
    diversificationScore: number;
    dominantRegion: string;
  };
  sectorRisk: {
    concentration: number;
    diversificationScore: number;
    dominantSector: string;
  };
  overallStructuralScore: number;
}

export interface SREPComplianceResult {
  overallRating: string;
  pillarAssessments: {
    businessModel: { rating: string; concerns: string[] };
    governance: { rating: string; concerns: string[] };
    capitalRisks: { rating: string; concerns: string[] };
    liquidity: { rating: string; concerns: string[] };
  };
  complianceScore: number;
  recommendations: string[];
}

export interface HybridRiskMetricsResult {
  calculationTimestamp: string;
  totalPortfolioValue: number;
  analysisType: 'look_through_enhanced' | 'position_based';
  traditionalRisk: TraditionalRiskMetrics;
  monteCarloRisk: MonteCarloRiskMetrics;
  concentrationRisk: ConcentrationRiskMetrics;
  currencyRisk: CurrencyRiskMetrics;
  structuralRisk: StructuralRiskMetrics;
  srepCompliance: SREPComplianceResult;
  overallRiskScore: number;
  recommendations: string[];
}

// Phase 9: German Compliance Formatter Types
export interface ReportingPeriod {
  year: number;
  quarter: number;
  startDate: string;
  endDate: string;
}

export interface ReportAttachment {
  filename: string;
  contentType: string;
  content: string;
}

export interface GermanComplianceReport {
  reportId: string;
  reportType: 'mifid_ii' | 'wphg' | 'bafin_srep' | 'tax_optimization' | 'full_compliance';
  portfolioId: string;
  generationTimestamp: string;
  reportingPeriod: ReportingPeriod;
  complianceStandard: string;
  content: any;
  attachments: ReportAttachment[];
  certificationStatus: 'compliant' | 'non_compliant' | 'pending' | 'advisory';
  validityPeriod: {
    from: string;
    to: string;
  };
}

// Phase 10: Investment Universe Maintenance Types
export interface QualityIssue {
  id: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  affectedInstruments: string[];
  suggestedAction: string;
}

export interface FactsheetUpdateResult {
  instrumentId: string;
  instrumentName: string;
  updateStatus: 'success' | 'failed';
  newData: any;
  issues: string[];
}

export interface DuplicateResolution {
  groupId: string;
  resolution: 'merged' | 'kept_separate' | 'manual_review';
  details: any;
}

export interface MaintenanceTaskResult {
  taskName: string;
  status: 'success' | 'failed' | 'completed_with_warnings';
  startTime: string;
  endTime: string;
  details: any;
  recommendations: string[];
}

export interface InvestmentUniverseMaintenanceResult {
  maintenanceId: string;
  timestamp: string;
  taskResults: MaintenanceTaskResult[];
  overallStatus: 'success' | 'completed_with_warnings' | 'failed';
  summary: string;
  nextMaintenanceScheduled: string;
  performanceMetrics: {
    totalInstruments: number;
    qualityScore: number;
    lastUpdated: string;
    dataFreshness: number;
  };
}

// Phase 12: High-Performance Orchestration Types
export interface OrchestrationResult {
  orchestrationId: string;
  portfolioId: string;
  requestedAnalyses: string[];
  completedAnalyses: string[];
  failedAnalyses: string[];
  results: { [key: string]: any };
  performance: {
    totalExecutionTime: number;
    taskExecutionTimes: { [key: string]: number };
    averageTaskTime: number;
  };
  timestamp: string;
  recommendations: string[];
}

// Frontend-specific API response types for new features
export interface LookThroughAnalysisResponse extends ApiResponse<LookThroughAnalysisResult> {
  portfolioId: string;
}

export interface HybridRiskMetricsResponse extends ApiResponse<HybridRiskMetricsResult> {
  portfolioId: string;
  includedLookThrough: boolean;
}

export interface ComplianceReportResponse extends ApiResponse<GermanComplianceReport> {
  portfolioId: string;
  reportType: string;
}

export interface MaintenanceStatusResponse extends ApiResponse<InvestmentUniverseMaintenanceResult> {
  portfolioId: string;
}

export interface AdvancedAnalysisResponse extends ApiResponse {
  data: {
    portfolioId: string;
    timestamp: string;
    analyses: {
      lookThrough?: LookThroughAnalysisResult;
      riskMetrics?: HybridRiskMetricsResult;
      compliance?: GermanComplianceReport;
    };
  };
}

export interface OrchestrationAnalysisResponse extends ApiResponse<OrchestrationResult> {}
export interface OrchestrationComplianceResponse extends ApiResponse<ComplianceOrchestrationResult> {}
export interface OrchestrationMaintenanceResponse extends ApiResponse<MaintenanceOrchestrationResult> {}

export interface ComplianceOrchestrationResult {
  orchestrationId: string;
  portfolioId: string;
  requestedReports: string[];
  completedReports: string[];
  failedReports: string[];
  reports: { [key: string]: any };
  sharedAnalyses: {
    lookThrough?: any;
    riskMetrics?: any;
  };
  performance: {
    totalExecutionTime: number;
    reportExecutionTimes: { [key: string]: number };
    averageReportTime: number;
    sharedAnalysesTime: string;
  };
  timestamp: string;
}

export interface MaintenanceOrchestrationResult {
  orchestrationId: string;
  scheduleType: 'daily' | 'weekly' | 'monthly';
  requestedTasks: string[];
  completedTasks: string[];
  failedTasks: string[];
  results: { [key: string]: any };
  performance: {
    totalExecutionTime: number;
    taskExecutionTimes: { [key: string]: number };
    averageTaskTime: number;
  };
  timestamp: string;
  nextScheduledRun: string;
}

// Portfolio Target Structure Types
export interface TargetAllocation {
  identifier: string; // Position name, asset class, region, or currency
  targetPercentage: number; // 0-100
  currentPercentage?: number; // Current actual percentage
  deviation?: number; // targetPercentage - currentPercentage
  targetValue?: number; // Calculated target value in EUR
  currentValue?: number; // Current actual value in EUR
  isin?: string; // ISIN for position-specific targets
  positionType?: 'specific' | 'category'; // Type of target allocation
}

export interface PortfolioTargetStructure {
  id?: string;
  portfolioId: string;
  name: string; // Name for this target structure
  description?: string;
  targets: {
    positions?: TargetAllocation[];
    assetClasses?: TargetAllocation[];
    regions?: TargetAllocation[];
    currencies?: TargetAllocation[];
  };
  constraints?: {
    maxTransactionCount?: number;
    maxTransactionCostPercent?: number; // Max transaction cost as % of portfolio
    minPositionSize?: number; // Minimum position size in EUR
    maintainMinimumPositions?: boolean;
    taxOptimization?: boolean; // Consider tax implications
  };
  // New fields for liquidity injection
  additionalCash?: number; // Amount of new cash to be added to portfolio
  reallocationStrategy?: 'sell-only' | 'buy-only' | 'hybrid'; // Strategy for achieving target
  cashDeploymentPriority?: string[]; // Priority order for deploying new cash (asset class identifiers)
  allowPartialReallocation?: boolean; // Allow partial achievement of targets with available cash
  createdAt?: Date | string;
  updatedAt?: Date | string;
  isActive?: boolean;
}

export interface ReallocationRecommendation {
  action: 'buy' | 'sell' | 'hold' | 'adjust';
  positionName: string;
  isin?: string;
  category: 'position' | 'assetClass' | 'region' | 'currency';
  currentAmount: number;
  currentPercentage: number;
  targetAmount: number;
  targetPercentage: number;
  changeAmount: number;
  changePercentage: number;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  estimatedCost?: number;
  taxImplication?: string;
  // New fields for liquidity injection support
  sourceType?: 'existing' | 'new-cash' | 'mixed'; // Source of funds for this recommendation
  requiresSale?: boolean; // Whether this recommendation requires selling existing positions
  newCashRequired?: number; // Amount of new cash needed for this recommendation
  alternativeWithoutSales?: boolean; // Whether this can be achieved without sales using new cash
}

export interface ReallocationAnalysis {
  id?: string;
  portfolioId: string;
  targetStructureId: string;
  analysisDate: Date | string;
  totalPortfolioValue: number;
  recommendations: ReallocationRecommendation[];
  summary: {
    totalBuyAmount: number;
    totalSellAmount: number;
    estimatedTotalCost: number;
    numberOfTransactions: number;
    reallocationEfficiency: number; // 0-100 score
    riskImpact: 'positive' | 'negative' | 'neutral';
    expectedImprovement: string[];
  };
  deviationAnalysis: {
    assetClassDeviation: number; // Average deviation from target
    regionDeviation: number;
    currencyDeviation: number;
    overallDeviation: number;
  };
  claudeAnalysis?: {
    detailedRecommendations: string;
    riskAssessment: string;
    taxConsiderations: string;
    alternativeStrategies?: string[];
  };
  // New fields for liquidity injection analysis
  cashInjectionAnalysis?: {
    requiredNewCash: number; // Minimum cash needed for buy-only strategy
    optimalNewCash?: number; // Optimal amount for best results
    newPortfolioValue: number; // Portfolio value after cash injection
    cashDeploymentPlan: Array<{
      assetClass: string;
      amount: number;
      percentage: number;
      priority: number;
    }>;
    strategyComparison: {
      sellOnlyStrategy: {
        totalSales: number;
        transactionCosts: number;
        taxImplications: number;
        achievablePercentage: number; // How much of target can be achieved
      };
      buyOnlyStrategy: {
        requiredCash: number;
        transactionCosts: number;
        achievablePercentage: number;
      };
      hybridStrategy: {
        salesRequired: number;
        cashRequired: number;
        totalCosts: number;
        achievablePercentage: number;
      };
    };
  };
  selectedStrategy?: 'sell-only' | 'buy-only' | 'hybrid';
  status: 'draft' | 'reviewed' | 'approved' | 'executed';
}
