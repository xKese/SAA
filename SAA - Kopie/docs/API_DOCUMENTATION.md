# API Documentation

Complete API reference for the SAA Portfolio Management System.

## Table of Contents
- [Authentication](#authentication)
- [Portfolio Management](#portfolio-management)
- [Market Data](#market-data)
- [WebSocket API](#websocket-api)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## Base URL

```
http://localhost:5000  (Development)
https://your-domain.com  (Production)
```

## Authentication

The application uses session-based authentication. Sessions are automatically created when users first connect.

### Session Management

```javascript
// Sessions are automatically managed by the browser
// No explicit authentication required for basic usage
```

## Portfolio Management

### Get User Portfolios

Retrieve all portfolios for the current user.

```http
GET /api/portfolio
```

**Response:**
```json
{
  "portfolios": [
    {
      "id": "uuid-string",
      "name": "My Portfolio",
      "total_value": 100000.0,
      "currency": "EUR",
      "holdings_count": 15,
      "created_at": "2024-01-15T10:30:00Z",
      "risk_tolerance": "moderate",
      "investment_horizon": 5
    }
  ]
}
```

### Create Portfolio

Create a new portfolio for the current user.

```http
POST /api/portfolio
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Growth Portfolio",
  "description": "Long-term growth focused portfolio",
  "currency": "EUR",
  "risk_tolerance": "aggressive",
  "investment_horizon": 10
}
```

**Response:**
```json
{
  "portfolio_id": "uuid-string",
  "message": "Portfolio created successfully"
}
```

### Get Portfolio Holdings

Retrieve all holdings for a specific portfolio.

```http
GET /api/portfolio/{portfolio_id}/holdings
```

**Response:**
```json
{
  "holdings": [
    {
      "id": 1,
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "quantity": 100.0,
      "current_value": 18000.0,
      "asset_type": "stock",
      "sector": "Technology",
      "region": "USA",
      "currency": "USD"
    }
  ]
}
```

### Add Portfolio Holding

Add a new holding to a portfolio.

```http
POST /api/portfolio/{portfolio_id}/holdings
Content-Type: application/json
```

**Request Body:**
```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "quantity": 100.0,
  "average_cost": 150.00,
  "asset_type": "stock",
  "isin": "US0378331005"
}
```

**Response:**
```json
{
  "message": "Holding added successfully",
  "holding_id": 1
}
```

### Update Portfolio Holding

Update an existing holding.

```http
PUT /api/portfolio/{portfolio_id}/holdings/{holding_id}
Content-Type: application/json
```

**Request Body:**
```json
{
  "quantity": 120.0,
  "current_price": 180.00
}
```

### Delete Portfolio Holding

Remove a holding from the portfolio.

```http
DELETE /api/portfolio/{portfolio_id}/holdings/{holding_id}
```

**Response:**
```json
{
  "message": "Holding deleted successfully"
}
```

## Market Data

### Search Assets

Search for financial assets by symbol or name.

```http
POST /api/market/search
Content-Type: application/json
```

**Request Body:**
```json
{
  "query": "apple",
  "asset_type": "stock"
}
```

**Response:**
```json
{
  "results": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "type": "EQUITY",
      "exchange": "NASDAQ"
    }
  ]
}
```

### Get Asset Price

Get current price and data for a specific asset.

```http
GET /api/market/price/{symbol}
```

**Response:**
```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "current_price": 180.50,
  "previous_close": 178.25,
  "change": 2.25,
  "change_percent": 1.26,
  "volume": 45678900,
  "market_cap": 2847563000000,
  "pe_ratio": 28.45,
  "sector": "Technology",
  "currency": "USD",
  "timestamp": "2024-01-15T15:30:00Z"
}
```

### Get Market Indicators

Retrieve major market indices and indicators.

```http
GET /api/market/indicators
```

**Response:**
```json
{
  "indices": {
    "^GSPC": {
      "value": 4350.50,
      "change": 30.25,
      "change_percent": 0.70
    },
    "^DJI": {
      "value": 34750.80,
      "change": 150.70,
      "change_percent": 0.44
    }
  },
  "timestamp": "2024-01-15T15:30:00Z"
}
```

### Get Historical Data

Retrieve historical price data for an asset.

```http
GET /api/market/history/{symbol}?period=1y&interval=1d
```

**Query Parameters:**
- `period`: Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
- `interval`: Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)

**Response:**
```json
{
  "symbol": "AAPL",
  "data": [
    {
      "date": "2024-01-15",
      "open": 179.50,
      "high": 181.20,
      "low": 178.80,
      "close": 180.50,
      "volume": 45678900
    }
  ]
}
```

## WebSocket API

The application uses WebSocket connections for real-time chat with AI assistants.

### Connection

```javascript
const socket = io();

socket.on('connect', function() {
    console.log('Connected to server');
});

socket.on('disconnect', function() {
    console.log('Disconnected from server');
});
```

### Chat with AI Assistant

Send a message to an AI assistant.

```javascript
socket.emit('chat_message', {
    assistant: 'analyst',  // or 'optimizer'
    message: 'Analyze my portfolio risk',
    portfolio_id: 'uuid-string'
});
```

### Receive Assistant Response

```javascript
socket.on('assistant_response', function(data) {
    console.log('Assistant:', data.assistant);
    console.log('Response:', data.response);
    console.log('Timestamp:', data.timestamp);
});
```

### Assistant Typing Indicator

```javascript
socket.on('assistant_typing', function(data) {
    // Show typing indicator for specified assistant
    showTypingIndicator(data.assistant);
});
```

### Error Handling

```javascript
socket.on('error', function(data) {
    console.error('Error:', data.message);
    hideTypingIndicator();
});
```

## Conversation History

### Get Conversation History

Retrieve chat history for the current user.

```http
GET /api/conversation/history
```

**Response:**
```json
{
  "history": [
    {
      "assistant": "analyst",
      "messages": [
        {
          "role": "user",
          "content": "Analyze my portfolio",
          "timestamp": "2024-01-15T10:30:00Z"
        },
        {
          "role": "assistant",
          "content": "Your portfolio shows...",
          "timestamp": "2024-01-15T10:30:15Z"
        }
      ],
      "last_message": "2024-01-15T10:30:15Z"
    }
  ]
}
```

## Analytics & Reporting

### Get Portfolio Analysis

Get comprehensive portfolio analysis.

```http
GET /api/portfolio/{portfolio_id}/analysis?type=current
```

**Query Parameters:**
- `type`: Analysis type (current, optimization, stress_test)

**Response:**
```json
{
  "analysis_id": "uuid-string",
  "analysis_type": "current",
  "asset_allocation": {
    "equity": 70.0,
    "fixed_income": 25.0,
    "cash": 5.0
  },
  "geographic_allocation": {
    "USA": 50.0,
    "Europe": 30.0,
    "Asia": 20.0
  },
  "risk_metrics": {
    "expected_return": 8.5,
    "volatility": 15.2,
    "sharpe_ratio": 1.25,
    "value_at_risk_95": -12.3,
    "max_drawdown": -18.5
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Generate Report

Generate detailed portfolio report.

```http
POST /api/portfolio/{portfolio_id}/report
Content-Type: application/json
```

**Request Body:**
```json
{
  "format": "pdf",
  "sections": ["overview", "allocation", "risk_analysis", "recommendations"],
  "comparison_date": "2023-12-31"
}
```

**Response:**
```json
{
  "report_id": "uuid-string",
  "download_url": "/api/reports/uuid-string/download",
  "expires_at": "2024-01-16T10:30:00Z"
}
```

## Error Handling

All API endpoints return consistent error responses.

### Error Response Format

```json
{
  "error": {
    "code": "PORTFOLIO_NOT_FOUND",
    "message": "Portfolio with ID 'xyz' not found",
    "details": {
      "portfolio_id": "xyz"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Request body validation failed |
| `PORTFOLIO_NOT_FOUND` | Portfolio doesn't exist |
| `HOLDING_NOT_FOUND` | Holding doesn't exist |
| `SYMBOL_NOT_FOUND` | Asset symbol not found |
| `API_KEY_INVALID` | Claude API key is invalid |
| `MARKET_DATA_UNAVAILABLE` | Market data service unavailable |
| `ANALYSIS_FAILED` | Portfolio analysis failed |
| `OPTIMIZATION_FAILED` | Portfolio optimization failed |

## Rate Limiting

The API implements rate limiting to ensure fair usage.

### Limits

- **Chat Messages**: 60 per minute per user
- **Market Data**: 100 requests per minute per user
- **Portfolio Operations**: 30 per minute per user
- **Report Generation**: 5 per hour per user

### Rate Limit Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642248600
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retry_after": 60
  }
}
```

## SDK Examples

### JavaScript/Node.js

```javascript
class SAA_API {
    constructor(baseURL = 'http://localhost:5000') {
        this.baseURL = baseURL;
    }

    async getPortfolios() {
        const response = await fetch(`${this.baseURL}/api/portfolio`);
        return await response.json();
    }

    async createPortfolio(data) {
        const response = await fetch(`${this.baseURL}/api/portfolio`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    async getAssetPrice(symbol) {
        const response = await fetch(`${this.baseURL}/api/market/price/${symbol}`);
        return await response.json();
    }
}

// Usage
const saa = new SAA_API();
const portfolios = await saa.getPortfolios();
```

### Python

```python
import requests

class SAAAPI:
    def __init__(self, base_url='http://localhost:5000'):
        self.base_url = base_url
        self.session = requests.Session()
    
    def get_portfolios(self):
        response = self.session.get(f'{self.base_url}/api/portfolio')
        return response.json()
    
    def create_portfolio(self, data):
        response = self.session.post(
            f'{self.base_url}/api/portfolio',
            json=data
        )
        return response.json()
    
    def get_asset_price(self, symbol):
        response = self.session.get(f'{self.base_url}/api/market/price/{symbol}')
        return response.json()

# Usage
saa = SAAAPI()
portfolios = saa.get_portfolios()
```

## Testing the API

### Using curl

```bash
# Get portfolios
curl -X GET http://localhost:5000/api/portfolio

# Create portfolio
curl -X POST http://localhost:5000/api/portfolio \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Portfolio","currency":"EUR"}'

# Get asset price
curl -X GET http://localhost:5000/api/market/price/AAPL
```

### Using Postman

1. Import the provided Postman collection
2. Set environment variables:
   - `base_url`: `http://localhost:5000`
   - `portfolio_id`: Your portfolio ID

3. Run the collection to test all endpoints

### Integration Tests

```python
import pytest
import requests

@pytest.fixture
def api_client():
    return requests.Session()

def test_get_portfolios(api_client):
    response = api_client.get('http://localhost:5000/api/portfolio')
    assert response.status_code == 200
    data = response.json()
    assert 'portfolios' in data
```

This comprehensive API documentation covers all endpoints and provides examples for integration. Use this reference to build applications that integrate with the SAA Portfolio Management System.