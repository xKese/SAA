/*
 * =============================================================================
 * ⚠️  DEPRECATED SERVICE - USE UNIFIED claudeService INSTEAD
 * =============================================================================
 * 
 * This service has been DEPRECATED and migrated to the unified architecture.
 * All functionality from this service has been moved to:
 * 
 *   server/services/claude.ts (ClaudePortfolioAnalysisService)
 * 
 * The unified service provides:
 * - Single Claude AI instance for all chat and analysis functions
 * - Better integration between chat and portfolio analysis
 * - Consistent security handling
 * - Enhanced German language support
 * - Streamlined intent detection and response generation
 * 
 * Migration Status: COMPLETED ✅
 * All routes now use: claudeService.processMessage() etc.
 * 
 * This file will be removed in a future release.
 * =============================================================================
 */

import Anthropic from '@anthropic-ai/sdk';
import { ClaudePortfolioAnalyst } from './portfolio-analyst';
import { 
  ChatSession, 
  ChatMessage, 
  PortfolioChangeRequest, 
  ChangeImpactAnalysis 
} from '../../shared/schema';
import { storage } from '../storage-temp';
import { portfolioSecurity } from './portfolio-security';

export interface ChatIntent {
  type: 'question' | 'change_request' | 'analysis_request' | 'general';
  confidence: number;
  extractedData?: any;
}

export interface ChatContext {
  portfolioId: string;
  sessionId: string;
  previousMessages: ChatMessage[];
  portfolioKnowledge: string[];
  currentPortfolio?: any;
}

/**
 * @deprecated Use claudeService from server/services/claude.ts instead
 * This class has been migrated to the unified ClaudePortfolioAnalysisService
 */
export class PortfolioChat {
  private anthropic: Anthropic;
  private portfolioAnalyst: ClaudePortfolioAnalyst;

  constructor() {
    console.warn('⚠️ DEPRECATED: PortfolioChat has been replaced by unified claudeService');
    console.warn('   Please use: claudeService.processMessage(), claudeService.createChatSession(), etc.');
    
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.portfolioAnalyst = new ClaudePortfolioAnalyst();
  }

  /**
   * Process a user message and generate a response
   */
  async processMessage(message: string, context: ChatContext): Promise<{
    response: string;
    intent: ChatIntent;
    actions?: any[];
    analysisData?: any;
  }> {
    console.log(`💬 Processing message for portfolio ${context.portfolioId}:`, message.substring(0, 100));

    try {
      // Security: Validate session access to portfolio
      const hasAccess = await portfolioSecurity.validateSessionAccess(context.sessionId, context.portfolioId);
      if (!hasAccess) {
        await portfolioSecurity.logSecurityEvent('access_denied', context.sessionId, context.portfolioId, { reason: 'Invalid session access' });
        throw new Error('Zugriff verweigert: Ungültige Session oder Portfolio-Zuordnung');
      }
      
      // Detect intent
      const intent = await this.detectIntent(message, context);
      
      // Get portfolio context with security isolation
      const portfolioData = await portfolioSecurity.getIsolatedPortfolioData(context.sessionId, context.portfolioId);
      
      let response: string;
      let analysisData: any = null;
      let actions: any[] = [];

      switch (intent.type) {
        case 'question':
          response = await this.answerPortfolioQuestion(message, context, portfolioData);
          break;
          
        case 'change_request':
          const changeResult = await this.processChangeRequest(message, context, portfolioData, intent.extractedData);
          response = changeResult.response;
          analysisData = changeResult.analysisData;
          actions = changeResult.actions;
          break;
          
        case 'analysis_request':
          const analysisResult = await this.performAnalysisRequest(message, context, portfolioData);
          response = analysisResult.response;
          analysisData = analysisResult.analysisData;
          break;
          
        default:
          // WICHTIG: Auch bei 'general' Intent müssen Portfolio-Daten verfügbar sein
          // Fallback zu answerPortfolioQuestion für bessere Antworten
          response = await this.answerPortfolioQuestion(message, context, portfolioData);
      }

      // Store the message and response
      await this.portfolioAnalyst.addChatMessage(context.sessionId, 'user', message);
      await this.portfolioAnalyst.addChatMessage(context.sessionId, 'assistant', response, {
        intent,
        analysisData,
        actions
      });

      return {
        response,
        intent,
        actions: actions.length > 0 ? actions : undefined,
        analysisData
      };

    } catch (error) {
      console.error('Error processing chat message:', error);
      const errorResponse = 'Entschuldigung, es ist ein Fehler bei der Verarbeitung Ihrer Nachricht aufgetreten. Bitte versuchen Sie es erneut.';
      
      await this.portfolioAnalyst.addChatMessage(context.sessionId, 'assistant', errorResponse, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        response: errorResponse,
        intent: { type: 'general', confidence: 0 }
      };
    }
  }

  /**
   * Detect the intent of the user message
   */
  private async detectIntent(message: string, context: ChatContext): Promise<ChatIntent> {
    const prompt = `
Analysiere diese Nachricht eines Nutzers bezüglich seines Portfolios und klassifiziere die Absicht:

Nachricht: "${message}"

Kontext: Portfolio-Chat mit vorherigen Nachrichten

Klassifiziere als:
1. "question" - Fragen über das Portfolio (Allokation, Risiko, Performance, etc.)
2. "change_request" - Wunsch nach Portfolio-Änderungen (Kauf/Verkauf, Umschichtung)
3. "analysis_request" - Bitte um spezifische Analysen oder Vergleiche
4. "general" - Allgemeine Unterhaltung oder unklar

WICHTIG: Im Zweifel immer "question" wählen, damit Portfolio-Daten verfügbar sind!

Bei change_request, extrahiere:
- Instrumente/Positionen die geändert werden sollen
- Beträge oder Prozente
- Art der Änderung (kaufen, verkaufen, umschichten)

Antworte NUR mit einem validen JSON-Objekt, keine anderen Texte oder Erklärungen:
{
  "type": "question",
  "confidence": 0.8,
  "extractedData": null
}
`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const responseText = response.content[0]?.type === 'text' ? response.content[0].text : '';
      
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.warn('Could not parse intent JSON:', parseError);
          return { type: 'general', confidence: 0 };
        }
      }
      
      return { type: 'general', confidence: 0 };
    } catch (error) {
      console.error('Error detecting intent:', error);
      // Bei Fehler default zu 'question' damit Portfolio-Daten verfügbar sind
      return { type: 'question', confidence: 0.5 };
    }
  }

  /**
   * Answer questions about the portfolio
   */
  private async answerPortfolioQuestion(message: string, context: ChatContext, portfolioData: any): Promise<string> {
    // Sanitize portfolio data before sending to Claude
    const sanitizedData = portfolioSecurity.sanitizePortfolioContext(portfolioData, context.portfolioId);
    
    // Erweiterte Chat-Historie mit Metadaten
    const recentHistory = context.previousMessages.slice(-10).map(m => {
      let messageText = `${m.sender}: ${m.content}`;
      
      // Füge wichtige Metadaten hinzu
      if (m.metadata) {
        if (m.metadata.intent) {
          messageText += ` [Intent: ${m.metadata.intent.type}]`;
        }
        if (m.metadata.actions && m.metadata.actions.length > 0) {
          const actionTypes = m.metadata.actions.map((a: any) => a.type).join(', ');
          messageText += ` [Vorgeschlagene Aktionen: ${actionTypes}]`;
        }
        if (m.metadata.analysisData) {
          messageText += ` [Analyse-Daten verfügbar]`;
        }
      }
      
      return messageText;
    }).join('\n');

    // Extrahiere wichtige Kontext-Informationen aus der Chat-Historie
    const contextualInfo = this.extractContextualInfo(context.previousMessages);

    const prompt = `
Du bist ein KI-Portfolio-Berater. Beantworte diese Frage über das Portfolio des Nutzers:

Frage: "${message}"

Portfolio-Informationen:
${JSON.stringify(sanitizedData, null, 2)}

Portfolio-Erkenntnisse aus der Wissensdatenbank:
${context.portfolioKnowledge.join('\n- ')}

Bisheriger Gesprächsverlauf (letzte 10 Nachrichten):
${recentHistory}

Wichtige Kontext-Informationen aus vorherigen Diskussionen:
${contextualInfo}

WICHTIG: Beziehe dich auf den bisherigen Gesprächsverlauf und vorherige Diskussionen über Portfolio-Änderungen, Empfehlungen oder Analysen. Wenn der Nutzer auf etwas Vorheriges Bezug nimmt, erkenne und verwende diese Informationen.

Beantworte die Frage präzise und hilfreich auf Deutsch. Verwende konkrete Zahlen und Prozente wo möglich.
Gib praktische Einschätzungen und Empfehlungen.
`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    return response.content[0]?.type === 'text' ? response.content[0].text : 'Entschuldigung, ich konnte Ihre Frage nicht beantworten.';
  }

  /**
   * Process portfolio change requests
   */
  private async processChangeRequest(message: string, context: ChatContext, portfolioData: any, extractedData: any): Promise<{
    response: string;
    analysisData: any;
    actions: any[];
  }> {
    console.log('Processing change request:', extractedData);

    // Convert extracted data to PortfolioChangeRequest
    const changeRequest = this.createChangeRequest(extractedData, context.portfolioId);
    
    // Perform impact analysis
    let analysisData = null;
    let actions = [];
    
    if (changeRequest) {
      try {
        analysisData = await this.portfolioAnalyst.analyzePortfolioImpact(context.portfolioId, changeRequest);
        actions.push({
          type: 'apply_changes',
          label: 'Änderungen anwenden',
          changeRequest
        });
      } catch (error) {
        console.error('Error in impact analysis:', error);
      }
    }

    // Erweiterte Chat-Historie mit Kontext
    const recentHistory = context.previousMessages.slice(-8).map(m => {
      let messageText = `${m.sender}: ${m.content.substring(0, 200)}${m.content.length > 200 ? '...' : ''}`;
      if (m.metadata && m.metadata.intent) {
        messageText += ` [${m.metadata.intent.type}]`;
      }
      return messageText;
    }).join('\n');
    
    const contextualInfo = this.extractContextualInfo(context.previousMessages);

    // Generate response with analysis
    const prompt = `
Du bist ein KI-Portfolio-Berater. Ein Nutzer möchte Änderungen an seinem Portfolio vornehmen:

Anfrage: "${message}"

Extrahierte Änderungen: ${JSON.stringify(extractedData, null, 2)}

Aktuelles Portfolio:
${JSON.stringify(portfolioData, null, 2)}

Auswirkungsanalyse:
${analysisData ? JSON.stringify(analysisData, null, 2) : 'Nicht verfügbar'}

Bisheriger Gesprächsverlauf:
${recentHistory}

Kontext aus vorherigen Diskussionen:
${contextualInfo}

Erstelle eine hilfreiche Antwort die:
1. Die vorgeschlagenen Änderungen zusammenfasst
2. Die erwarteten Auswirkungen auf das Portfolio erklärt
3. Risiken und Chancen aufzeigt
4. Empfehlungen gibt
5. Bezug zu vorherigen Diskussionen nimmt, falls relevant

Schreibe auf Deutsch und sei präzise und verständlich.
`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = response.content[0]?.type === 'text' ? response.content[0].text : 'Ich konnte die Änderungsanfrage nicht verarbeiten.';

    return {
      response: responseText,
      analysisData,
      actions
    };
  }

  /**
   * Perform specific analysis requests
   */
  private async performAnalysisRequest(message: string, context: ChatContext, portfolioData: any): Promise<{
    response: string;
    analysisData: any;
  }> {
    // Erweiterte Chat-Historie mit Kontext
    const recentHistory = context.previousMessages.slice(-8).map(m => {
      let messageText = `${m.sender}: ${m.content.substring(0, 150)}${m.content.length > 150 ? '...' : ''}`;
      if (m.metadata && m.metadata.intent) {
        messageText += ` [${m.metadata.intent.type}]`;
      }
      return messageText;
    }).join('\n');
    
    const contextualInfo = this.extractContextualInfo(context.previousMessages);
    
    // This could trigger specific analyses like risk assessment, sector analysis, etc.
    const prompt = `
Du bist ein KI-Portfolio-Berater. Führe die gewünschte Analyse durch:

Anfrage: "${message}"

Portfolio-Daten:
${JSON.stringify(portfolioData, null, 2)}

Portfolio-Erkenntnisse:
${context.portfolioKnowledge.join('\n- ')}

Bisheriger Gesprächsverlauf:
${recentHistory}

Kontext aus vorherigen Diskussionen:
${contextualInfo}

WICHTIG: Beziehe dich auf vorherige Analysen, Empfehlungen oder Diskussionen, falls diese für die aktuelle Anfrage relevant sind.

Erstelle eine detaillierte Analyse basierend auf der Anfrage. Verwende konkrete Zahlen und gib 
praktische Einschätzungen und Empfehlungen.
`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = response.content[0]?.type === 'text' ? response.content[0].text : 'Ich konnte die Analyse nicht durchführen.';

    return {
      response: responseText,
      analysisData: portfolioData // Could be enhanced with specific analysis results
    };
  }

  /**
   * Generate general responses (DEPRECATED - use answerPortfolioQuestion instead)
   */
  private async generateGeneralResponse(message: string, context: ChatContext): Promise<string> {
    console.warn('⚠️ Using deprecated generateGeneralResponse - Portfolio data not available!');
    const prompt = `
Du bist ein freundlicher KI-Portfolio-Berater. Antworte höflich auf diese Nachricht:

Nachricht: "${message}"

Kontext: Portfolio-Beratung für Nutzer

Antworte hilfreich und leite das Gespräch zurück zu Portfolio-Themen wenn möglich.
Schreibe auf Deutsch.
`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    return response.content[0]?.type === 'text' ? response.content[0].text : 'Wie kann ich Ihnen bei Ihrem Portfolio helfen?';
  }

  /**
   * Get portfolio context for chat (deprecated - use portfolioSecurity.getIsolatedPortfolioData)
   */
  private async getPortfolioContext(portfolioId: string): Promise<any> {
    console.warn('⚠️ Using deprecated getPortfolioContext - should use portfolioSecurity.getIsolatedPortfolioData');
    try {
      const portfolio = await storage.getPortfolio(portfolioId);
      const positions = await storage.getPortfolioPositions(portfolioId);
      
      return {
        portfolio,
        positions,
        positionCount: positions.length,
        totalValue: portfolio?.totalValue,
        analysisStatus: portfolio?.analysisStatus,
        analysisResults: portfolio?.analysisResults
      };
    } catch (error) {
      console.error('Error getting portfolio context:', error);
      return null;
    }
  }

  /**
   * Create a PortfolioChangeRequest from extracted data
   */
  private createChangeRequest(extractedData: any, portfolioId: string): PortfolioChangeRequest | null {
    if (!extractedData || !extractedData.instruments) {
      return null;
    }

    try {
      return {
        changeType: extractedData.changeType || 'rebalance',
        changes: extractedData.instruments.map((instrument: any) => ({
          instrumentName: instrument.name,
          isin: instrument.isin,
          currentValue: instrument.currentValue || 0,
          newValue: instrument.newValue || instrument.targetValue || 0,
          changeAmount: instrument.changeAmount || 0,
          instrumentType: instrument.type || 'Aktien'
        })),
        scenarioName: extractedData.scenarioName || `Chat-Änderung ${new Date().toLocaleString('de-DE')}`,
        analysisDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating change request:', error);
      return null;
    }
  }

  /**
   * Apply changes to portfolio (if requested by user)
   */
  async applyChanges(portfolioId: string, changeRequest: PortfolioChangeRequest): Promise<ChangeImpactAnalysis> {
    console.log(`🔄 Applying changes to portfolio ${portfolioId}`);
    
    try {
      const analysis = await this.portfolioAnalyst.analyzePortfolioImpact(portfolioId, changeRequest);
      
      // Create a snapshot of the change
      const positions = await storage.getPortfolioPositions(portfolioId);
      await this.portfolioAnalyst.createPortfolioSnapshot(
        portfolioId, 
        'analysis_result', 
        positions, 
        analysis
      );

      return analysis;
    } catch (error) {
      console.error('Error applying changes:', error);
      throw error;
    }
  }

  /**
   * Initialize chat session
   */
  async initializeChatSession(portfolioId: string, userId?: string): Promise<ChatSession> {
    return await this.portfolioAnalyst.createChatSession(portfolioId, userId);
  }

  /**
   * Extract contextual information from chat history
   */
  private extractContextualInfo(messages: ChatMessage[]): string {
    const contextInfo: string[] = [];
    
    messages.forEach(msg => {
      if (msg.metadata) {
        // Extrahiere vorgeschlagene Änderungen
        if (msg.metadata.actions) {
          msg.metadata.actions.forEach((action: any) => {
            if (action.type === 'apply_changes' && action.changeRequest) {
              contextInfo.push(`Vorgeschlagene Änderung: ${action.label}`);
              if (action.changeRequest.changes) {
                action.changeRequest.changes.forEach((change: any) => {
                  contextInfo.push(`- ${change.instrumentName}: ${change.changeAmount > 0 ? 'Erhöhung' : 'Verringerung'} um €${Math.abs(change.changeAmount)}`);
                });
              }
            }
          });
        }
        
        // Extrahiere wichtige Empfehlungen aus Assistant-Nachrichten
        if (msg.sender === 'assistant' && msg.content) {
          const recommendations = this.extractRecommendations(msg.content);
          contextInfo.push(...recommendations);
        }
        
        // Extrahiere Analyse-Ergebnisse
        if (msg.metadata.analysisData && msg.metadata.analysisData.comparison) {
          contextInfo.push('Vorher-Nachher-Vergleich wurde erstellt');
        }
      }
    });
    
    return contextInfo.length > 0 ? contextInfo.join('\n- ') : 'Keine spezifischen Kontext-Informationen aus vorherigen Diskussionen.';
  }
  
  /**
   * Extract key recommendations from assistant messages
   */
  private extractRecommendations(content: string): string[] {
    const recommendations: string[] = [];
    
    // Suche nach strukturierten Empfehlungen
    const lines = content.split('\n');
    let inRecommendationSection = false;
    
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      
      // Erkenne Empfehlungssektionen
      if (lowerLine.includes('empfehlung') || lowerLine.includes('vorschlag') || lowerLine.includes('maßnahme')) {
        inRecommendationSection = true;
      }
      
      // Extrahiere konkrete Empfehlungen
      if (inRecommendationSection && line.trim().startsWith('-')) {
        recommendations.push(`Empfehlung: ${line.trim().substring(1).trim()}`);
      }
      
      // Extrahiere spezifische Zahlen und Prozente
      const percentageMatch = line.match(/(\d+(?:,\d+)?%)/g);
      const euroMatch = line.match(/(€[\d,.]+)/g);
      
      if (percentageMatch || euroMatch) {
        const context = line.trim().substring(0, 100);
        if (context.length > 10) {
          recommendations.push(`Kontext: ${context}`);
        }
      }
    });
    
    return recommendations.slice(0, 5); // Limite auf die wichtigsten 5
  }

  /**
   * Get chat history
   */
  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    const messages = await this.portfolioAnalyst.getChatHistory(sessionId);
    // Validate that all messages belong to this session
    return await portfolioSecurity.validateChatHistory(sessionId, messages);
  }
}