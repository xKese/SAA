import { storage } from '../storage-temp';

/**
 * Portfolio Security Service
 * Implements Chinese Wall and strict data isolation between portfolios
 */
export class PortfolioSecurityService {
  private activePortfolioContexts: Map<string, Set<string>> = new Map(); // sessionId -> portfolioIds
  private sessionOwners: Map<string, string> = new Map(); // sessionId -> userId/clientId
  
  /**
   * Validate that a session has access to a specific portfolio
   * Implements Chinese Wall principle
   */
  async validateSessionAccess(sessionId: string, portfolioId: string): Promise<boolean> {
    try {
      // Get session from database
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        console.error(`🔒 Security: Session ${sessionId} not found`);
        return false;
      }

      // Check if session belongs to the correct portfolio
      if (session.portfolioId !== portfolioId) {
        console.error(`🔒 Security: Session ${sessionId} attempted to access portfolio ${portfolioId} but belongs to ${session.portfolioId}`);
        return false;
      }

      // Track active contexts for Chinese Wall enforcement
      if (!this.activePortfolioContexts.has(sessionId)) {
        this.activePortfolioContexts.set(sessionId, new Set());
      }
      
      const sessionPortfolios = this.activePortfolioContexts.get(sessionId)!;
      
      // Chinese Wall: Prevent accessing multiple portfolios in same session
      if (sessionPortfolios.size > 0 && !sessionPortfolios.has(portfolioId)) {
        console.error(`🔒 Security: Chinese Wall violation - Session ${sessionId} tried to access portfolio ${portfolioId} while having access to ${Array.from(sessionPortfolios).join(', ')}`);
        return false;
      }
      
      sessionPortfolios.add(portfolioId);
      
      console.log(`✅ Security: Session ${sessionId} validated for portfolio ${portfolioId}`);
      return true;
      
    } catch (error) {
      console.error('Error validating session access:', error);
      return false;
    }
  }

  /**
   * Get portfolio data with strict isolation
   * Ensures no data leakage between portfolios
   */
  async getIsolatedPortfolioData(sessionId: string, portfolioId: string): Promise<any> {
    // First validate access
    const hasAccess = await this.validateSessionAccess(sessionId, portfolioId);
    if (!hasAccess) {
      throw new Error('Unauthorized portfolio access attempt');
    }

    try {
      // Get portfolio data with explicit ID check
      const portfolio = await storage.getPortfolio(portfolioId);
      if (!portfolio || portfolio.id !== portfolioId) {
        throw new Error('Portfolio data integrity check failed');
      }

      // Get positions with explicit portfolio ID filter
      const positions = await storage.getPortfolioPositions(portfolioId);
      
      // Double-check all positions belong to this portfolio
      const validPositions = positions.filter(pos => {
        if (pos.portfolioId !== portfolioId) {
          console.error(`🔒 Security: Position ${pos.id} has wrong portfolioId ${pos.portfolioId}, expected ${portfolioId}`);
          return false;
        }
        return true;
      });

      // Get knowledge entries specific to this portfolio
      const knowledge = await storage.getKnowledgeEntries({
        portfolioId,
        limit: 50,
        sortBy: 'confidence',
        sortOrder: 'desc'
      });

      // Return isolated data
      return {
        portfolio: {
          id: portfolio.id,
          name: portfolio.name,
          totalValue: portfolio.totalValue,
          positionCount: portfolio.positionCount,
          analysisStatus: portfolio.analysisStatus,
          analysisResults: portfolio.analysisResults
        },
        positions: validPositions.map(pos => ({
          id: pos.id,
          portfolioId: pos.portfolioId,
          name: pos.name,
          isin: pos.isin,
          value: pos.value,
          percentage: pos.percentage,
          instrumentType: pos.instrumentType,
          sector: pos.sector,
          geography: pos.geography,
          currency: pos.currency
        })),
        knowledge: knowledge.map(k => ({
          content: k.content,
          confidence: k.confidence,
          analysisType: k.analysisType
        }))
      };
      
    } catch (error) {
      console.error(`Error getting isolated portfolio data for ${portfolioId}:`, error);
      throw new Error('Failed to retrieve portfolio data securely');
    }
  }

  /**
   * Clear session context when session ends
   * Ensures no residual access
   */
  clearSessionContext(sessionId: string): void {
    this.activePortfolioContexts.delete(sessionId);
    this.sessionOwners.delete(sessionId);
    console.log(`🔒 Security: Cleared context for session ${sessionId}`);
  }

  /**
   * Validate that chat history belongs to correct session and portfolio
   */
  async validateChatHistory(sessionId: string, messages: any[]): Promise<any[]> {
    try {
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return [];
      }

      // Filter messages to only those belonging to this session
      const validMessages = messages.filter(msg => {
        if (msg.sessionId !== sessionId) {
          console.error(`🔒 Security: Message ${msg.id} has wrong sessionId ${msg.sessionId}, expected ${sessionId}`);
          return false;
        }
        return true;
      });

      return validMessages;
    } catch (error) {
      console.error('Error validating chat history:', error);
      return [];
    }
  }

  /**
   * Sanitize portfolio data before sending to Claude
   * Removes any cross-portfolio references
   */
  sanitizePortfolioContext(portfolioData: any, portfolioId: string): any {
    // Create a deep copy to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(portfolioData));
    
    // Remove any references to other portfolios
    if (sanitized.portfolio && sanitized.portfolio.id !== portfolioId) {
      throw new Error('Portfolio ID mismatch in context');
    }
    
    // Remove sensitive system fields
    delete sanitized.portfolio?.createdAt;
    delete sanitized.portfolio?.updatedAt;
    delete sanitized.portfolio?.userId;
    
    // Ensure all positions belong to this portfolio
    if (sanitized.positions) {
      sanitized.positions = sanitized.positions.filter((pos: any) => 
        pos.portfolioId === portfolioId
      );
    }
    
    return sanitized;
  }

  /**
   * Audit log for security-relevant actions
   */
  async logSecurityEvent(eventType: string, sessionId: string, portfolioId: string, details?: any): Promise<void> {
    const event = {
      timestamp: new Date().toISOString(),
      eventType,
      sessionId,
      portfolioId,
      details
    };
    
    console.log(`🔒 Security Event: ${JSON.stringify(event)}`);
    
    // In production, this would write to a secure audit log
    // For now, we'll store in knowledge base
    try {
      await storage.createKnowledgeEntry({
        portfolioId,
        analysisType: 'security_audit',
        content: JSON.stringify(event),
        confidence: 1.0,
        source: 'security_service',
        data: event,  // Use 'data' field instead of 'metadata'
        metadata: {
          eventType,
          sessionId
        }
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
}

export const portfolioSecurity = new PortfolioSecurityService();