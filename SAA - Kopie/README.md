# SAA Portfolio Management System

**AI-Powered Strategic Asset Allocation Assistant**

A revolutionary portfolio management application that leverages dual Claude AI assistants to provide comprehensive portfolio analysis and optimization through natural conversation.

## 🌟 Key Features

### Conversational AI Interface
- **Portfolio Analyst**: Deep analysis of portfolio structure, risk metrics, and performance
- **Portfolio Optimizer**: Strategic and tactical asset allocation optimization
- **Dual Claude Instances**: Separate AI assistants with specialized knowledge domains
- **Natural Language Interaction**: No complex menus - just chat with expert AI assistants

### Core Capabilities
- **Portfolio Analysis**: Asset allocation, geographic diversification, currency exposure
- **Risk Metrics**: VaR, Sharpe ratio, maximum drawdown, diversification quotient
- **Fund Look-Through**: ETF and mutual fund decomposition analysis  
- **Optimization Strategies**: Mean-variance, Black-Litterman, risk parity
- **Real-Time Market Data**: Integration with Yahoo Finance and Alpha Vantage
- **German Financial Standards**: Compliant with German portfolio reporting requirements

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web Interface                            │
│                   (Conversational Chat UI)                     │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                    Flask Backend                                │
│              (WebSocket + REST API)                            │
└─────────┬─────────────────────────────────┬───────────────────┘
          │                                 │
┌─────────┴──────────┐              ┌──────┴────────────┐
│  Portfolio Analyst │              │ Portfolio Optimizer│
│   (Claude AI #1)   │              │   (Claude AI #2)   │
└─────────┬──────────┘              └──────┬────────────┘
          │                                │
┌─────────┴────────────────────────────────┴───────────────────────┐
│                    Data Layer                                   │
│          SQLAlchemy ORM + Market Data Service                   │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Claude API keys (2 separate keys for dual instances)
- Optional: Alpha Vantage API key for enhanced market data

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd SAA
```

2. **Set up virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your API keys and settings
```

5. **Run the application**
```bash
python run.py
```

6. **Access the application**
   - Open http://localhost:5000 in your browser
   - Start chatting with the AI assistants!

## 📁 Project Structure

```
SAA/
├── app/
│   ├── assistants/
│   │   ├── portfolio_analyst.py      # Claude AI analyst
│   │   └── portfolio_optimizer.py    # Claude AI optimizer
│   ├── models/
│   │   └── portfolio.py             # Database models
│   ├── services/
│   │   └── market_data.py           # Financial data integration
│   ├── templates/
│   │   └── index.html               # Web interface
│   └── app.py                       # Flask application
├── config/
│   └── settings.py                  # Configuration
├── tests/                          # Test suite
├── data/                          # Database and uploads
├── docs/                          # Documentation
├── requirements.txt               # Dependencies
├── run.py                        # Application launcher
└── README.md                     # This file
```

## 🔧 Configuration

### Environment Variables
```bash
# Claude AI API Keys (REQUIRED)
CLAUDE_API_KEY_ANALYST=your-analyst-key
CLAUDE_API_KEY_OPTIMIZER=your-optimizer-key

# Database
DATABASE_URL=sqlite:///data/portfolio.db

# Optional APIs
ALPHA_VANTAGE_API_KEY=your-av-key

# Security
SECRET_KEY=your-secret-key
DEBUG=False
```

### Database Setup
The application automatically creates SQLite tables on first run. For production:

```bash
# PostgreSQL example
DATABASE_URL=postgresql://user:pass@localhost/portfolio_db
```

## 💬 Using the AI Assistants

### Portfolio Analyst
Ask questions like:
- "Analyze my portfolio's risk profile"
- "What is my geographic diversification?"
- "Calculate my Sharpe ratio and VaR"
- "Show me the asset allocation breakdown"

### Portfolio Optimizer
Ask questions like:
- "Optimize my portfolio for 8% target return"
- "What's the optimal risk parity allocation?"
- "Generate an efficient frontier analysis"
- "Suggest tactical allocation adjustments"

## 🧪 Testing

Run the test suite:
```bash
# Install test dependencies
pip install pytest pytest-asyncio pytest-cov

# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_portfolio_models.py -v
```

## 📊 API Endpoints

### Portfolio Management
- `GET /api/portfolio` - List user portfolios
- `POST /api/portfolio` - Create new portfolio
- `GET /api/portfolio/<id>/holdings` - Get portfolio holdings
- `POST /api/portfolio/<id>/holdings` - Add holding

### Market Data
- `POST /api/market/search` - Search for assets
- `GET /api/market/price/<symbol>` - Get asset price
- `GET /api/market/indicators` - Get market indicators

### WebSocket Events
- `chat_message` - Send message to AI assistant
- `assistant_response` - Receive AI response
- `assistant_typing` - Typing indicator

## 🏭 Production Deployment

### Docker Deployment
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["python", "run.py"]
```

### Environment Setup
```bash
# Production settings
DEBUG=False
SECRET_KEY=complex-production-secret
DATABASE_URL=postgresql://user:pass@db/portfolio
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔐 Security Considerations

- **API Keys**: Store securely, never commit to version control
- **Database**: Use PostgreSQL with SSL in production
- **HTTPS**: Always use HTTPS in production
- **Input Validation**: All user inputs are validated via Pydantic models
- **Rate Limiting**: Implement rate limiting for API endpoints

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines
- Follow PEP 8 style guidelines
- Add tests for new features
- Update documentation
- Use type hints
- Maintain test coverage > 90%

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Q: "Claude API authentication failed"**  
A: Verify your API keys are correct in the `.env` file. Ensure you have separate keys for both assistants.

**Q: "Market data not loading"**  
A: Check your internet connection and ensure Yahoo Finance is accessible. For enhanced data, verify your Alpha Vantage API key.

**Q: "Portfolio analysis taking too long"**  
A: Large portfolios (>50 holdings) may take longer to analyze. Consider breaking them into smaller sub-portfolios.

### Getting Help
- 📧 Email: support@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-repo/discussions)

## 🔮 Roadmap

### Version 2.0
- [ ] Mobile app integration
- [ ] Advanced backtesting engine
- [ ] Multi-language support
- [ ] ESG scoring integration
- [ ] Institutional client features

### Version 2.1
- [ ] Machine learning predictions
- [ ] Alternative data sources
- [ ] Advanced visualization dashboard
- [ ] API for third-party integrations

---

**Built with ❤️ using Claude AI, Flask, and modern web technologies**