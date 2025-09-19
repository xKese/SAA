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
  userPreferences
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;

  // Portfolio methods
  createPortfolio(insertPortfolio: InsertPortfolio): Promise<Portfolio>;
  getAllPortfolios(): Promise<Portfolio[]>;
  getPortfolio(id: string): Promise<Portfolio | undefined>;
  updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<Portfolio | undefined>;
  deletePortfolio(id: string): Promise<boolean>;

  // Position methods
  createPortfolioPosition(insertPosition: InsertPortfolioPosition): Promise<PortfolioPosition>;
  getPortfolioPositions(portfolioId: string): Promise<PortfolioPosition[]>;
  updatePortfolioPosition(id: string, updates: Partial<PortfolioPosition>): Promise<PortfolioPosition | undefined>;

  // Analysis phase methods
  createAnalysisPhase(insertPhase: InsertAnalysisPhase): Promise<AnalysisPhase>;
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
  getAnalysisPatterns(query: { portfolioId?: string; patternType?: string[]; limit?: number }): Promise<AnalysisPattern[]>;
  updateAnalysisPattern(id: string, updates: Partial<AnalysisPattern>): Promise<AnalysisPattern | undefined>;
  deleteAnalysisPattern(id: string): Promise<boolean>;

  // User Preference methods
  createUserPreference(preference: InsertUserPreference): Promise<UserPreference>;
  getUserPreferences(userId: string, portfolioId?: string): Promise<UserPreference[]>;
  updateUserPreference(id: string, updates: Partial<UserPreference>): Promise<UserPreference | undefined>;
  deleteUserPreference(id: string): Promise<boolean>;
}

export class CleanDatabaseStorage implements IStorage {
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
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Portfolio methods
  async createPortfolio(insertPortfolio: InsertPortfolio): Promise<Portfolio> {
    const [portfolio] = await db.insert(portfolios)
      .values({
        ...insertPortfolio,
        analysisProgress: 0,
        currentPhase: "Phase 0: Instrumentenidentifikation",
      })
      .returning();
    return portfolio;
  }

  async getAllPortfolios(): Promise<Portfolio[]> {
    return await db.select().from(portfolios);
  }

  async getPortfolio(id: string): Promise<Portfolio | undefined> {
    const [portfolio] = await db.select().from(portfolios).where(eq(portfolios.id, id));
    return portfolio || undefined;
  }

  async updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<Portfolio | undefined> {
    const sanitizedUpdates = this.sanitizeDateFields({ ...updates });
    const [portfolio] = await db.update(portfolios)
      .set(sanitizedUpdates)
      .where(eq(portfolios.id, id))
      .returning();
    return portfolio || undefined;
  }

  async deletePortfolio(id: string): Promise<boolean> {
    try {
      // Use transaction for atomic deletion
      await db.transaction(async (tx) => {
        // Delete all related data in correct order due to foreign key constraints
        
        // 1. Delete chat messages for all sessions of this portfolio
        const sessions = await tx.select().from(chatSessions).where(eq(chatSessions.portfolioId, id));
        for (const session of sessions) {
          await tx.delete(chatMessages).where(eq(chatMessages.sessionId, session.id));
        }
        
        // 2. Delete chat sessions
        await tx.delete(chatSessions).where(eq(chatSessions.portfolioId, id));
        
        // 3. Delete knowledge base entries
        await tx.delete(knowledgeBase).where(eq(knowledgeBase.portfolioId, id));
        
        // 4. Delete portfolio snapshots
        await tx.delete(portfolioSnapshots).where(eq(portfolioSnapshots.portfolioId, id));
        
        // 5. Delete analysis phases
        await tx.delete(analysisPhases).where(eq(analysisPhases.portfolioId, id));
        
        // 6. Delete portfolio positions
        await tx.delete(portfolioPositions).where(eq(portfolioPositions.portfolioId, id));
        
        // 7. Delete user preferences for this portfolio
        await tx.delete(userPreferences).where(eq(userPreferences.portfolioId, id));
        
        // 8. Finally, delete the portfolio itself
        await tx.delete(portfolios).where(eq(portfolios.id, id));
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      return false;
    }
  }

  // Position methods
  async createPortfolioPosition(insertPosition: InsertPortfolioPosition): Promise<PortfolioPosition> {
    const [position] = await db.insert(portfolioPositions).values(insertPosition).returning();
    return position;
  }

  async getPortfolioPositions(portfolioId: string): Promise<PortfolioPosition[]> {
    return await db.select().from(portfolioPositions).where(eq(portfolioPositions.portfolioId, portfolioId));
  }

  async updatePortfolioPosition(id: string, updates: Partial<PortfolioPosition>): Promise<PortfolioPosition | undefined> {
    const sanitizedUpdates = this.sanitizeDateFields({ ...updates });
    const [position] = await db.update(portfolioPositions)
      .set(sanitizedUpdates)
      .where(eq(portfolioPositions.id, id))
      .returning();
    return position || undefined;
  }

  // Analysis phase methods
  async createAnalysisPhase(insertPhase: InsertAnalysisPhase): Promise<AnalysisPhase> {
    const [phase] = await db.insert(analysisPhases).values(insertPhase).returning();
    return phase;
  }

  async getAnalysisPhases(portfolioId: string): Promise<AnalysisPhase[]> {
    return await db.select().from(analysisPhases).where(eq(analysisPhases.portfolioId, portfolioId));
  }

  async updateAnalysisPhase(id: string, updates: Partial<AnalysisPhase>): Promise<AnalysisPhase | undefined> {
    // Sanitize date fields before database update
    const sanitizedUpdates = this.sanitizeDateFields({ ...updates });
    
    const [phase] = await db.update(analysisPhases)
      .set(sanitizedUpdates)
      .where(eq(analysisPhases.id, id))
      .returning();
    return phase || undefined;
  }

  // Knowledge Base methods
  async createKnowledgeEntry(entry: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const sanitizedEntry = this.sanitizeDateFields({ ...entry });
    const [knowledge] = await db.insert(knowledgeBase).values(sanitizedEntry).returning();
    return knowledge;
  }

  async getKnowledgeEntries(query: KnowledgeQuery): Promise<KnowledgeBase[]> {
    const result = await db.select().from(knowledgeBase);
    
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
    const sanitizedUpdates = this.sanitizeDateFields({ ...updates });
    const [entry] = await db.update(knowledgeBase)
      .set(sanitizedUpdates)
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
    const sanitizedSession = this.sanitizeDateFields({ ...insertSession });
    const [session] = await db.insert(chatSessions).values(sanitizedSession).returning();
    return session;
  }

  async getChatSession(id: string): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session || undefined;
  }

  async getChatSessions(portfolioId: string): Promise<ChatSession[]> {
    return await db.select().from(chatSessions).where(eq(chatSessions.portfolioId, portfolioId));
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    // Add updatedAt timestamp and sanitize
    const updatesWithTimestamp = { ...updates, updatedAt: new Date() };
    const sanitizedUpdates = this.sanitizeDateFields(updatesWithTimestamp);
    
    const [session] = await db.update(chatSessions)
      .set(sanitizedUpdates)
      .where(eq(chatSessions.id, id))
      .returning();
    return session || undefined;
  }

  async deleteChatSession(id: string): Promise<boolean> {
    const result = await db.delete(chatSessions).where(eq(chatSessions.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Chat Message methods
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const sanitizedMessage = this.sanitizeDateFields({ ...insertMessage });
    const [message] = await db.insert(chatMessages).values(sanitizedMessage).returning();
    return message;
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages).where(eq(chatMessages.sessionId, sessionId));
  }

  async updateChatMessage(id: string, updates: Partial<ChatMessage>): Promise<ChatMessage | undefined> {
    const sanitizedUpdates = this.sanitizeDateFields({ ...updates });
    const [message] = await db.update(chatMessages)
      .set(sanitizedUpdates)
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
    const sanitizedSnapshot = this.sanitizeDateFields({ ...insertSnapshot });
    const [snapshot] = await db.insert(portfolioSnapshots).values(sanitizedSnapshot).returning();
    return snapshot;
  }

  async getPortfolioSnapshots(query: { portfolioId: string; limit?: number; sortBy?: string; sortOrder?: string }): Promise<PortfolioSnapshot[]> {
    const result = await db.select().from(portfolioSnapshots);
    
    let filtered = result.filter(s => s.portfolioId === query.portfolioId);
    
    return filtered
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, query.limit || 20);
  }

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
    const [pattern] = await db.insert(analysisPatterns).values(insertPattern).returning();
    return pattern;
  }

  async getAnalysisPatterns(query: { portfolioId?: string; patternType?: string[]; limit?: number }): Promise<AnalysisPattern[]> {
    const result = await db.select().from(analysisPatterns);
    
    let filtered = result;
    // Note: analysisPatterns table doesn't have portfolioId field - it's global patterns
    if (query.patternType) {
      filtered = filtered.filter(p => query.patternType!.includes(p.patternType));
    }
    
    return filtered
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, query.limit || 50);
  }

  async updateAnalysisPattern(id: string, updates: Partial<AnalysisPattern>): Promise<AnalysisPattern | undefined> {
    const sanitizedUpdates = this.sanitizeDateFields({ ...updates });
    const [pattern] = await db.update(analysisPatterns)
      .set(sanitizedUpdates)
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
    const [preference] = await db.insert(userPreferences).values(insertPreference).returning();
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
    // Add updatedAt timestamp and sanitize
    const updatesWithTimestamp = { ...updates, updatedAt: new Date() };
    const sanitizedUpdates = this.sanitizeDateFields(updatesWithTimestamp);
    
    const [preference] = await db.update(userPreferences)
      .set(sanitizedUpdates)
      .where(eq(userPreferences.id, id))
      .returning();
    return preference || undefined;
  }

  async deleteUserPreference(id: string): Promise<boolean> {
    const result = await db.delete(userPreferences).where(eq(userPreferences.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Helper method to sanitize Date fields for PostgreSQL
  private sanitizeDateFields(updates: Record<string, any>): Record<string, any> {
    const sanitized = { ...updates };
    
    // Common date fields that need conversion
    const dateFields = ['createdAt', 'updatedAt', 'startedAt', 'completedAt', 'lastMessageAt', 'lastObserved', 'identifiedAt'];
    
    for (const field of dateFields) {
      if (sanitized[field] !== undefined) {
        if (sanitized[field] instanceof Date) {
          // Keep Date objects as-is - Drizzle expects Date objects
          sanitized[field] = sanitized[field];
        } else if (sanitized[field] === null) {
          sanitized[field] = null;
        } else if (typeof sanitized[field] === 'string') {
          // Convert ISO string to Date object for Drizzle
          sanitized[field] = new Date(sanitized[field]);
        }
      }
    }
    
    return sanitized;
  }
}

export const storage = new CleanDatabaseStorage();