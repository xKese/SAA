"""
Portfolio Analyst Assistant - Claude AI Integration
Analyzes portfolio composition, risk metrics, and performance
"""

import os
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
import anthropic
from pathlib import Path
import pandas as pd
import numpy as np

from config.settings import (
    CLAUDE_API_KEY_ANALYST,
    CLAUDE_MODEL,
    CLAUDE_MAX_TOKENS,
    CLAUDE_TEMPERATURE,
    PORTFOLIO_ANALYST_PROMPT
)


class PortfolioAnalystAssistant:
    """
    Portfolio Analyst powered by Claude AI
    Specializes in portfolio structure decomposition and risk analysis
    """
    
    def __init__(self):
        """Initialize the Portfolio Analyst with its dedicated Claude instance"""
        if not CLAUDE_API_KEY_ANALYST:
            raise ValueError("CLAUDE_API_KEY_ANALYST not configured")
        
        self.client = anthropic.Anthropic(api_key=CLAUDE_API_KEY_ANALYST)
        self.model = CLAUDE_MODEL
        self.max_tokens = CLAUDE_MAX_TOKENS
        self.temperature = CLAUDE_TEMPERATURE
        
        # Load the analyst prompt
        self.system_prompt = self._load_system_prompt()
        
        # Initialize analysis cache
        self.analysis_cache = {}
    
    def _load_system_prompt(self) -> str:
        """Load the portfolio analyst system prompt from file"""
        prompt_path = Path(PORTFOLIO_ANALYST_PROMPT)
        if prompt_path.exists():
            with open(prompt_path, 'r', encoding='utf-8') as f:
                return f.read()
        else:
            # Fallback prompt if file not found
            return self._get_default_prompt()
    
    def _get_default_prompt(self) -> str:
        """Default prompt for portfolio analysis"""
        return """You are a Senior Portfolio Analyst specializing in portfolio structure decomposition and risk analysis.
        
        Your expertise includes:
        - Fund look-through analysis
        - Asset allocation breakdown
        - Geographic and currency exposure analysis
        - Risk metrics calculation (VaR, Sharpe Ratio, etc.)
        - Portfolio diversification assessment
        
        Provide detailed analysis using German financial standards and terminology.
        Use comma as decimal separator in all numerical outputs.
        """
    
    async def analyze_portfolio(self, portfolio_data: Dict[str, Any], 
                               user_query: Optional[str] = None) -> Dict[str, Any]:
        """
        Perform comprehensive portfolio analysis
        
        Args:
            portfolio_data: Dictionary containing portfolio holdings and metadata
            user_query: Optional specific question from user
        
        Returns:
            Dictionary containing analysis results and recommendations
        """
        # Prepare the portfolio context
        context = self._prepare_portfolio_context(portfolio_data)
        
        # Build the analysis request
        if user_query:
            prompt = f"""Analyze the following portfolio and answer this specific question: {user_query}
            
            Portfolio Data:
            {json.dumps(context, indent=2, ensure_ascii=False)}
            """
        else:
            prompt = f"""Perform a comprehensive analysis of the following portfolio:
            
            Portfolio Data:
            {json.dumps(context, indent=2, ensure_ascii=False)}
            
            Please provide:
            1. Asset allocation breakdown
            2. Geographic diversification analysis
            3. Currency exposure assessment
            4. Risk metrics calculation
            5. Key observations and recommendations
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
            analysis_result = self._parse_analysis_response(response.content[0].text)
            
            # Cache the analysis
            cache_key = self._generate_cache_key(portfolio_data)
            self.analysis_cache[cache_key] = {
                'timestamp': datetime.utcnow(),
                'result': analysis_result
            }
            
            return analysis_result
            
        except Exception as e:
            return {
                'error': str(e),
                'status': 'failed',
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def _prepare_portfolio_context(self, portfolio_data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare portfolio data for analysis"""
        context = {
            'portfolio_id': portfolio_data.get('portfolio_id'),
            'total_value': portfolio_data.get('total_value', 0),
            'currency': portfolio_data.get('currency', 'EUR'),
            'holdings': [],
            'metadata': {
                'risk_tolerance': portfolio_data.get('risk_tolerance', 'moderate'),
                'investment_horizon': portfolio_data.get('investment_horizon', 5),
                'analysis_date': datetime.utcnow().isoformat()
            }
        }
        
        # Process holdings
        for holding in portfolio_data.get('holdings', []):
            context['holdings'].append({
                'symbol': holding.get('symbol'),
                'isin': holding.get('isin'),
                'name': holding.get('name'),
                'asset_type': holding.get('asset_type'),
                'quantity': holding.get('quantity'),
                'current_value': holding.get('current_value'),
                'percentage': (holding.get('current_value', 0) / portfolio_data.get('total_value', 1)) * 100
            })
        
        return context
    
    def _parse_analysis_response(self, response_text: str) -> Dict[str, Any]:
        """Parse Claude's response into structured analysis data"""
        # This would parse the response and extract structured data
        # For now, returning the raw response with metadata
        return {
            'status': 'success',
            'timestamp': datetime.utcnow().isoformat(),
            'analysis': response_text,
            'structured_data': self._extract_structured_data(response_text)
        }
    
    def _extract_structured_data(self, text: str) -> Dict[str, Any]:
        """Extract structured data from analysis text"""
        # This would use regex or NLP to extract specific metrics
        # Placeholder implementation
        return {
            'asset_allocation': {},
            'geographic_allocation': {},
            'currency_allocation': {},
            'risk_metrics': {},
            'recommendations': []
        }
    
    def _generate_cache_key(self, portfolio_data: Dict[str, Any]) -> str:
        """Generate cache key for portfolio analysis"""
        holdings_hash = hash(json.dumps(
            sorted([h.get('symbol', '') for h in portfolio_data.get('holdings', [])]),
            sort_keys=True
        ))
        return f"{portfolio_data.get('portfolio_id')}_{holdings_hash}"
    
    async def get_fund_decomposition(self, isin: str) -> Dict[str, Any]:
        """
        Perform fund look-through analysis for ETFs and mutual funds
        
        Args:
            isin: International Securities Identification Number
        
        Returns:
            Dictionary containing fund composition and allocations
        """
        prompt = f"""Perform a detailed fund decomposition analysis for ISIN: {isin}
        
        Please provide:
        1. Underlying asset allocation
        2. Geographic distribution
        3. Sector breakdown
        4. Top holdings
        5. Currency exposure
        
        Format the response as structured data.
        """
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                temperature=0.3,  # Lower temperature for factual data
                system=self.system_prompt,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            return {
                'isin': isin,
                'decomposition': response.content[0].text,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'isin': isin,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    async def calculate_risk_metrics(self, portfolio_data: Dict[str, Any]) -> Dict[str, float]:
        """
        Calculate comprehensive risk metrics for the portfolio
        
        Args:
            portfolio_data: Portfolio holdings and values
        
        Returns:
            Dictionary of risk metrics
        """
        prompt = f"""Calculate the following risk metrics for this portfolio:
        
        Portfolio: {json.dumps(portfolio_data, indent=2, ensure_ascii=False)}
        
        Required metrics:
        - Expected annual return
        - Portfolio volatility
        - Sharpe ratio
        - Value at Risk (95%, 1 year)
        - Expected Shortfall (95%, 1 year)
        - Maximum drawdown
        - Diversification quotient
        
        Use German number formatting (comma as decimal separator).
        """
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                temperature=0.2,
                system=self.system_prompt,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Parse metrics from response
            return self._parse_risk_metrics(response.content[0].text)
            
        except Exception as e:
            return {'error': str(e)}
    
    def _parse_risk_metrics(self, response_text: str) -> Dict[str, float]:
        """Parse risk metrics from Claude's response"""
        # This would extract numerical values from the response
        # Placeholder implementation
        return {
            'expected_return': 0.0,
            'volatility': 0.0,
            'sharpe_ratio': 0.0,
            'var_95': 0.0,
            'expected_shortfall': 0.0,
            'max_drawdown': 0.0,
            'diversification_quotient': 0.0
        }
    
    async def generate_performance_report(self, portfolio_data: Dict[str, Any],
                                         comparison_data: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate a detailed performance report
        
        Args:
            portfolio_data: Current portfolio state
            comparison_data: Optional previous state for comparison
        
        Returns:
            Formatted performance report
        """
        if comparison_data:
            prompt = f"""Generate a before/after performance comparison report:
            
            Previous Portfolio: {json.dumps(comparison_data, indent=2, ensure_ascii=False)}
            Current Portfolio: {json.dumps(portfolio_data, indent=2, ensure_ascii=False)}
            
            Include tables showing changes in allocation, risk metrics, and performance.
            """
        else:
            prompt = f"""Generate a comprehensive performance report for:
            
            Portfolio: {json.dumps(portfolio_data, indent=2, ensure_ascii=False)}
            
            Include asset allocation, risk metrics, and performance attribution.
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
            
            return response.content[0].text
            
        except Exception as e:
            return f"Error generating report: {str(e)}"
    
    def get_conversation_context(self, conversation_history: List[Dict[str, str]]) -> str:
        """
        Maintain conversation context for multi-turn interactions
        
        Args:
            conversation_history: List of previous messages
        
        Returns:
            Formatted context string
        """
        context = "Previous conversation:\n"
        for msg in conversation_history[-5:]:  # Keep last 5 messages for context
            context += f"{msg['role']}: {msg['content']}\n"
        return context