# ClaudePortfolioAnalyst Deployment Guide

## 🚀 Production Deployment

### Prerequisites
1. **Environment Variables**
   ```bash
   ANTHROPIC_API_KEY=sk-ant-api03-xxx  # Required for Chat functionality
   DATABASE_URL=postgresql://...        # Database connection
   NODE_ENV=production
   ```

2. **Database Migration**
   ```bash
   # Run database push to create new tables
   npm run db:push
   ```

### New Database Tables
The following tables will be automatically created:
- `knowledge_base` - Stores all analysis insights
- `chat_sessions` - Chat session management
- `chat_messages` - Chat message history
- `portfolio_snapshots` - Portfolio version history
- `analysis_patterns` - Learned analysis patterns
- `user_preferences` - User customization

### Deployment Steps

#### 1. Build Application
```bash
npm run build
```

#### 2. Start Production Server
```bash
npm start
```

#### 3. Verify Deployment
```bash
# Test basic functionality
curl http://localhost:5000/api/portfolios

# Test chat endpoint structure
curl http://localhost:5000/api/portfolios/test-id/chat/session -X POST
```

## 🔧 Configuration

### Chat Functionality
- Chat is **automatically enabled** for portfolios with `analysisStatus: "completed"`
- Floating chat button appears in bottom-right corner
- No additional configuration required

### Knowledge Base
- Automatically populates during portfolio analysis
- Stores insights with confidence scores
- Enables contextual chat responses

### Performance Settings
```typescript
// Recommended production settings
const CONFIG = {
  chatTimeout: 30000,      // 30 seconds for chat responses
  analysisTimeout: 300000, // 5 minutes for portfolio analysis
  maxChatHistory: 100,     // Limit chat history per session
  knowledgeRetention: 365  // Days to retain knowledge entries
};
```

## 📊 Monitoring

### Health Check Endpoint
```bash
curl http://localhost:5000/api/system/health
```

### Chat System Status
- Monitor chat session creation rate
- Track average response times
- Watch for ANTHROPIC_API_KEY issues

### Database Usage
- Monitor knowledge_base table growth
- Archive old snapshots periodically
- Watch for chat message volume

## 🔐 Security Considerations

### API Key Security
- Store ANTHROPIC_API_KEY securely
- Rotate keys regularly
- Monitor API usage

### Chat Input Validation
- All chat inputs are sanitized
- Intent detection prevents malicious requests
- Portfolio access is validated per session

## 🚨 Troubleshooting

### Common Issues

1. **Chat not working**
   ```bash
   # Check API key
   echo $ANTHROPIC_API_KEY
   
   # Verify portfolio analysis completed
   curl http://localhost:5000/api/portfolios/ID
   ```

2. **Database connection errors**
   ```bash
   # Verify database URL
   echo $DATABASE_URL
   
   # Test connection
   npm run db:push
   ```

3. **Knowledge base not populating**
   ```bash
   # Check portfolio analysis workflow
   # Look for "Knowledge base enriched" in logs
   ```

### Log Monitoring
Watch for these key log messages:
```bash
📚 Storing knowledge: portfolio_analysis
💬 Creating chat session for portfolio
🧠 Portfolio analysis completed with knowledge storage
```

## ✅ Post-Deployment Checklist

- [ ] Environment variables set
- [ ] Database migration completed
- [ ] Chat functionality tested
- [ ] Knowledge base populating
- [ ] All API endpoints responding
- [ ] Frontend chat component working
- [ ] Portfolio analysis workflow enhanced

## 📈 Success Metrics

Track these KPIs after deployment:
- Portfolio analysis completion rate
- Chat session engagement
- Knowledge base growth
- User satisfaction with natural language interface
- System response times

---

## 🎉 Deployment Complete!

Your ClaudePortfolioAnalyst system is now ready for production with:
- ✅ Centralized portfolio analysis control
- ✅ Persistent knowledge management
- ✅ Interactive chat functionality  
- ✅ Pattern recognition and learning
- ✅ Complete audit trail via snapshots

**Welcome to the future of intelligent portfolio management!** 🚀