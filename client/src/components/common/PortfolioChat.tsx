import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  TrendingUp, 
  BarChart3,
  AlertTriangle,
  CheckCircle,
  X,
  ChevronDown,
  Eye
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: {
      type: string;
      confidence: number;
    };
    analysisData?: any;
    actions?: Array<{
      type: string;
      label: string;
      changeRequest?: any;
    }>;
  };
}

interface ChatSession {
  id: string;
  portfolioId: string;
  sessionName: string;
  createdAt: Date;
  lastMessageAt: Date;
}

interface PortfolioChatProps {
  portfolioId: string;
  isOpen: boolean;
  onClose: () => void;
  onShowComparison?: (changeRequest: any) => void;
}

export default function PortfolioChat({ portfolioId, isOpen, onClose, onShowComparison }: PortfolioChatProps) {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [pendingChangeRequest, setPendingChangeRequest] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    // Leichte Verzögerung um sicherzustellen, dass das DOM aktualisiert ist
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: "smooth",
        block: "end",
        inline: "nearest"
      });
    }, 100);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Create or get chat session
  const createSession = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/portfolios/${portfolioId}/chat/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionName: `Chat ${new Date().toLocaleString('de-DE')}` })
      });
      
      if (!response.ok) throw new Error('Failed to create chat session');
      const data = await response.json();
      return data.data;
    },
    onSuccess: (session: ChatSession) => {
      setCurrentSessionId(session.id);
      // Load chat history
      loadChatHistory(session.id);
    }
  });

  // Send message
  const sendMessage = useMutation({
    mutationFn: async (messageText: string) => {
      if (!currentSessionId) throw new Error('No active session');
      
      const response = await fetch(`/api/chat/${currentSessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText })
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      const data = await response.json();
      return data.data;
    },
    onSuccess: (response) => {
      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        content: message,
        timestamp: new Date()
      };

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        content: response.response,
        timestamp: new Date(),
        metadata: {
          intent: response.intent,
          analysisData: response.analysisData,
          actions: response.actions
        }
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
      setMessage("");
      // Sofort scrollen nach neuer Nachricht
      setTimeout(() => scrollToBottom(), 200);
    }
  });

  // Apply changes
  const applyChanges = useMutation({
    mutationFn: async (changeRequest: any) => {
      if (!currentSessionId) throw new Error('No active session');
      
      const response = await fetch(`/api/chat/${currentSessionId}/apply-changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeRequest })
      });
      
      if (!response.ok) throw new Error('Failed to apply changes');
      const data = await response.json();
      return data.data;
    },
    onSuccess: () => {
      // Reload chat history to get confirmation message
      if (currentSessionId) {
        loadChatHistory(currentSessionId);
      }
    }
  });

  const loadChatHistory = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/${sessionId}/history`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    if (!currentSessionId) {
      createSession.mutate();
      return;
    }
    sendMessage.mutate(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.sender === 'user';
    
    return (
      <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 chat-message-container`}>
        <div className={`flex items-start space-x-2 max-w-[85%] min-w-0 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-ms-green text-white' : 'bg-gray-100 text-gray-600'
          }`}>
            {isUser ? <User size={16} /> : <Bot size={16} />}
          </div>
          
          <div className={`rounded-lg px-4 py-2 min-w-0 flex-1 ${
            isUser 
              ? 'bg-ms-green text-white' 
              : 'bg-gray-50 text-gray-900 border'
          }`}>
            <div className="whitespace-pre-wrap break-words overflow-hidden" style={{ wordWrap: 'break-word', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{msg.content}</div>
            
            {/* Intent badge */}
            {msg.metadata?.intent && !isUser && (
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  {getIntentLabel(msg.metadata.intent.type)}
                </Badge>
              </div>
            )}
            
            {/* Actions */}
            {msg.metadata?.actions && msg.metadata.actions.length > 0 && (
              <div className="mt-3 space-y-2">
                {msg.metadata.actions.map((action, index) => (
                  <div key={index} className="flex space-x-2">
                    {/* Preview Button */}
                    {action.type === 'apply_changes' && action.changeRequest && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onShowComparison?.(action.changeRequest);
                        }}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Vorschau
                      </Button>
                    )}
                    
                    {/* Apply Changes Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="mr-2"
                      onClick={() => {
                        if (action.type === 'apply_changes' && action.changeRequest) {
                          setPendingChangeRequest(action.changeRequest);
                          setShowConfirmDialog(true);
                        }
                      }}
                      disabled={applyChanges.isPending}
                    >
                      {action.type === 'apply_changes' && applyChanges.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      )}
                      {action.label}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Analysis data preview */}
            {msg.metadata?.analysisData && (
              <div className="mt-3 p-2 bg-white/10 rounded text-xs">
                <div className="flex items-center space-x-1 mb-1">
                  <BarChart3 className="w-3 h-3" />
                  <span>Analyse-Daten verfügbar</span>
                </div>
                {msg.metadata.analysisData.comparison && (
                  <div className="text-gray-600">
                    Vorher-Nachher-Vergleich berechnet
                  </div>
                )}
              </div>
            )}
            
            <div className="text-xs opacity-70 mt-1">
              {msg.timestamp.toLocaleTimeString('de-DE')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getIntentLabel = (type: string) => {
    switch (type) {
      case 'question': return 'Frage';
      case 'change_request': return 'Änderungsanfrage';
      case 'analysis_request': return 'Analyse-Anfrage';
      default: return 'Allgemein';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl h-5/6 flex flex-col max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5 text-ms-green" />
              <CardTitle>Portfolio-Chat</CardTitle>
              {currentSessionId && (
                <Badge variant="outline" className="text-xs">
                  Session aktiv
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {!currentSessionId && (
            <div className="text-sm text-gray-600">
              Stellen Sie Fragen zu Ihrem Portfolio oder schlagen Sie Änderungen vor
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <div 
            ref={scrollContainerRef}
            className="flex-1 p-4 max-h-[60vh] overflow-y-auto scroll-smooth relative scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent hover:scrollbar-thumb-gray-500" 
            id="chat-messages-container"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
            }}
            onScroll={handleScroll}
          >
            {messages.length === 0 && !currentSessionId ? (
              <div className="text-center text-gray-500 mt-8">
                <Bot className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">Willkommen beim Portfolio-Chat</h3>
                <p className="text-sm mb-6">
                  Ich bin Ihr KI-Portfolio-Berater. Fragen Sie mich alles über Ihr Portfolio:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left max-w-2xl mx-auto">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <BarChart3 className="w-4 h-4 text-ms-green" />
                      <span className="font-medium text-sm">Portfolio-Fragen</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      "Wie ist mein Portfolio aufgeteilt?" <br />
                      "Welche Risiken bestehen?"
                    </p>
                  </div>
                  
                </div>
              </div>
            ) : (
              messages.map(renderMessage)
            )}
            
            {(sendMessage.isPending || createSession.isPending) && (
              <div className="flex justify-start mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-gray-50 rounded-lg px-4 py-2 border">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-gray-600">Analysiere Ihre Anfrage...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
            
            {/* Scroll to bottom button */}
            {showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-4 right-4 bg-ms-green text-white p-2 rounded-full shadow-lg hover:bg-ms-green/90 transition-all duration-200 z-10"
                aria-label="Zum Ende scrollen"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Input area */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={currentSessionId 
                  ? "Stellen Sie eine Frage oder schlagen Sie Änderungen vor..." 
                  : "Chat starten - Fragen Sie mich alles über Ihr Portfolio..."
                }
                className="flex-1"
                disabled={sendMessage.isPending || createSession.isPending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || sendMessage.isPending || createSession.isPending}
                className="bg-ms-green hover:bg-ms-green/90"
              >
                {sendMessage.isPending || createSession.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            {currentSessionId && (
              <div className="text-xs text-gray-500 mt-2 flex items-center space-x-4">
                <span>💡 Tipp: Drücken Sie Enter zum Senden</span>
                <span>🤖 KI-Portfolio-Berater aktiv</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <span>Portfolio-Änderungen bestätigen</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              Möchten Sie die vorgeschlagenen Änderungen am Portfolio wirklich durchführen?
            </p>
            
            {pendingChangeRequest && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Geplante Änderungen:</h4>
                <div className="text-sm text-gray-700">
                  <p><strong>Typ:</strong> {pendingChangeRequest.changeType || 'Änderung'}</p>
                  <p><strong>Anzahl Positionen:</strong> {pendingChangeRequest.changes?.length || 0}</p>
                  {pendingChangeRequest.totalValue && (
                    <p><strong>Gesamtwert:</strong> €{pendingChangeRequest.totalValue.toLocaleString('de-DE')}</p>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-start space-x-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Wichtiger Hinweis:</strong> Diese Änderungen werden direkt in Ihrem Portfolio umgesetzt und können nicht automatisch rückgängig gemacht werden.
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setPendingChangeRequest(null);
              }}
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                if (pendingChangeRequest) {
                  applyChanges.mutate(pendingChangeRequest);
                  setShowConfirmDialog(false);
                  setPendingChangeRequest(null);
                }
              }}
              disabled={applyChanges.isPending}
              className="bg-ms-green hover:bg-ms-green/90"
            >
              {applyChanges.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wird angewendet...
                </>
              ) : (
                'Änderungen durchführen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}