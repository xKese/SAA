"""
Market Data Service - Integration with financial data providers
"""

import yfinance as yf
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import json
import requests
from functools import lru_cache
import asyncio
from concurrent.futures import ThreadPoolExecutor

from config.settings import ALPHA_VANTAGE_API_KEY, YAHOO_FINANCE_ENABLED


class MarketDataService:
    """
    Service for fetching and processing market data from various sources
    """
    
    def __init__(self):
        """Initialize market data service"""
        self.yf_enabled = YAHOO_FINANCE_ENABLED
        self.alpha_vantage_key = ALPHA_VANTAGE_API_KEY
        self.executor = ThreadPoolExecutor(max_workers=10)
        self._cache = {}
        self._cache_expiry = {}
        self.cache_duration = timedelta(minutes=15)
    
    async def get_asset_data(self, symbol: str, asset_type: str = 'stock') -> Dict[str, Any]:
        """
        Fetch comprehensive data for a single asset
        
        Args:
            symbol: Asset ticker symbol
            asset_type: Type of asset (stock, etf, bond, etc.)
        
        Returns:
            Dictionary containing asset data
        """
        # Check cache first
        cache_key = f"{symbol}_{asset_type}"
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]
        
        try:
            if self.yf_enabled and asset_type in ['stock', 'etf']:
                data = await self._fetch_yahoo_finance_data(symbol)
            else:
                data = await self._fetch_alpha_vantage_data(symbol)
            
            # Cache the result
            self._cache[cache_key] = data
            self._cache_expiry[cache_key] = datetime.utcnow() + self.cache_duration
            
            return data
            
        except Exception as e:
            return {
                'symbol': symbol,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    async def _fetch_yahoo_finance_data(self, symbol: str) -> Dict[str, Any]:
        """Fetch data from Yahoo Finance"""
        loop = asyncio.get_event_loop()
        
        def fetch():
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # Get price history
            hist = ticker.history(period="1y")
            
            # Calculate basic metrics
            current_price = info.get('currentPrice', info.get('regularMarketPrice', 0))
            prev_close = info.get('previousClose', 0)
            
            return {
                'symbol': symbol,
                'name': info.get('longName', info.get('shortName', symbol)),
                'current_price': current_price,
                'previous_close': prev_close,
                'change': current_price - prev_close if prev_close else 0,
                'change_percent': ((current_price - prev_close) / prev_close * 100) if prev_close else 0,
                'volume': info.get('volume', 0),
                'market_cap': info.get('marketCap', 0),
                'pe_ratio': info.get('trailingPE'),
                'dividend_yield': info.get('dividendYield'),
                'sector': info.get('sector'),
                'industry': info.get('industry'),
                'country': info.get('country'),
                'currency': info.get('currency', 'USD'),
                'exchange': info.get('exchange'),
                '52_week_high': info.get('fiftyTwoWeekHigh'),
                '52_week_low': info.get('fiftyTwoWeekLow'),
                'beta': info.get('beta'),
                'historical_data': hist.to_dict() if not hist.empty else None,
                'timestamp': datetime.utcnow().isoformat()
            }
        
        return await loop.run_in_executor(self.executor, fetch)
    
    async def _fetch_alpha_vantage_data(self, symbol: str) -> Dict[str, Any]:
        """Fetch data from Alpha Vantage"""
        if not self.alpha_vantage_key:
            return {'error': 'Alpha Vantage API key not configured'}
        
        url = f"https://www.alphavantage.co/query"
        params = {
            'function': 'GLOBAL_QUOTE',
            'symbol': symbol,
            'apikey': self.alpha_vantage_key
        }
        
        loop = asyncio.get_event_loop()
        
        def fetch():
            response = requests.get(url, params=params)
            data = response.json()
            
            if 'Global Quote' in data:
                quote = data['Global Quote']
                return {
                    'symbol': symbol,
                    'current_price': float(quote.get('05. price', 0)),
                    'previous_close': float(quote.get('08. previous close', 0)),
                    'change': float(quote.get('09. change', 0)),
                    'change_percent': quote.get('10. change percent', '0%').rstrip('%'),
                    'volume': int(quote.get('06. volume', 0)),
                    'timestamp': datetime.utcnow().isoformat()
                }
            else:
                return {'error': 'Data not available', 'symbol': symbol}
        
        return await loop.run_in_executor(self.executor, fetch)
    
    async def get_bulk_prices(self, symbols: List[str]) -> Dict[str, float]:
        """
        Fetch current prices for multiple symbols
        
        Args:
            symbols: List of ticker symbols
        
        Returns:
            Dictionary mapping symbols to current prices
        """
        tasks = [self.get_asset_data(symbol) for symbol in symbols]
        results = await asyncio.gather(*tasks)
        
        prices = {}
        for result in results:
            if 'current_price' in result:
                prices[result['symbol']] = result['current_price']
            else:
                prices[result.get('symbol', 'unknown')] = None
        
        return prices
    
    async def get_historical_data(self, 
                                 symbol: str,
                                 period: str = '1y',
                                 interval: str = '1d') -> pd.DataFrame:
        """
        Fetch historical price data
        
        Args:
            symbol: Ticker symbol
            period: Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
            interval: Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)
        
        Returns:
            DataFrame with historical data
        """
        loop = asyncio.get_event_loop()
        
        def fetch():
            ticker = yf.Ticker(symbol)
            return ticker.history(period=period, interval=interval)
        
        return await loop.run_in_executor(self.executor, fetch)
    
    async def calculate_returns(self, 
                               symbols: List[str],
                               period: str = '1y') -> Dict[str, Dict[str, float]]:
        """
        Calculate returns for multiple assets
        
        Args:
            symbols: List of ticker symbols
            period: Time period for calculation
        
        Returns:
            Dictionary with return statistics for each symbol
        """
        returns_data = {}
        
        for symbol in symbols:
            try:
                hist = await self.get_historical_data(symbol, period)
                
                if not hist.empty:
                    # Calculate returns
                    daily_returns = hist['Close'].pct_change().dropna()
                    
                    returns_data[symbol] = {
                        'total_return': (hist['Close'].iloc[-1] / hist['Close'].iloc[0] - 1) * 100,
                        'annualized_return': self._annualize_return(daily_returns),
                        'volatility': self._calculate_volatility(daily_returns),
                        'sharpe_ratio': self._calculate_sharpe_ratio(daily_returns),
                        'max_drawdown': self._calculate_max_drawdown(hist['Close'])
                    }
                else:
                    returns_data[symbol] = {'error': 'No historical data available'}
                    
            except Exception as e:
                returns_data[symbol] = {'error': str(e)}
        
        return returns_data
    
    def _annualize_return(self, daily_returns: pd.Series) -> float:
        """Annualize daily returns"""
        return (1 + daily_returns.mean()) ** 252 - 1
    
    def _calculate_volatility(self, daily_returns: pd.Series) -> float:
        """Calculate annualized volatility"""
        return daily_returns.std() * np.sqrt(252)
    
    def _calculate_sharpe_ratio(self, daily_returns: pd.Series, risk_free_rate: float = 0.03) -> float:
        """Calculate Sharpe ratio"""
        excess_returns = daily_returns - risk_free_rate / 252
        if excess_returns.std() == 0:
            return 0
        return np.sqrt(252) * excess_returns.mean() / excess_returns.std()
    
    def _calculate_max_drawdown(self, prices: pd.Series) -> float:
        """Calculate maximum drawdown"""
        cumulative = (1 + prices.pct_change()).cumprod()
        running_max = cumulative.expanding().max()
        drawdown = (cumulative - running_max) / running_max
        return drawdown.min()
    
    async def get_correlation_matrix(self, symbols: List[str], period: str = '1y') -> pd.DataFrame:
        """
        Calculate correlation matrix for multiple assets
        
        Args:
            symbols: List of ticker symbols
            period: Time period for calculation
        
        Returns:
            Correlation matrix as DataFrame
        """
        price_data = {}
        
        for symbol in symbols:
            hist = await self.get_historical_data(symbol, period)
            if not hist.empty:
                price_data[symbol] = hist['Close']
        
        if price_data:
            prices_df = pd.DataFrame(price_data)
            returns_df = prices_df.pct_change().dropna()
            return returns_df.corr()
        else:
            return pd.DataFrame()
    
    async def get_fund_holdings(self, symbol: str) -> Dict[str, Any]:
        """
        Get ETF or mutual fund holdings
        
        Args:
            symbol: Fund ticker symbol
        
        Returns:
            Dictionary with fund holdings and composition
        """
        loop = asyncio.get_event_loop()
        
        def fetch():
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # Try to get major holdings
            try:
                major_holdings = ticker.major_holders
                top_holdings = ticker.institutional_holders
                
                return {
                    'symbol': symbol,
                    'fund_type': info.get('quoteType'),
                    'category': info.get('category'),
                    'total_assets': info.get('totalAssets'),
                    'expense_ratio': info.get('annualReportExpenseRatio'),
                    'holdings_count': info.get('holdings', {}).get('count'),
                    'turnover': info.get('annualHoldingsTurnover'),
                    'major_holdings': major_holdings.to_dict() if major_holdings is not None else None,
                    'top_institutional': top_holdings.to_dict() if top_holdings is not None else None,
                    'sector_weights': info.get('sectorWeightings'),
                    'timestamp': datetime.utcnow().isoformat()
                }
            except:
                return {
                    'symbol': symbol,
                    'fund_type': info.get('quoteType'),
                    'category': info.get('category'),
                    'expense_ratio': info.get('annualReportExpenseRatio'),
                    'timestamp': datetime.utcnow().isoformat()
                }
        
        return await loop.run_in_executor(self.executor, fetch)
    
    async def search_assets(self, query: str, asset_type: Optional[str] = None) -> List[Dict[str, str]]:
        """
        Search for assets by name or symbol
        
        Args:
            query: Search query
            asset_type: Optional filter by asset type
        
        Returns:
            List of matching assets
        """
        # This would integrate with a search API
        # For now, using yfinance search functionality
        loop = asyncio.get_event_loop()
        
        def search():
            # This is a simplified implementation
            # In production, you'd use a proper search API
            results = []
            
            # Try exact symbol match
            try:
                ticker = yf.Ticker(query.upper())
                info = ticker.info
                if info.get('symbol'):
                    results.append({
                        'symbol': info.get('symbol'),
                        'name': info.get('longName', info.get('shortName')),
                        'type': info.get('quoteType'),
                        'exchange': info.get('exchange')
                    })
            except:
                pass
            
            return results
        
        return await loop.run_in_executor(self.executor, search)
    
    def _is_cache_valid(self, key: str) -> bool:
        """Check if cached data is still valid"""
        if key not in self._cache:
            return False
        
        expiry = self._cache_expiry.get(key)
        if expiry and datetime.utcnow() < expiry:
            return True
        
        # Clean up expired cache
        if key in self._cache:
            del self._cache[key]
        if key in self._cache_expiry:
            del self._cache_expiry[key]
        
        return False
    
    async def get_market_indicators(self) -> Dict[str, Any]:
        """
        Get major market indicators and indices
        
        Returns:
            Dictionary with market indicators
        """
        indices = ['^GSPC', '^DJI', '^IXIC', '^FTSE', '^GDAXI', '^N225']  # S&P500, Dow, Nasdaq, FTSE, DAX, Nikkei
        
        indicators = {}
        for index in indices:
            data = await self.get_asset_data(index, 'index')
            if 'current_price' in data:
                indicators[index] = {
                    'value': data['current_price'],
                    'change': data.get('change', 0),
                    'change_percent': data.get('change_percent', 0)
                }
        
        return {
            'indices': indicators,
            'timestamp': datetime.utcnow().isoformat()
        }