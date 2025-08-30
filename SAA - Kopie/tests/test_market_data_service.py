"""
Test cases for Market Data Service
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
import pandas as pd
import numpy as np
from datetime import datetime

from app.services.market_data import MarketDataService


class TestMarketDataService:
    """Test market data service functionality"""
    
    @pytest.fixture
    def market_service(self):
        """Create market data service instance"""
        return MarketDataService()
    
    @pytest.fixture
    def sample_ticker_info(self):
        """Sample ticker info from yfinance"""
        return {
            'symbol': 'AAPL',
            'longName': 'Apple Inc.',
            'currentPrice': 180.50,
            'previousClose': 178.25,
            'volume': 45678900,
            'marketCap': 2847563000000,
            'trailingPE': 28.45,
            'dividendYield': 0.0051,
            'sector': 'Technology',
            'industry': 'Consumer Electronics',
            'country': 'United States',
            'currency': 'USD',
            'exchange': 'NMS',
            'fiftyTwoWeekHigh': 199.62,
            'fiftyTwoWeekLow': 164.08,
            'beta': 1.29
        }
    
    @pytest.fixture
    def sample_historical_data(self):
        """Sample historical price data"""
        dates = pd.date_range('2023-01-01', periods=252, freq='D')
        prices = 150 + np.random.randn(252).cumsum() * 2
        
        return pd.DataFrame({
            'Open': prices + np.random.randn(252) * 0.5,
            'High': prices + np.abs(np.random.randn(252)) * 0.8,
            'Low': prices - np.abs(np.random.randn(252)) * 0.8,
            'Close': prices,
            'Volume': np.random.randint(20000000, 80000000, 252)
        }, index=dates)
    
    @patch('app.services.market_data.yf.Ticker')
    @pytest.mark.asyncio
    async def test_get_asset_data_success(self, mock_ticker, market_service, sample_ticker_info, sample_historical_data):
        """Test successful asset data retrieval"""
        # Mock yfinance ticker
        mock_ticker_instance = Mock()
        mock_ticker_instance.info = sample_ticker_info
        mock_ticker_instance.history.return_value = sample_historical_data
        mock_ticker.return_value = mock_ticker_instance
        
        # Test the method
        result = await market_service.get_asset_data('AAPL', 'stock')
        
        # Verify results
        assert result['symbol'] == 'AAPL'
        assert result['name'] == 'Apple Inc.'
        assert result['current_price'] == 180.50
        assert result['previous_close'] == 178.25
        assert result['sector'] == 'Technology'
        assert result['country'] == 'United States'
        assert result['change'] == 2.25  # 180.50 - 178.25
        assert 'timestamp' in result
    
    @patch('app.services.market_data.yf.Ticker')
    @pytest.mark.asyncio
    async def test_get_asset_data_error_handling(self, mock_ticker, market_service):
        """Test error handling in asset data retrieval"""
        # Mock yfinance to raise an exception
        mock_ticker.side_effect = Exception("Network error")
        
        # Test the method
        result = await market_service.get_asset_data('INVALID', 'stock')
        
        # Verify error handling
        assert 'error' in result
        assert result['symbol'] == 'INVALID'
        assert 'Network error' in result['error']
    
    @patch('app.services.market_data.yf.Ticker')
    @pytest.mark.asyncio
    async def test_get_bulk_prices(self, mock_ticker, market_service):
        """Test bulk price retrieval"""
        symbols = ['AAPL', 'GOOGL', 'MSFT']
        
        # Mock responses for each symbol
        def mock_ticker_side_effect(symbol):
            mock_instance = Mock()
            prices = {'AAPL': 180.50, 'GOOGL': 2750.30, 'MSFT': 340.80}
            mock_instance.info = {'currentPrice': prices.get(symbol, 100.0), 'symbol': symbol}
            mock_instance.history.return_value = pd.DataFrame()
            return mock_instance
        
        mock_ticker.side_effect = mock_ticker_side_effect
        
        # Test the method
        result = await market_service.get_bulk_prices(symbols)
        
        # Verify results
        assert len(result) == 3
        assert result['AAPL'] == 180.50
        assert result['GOOGL'] == 2750.30
        assert result['MSFT'] == 340.80
    
    @patch('app.services.market_data.yf.Ticker')
    @pytest.mark.asyncio
    async def test_get_historical_data(self, mock_ticker, market_service, sample_historical_data):
        """Test historical data retrieval"""
        # Mock yfinance ticker
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = sample_historical_data
        mock_ticker.return_value = mock_ticker_instance
        
        # Test the method
        result = await market_service.get_historical_data('AAPL', '1y', '1d')
        
        # Verify results
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 252
        assert 'Close' in result.columns
        assert 'Volume' in result.columns
        
        # Verify yfinance was called correctly
        mock_ticker_instance.history.assert_called_once_with(period='1y', interval='1d')
    
    @pytest.mark.asyncio
    async def test_calculate_returns(self, market_service):
        """Test returns calculation"""
        # Create mock historical data for testing
        with patch.object(market_service, 'get_historical_data') as mock_get_hist:
            # Mock data: prices going from 100 to 110 over the period
            dates = pd.date_range('2023-01-01', periods=252, freq='D')
            prices = np.linspace(100, 110, 252)
            mock_hist_data = pd.DataFrame({'Close': prices}, index=dates)
            mock_get_hist.return_value = mock_hist_data
            
            # Test the method
            result = await market_service.calculate_returns(['TEST'], '1y')
            
            # Verify results
            assert 'TEST' in result
            returns_data = result['TEST']
            assert 'total_return' in returns_data
            assert 'annualized_return' in returns_data
            assert 'volatility' in returns_data
            assert 'sharpe_ratio' in returns_data
            assert 'max_drawdown' in returns_data
            
            # Check total return calculation (should be about 10%)
            assert abs(returns_data['total_return'] - 10.0) < 1.0
    
    def test_annualize_return(self, market_service):
        """Test return annualization"""
        # Create daily returns of 0.1% (approximately 25% annually)
        daily_returns = pd.Series([0.001] * 252)
        
        result = market_service._annualize_return(daily_returns)
        
        # Should be approximately 0.284 (28.4%)
        assert abs(result - 0.284) < 0.01
    
    def test_calculate_volatility(self, market_service):
        """Test volatility calculation"""
        # Create daily returns with known standard deviation
        daily_returns = pd.Series(np.random.normal(0, 0.02, 252))  # 2% daily vol
        
        result = market_service._calculate_volatility(daily_returns)
        
        # Should be approximately 2% * sqrt(252) ≈ 31.7%
        assert abs(result - 0.317) < 0.05  # Allow some variance due to randomness
    
    def test_calculate_sharpe_ratio(self, market_service):
        """Test Sharpe ratio calculation"""
        # Create returns with known mean and std
        daily_returns = pd.Series(np.random.normal(0.0004, 0.02, 252))  # ~10% annual return, ~32% vol
        
        result = market_service._calculate_sharpe_ratio(daily_returns, 0.03)
        
        # Should be approximately (0.10 - 0.03) / 0.32 ≈ 0.22
        assert abs(result - 0.22) < 0.1  # Allow variance due to randomness
    
    def test_calculate_max_drawdown(self, market_service):
        """Test maximum drawdown calculation"""
        # Create price series with known drawdown
        prices = pd.Series([100, 110, 105, 95, 120, 100, 130])
        
        result = market_service._calculate_max_drawdown(prices)
        
        # Maximum drawdown should be from 110 to 95 = -13.6%
        assert abs(result - (-0.136)) < 0.01
    
    @patch('app.services.market_data.yf.Ticker')
    @pytest.mark.asyncio
    async def test_get_correlation_matrix(self, mock_ticker, market_service):
        """Test correlation matrix calculation"""
        symbols = ['AAPL', 'GOOGL']
        
        # Mock historical data for correlation calculation
        dates = pd.date_range('2023-01-01', periods=100, freq='D')
        
        def mock_get_hist_side_effect(symbol, period):
            if symbol == 'AAPL':
                prices = 150 + np.random.randn(100).cumsum() * 2
            else:  # GOOGL
                prices = 2500 + np.random.randn(100).cumsum() * 50
            
            return pd.DataFrame({'Close': prices}, index=dates)
        
        with patch.object(market_service, 'get_historical_data', side_effect=mock_get_hist_side_effect):
            result = await market_service.get_correlation_matrix(symbols, '1y')
            
            # Verify results
            assert isinstance(result, pd.DataFrame)
            assert result.shape == (2, 2)
            assert 'AAPL' in result.columns
            assert 'GOOGL' in result.columns
            assert result.loc['AAPL', 'AAPL'] == 1.0  # Self-correlation should be 1
            assert result.loc['GOOGL', 'GOOGL'] == 1.0
    
    @patch('app.services.market_data.yf.Ticker')
    @pytest.mark.asyncio
    async def test_get_fund_holdings(self, mock_ticker, market_service):
        """Test fund holdings retrieval"""
        # Mock fund data
        mock_ticker_instance = Mock()
        mock_ticker_instance.info = {
            'symbol': 'SPY',
            'quoteType': 'ETF',
            'category': 'Large Blend',
            'totalAssets': 400000000000,
            'annualReportExpenseRatio': 0.0945
        }
        mock_ticker_instance.major_holders = None
        mock_ticker_instance.institutional_holders = None
        mock_ticker.return_value = mock_ticker_instance
        
        result = await market_service.get_fund_holdings('SPY')
        
        # Verify results
        assert result['symbol'] == 'SPY'
        assert result['fund_type'] == 'ETF'
        assert result['category'] == 'Large Blend'
        assert result['total_assets'] == 400000000000
        assert result['expense_ratio'] == 0.0945
    
    def test_cache_functionality(self, market_service):
        """Test caching mechanism"""
        # Test cache validation
        assert not market_service._is_cache_valid('non-existent-key')
        
        # Add item to cache
        test_key = 'test_key'
        test_data = {'symbol': 'TEST', 'price': 100.0}
        market_service._cache[test_key] = test_data
        market_service._cache_expiry[test_key] = datetime.utcnow()
        
        # Should not be valid (expired)
        assert not market_service._is_cache_valid(test_key)
        
        # Should not exist in cache after validation check
        assert test_key not in market_service._cache
    
    @patch('app.services.market_data.requests.get')
    @pytest.mark.asyncio
    async def test_alpha_vantage_integration(self, mock_get, market_service):
        """Test Alpha Vantage API integration"""
        # Mock Alpha Vantage API response
        mock_response = Mock()
        mock_response.json.return_value = {
            'Global Quote': {
                '01. symbol': 'AAPL',
                '05. price': '180.50',
                '08. previous close': '178.25',
                '09. change': '2.25',
                '10. change percent': '1.26%',
                '06. volume': '45678900'
            }
        }
        mock_get.return_value = mock_response
        
        # Temporarily set API key for testing
        market_service.alpha_vantage_key = 'test_key'
        
        result = await market_service._fetch_alpha_vantage_data('AAPL')
        
        # Verify results
        assert result['symbol'] == 'AAPL'
        assert result['current_price'] == 180.50
        assert result['previous_close'] == 178.25
        assert result['change'] == 2.25
        assert result['volume'] == 45678900
    
    @patch('app.services.market_data.yf.Ticker')
    @pytest.mark.asyncio
    async def test_get_market_indicators(self, mock_ticker, market_service):
        """Test market indicators retrieval"""
        def mock_ticker_side_effect(symbol):
            mock_instance = Mock()
            # Mock data for major indices
            mock_data = {
                '^GSPC': {'currentPrice': 4350.50, 'previousClose': 4320.25},
                '^DJI': {'currentPrice': 34750.80, 'previousClose': 34600.10},
                '^IXIC': {'currentPrice': 13450.75, 'previousClose': 13380.90}
            }
            mock_instance.info = mock_data.get(symbol, {})
            mock_instance.history.return_value = pd.DataFrame()
            return mock_instance
        
        mock_ticker.side_effect = mock_ticker_side_effect
        
        result = await market_service.get_market_indicators()
        
        # Verify results
        assert 'indices' in result
        assert 'timestamp' in result
        
        indices = result['indices']
        if '^GSPC' in indices:
            assert indices['^GSPC']['value'] == 4350.50
            assert indices['^GSPC']['change'] == 30.25  # 4350.50 - 4320.25