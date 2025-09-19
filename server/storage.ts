import { 
  type Portfolio, 
  type InsertPortfolio,
  type PortfolioPosition,
  type InsertPortfolioPosition,
  type AnalysisPhase,
  type InsertAnalysisPhase,
  type User, 
  type InsertUser,
  type AnalysisResults,
  type KnowledgeBase,
  type InsertKnowledgeBase,
  type ChatSession,
  type InsertChatSession,
  type ChatMessage,
  type InsertChatMessage,
  type PortfolioSnapshot,
  type InsertPortfolioSnapshot,
  type AnalysisPattern,
  type InsertAnalysisPattern,
  type UserPreference,
  type InsertUserPreference,
  type PositionTarget,
  type InsertPositionTarget,
  type KnowledgeQuery,
  users,
  portfolios,
  portfolioPositions,
  analysisPhases,
  knowledgeBase,
  chatSessions,
  chatMessages,
  portfolioSnapshots,
  analysisPatterns,
  userPreferences,
  positionTargets
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Portfolio methods
  createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  getPortfolio(id: string): Promise<Portfolio | undefined>;
  getAllPortfolios(): Promise<Portfolio[]>;
  updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<Portfolio | undefined>;
  deletePortfolio(id: string): Promise<boolean>;
  
  // Portfolio position methods
  createPortfolioPosition(position: InsertPortfolioPosition): Promise<PortfolioPosition>;
  getPortfolioPositions(portfolioId: string): Promise<PortfolioPosition[]>;
  updatePortfolioPosition(id: string, updates: Partial<PortfolioPosition>): Promise<PortfolioPosition | undefined>;
  
  // Analysis phase methods
  createAnalysisPhase(phase: InsertAnalysisPhase): Promise<AnalysisPhase>;
  getAnalysisPhases(portfolioId: string): Promise<AnalysisPhase[]>;
  updateAnalysisPhase(id: string, updates: Partial<AnalysisPhase>): Promise<AnalysisPhase | undefined>;

  // Knowledge Base methods
  createKnowledgeEntry(entry: InsertKnowledgeBase): Promise<KnowledgeBase>;
  getKnowledgeEntries(query: KnowledgeQuery): Promise<KnowledgeBase[]>;
  updateKnowledgeEntry(id: string, updates: Partial<KnowledgeBase>): Promise<KnowledgeBase | undefined>;
  deleteKnowledgeEntry(id: string): Promise<boolean>;

  // Chat Session methods
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSession(id: string): Promise<ChatSession | undefined>;
  getChatSessions(portfolioId: string): Promise<ChatSession[]>;
  updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined>;
  deleteChatSession(id: string): Promise<boolean>;

  // Chat Message methods
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(sessionId: string): Promise<ChatMessage[]>;
  updateChatMessage(id: string, updates: Partial<ChatMessage>): Promise<ChatMessage | undefined>;
  deleteChatMessage(id: string): Promise<boolean>;

  // Portfolio Snapshot methods
  createPortfolioSnapshot(snapshot: InsertPortfolioSnapshot): Promise<PortfolioSnapshot>;
  getPortfolioSnapshots(query: { portfolioId: string; limit?: number; sortBy?: string; sortOrder?: string }): Promise<PortfolioSnapshot[]>;
  getPortfolioSnapshot(id: string): Promise<PortfolioSnapshot | undefined>;
  deletePortfolioSnapshot(id: string): Promise<boolean>;

  // Analysis Pattern methods
  createAnalysisPattern(pattern: InsertAnalysisPattern): Promise<AnalysisPattern>;
  getAnalysisPatterns(patternType?: string): Promise<AnalysisPattern[]>;
  updateAnalysisPattern(id: string, updates: Partial<AnalysisPattern>): Promise<AnalysisPattern | undefined>;
  deleteAnalysisPattern(id: string): Promise<boolean>;

  // User Preference methods
  createUserPreference(preference: InsertUserPreference): Promise<UserPreference>;
  getUserPreferences(userId: string, portfolioId?: string): Promise<UserPreference[]>;
  updateUserPreference(id: string, updates: Partial<UserPreference>): Promise<UserPreference | undefined>;
  deleteUserPreference(id: string): Promise<boolean>;

  // Position Target methods
  createPositionTarget(target: InsertPositionTarget): Promise<PositionTarget>;
  getPositionTargets(portfolioId: string): Promise<PositionTarget[]>;
  getPositionTargetsByStructure(targetStructureId: string): Promise<PositionTarget[]>;
  updatePositionTarget(id: string, updates: Partial<PositionTarget>): Promise<PositionTarget | undefined>;
  deletePositionTarget(id: string): Promise<boolean>;
  deletePositionTargetsByPortfolio(portfolioId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private portfolios: Map<string, Portfolio>;
  private portfolioPositions: Map<string, PortfolioPosition>;
  private analysisPhases: Map<string, AnalysisPhase>;
  private knowledgeEntries: Map<string, KnowledgeBase>;
  private chatSessions: Map<string, ChatSession>;
  private chatMessages: Map<string, ChatMessage>;
  private portfolioSnapshots: Map<string, PortfolioSnapshot>;
  private analysisPatterns: Map<string, AnalysisPattern>;
  private userPreferences: Map<string, UserPreference>;
  private positionTargets: Map<string, PositionTarget>;

  constructor() {
    this.users = new Map();
    this.portfolios = new Map();
    this.portfolioPositions = new Map();
    this.analysisPhases = new Map();
    this.knowledgeEntries = new Map();
    this.chatSessions = new Map();
    this.chatMessages = new Map();
    this.portfolioSnapshots = new Map();
    this.analysisPatterns = new Map();
    this.userPreferences = new Map();
    this.positionTargets = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Portfolio methods
  async createPortfolio(insertPortfolio: InsertPortfolio): Promise<Portfolio> {
    const id = randomUUID();
    const portfolio: Portfolio = {
      id,
      name: insertPortfolio.name,
      fileName: insertPortfolio.fileName,
      uploadedAt: new Date(),
      analysisStatus: insertPortfolio.analysisStatus || 'pending',
      analysisProgress: 0,
      currentPhase: "Phase 0: Instrumentenidentifikation",
      analysisResults: null,
      totalValue: null,
      positionCount: null,
    };
    this.portfolios.set(id, portfolio);
    return portfolio;
  }

  async getPortfolio(id: string): Promise<Portfolio | undefined> {
    return this.portfolios.get(id);
  }

  async getAllPortfolios(): Promise<Portfolio[]> {
    return Array.from(this.portfolios.values()).sort((a, b) => 
      new Date(b.uploadedAt!).getTime() - new Date(a.uploadedAt!).getTime()
    );
  }

  async updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<Portfolio | undefined> {
    const portfolio = this.portfolios.get(id);
    if (!portfolio) return undefined;
    
    const updatedPortfolio = { ...portfolio, ...updates };
    this.portfolios.set(id, updatedPortfolio);
    return updatedPortfolio;
  }

  async deletePortfolio(id: string): Promise<boolean> {
    // Also delete related positions and phases
    const positions = Array.from(this.portfolioPositions.values()).filter(p => p.portfolioId === id);
    const phases = Array.from(this.analysisPhases.values()).filter(p => p.portfolioId === id);
    
    positions.forEach(p => this.portfolioPositions.delete(p.id));
    phases.forEach(p => this.analysisPhases.delete(p.id));
    
    return this.portfolios.delete(id);
  }

  // Portfolio position methods
  async createPortfolioPosition(insertPosition: InsertPortfolioPosition): Promise<PortfolioPosition> {
    const id = randomUUID();
    const position: PortfolioPosition = { 
      id,
      portfolioId: insertPosition.portfolioId || null,
      name: insertPosition.name,
      isin: insertPosition.isin || null,
      value: insertPosition.value,
      percentage: insertPosition.percentage || null,
      instrumentType: insertPosition.instrumentType || null,
      sector: insertPosition.sector || null,
      geography: insertPosition.geography || null,
      currency: insertPosition.currency || null,
      assetClass: insertPosition.assetClass || null,
      analysisStatus: insertPosition.analysisStatus || null
    };
    this.portfolioPositions.set(id, position);
    return position;
  }

  async getPortfolioPositions(portfolioId: string): Promise<PortfolioPosition[]> {
    return Array.from(this.portfolioPositions.values())
      .filter(p => p.portfolioId === portfolioId)
      .sort((a, b) => Number(b.value) - Number(a.value));
  }

  async updatePortfolioPosition(id: string, updates: Partial<PortfolioPosition>): Promise<PortfolioPosition | undefined> {
    const position = this.portfolioPositions.get(id);
    if (!position) return undefined;
    
    const updatedPosition = { ...position, ...updates };
    this.portfolioPositions.set(id, updatedPosition);
    return updatedPosition;
  }

  // Analysis phase methods
  async createAnalysisPhase(insertPhase: InsertAnalysisPhase): Promise<AnalysisPhase> {
    const id = randomUUID();
    const phase: AnalysisPhase = { 
      id,
      portfolioId: insertPhase.portfolioId || null,
      phaseNumber: insertPhase.phaseNumber,
      phaseName: insertPhase.phaseName,
      status: insertPhase.status || 'pending',
      startedAt: null,
      completedAt: null,
      results: null,
    };
    this.analysisPhases.set(id, phase);
    return phase;
  }

  async getAnalysisPhases(portfolioId: string): Promise<AnalysisPhase[]> {
    return Array.from(this.analysisPhases.values())
      .filter(p => p.portfolioId === portfolioId)
      .sort((a, b) => a.phaseNumber - b.phaseNumber);
  }

  async updateAnalysisPhase(id: string, updates: Partial<AnalysisPhase>): Promise<AnalysisPhase | undefined> {
    const phase = this.analysisPhases.get(id);
    if (!phase) return undefined;
    
    const updatedPhase = { ...phase, ...updates };
    this.analysisPhases.set(id, updatedPhase);
    return updatedPhase;
  }

  // Knowledge Base methods
  async createKnowledgeEntry(insertEntry: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const id = randomUUID();
    const entry: KnowledgeBase = { 
      id,
      portfolioId: insertEntry.portfolioId || null,
      analysisType: insertEntry.analysisType,
      data: insertEntry.data,
      insights: insertEntry.insights || null,
      confidence: insertEntry.confidence || null,
      tags: insertEntry.tags || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isValid: insertEntry.isValid || "true"
    };
    this.knowledgeEntries.set(id, entry);
    return entry;
  }

  async getKnowledgeEntries(query: KnowledgeQuery): Promise<KnowledgeBase[]> {
    let entries = Array.from(this.knowledgeEntries.values());

    if (query.portfolioId) {
      entries = entries.filter(e => e.portfolioId === query.portfolioId);
    }
    if (query.analysisType) {
      entries = entries.filter(e => query.analysisType!.includes(e.analysisType));
    }
    if (query.confidenceMin !== undefined) {
      entries = entries.filter(e => e.confidence && parseFloat(e.confidence) >= query.confidenceMin!);
    }

    return entries
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, query.limit || 50);
  }

  async updateKnowledgeEntry(id: string, updates: Partial<KnowledgeBase>): Promise<KnowledgeBase | undefined> {
    const entry = this.knowledgeEntries.get(id);
    if (!entry) return undefined;
    
    const updatedEntry = { ...entry, ...updates, updatedAt: new Date() };
    this.knowledgeEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  async deleteKnowledgeEntry(id: string): Promise<boolean> {
    return this.knowledgeEntries.delete(id);
  }

  // Chat Session methods
  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const id = randomUUID();
    const session: ChatSession = {
      id,
      portfolioId: insertSession.portfolioId || null,
      userId: insertSession.userId || null,
      sessionName: insertSession.sessionName || "New Chat",
      context: insertSession.context || null,
      createdAt: new Date(),
      lastMessageAt: new Date(),
      isActive: insertSession.isActive || "true"
    };
    this.chatSessions.set(id, session);
    return session;
  }

  async getChatSession(id: string): Promise<ChatSession | undefined> {
    return this.chatSessions.get(id);
  }

  async getChatSessions(portfolioId: string): Promise<ChatSession[]> {
    return Array.from(this.chatSessions.values())
      .filter(s => s.portfolioId === portfolioId)
      .sort((a, b) => new Date(b.lastMessageAt!).getTime() - new Date(a.lastMessageAt!).getTime());
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    const session = this.chatSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.chatSessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteChatSession(id: string): Promise<boolean> {
    // Also delete related messages
    const messages = Array.from(this.chatMessages.values()).filter(m => m.sessionId === id);
    messages.forEach(m => this.chatMessages.delete(m.id));
    
    return this.chatSessions.delete(id);
  }

  // Chat Message methods
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = {
      id,
      sessionId: insertMessage.sessionId || null,
      sender: insertMessage.sender,
      messageType: insertMessage.messageType || "text",
      content: insertMessage.content,
      metadata: insertMessage.metadata || null,
      timestamp: new Date(),
      isDeleted: insertMessage.isDeleted || "false"
    };
    this.chatMessages.set(id, message);
    return message;
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(m => m.sessionId === sessionId && m.isDeleted === "false")
      .sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime());
  }

  async updateChatMessage(id: string, updates: Partial<ChatMessage>): Promise<ChatMessage | undefined> {
    const message = this.chatMessages.get(id);
    if (!message) return undefined;
    
    const updatedMessage = { ...message, ...updates };
    this.chatMessages.set(id, updatedMessage);
    return updatedMessage;
  }

  async deleteChatMessage(id: string): Promise<boolean> {
    return this.chatMessages.delete(id);
  }

  // Portfolio Snapshot methods
  async createPortfolioSnapshot(insertSnapshot: InsertPortfolioSnapshot): Promise<PortfolioSnapshot> {
    const id = randomUUID();
    const snapshot: PortfolioSnapshot = {
      id,
      portfolioId: insertSnapshot.portfolioId || null,
      snapshotType: insertSnapshot.snapshotType,
      positions: insertSnapshot.positions,
      analysisResults: insertSnapshot.analysisResults || null,
      totalValue: insertSnapshot.totalValue || null,
      metadata: insertSnapshot.metadata || null,
      createdAt: new Date(),
      description: insertSnapshot.description || null
    };
    this.portfolioSnapshots.set(id, snapshot);
    return snapshot;
  }

  async getPortfolioSnapshots(query: { portfolioId: string; limit?: number; sortBy?: string; sortOrder?: string }): Promise<PortfolioSnapshot[]> {
    const results = Array.from(this.portfolioSnapshots.values())
      .filter(s => s.portfolioId === query.portfolioId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    
    return results.slice(0, query.limit || 50);
  }

  async getPortfolioSnapshot(id: string): Promise<PortfolioSnapshot | undefined> {
    return this.portfolioSnapshots.get(id);
  }

  async deletePortfolioSnapshot(id: string): Promise<boolean> {
    return this.portfolioSnapshots.delete(id);
  }

  // Analysis Pattern methods
  async createAnalysisPattern(insertPattern: InsertAnalysisPattern): Promise<AnalysisPattern> {
    const id = randomUUID();
    const pattern: AnalysisPattern = {
      id,
      patternType: insertPattern.patternType,
      patternData: insertPattern.patternData,
      frequency: insertPattern.frequency || 1,
      reliability: insertPattern.reliability || "0.50",
      lastObserved: new Date(),
      createdAt: new Date(),
      isActive: insertPattern.isActive || "true"
    };
    this.analysisPatterns.set(id, pattern);
    return pattern;
  }

  async getAnalysisPatterns(patternType?: string): Promise<AnalysisPattern[]> {
    let patterns = Array.from(this.analysisPatterns.values()).filter(p => p.isActive === "true");
    
    if (patternType) {
      patterns = patterns.filter(p => p.patternType === patternType);
    }
    
    return patterns.sort((a, b) => (parseFloat(b.reliability!) - parseFloat(a.reliability!)));
  }

  async updateAnalysisPattern(id: string, updates: Partial<AnalysisPattern>): Promise<AnalysisPattern | undefined> {
    const pattern = this.analysisPatterns.get(id);
    if (!pattern) return undefined;
    
    const updatedPattern = { ...pattern, ...updates };
    this.analysisPatterns.set(id, updatedPattern);
    return updatedPattern;
  }

  async deleteAnalysisPattern(id: string): Promise<boolean> {
    return this.analysisPatterns.delete(id);
  }

  // User Preference methods
  async createUserPreference(insertPreference: InsertUserPreference): Promise<UserPreference> {
    const id = randomUUID();
    const preference: UserPreference = {
      id,
      userId: insertPreference.userId || null,
      preferenceType: insertPreference.preferenceType,
      preferenceValue: insertPreference.preferenceValue,
      portfolioId: insertPreference.portfolioId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.userPreferences.set(id, preference);
    return preference;
  }

  async getUserPreferences(userId: string, portfolioId?: string): Promise<UserPreference[]> {
    let preferences = Array.from(this.userPreferences.values()).filter(p => p.userId === userId);
    
    if (portfolioId) {
      preferences = preferences.filter(p => p.portfolioId === portfolioId);
    }
    
    return preferences.sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime());
  }

  async updateUserPreference(id: string, updates: Partial<UserPreference>): Promise<UserPreference | undefined> {
    const preference = this.userPreferences.get(id);
    if (!preference) return undefined;
    
    const updatedPreference = { ...preference, ...updates, updatedAt: new Date() };
    this.userPreferences.set(id, updatedPreference);
    return updatedPreference;
  }

  async deleteUserPreference(id: string): Promise<boolean> {
    return this.userPreferences.delete(id);
  }

  // Position Target methods
  async createPositionTarget(target: InsertPositionTarget): Promise<PositionTarget> {
    const id = randomUUID();
    const now = new Date();
    const newTarget: PositionTarget = {
      id,
      ...target,
      createdAt: now,
      updatedAt: now
    };
    this.positionTargets.set(id, newTarget);
    return newTarget;
  }

  async getPositionTargets(portfolioId: string): Promise<PositionTarget[]> {
    return Array.from(this.positionTargets.values()).filter(
      target => target.portfolioId === portfolioId
    );
  }

  async getPositionTargetsByStructure(targetStructureId: string): Promise<PositionTarget[]> {
    return Array.from(this.positionTargets.values()).filter(
      target => target.targetStructureId === targetStructureId
    );
  }

  async updatePositionTarget(id: string, updates: Partial<PositionTarget>): Promise<PositionTarget | undefined> {
    const existing = this.positionTargets.get(id);
    if (!existing) return undefined;
    
    const updated: PositionTarget = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.positionTargets.set(id, updated);
    return updated;
  }

  async deletePositionTarget(id: string): Promise<boolean> {
    return this.positionTargets.delete(id);
  }

  async deletePositionTargetsByPortfolio(portfolioId: string): Promise<boolean> {
    const targets = Array.from(this.positionTargets.entries()).filter(
      ([_, target]) => target.portfolioId === portfolioId
    );
    targets.forEach(([id]) => this.positionTargets.delete(id));
    return targets.length > 0;
  }
}

/**
 * Helper function to safely convert Date objects to ISO strings for PostgreSQL
 */
function sanitizeDateFields(updates: Record<string, any>): Record<string, any> {
  const sanitized = { ...updates };
  
  // Common date fields that need conversion
  const dateFields = ['createdAt', 'updatedAt', 'startedAt', 'completedAt', 'lastMessageAt', 'lastObserved', 'identifiedAt'];
  
  for (const field of dateFields) {
    if (sanitized[field] !== undefined) {
      if (sanitized[field] instanceof Date) {
        sanitized[field] = sanitized[field].toISOString();
      } else if (sanitized[field] === null) {
        sanitized[field] = null;
      }
      // Keep string values as-is (they should already be ISO strings)
    }
  }
  
  return sanitized;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Portfolio methods
  async createPortfolio(insertPortfolio: InsertPortfolio): Promise<Portfolio> {
    const [portfolio] = await db
      .insert(portfolios)
      .values({
        ...insertPortfolio,
        analysisProgress: 0,
        currentPhase: "Phase 0: Instrumentenidentifikation",
      })
      .returning();
    return portfolio;
  }

  async getPortfolio(id: string): Promise<Portfolio | undefined> {
    const [portfolio] = await db.select().from(portfolios).where(eq(portfolios.id, id));
    return portfolio || undefined;
  }

  async getAllPortfolios(): Promise<Portfolio[]> {
    const result = await db.select().from(portfolios).orderBy(portfolios.uploadedAt);
    return result.reverse(); // Most recent first
  }

  async updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<Portfolio | undefined> {
    const [portfolio] = await db
      .update(portfolios)
      .set(updates)
      .where(eq(portfolios.id, id))
      .returning();
    return portfolio || undefined;
  }

  async deletePortfolio(id: string): Promise<boolean> {
    try {
      console.log(`🗑️ Starting cascade delete for portfolio ${id}`);
      
      // Delete all related data in the correct order (foreign key constraints)
      // 1. First delete chat messages (depend on chat sessions)
      const sessionsToDelete = await db.select({ id: chatSessions.id }).from(chatSessions).where(eq(chatSessions.portfolioId, id));
      let totalMessagesDeleted = 0;
      for (const session of sessionsToDelete) {
        const messagesResult = await db.delete(chatMessages).where(eq(chatMessages.sessionId, session.id));
        totalMessagesDeleted += messagesResult.rowCount || 0;
      }
      console.log(`   Deleted ${totalMessagesDeleted} chat messages`);
      
      // 2. Then delete chat sessions (depend on portfolio)
      const chatResult = await db.delete(chatSessions).where(eq(chatSessions.portfolioId, id));
      console.log(`   Deleted ${chatResult.rowCount || 0} chat sessions`);
      
      // 3. Knowledge base entries
      const knowledgeResult = await db.delete(knowledgeBase).where(eq(knowledgeBase.portfolioId, id));
      console.log(`   Deleted ${knowledgeResult.rowCount || 0} knowledge base entries`);
      
      // 4. Portfolio snapshots
      const snapshotsResult = await db.delete(portfolioSnapshots).where(eq(portfolioSnapshots.portfolioId, id));
      console.log(`   Deleted ${snapshotsResult.rowCount || 0} portfolio snapshots`);
      
      // 5. Analysis phases
      const phasesResult = await db.delete(analysisPhases).where(eq(analysisPhases.portfolioId, id));
      console.log(`   Deleted ${phasesResult.rowCount || 0} analysis phases`);
      
      // 6. Portfolio positions
      const positionsResult = await db.delete(portfolioPositions).where(eq(portfolioPositions.portfolioId, id));
      console.log(`   Deleted ${positionsResult.rowCount || 0} portfolio positions`);
      
      // 7. User preferences (portfolio-specific)
      const preferencesResult = await db.delete(userPreferences).where(eq(userPreferences.portfolioId, id));
      console.log(`   Deleted ${preferencesResult.rowCount || 0} user preferences`);
      
      // 8. Finally, delete the portfolio itself
      const portfolioResult = await db.delete(portfolios).where(eq(portfolios.id, id));
      console.log(`   Deleted ${portfolioResult.rowCount || 0} portfolios`);
      
      const success = portfolioResult.rowCount ? portfolioResult.rowCount > 0 : false;
      console.log(`✅ Portfolio ${id} deletion ${success ? 'successful' : 'failed'}`);
      
      return success;
    } catch (error) {
      console.error(`❌ Error during cascade delete for portfolio ${id}:`, error);
      throw error;
    }
  }

  // Portfolio position methods
  async createPortfolioPosition(insertPosition: InsertPortfolioPosition): Promise<PortfolioPosition> {
    const [position] = await db
      .insert(portfolioPositions)
      .values(insertPosition)
      .returning();
    return position;
  }

  async getPortfolioPositions(portfolioId: string): Promise<PortfolioPosition[]> {
    const result = await db
      .select()
      .from(portfolioPositions)
      .where(eq(portfolioPositions.portfolioId, portfolioId));
    
    // Sort by value descending (convert string to number for sorting)
    return result.sort((a, b) => Number(b.value) - Number(a.value));
  }

  async updatePortfolioPosition(id: string, updates: Partial<PortfolioPosition>): Promise<PortfolioPosition | undefined> {
    const [position] = await db
      .update(portfolioPositions)
      .set(updates)
      .where(eq(portfolioPositions.id, id))
      .returning();
    return position || undefined;
  }

  // Analysis phase methods
  async createAnalysisPhase(insertPhase: InsertAnalysisPhase): Promise<AnalysisPhase> {
    const [phase] = await db
      .insert(analysisPhases)
      .values(insertPhase)
      .returning();
    return phase;
  }

  async getAnalysisPhases(portfolioId: string): Promise<AnalysisPhase[]> {
    const result = await db
      .select()
      .from(analysisPhases)
      .where(eq(analysisPhases.portfolioId, portfolioId));
    
    // Sort by phase number ascending
    return result.sort((a, b) => a.phaseNumber - b.phaseNumber);
  }

  async updateAnalysisPhase(id: string, updates: Partial<AnalysisPhase>): Promise<AnalysisPhase | undefined> {
    const [phase] = await db
      .update(analysisPhases)
      .set(sanitizeDateFields(updates))
      .where(eq(analysisPhases.id, id))
      .returning();
    return phase || undefined;
  }

  // Knowledge Base methods
  async createKnowledgeEntry(insertEntry: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const [entry] = await db
      .insert(knowledgeBase)
      .values(insertEntry)
      .returning();
    return entry;
  }

  async getKnowledgeEntries(query: KnowledgeQuery): Promise<KnowledgeBase[]> {
    let dbQuery = db.select().from(knowledgeBase);

    // Apply filters (simplified for PostgreSQL)
    const result = await dbQuery;
    let filtered = result;

    if (query.portfolioId) {
      filtered = filtered.filter(e => e.portfolioId === query.portfolioId);
    }
    if (query.analysisType) {
      filtered = filtered.filter(e => query.analysisType!.includes(e.analysisType));
    }
    if (query.confidenceMin !== undefined) {
      filtered = filtered.filter(e => e.confidence && parseFloat(e.confidence) >= query.confidenceMin!);
    }

    return filtered
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, query.limit || 50);
  }

  async updateKnowledgeEntry(id: string, updates: Partial<KnowledgeBase>): Promise<KnowledgeBase | undefined> {
    const [entry] = await db
      .update(knowledgeBase)
      .set(sanitizeDateFields({...updates, updatedAt: new Date()}))
      .where(eq(knowledgeBase.id, id))
      .returning();
    return entry || undefined;
  }

  async deleteKnowledgeEntry(id: string): Promise<boolean> {
    const result = await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Chat Session methods
  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const [session] = await db
      .insert(chatSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async getChatSession(id: string): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session || undefined;
  }

  async getChatSessions(portfolioId: string): Promise<ChatSession[]> {
    const result = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.portfolioId, portfolioId));
    
    return result.sort((a, b) => new Date(b.lastMessageAt!).getTime() - new Date(a.lastMessageAt!).getTime());
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    const [session] = await db
      .update(chatSessions)
      .set(sanitizeDateFields(updates))
      .where(eq(chatSessions.id, id))
      .returning();
    return session || undefined;
  }

  async deleteChatSession(id: string): Promise<boolean> {
    // Delete related messages first
    await db.delete(chatMessages).where(eq(chatMessages.sessionId, id));
    
    const result = await db.delete(chatSessions).where(eq(chatSessions.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Chat Message methods
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    const result = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId));
    
    return result
      .filter(m => m.isDeleted === "false")
      .sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime());
  }

  async updateChatMessage(id: string, updates: Partial<ChatMessage>): Promise<ChatMessage | undefined> {
    const [message] = await db
      .update(chatMessages)
      .set(updates)
      .where(eq(chatMessages.id, id))
      .returning();
    return message || undefined;
  }

  async deleteChatMessage(id: string): Promise<boolean> {
    const result = await db.delete(chatMessages).where(eq(chatMessages.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Portfolio Snapshot methods
  async createPortfolioSnapshot(insertSnapshot: InsertPortfolioSnapshot): Promise<PortfolioSnapshot> {
    const [snapshot] = await db
      .insert(portfolioSnapshots)
      .values(insertSnapshot)
      .returning();
    return snapshot;
  }

  // This method was moved to the end of the class - removing duplicate

  async getPortfolioSnapshot(id: string): Promise<PortfolioSnapshot | undefined> {
    const [snapshot] = await db.select().from(portfolioSnapshots).where(eq(portfolioSnapshots.id, id));
    return snapshot || undefined;
  }

  async deletePortfolioSnapshot(id: string): Promise<boolean> {
    const result = await db.delete(portfolioSnapshots).where(eq(portfolioSnapshots.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Analysis Pattern methods
  async createAnalysisPattern(insertPattern: InsertAnalysisPattern): Promise<AnalysisPattern> {
    const [pattern] = await db
      .insert(analysisPatterns)
      .values(insertPattern)
      .returning();
    return pattern;
  }

  async getAnalysisPatterns(patternType?: string): Promise<AnalysisPattern[]> {
    const result = await db.select().from(analysisPatterns);
    
    let filtered = result.filter(p => p.isActive === "true");
    if (patternType) {
      filtered = filtered.filter(p => p.patternType === patternType);
    }
    
    return filtered.sort((a, b) => (parseFloat(b.reliability!) - parseFloat(a.reliability!)));
  }

  async updateAnalysisPattern(id: string, updates: Partial<AnalysisPattern>): Promise<AnalysisPattern | undefined> {
    const [pattern] = await db
      .update(analysisPatterns)
      .set(updates)
      .where(eq(analysisPatterns.id, id))
      .returning();
    return pattern || undefined;
  }

  async deleteAnalysisPattern(id: string): Promise<boolean> {
    const result = await db.delete(analysisPatterns).where(eq(analysisPatterns.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // User Preference methods
  async createUserPreference(insertPreference: InsertUserPreference): Promise<UserPreference> {
    const [preference] = await db
      .insert(userPreferences)
      .values(insertPreference)
      .returning();
    return preference;
  }

  async getUserPreferences(userId: string, portfolioId?: string): Promise<UserPreference[]> {
    const result = await db.select().from(userPreferences);
    
    let filtered = result.filter(p => p.userId === userId);
    if (portfolioId) {
      filtered = filtered.filter(p => p.portfolioId === portfolioId);
    }
    
    return filtered.sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime());
  }

  async updateUserPreference(id: string, updates: Partial<UserPreference>): Promise<UserPreference | undefined> {
    const [preference] = await db
      .update(userPreferences)
      .set(sanitizeDateFields({...updates, updatedAt: new Date()}))
      .where(eq(userPreferences.id, id))
      .returning();
    return preference || undefined;
  }

  async deleteUserPreference(id: string): Promise<boolean> {
    const result = await db.delete(userPreferences).where(eq(userPreferences.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Portfolio Snapshot methods
  async createPortfolioSnapshot(insertSnapshot: InsertPortfolioSnapshot): Promise<PortfolioSnapshot> {
    const [snapshot] = await db
      .insert(portfolioSnapshots)
      .values(insertSnapshot)
      .returning();
    return snapshot;
  }

  async getPortfolioSnapshots(query: { portfolioId: string; limit?: number; sortBy?: string; sortOrder?: string }): Promise<PortfolioSnapshot[]> {
    let dbQuery = db.select().from(portfolioSnapshots);
    const result = await dbQuery;
    
    let filtered = result.filter(s => s.portfolioId === query.portfolioId);
    
    return filtered
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, query.limit || 20);
  }

  async getPortfolioSnapshot(id: string): Promise<PortfolioSnapshot | undefined> {
    const [snapshot] = await db.select().from(portfolioSnapshots).where(eq(portfolioSnapshots.id, id));
    return snapshot || undefined;
  }

  async updatePortfolioSnapshot(id: string, updates: Partial<PortfolioSnapshot>): Promise<PortfolioSnapshot | undefined> {
    const [snapshot] = await db
      .update(portfolioSnapshots)
      .set(updates)
      .where(eq(portfolioSnapshots.id, id))
      .returning();
    return snapshot || undefined;
  }

  async deletePortfolioSnapshot(id: string): Promise<boolean> {
    const result = await db.delete(portfolioSnapshots).where(eq(portfolioSnapshots.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Analysis Pattern methods
  async createAnalysisPattern(insertPattern: InsertAnalysisPattern): Promise<AnalysisPattern> {
    const [pattern] = await db
      .insert(analysisPatterns)
      .values(insertPattern)
      .returning();
    return pattern;
  }

  async getAnalysisPatterns(query: { portfolioId?: string; patternType?: string[]; limit?: number }): Promise<AnalysisPattern[]> {
    const result = await db.select().from(analysisPatterns);
    
    let filtered = result;
    if (query.portfolioId) {
      filtered = filtered.filter(p => p.portfolioId === query.portfolioId);
    }
    
    return filtered
      .sort((a, b) => new Date(b.identifiedAt!).getTime() - new Date(a.identifiedAt!).getTime())
      .slice(0, query.limit || 50);
  }

  async updateAnalysisPattern(id: string, updates: Partial<AnalysisPattern>): Promise<AnalysisPattern | undefined> {
    const [pattern] = await db
      .update(analysisPatterns)
      .set(sanitizeDateFields({...updates, identifiedAt: new Date()}))
      .where(eq(analysisPatterns.id, id))
      .returning();
    return pattern || undefined;
  }

  async deleteAnalysisPattern(id: string): Promise<boolean> {
    const result = await db.delete(analysisPatterns).where(eq(analysisPatterns.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Position Target methods
  async createPositionTarget(target: InsertPositionTarget): Promise<PositionTarget> {
    const [positionTarget] = await db
      .insert(positionTargets)
      .values(target)
      .returning();
    return positionTarget;
  }

  async getPositionTargets(portfolioId: string): Promise<PositionTarget[]> {
    const targets = await db
      .select()
      .from(positionTargets)
      .where(eq(positionTargets.portfolioId, portfolioId));
    return targets;
  }

  async getPositionTargetsByStructure(targetStructureId: string): Promise<PositionTarget[]> {
    const targets = await db
      .select()
      .from(positionTargets)
      .where(eq(positionTargets.targetStructureId, targetStructureId));
    return targets;
  }

  async updatePositionTarget(id: string, updates: Partial<PositionTarget>): Promise<PositionTarget | undefined> {
    const sanitizedUpdates = sanitizeDateFields(updates);
    const [target] = await db
      .update(positionTargets)
      .set({ 
        ...sanitizedUpdates, 
        updatedAt: new Date().toISOString() 
      })
      .where(eq(positionTargets.id, id))
      .returning();
    return target || undefined;
  }

  async deletePositionTarget(id: string): Promise<boolean> {
    const result = await db.delete(positionTargets).where(eq(positionTargets.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async deletePositionTargetsByPortfolio(portfolioId: string): Promise<boolean> {
    const result = await db.delete(positionTargets).where(eq(positionTargets.portfolioId, portfolioId));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = new DatabaseStorage();
