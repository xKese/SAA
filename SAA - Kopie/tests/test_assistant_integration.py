"""
Test cases for AI Assistant Integration
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
import json
from datetime import datetime

from app.assistants.portfolio_analyst import PortfolioAnalystAssistant
from app.assistants.portfolio_optimizer import PortfolioOptimizerAssistant


class TestPortfolioAnalystAssistant:
    """Test Portfolio Analyst Assistant functionality"""
    
    @pytest.fixture
    def mock_anthropic_client(self):
        """Mock Anthropic client"""
        mock_client = Mock()
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = "Comprehensive portfolio analysis completed."
        mock_client.messages.create.return_value = mock_response
        return mock_client
    
    @pytest.fixture
    def sample_portfolio_data(self):
        """Sample portfolio data for testing"""
        return {
            'portfolio_id': 'test-portfolio-123',
            'total_value': 100000.0,
            'currency': 'EUR',
            'risk_tolerance': 'moderate',
            'investment_horizon': 5,
            'holdings': [
                {
                    'symbol': 'AAPL',
                    'isin': 'US0378331005',
                    'name': 'Apple Inc.',
                    'asset_type': 'stock',
                    'quantity': 100.0,
                    'current_value': 18000.0
                },
                {
                    'symbol': 'SPY',
                    'isin': 'US78462F1030',
                    'name': 'SPDR S&P 500 ETF',
                    'asset_type': 'etf',
                    'quantity': 200.0,
                    'current_value': 82000.0
                }
            ]
        }
    
    @patch('app.assistants.portfolio_analyst.anthropic.Anthropic')
    def test_analyst_initialization(self, mock_anthropic):
        """Test Portfolio Analyst initialization"""
        with patch('app.assistants.portfolio_analyst.CLAUDE_API_KEY_ANALYST', 'test-key'):
            analyst = PortfolioAnalystAssistant()
            
            # Verify initialization
            mock_anthropic.assert_called_once_with(api_key='test-key')
            assert analyst.model == 'claude-3-opus-20240229'
            assert analyst.max_tokens == 4096
    
    @patch('app.assistants.portfolio_analyst.anthropic.Anthropic')
    @pytest.mark.asyncio
    async def test_analyze_portfolio_success(self, mock_anthropic, sample_portfolio_data):
        """Test successful portfolio analysis"""
        with patch('app.assistants.portfolio_analyst.CLAUDE_API_KEY_ANALYST', 'test-key'):
            # Setup mock
            mock_client = Mock()
            mock_response = Mock()
            mock_response.content = [Mock()]
            mock_response.content[0].text = """
            Portfolio Analysis Results:
            - Total Value: €100,000
            - Asset Allocation: 82% Equity, 18% Other
            - Risk Level: Moderate
            - Diversification: Good
            """
            mock_client.messages.create.return_value = mock_response
            mock_anthropic.return_value = mock_client
            
            # Test analysis
            analyst = PortfolioAnalystAssistant()
            result = await analyst.analyze_portfolio(sample_portfolio_data)
            
            # Verify results
            assert result['status'] == 'success'
            assert 'analysis' in result
            assert 'timestamp' in result
            assert 'Portfolio Analysis Results' in result['analysis']
            
            # Verify API was called correctly
            mock_client.messages.create.assert_called_once()
            call_args = mock_client.messages.create.call_args
            assert call_args[1]['model'] == 'claude-3-opus-20240229'
            assert 'test-portfolio-123' in call_args[1]['messages'][0]['content']
    
    @patch('app.assistants.portfolio_analyst.anthropic.Anthropic')
    @pytest.mark.asyncio
    async def test_analyze_portfolio_with_query(self, mock_anthropic, sample_portfolio_data):
        """Test portfolio analysis with specific user query"""
        with patch('app.assistants.portfolio_analyst.CLAUDE_API_KEY_ANALYST', 'test-key'):
            mock_client = Mock()
            mock_response = Mock()
            mock_response.content = [Mock()]
            mock_response.content[0].text = "Your portfolio has high concentration in technology stocks."
            mock_client.messages.create.return_value = mock_response
            mock_anthropic.return_value = mock_client
            
            analyst = PortfolioAnalystAssistant()
            result = await analyst.analyze_portfolio(
                sample_portfolio_data,
                "What is my sector concentration?"
            )
            
            # Verify results
            assert result['status'] == 'success'
            assert 'technology stocks' in result['analysis']
            
            # Verify query was included in prompt
            call_args = mock_client.messages.create.call_args
            assert 'sector concentration' in call_args[1]['messages'][0]['content']
    
    @patch('app.assistants.portfolio_analyst.anthropic.Anthropic')
    @pytest.mark.asyncio
    async def test_get_fund_decomposition(self, mock_anthropic):
        """Test fund decomposition analysis"""
        with patch('app.assistants.portfolio_analyst.CLAUDE_API_KEY_ANALYST', 'test-key'):
            mock_client = Mock()
            mock_response = Mock()
            mock_response.content = [Mock()]
            mock_response.content[0].text = """
            Fund Decomposition for SPY:
            - Top Holdings: AAPL 7.1%, MSFT 6.8%, AMZN 3.4%
            - Sector Allocation: Technology 28%, Healthcare 13%
            - Geographic: US 100%
            """
            mock_client.messages.create.return_value = mock_response
            mock_anthropic.return_value = mock_client
            
            analyst = PortfolioAnalystAssistant()
            result = await analyst.get_fund_decomposition('US78462F1030')
            
            # Verify results
            assert result['isin'] == 'US78462F1030'
            assert 'Fund Decomposition' in result['decomposition']
            assert 'Technology 28%' in result['decomposition']
    
    @patch('app.assistants.portfolio_analyst.anthropic.Anthropic')
    @pytest.mark.asyncio
    async def test_calculate_risk_metrics(self, mock_anthropic, sample_portfolio_data):
        """Test risk metrics calculation"""
        with patch('app.assistants.portfolio_analyst.CLAUDE_API_KEY_ANALYST', 'test-key'):
            mock_client = Mock()
            mock_response = Mock()
            mock_response.content = [Mock()]
            mock_response.content[0].text = """
            Risk Metrics:
            - Expected Return: 8,5%
            - Volatility: 15,2%
            - Sharpe Ratio: 1,25
            - VaR 95%: -12,3%
            """
            mock_client.messages.create.return_value = mock_response
            mock_anthropic.return_value = mock_client
            
            analyst = PortfolioAnalystAssistant()
            result = await analyst.calculate_risk_metrics(sample_portfolio_data)
            
            # Verify results (would need actual parsing implementation)
            assert isinstance(result, dict)
    
    @patch('app.assistants.portfolio_analyst.anthropic.Anthropic')
    @pytest.mark.asyncio
    async def test_error_handling(self, mock_anthropic, sample_portfolio_data):
        """Test error handling in portfolio analysis"""
        with patch('app.assistants.portfolio_analyst.CLAUDE_API_KEY_ANALYST', 'test-key'):
            mock_client = Mock()
            mock_client.messages.create.side_effect = Exception("API Error")
            mock_anthropic.return_value = mock_client
            
            analyst = PortfolioAnalystAssistant()
            result = await analyst.analyze_portfolio(sample_portfolio_data)
            
            # Verify error handling
            assert 'error' in result
            assert result['status'] == 'failed'
            assert 'API Error' in result['error']


class TestPortfolioOptimizerAssistant:
    """Test Portfolio Optimizer Assistant functionality"""
    
    @pytest.fixture
    def sample_constraints(self):
        """Sample optimization constraints"""
        return {
            'risk_tolerance': 'moderate',
            'target_return': 0.08,
            'max_volatility': 0.15,
            'investment_horizon': 5,
            'min_allocation': {'equity': 0.5},
            'max_allocation': {'equity': 0.8},
            'excluded_assets': [],
            'esg_preference': False
        }
    
    @pytest.fixture
    def sample_market_views(self):
        """Sample Black-Litterman market views"""
        return [
            {
                'asset': 'US Equities',
                'expected_return': 0.08,
                'confidence': 0.7
            },
            {
                'asset': 'European Equities',
                'expected_return': 0.06,
                'confidence': 0.5
            }
        ]
    
    @patch('app.assistants.portfolio_optimizer.anthropic.Anthropic')
    def test_optimizer_initialization(self, mock_anthropic):
        """Test Portfolio Optimizer initialization"""
        with patch('app.assistants.portfolio_optimizer.CLAUDE_API_KEY_OPTIMIZER', 'test-key'):
            optimizer = PortfolioOptimizerAssistant()
            
            # Verify initialization
            mock_anthropic.assert_called_once_with(api_key='test-key')
            assert optimizer.model == 'claude-3-opus-20240229'
    
    @patch('app.assistants.portfolio_optimizer.anthropic.Anthropic')
    @pytest.mark.asyncio
    async def test_optimize_portfolio_success(self, mock_anthropic, sample_constraints):
        """Test successful portfolio optimization"""
        portfolio_data = {
            'portfolio_id': 'test-portfolio',
            'total_value': 100000.0,
            'currency': 'EUR',
            'holdings': []
        }
        
        with patch('app.assistants.portfolio_optimizer.CLAUDE_API_KEY_OPTIMIZER', 'test-key'):
            mock_client = Mock()
            mock_response = Mock()
            mock_response.content = [Mock()]
            mock_response.content[0].text = """
            Optimization Results:
            - Optimal Allocation: Equity 70%, Bonds 25%, Cash 5%
            - Expected Return: 8,2%
            - Expected Volatility: 14,8%
            - Sharpe Ratio: 1,35
            """
            mock_client.messages.create.return_value = mock_response
            mock_anthropic.return_value = mock_client
            
            optimizer = PortfolioOptimizerAssistant()
            result = await optimizer.optimize_portfolio(portfolio_data, sample_constraints)
            
            # Verify results
            assert result['status'] == 'success'
            assert 'optimization' in result
            assert 'Optimal Allocation' in result['optimization']
    
    @patch('app.assistants.portfolio_optimizer.anthropic.Anthropic')
    @pytest.mark.asyncio
    async def test_generate_efficient_frontier(self, mock_anthropic):
        """Test efficient frontier generation"""
        portfolio_data = {'portfolio_id': 'test', 'total_value': 100000.0, 'holdings': []}
        
        with patch('app.assistants.portfolio_optimizer.CLAUDE_API_KEY_OPTIMIZER', 'test-key'):
            mock_client = Mock()
            mock_response = Mock()
            mock_response.content = [Mock()]
            mock_response.content[0].text = """
            Efficient Frontier Analysis:
            - Portfolio 1: Risk 10%, Return 6%
            - Portfolio 2: Risk 15%, Return 8%
            - Portfolio 3: Risk 20%, Return 10%
            - Tangency Portfolio: Risk 15%, Return 8%
            """
            mock_client.messages.create.return_value = mock_response
            mock_anthropic.return_value = mock_client
            
            optimizer = PortfolioOptimizerAssistant()
            result = await optimizer.generate_efficient_frontier(portfolio_data, 50)
            
            # Verify results
            assert 'frontier_data' in result
            assert 'Efficient Frontier Analysis' in result['frontier_data']
            assert 'Tangency Portfolio' in result['frontier_data']
    
    @patch('app.assistants.portfolio_optimizer.anthropic.Anthropic')
    @pytest.mark.asyncio
    async def test_apply_black_litterman(self, mock_anthropic, sample_market_views):
        """Test Black-Litterman model application"""
        portfolio_data = {'portfolio_id': 'test', 'total_value': 100000.0, 'holdings': []}
        
        with patch('app.assistants.portfolio_optimizer.CLAUDE_API_KEY_OPTIMIZER', 'test-key'):
            mock_client = Mock()
            mock_response = Mock()
            mock_response.content = [Mock()]
            mock_response.content[0].text = """
            Black-Litterman Results:
            - Equilibrium Returns: US 6,5%, EU 5,8%
            - Adjusted Returns: US 7,2%, EU 5,9%
            - Optimal Weights: US 60%, EU 40%
            """
            mock_client.messages.create.return_value = mock_response
            mock_anthropic.return_value = mock_client
            
            optimizer = PortfolioOptimizerAssistant()
            result = await optimizer.apply_black_litterman(portfolio_data, sample_market_views)
            
            # Verify results
            assert 'black_litterman_result' in result
            assert 'Equilibrium Returns' in result['black_litterman_result']
            assert 'Optimal Weights' in result['black_litterman_result']
    
    @patch('app.assistants.portfolio_optimizer.anthropic.Anthropic')
    @pytest.mark.asyncio
    async def test_optimize_risk_parity(self, mock_anthropic):
        """Test risk parity optimization"""
        portfolio_data = {'portfolio_id': 'test', 'total_value': 100000.0, 'holdings': []}
        
        with patch('app.assistants.portfolio_optimizer.CLAUDE_API_KEY_OPTIMIZER', 'test-key'):
            mock_client = Mock()
            mock_response = Mock()
            mock_response.content = [Mock()]
            mock_response.content[0].text = """
            Risk Parity Optimization:
            - Equal Risk Contributions: Each asset contributes 25% to portfolio risk
            - Optimal Weights: Large Cap 40%, Small Cap 20%, Bonds 30%, REITs 10%
            - Portfolio Volatility: 12,5%
            """
            mock_client.messages.create.return_value = mock_response
            mock_anthropic.return_value = mock_client
            
            optimizer = PortfolioOptimizerAssistant()
            result = await optimizer.optimize_risk_parity(portfolio_data)
            
            # Verify results
            assert 'risk_parity_result' in result
            assert 'Equal Risk Contributions' in result['risk_parity_result']
    
    def test_get_rebalancing_trades(self):
        """Test rebalancing trades calculation"""
        current_allocation = {'equity': 60.0, 'bonds': 35.0, 'cash': 5.0}
        target_allocation = {'equity': 70.0, 'bonds': 25.0, 'cash': 5.0}
        portfolio_value = 100000.0
        
        optimizer = PortfolioOptimizerAssistant()
        trades = optimizer.get_rebalancing_trades(
            current_allocation,
            target_allocation,
            portfolio_value
        )
        
        # Verify trades
        assert len(trades) == 2  # Should have trades for equity and bonds
        
        # Find equity trade (should be buy)
        equity_trade = next((t for t in trades if t['asset_class'] == 'equity'), None)
        assert equity_trade is not None
        assert equity_trade['action'] == 'buy'
        assert equity_trade['amount'] == 10000.0  # 10% of 100k
        
        # Find bonds trade (should be sell)
        bonds_trade = next((t for t in trades if t['asset_class'] == 'bonds'), None)
        assert bonds_trade is not None
        assert bonds_trade['action'] == 'sell'
        assert bonds_trade['amount'] == 10000.0  # 10% of 100k
    
    def test_prepare_optimization_context(self):
        """Test optimization context preparation"""
        portfolio_data = {
            'total_value': 100000.0,
            'currency': 'EUR',
            'holdings': [
                {
                    'asset_class': 'equity',
                    'current_value': 70000.0
                },
                {
                    'asset_class': 'fixed_income',
                    'current_value': 30000.0
                }
            ]
        }
        
        constraints = {
            'risk_tolerance': 'aggressive',
            'target_return': 0.10
        }
        
        optimizer = PortfolioOptimizerAssistant()
        context = optimizer._prepare_optimization_context(portfolio_data, constraints)
        
        # Verify context structure
        assert 'portfolio' in context
        assert 'constraints' in context
        assert context['portfolio']['total_value'] == 100000.0
        assert context['constraints']['risk_tolerance'] == 'aggressive'
        
        # Verify allocation calculation
        allocation = context['portfolio']['current_allocation']
        assert allocation['equity'] == 70.0
        assert allocation['fixed_income'] == 30.0