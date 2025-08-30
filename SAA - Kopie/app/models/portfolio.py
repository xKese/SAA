"""
Portfolio Data Models
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, Session
from sqlalchemy import create_engine
from pydantic import BaseModel, Field, validator
import uuid

Base = declarative_base()


class User(Base):
    """User model for portfolio ownership"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(100), unique=True, index=True)
    name = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    portfolios = relationship("Portfolio", back_populates="owner")
    conversations = relationship("Conversation", back_populates="user")


class Portfolio(Base):
    """Portfolio model containing multiple holdings"""
    __tablename__ = "portfolios"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(String(50), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100))
    description = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"))
    currency = Column(String(3), default="EUR")
    total_value = Column(Float, default=0.0)
    cash_balance = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Risk profile
    risk_tolerance = Column(String(20), default="moderate")  # conservative, moderate, aggressive
    investment_horizon = Column(Integer, default=5)  # years
    
    # Relationships
    owner = relationship("User", back_populates="portfolios")
    holdings = relationship("Holding", back_populates="portfolio", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="portfolio")
    analyses = relationship("PortfolioAnalysis", back_populates="portfolio")


class Holding(Base):
    """Individual holding within a portfolio"""
    __tablename__ = "holdings"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"))
    
    # Asset identification
    symbol = Column(String(20), index=True)
    isin = Column(String(12), index=True)
    name = Column(String(200))
    asset_type = Column(String(50))  # stock, bond, etf, fund, cash, commodity
    asset_class = Column(String(50))  # equity, fixed_income, alternative, cash
    
    # Position details
    quantity = Column(Float)
    average_cost = Column(Float)
    current_price = Column(Float)
    current_value = Column(Float)
    
    # Geographic and currency exposure
    region = Column(String(50))  # USA, Europe, Asia-Pacific, Emerging Markets
    country = Column(String(50))
    currency = Column(String(3))
    
    # Additional metadata
    sector = Column(String(100))
    exchange = Column(String(50))
    last_updated = Column(DateTime, default=datetime.utcnow)
    
    # Fund-specific data (for ETFs and mutual funds)
    is_fund = Column(Boolean, default=False)
    fund_composition = Column(JSON)  # Stores underlying asset allocation
    expense_ratio = Column(Float)
    
    # Relationships
    portfolio = relationship("Portfolio", back_populates="holdings")


class Transaction(Base):
    """Transaction history for portfolio"""
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"))
    transaction_id = Column(String(50), unique=True, default=lambda: str(uuid.uuid4()))
    
    # Transaction details
    transaction_type = Column(String(20))  # buy, sell, dividend, deposit, withdrawal
    symbol = Column(String(20))
    quantity = Column(Float)
    price = Column(Float)
    total_amount = Column(Float)
    fees = Column(Float, default=0.0)
    currency = Column(String(3))
    
    # Timestamps
    transaction_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    portfolio = relationship("Portfolio", back_populates="transactions")


class PortfolioAnalysis(Base):
    """Stored portfolio analysis results"""
    __tablename__ = "portfolio_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"))
    analysis_id = Column(String(50), unique=True, default=lambda: str(uuid.uuid4()))
    
    # Analysis metadata
    analysis_type = Column(String(50))  # current, optimization, simulation
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Asset allocation
    asset_allocation = Column(JSON)
    geographic_allocation = Column(JSON)
    currency_allocation = Column(JSON)
    sector_allocation = Column(JSON)
    
    # Risk metrics
    expected_return = Column(Float)
    portfolio_volatility = Column(Float)
    sharpe_ratio = Column(Float)
    value_at_risk_95 = Column(Float)
    expected_shortfall_95 = Column(Float)
    max_drawdown = Column(Float)
    diversification_ratio = Column(Float)
    
    # Additional analysis data
    correlation_matrix = Column(JSON)
    efficient_frontier = Column(JSON)
    recommendations = Column(JSON)
    
    # Relationships
    portfolio = relationship("Portfolio", back_populates="analyses")


class Conversation(Base):
    """Chat conversation history"""
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    conversation_id = Column(String(50), unique=True, default=lambda: str(uuid.uuid4()))
    assistant_type = Column(String(20))  # analyst, optimizer
    
    # Conversation data
    messages = Column(JSON)  # List of message objects
    context = Column(JSON)  # Additional context for the conversation
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    last_message_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="conversations")


# Pydantic models for API validation
class HoldingCreate(BaseModel):
    """Schema for creating a new holding"""
    symbol: str
    isin: Optional[str] = None
    name: str
    quantity: float
    average_cost: float
    asset_type: str
    
    @validator('asset_type')
    def validate_asset_type(cls, v):
        valid_types = ['stock', 'bond', 'etf', 'fund', 'cash', 'commodity']
        if v.lower() not in valid_types:
            raise ValueError(f'Asset type must be one of {valid_types}')
        return v.lower()


class PortfolioCreate(BaseModel):
    """Schema for creating a new portfolio"""
    name: str
    description: Optional[str] = None
    currency: str = "EUR"
    risk_tolerance: str = "moderate"
    investment_horizon: int = 5
    
    @validator('risk_tolerance')
    def validate_risk_tolerance(cls, v):
        valid_levels = ['conservative', 'moderate', 'aggressive']
        if v.lower() not in valid_levels:
            raise ValueError(f'Risk tolerance must be one of {valid_levels}')
        return v.lower()
    
    @validator('currency')
    def validate_currency(cls, v):
        valid_currencies = ['EUR', 'USD', 'GBP', 'CHF', 'JPY']
        if v.upper() not in valid_currencies:
            raise ValueError(f'Currency must be one of {valid_currencies}')
        return v.upper()


class TransactionCreate(BaseModel):
    """Schema for recording a transaction"""
    transaction_type: str
    symbol: str
    quantity: float
    price: float
    fees: float = 0.0
    transaction_date: datetime
    
    @validator('transaction_type')
    def validate_transaction_type(cls, v):
        valid_types = ['buy', 'sell', 'dividend', 'deposit', 'withdrawal']
        if v.lower() not in valid_types:
            raise ValueError(f'Transaction type must be one of {valid_types}')
        return v.lower()


class AnalysisRequest(BaseModel):
    """Schema for requesting portfolio analysis"""
    portfolio_id: str
    analysis_type: str = "current"
    include_optimization: bool = False
    target_return: Optional[float] = None
    max_risk: Optional[float] = None
    
    @validator('analysis_type')
    def validate_analysis_type(cls, v):
        valid_types = ['current', 'optimization', 'simulation', 'stress_test']
        if v.lower() not in valid_types:
            raise ValueError(f'Analysis type must be one of {valid_types}')
        return v.lower()


class ChatMessage(BaseModel):
    """Schema for chat messages"""
    role: str  # user, assistant
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = None