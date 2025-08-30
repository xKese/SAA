"""
Portfolio Optimizer Assistant - Claude AI Integration
Optimizes portfolio allocation based on risk-return objectives
"""

import os
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import anthropic
from pathlib import Path
import numpy as np
import pandas as pd

from config.settings import (
    CLAUDE_API_KEY_OPTIMIZER,
    CLAUDE_MODEL,
    CLAUDE_MAX_TOKENS,
    CLAUDE_TEMPERATURE,
    PORTFOLIO_OPTIMIZER_PROMPT
)


class PortfolioOptimizerAssistant:
    """
    Portfolio Optimizer powered by Claude AI
    Specializes in strategic and tactical asset allocation optimization
    """
    
    def __init__(self):
        """Initialize the Portfolio Optimizer with its dedicated Claude instance"""
        if not CLAUDE_API_KEY_OPTIMIZER:
            raise ValueError("CLAUDE_API_KEY_OPTIMIZER not configured")
        
        self.client = anthropic.Anthropic(api_key=CLAUDE_API_KEY_OPTIMIZER)
        self.model = CLAUDE_MODEL
        self.max_tokens = CLAUDE_MAX_TOKENS
        self.temperature = CLAUDE_TEMPERATURE
        
        # Load the optimizer prompt
        self.system_prompt = self._load_system_prompt()
        
        # Initialize optimization cache
        self.optimization_cache = {}
    
    def _load_system_prompt(self) -> str:
        """Load the portfolio optimizer system prompt from file"""
        prompt_path = Path(PORTFOLIO_OPTIMIZER_PROMPT)
        if prompt_path.exists():
            with open(prompt_path, 'r', encoding='utf-8') as f:
                return f.read()
        else:
            # Fallback prompt if file not found
            return self._get_default_prompt()
    
    def _get_default_prompt(self) -> str:
        """Default prompt for portfolio optimization"""
        return """You are a Senior Quantitative Analyst and Portfolio Optimization Specialist with 15+ years of experience.
        
        Your expertise includes:
        - Mean-variance optimization
        - Black-Litterman model
        - Risk parity strategies
        - Factor-based portfolio construction
        - Strategic and tactical asset allocation
        
        Provide optimization recommendations using quantitative analysis and modern portfolio theory.
        Use decimal comma (,) for all numerical outputs per user preference.
        """
    
    async def optimize_portfolio(self, 
                                portfolio_data: Dict[str, Any],
                                constraints: Dict[str, Any],
                                user_query: Optional[str] = None) -> Dict[str, Any]:
        """
        Perform portfolio optimization based on constraints and objectives
        
        Args:
            portfolio_data: Current portfolio holdings and metadata
            constraints: Optimization constraints (risk tolerance, return target, etc.)
            user_query: Optional specific optimization request from user
        
        Returns:
            Dictionary containing optimized allocation and recommendations
        """
        # Prepare optimization context
        context = self._prepare_optimization_context(portfolio_data, constraints)
        
        # Build the optimization request
        if user_query:
            prompt = f"""Optimize the following portfolio based on this specific request: {user_query}
            
            Current Portfolio:
            {json.dumps(context['portfolio'], indent=2, ensure_ascii=False)}
            
            Constraints:
            {json.dumps(context['constraints'], indent=2, ensure_ascii=False)}
            """
        else:
            prompt = f"""Perform portfolio optimization with the following inputs:
            
            Current Portfolio:
            {json.dumps(context['portfolio'], indent=2, ensure_ascii=False)}
            
            Constraints:
            {json.dumps(context['constraints'], indent=2, ensure_ascii=False)}
            
            Please provide:
            1. Optimal asset allocation
            2. Expected risk-return profile
            3. Rebalancing recommendations
            4. Implementation strategy
            5. Risk considerations
            """
        
        try:
            # Call Claude API
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                system=self.system_prompt,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Parse and structure the response
            optimization_result = self._parse_optimization_response(response.content[0].text)
            
            # Cache the optimization
            cache_key = self._generate_cache_key(portfolio_data, constraints)
            self.optimization_cache[cache_key] = {
                'timestamp': datetime.utcnow(),
                'result': optimization_result
            }
            
            return optimization_result
            
        except Exception as e:
            return {
                'error': str(e),
                'status': 'failed',
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def _prepare_optimization_context(self, 
                                     portfolio_data: Dict[str, Any],
                                     constraints: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare context for optimization"""
        context = {
            'portfolio': {
                'total_value': portfolio_data.get('total_value', 0),
                'currency': portfolio_data.get('currency', 'EUR'),
                'current_allocation': self._calculate_current_allocation(portfolio_data),
                'holdings': portfolio_data.get('holdings', [])
            },
            'constraints': {
                'risk_tolerance': constraints.get('risk_tolerance', 'moderate'),
                'target_return': constraints.get('target_return'),
                'max_volatility': constraints.get('max_volatility'),
                'investment_horizon': constraints.get('investment_horizon', 5),
                'min_allocation': constraints.get('min_allocation', {}),
                'max_allocation': constraints.get('max_allocation', {}),
                'excluded_assets': constraints.get('excluded_assets', []),
                'esg_preference': constraints.get('esg_preference', False)
            }
        }
        
        return context
    
    def _calculate_current_allocation(self, portfolio_data: Dict[str, Any]) -> Dict[str, float]:
        """Calculate current asset class allocation"""
        allocation = {}
        total_value = portfolio_data.get('total_value', 1)
        
        for holding in portfolio_data.get('holdings', []):
            asset_class = holding.get('asset_class', 'other')
            current_value = holding.get('current_value', 0)
            
            if asset_class not in allocation:
                allocation[asset_class] = 0
            
            allocation[asset_class] += (current_value / total_value) * 100
        
        return allocation
    
    def _parse_optimization_response(self, response_text: str) -> Dict[str, Any]:
        """Parse Claude's optimization response into structured data"""
        return {
            'status': 'success',
            'timestamp': datetime.utcnow().isoformat(),
            'optimization': response_text,
            'structured_data': self._extract_optimization_data(response_text)
        }
    
    def _extract_optimization_data(self, text: str) -> Dict[str, Any]:
        """Extract structured optimization data from response"""
        # This would parse specific allocation recommendations
        # Placeholder implementation
        return {
            'optimal_allocation': {},
            'expected_return': 0.0,
            'expected_volatility': 0.0,
            'sharpe_ratio': 0.0,
            'rebalancing_trades': [],
            'implementation_notes': []
        }
    
    def _generate_cache_key(self, portfolio_data: Dict[str, Any], 
                          constraints: Dict[str, Any]) -> str:
        """Generate cache key for optimization results"""
        portfolio_hash = hash(json.dumps(
            sorted([h.get('symbol', '') for h in portfolio_data.get('holdings', [])]),
            sort_keys=True
        ))
        constraints_hash = hash(json.dumps(constraints, sort_keys=True))
        return f"{portfolio_data.get('portfolio_id')}_{portfolio_hash}_{constraints_hash}"
    
    async def generate_efficient_frontier(self, 
                                         portfolio_data: Dict[str, Any],
                                         num_portfolios: int = 100) -> Dict[str, Any]:
        """
        Generate efficient frontier for portfolio optimization
        
        Args:
            portfolio_data: Current portfolio holdings
            num_portfolios: Number of portfolios to simulate
        
        Returns:
            Dictionary containing frontier data and optimal portfolios
        """
        prompt = f"""Generate an efficient frontier analysis for this portfolio:
        
        Portfolio: {json.dumps(portfolio_data, indent=2, ensure_ascii=False)}
        
        Please provide:
        1. Multiple portfolio combinations along the efficient frontier
        2. Risk-return characteristics for each portfolio
        3. Identification of the tangency portfolio
        4. Minimum variance portfolio
        5. Maximum Sharpe ratio portfolio
        
        Simulate {num_portfolios} different allocations.
        """
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=0.3,
                system=self.system_prompt,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            return {
                'frontier_data': response.content[0].text,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    async def apply_black_litterman(self,
                                   portfolio_data: Dict[str, Any],
                                   market_views: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Apply Black-Litterman model for portfolio optimization
        
        Args:
            portfolio_data: Current portfolio
            market_views: List of market views and confidence levels
        
        Returns:
            Black-Litterman optimized allocation
        """
        prompt = f"""Apply the Black-Litterman model to optimize this portfolio:
        
        Portfolio: {json.dumps(portfolio_data, indent=2, ensure_ascii=False)}
        
        Market Views:
        {json.dumps(market_views, indent=2, ensure_ascii=False)}
        
        Please provide:
        1. Equilibrium returns
        2. Adjusted expected returns incorporating views
        3. Optimal portfolio weights
        4. Confidence intervals
        5. Implementation recommendations
        """
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=0.3,
                system=self.system_prompt,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            return {
                'black_litterman_result': response.content[0].text,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    async def optimize_risk_parity(self, portfolio_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Implement risk parity optimization strategy
        
        Args:
            portfolio_data: Current portfolio holdings
        
        Returns:
            Risk parity optimized allocation
        """
        prompt = f"""Implement a risk parity optimization for this portfolio:
        
        Portfolio: {json.dumps(portfolio_data, indent=2, ensure_ascii=False)}
        
        Please provide:
        1. Equal risk contribution weights
        2. Risk contribution by asset class
        3. Expected portfolio volatility
        4. Comparison with current allocation
        5. Rebalancing requirements
        """
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=0.3,
                system=self.system_prompt,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            return {
                'risk_parity_result': response.content[0].text,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    async def tactical_allocation_overlay(self,
                                         portfolio_data: Dict[str, Any],
                                         market_conditions: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate tactical allocation recommendations based on market conditions
        
        Args:
            portfolio_data: Current strategic allocation
            market_conditions: Current market indicators and signals
        
        Returns:
            Tactical allocation adjustments
        """
        prompt = f"""Provide tactical allocation recommendations:
        
        Current Portfolio:
        {json.dumps(portfolio_data, indent=2, ensure_ascii=False)}
        
        Market Conditions:
        {json.dumps(market_conditions, indent=2, ensure_ascii=False)}
        
        Please provide:
        1. Tactical tilts from strategic allocation
        2. Risk-on/risk-off positioning
        3. Sector/region over/underweights
        4. Implementation timeline
        5. Exit criteria for tactical positions
        """
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                system=self.system_prompt,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            return {
                'tactical_recommendations': response.content[0].text,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    async def stress_test_portfolio(self,
                                   portfolio_data: Dict[str, Any],
                                   scenarios: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Perform stress testing on portfolio under various scenarios
        
        Args:
            portfolio_data: Current portfolio
            scenarios: List of stress test scenarios
        
        Returns:
            Stress test results and recommendations
        """
        prompt = f"""Perform stress testing on this portfolio:
        
        Portfolio: {json.dumps(portfolio_data, indent=2, ensure_ascii=False)}
        
        Stress Scenarios:
        {json.dumps(scenarios, indent=2, ensure_ascii=False)}
        
        For each scenario, provide:
        1. Expected portfolio impact
        2. Asset class performance
        3. Risk metrics under stress
        4. Hedging recommendations
        5. Recovery time estimates
        """
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=0.3,
                system=self.system_prompt,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            return {
                'stress_test_results': response.content[0].text,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def get_rebalancing_trades(self,
                              current_allocation: Dict[str, float],
                              target_allocation: Dict[str, float],
                              portfolio_value: float) -> List[Dict[str, Any]]:
        """
        Calculate specific trades needed for rebalancing
        
        Args:
            current_allocation: Current percentage allocations
            target_allocation: Target percentage allocations
            portfolio_value: Total portfolio value
        
        Returns:
            List of rebalancing trades
        """
        trades = []
        
        for asset_class in set(list(current_allocation.keys()) + list(target_allocation.keys())):
            current_pct = current_allocation.get(asset_class, 0)
            target_pct = target_allocation.get(asset_class, 0)
            
            current_value = (current_pct / 100) * portfolio_value
            target_value = (target_pct / 100) * portfolio_value
            trade_value = target_value - current_value
            
            if abs(trade_value) > 0.01 * portfolio_value:  # Only include trades > 1% of portfolio
                trades.append({
                    'asset_class': asset_class,
                    'action': 'buy' if trade_value > 0 else 'sell',
                    'amount': abs(trade_value),
                    'current_allocation': current_pct,
                    'target_allocation': target_pct
                })
        
        return sorted(trades, key=lambda x: x['amount'], reverse=True)