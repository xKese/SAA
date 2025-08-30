"""
Test cases for Portfolio data models
"""

import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.portfolio import Base, User, Portfolio, Holding, Transaction, PortfolioAnalysis


class TestPortfolioModels:
    """Test portfolio data models"""
    
    @pytest.fixture(scope="function")
    def db_session(self):
        """Create test database session"""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        
        Session = sessionmaker(bind=engine)
        session = Session()
        
        yield session
        
        session.close()
    
    @pytest.fixture
    def sample_user(self, db_session):
        """Create sample user for testing"""
        user = User(
            user_id="test-user-123",
            email="test@example.com",
            name="Test User"
        )
        db_session.add(user)
        db_session.commit()
        return user
    
    @pytest.fixture
    def sample_portfolio(self, db_session, sample_user):
        """Create sample portfolio for testing"""
        portfolio = Portfolio(
            name="Test Portfolio",
            description="Test portfolio for unit tests",
            user_id=sample_user.id,
            currency="EUR",
            total_value=50000.0,
            risk_tolerance="moderate",
            investment_horizon=5
        )
        db_session.add(portfolio)
        db_session.commit()
        return portfolio
    
    def test_create_user(self, db_session):
        """Test user creation"""
        user = User(
            user_id="test-user-456",
            email="testuser@example.com",
            name="John Doe"
        )
        
        db_session.add(user)
        db_session.commit()
        
        # Verify user was created
        retrieved_user = db_session.query(User).filter(User.user_id == "test-user-456").first()
        assert retrieved_user is not None
        assert retrieved_user.email == "testuser@example.com"
        assert retrieved_user.name == "John Doe"
    
    def test_create_portfolio(self, db_session, sample_user):
        """Test portfolio creation"""
        portfolio = Portfolio(
            name="My Investment Portfolio",
            description="Long-term investment portfolio",
            user_id=sample_user.id,
            currency="USD",
            total_value=100000.0,
            risk_tolerance="aggressive",
            investment_horizon=10
        )
        
        db_session.add(portfolio)
        db_session.commit()
        
        # Verify portfolio was created
        retrieved_portfolio = db_session.query(Portfolio).filter(
            Portfolio.name == "My Investment Portfolio"
        ).first()
        
        assert retrieved_portfolio is not None
        assert retrieved_portfolio.currency == "USD"
        assert retrieved_portfolio.total_value == 100000.0
        assert retrieved_portfolio.risk_tolerance == "aggressive"
        assert retrieved_portfolio.owner.id == sample_user.id
    
    def test_create_holding(self, db_session, sample_portfolio):
        """Test holding creation"""
        holding = Holding(
            portfolio_id=sample_portfolio.id,
            symbol="AAPL",
            isin="US0378331005",
            name="Apple Inc.",
            asset_type="stock",
            asset_class="equity",
            quantity=100.0,
            average_cost=150.00,
            current_price=180.00,
            current_value=18000.00,
            region="USA",
            country="United States",
            currency="USD",
            sector="Technology"
        )
        
        db_session.add(holding)
        db_session.commit()
        
        # Verify holding was created
        retrieved_holding = db_session.query(Holding).filter(
            Holding.symbol == "AAPL"
        ).first()
        
        assert retrieved_holding is not None
        assert retrieved_holding.name == "Apple Inc."
        assert retrieved_holding.quantity == 100.0
        assert retrieved_holding.current_value == 18000.00
        assert retrieved_holding.portfolio.id == sample_portfolio.id
    
    def test_create_transaction(self, db_session, sample_portfolio):
        """Test transaction creation"""
        transaction = Transaction(
            portfolio_id=sample_portfolio.id,
            transaction_type="buy",
            symbol="MSFT",
            quantity=50.0,
            price=250.00,
            total_amount=12500.00,
            fees=9.95,
            currency="USD",
            transaction_date=datetime(2024, 1, 15, 10, 30, 0)
        )
        
        db_session.add(transaction)
        db_session.commit()
        
        # Verify transaction was created
        retrieved_transaction = db_session.query(Transaction).filter(
            Transaction.symbol == "MSFT"
        ).first()
        
        assert retrieved_transaction is not None
        assert retrieved_transaction.transaction_type == "buy"
        assert retrieved_transaction.quantity == 50.0
        assert retrieved_transaction.total_amount == 12500.00
        assert retrieved_transaction.fees == 9.95
    
    def test_portfolio_analysis_creation(self, db_session, sample_portfolio):
        """Test portfolio analysis creation"""
        analysis = PortfolioAnalysis(
            portfolio_id=sample_portfolio.id,
            analysis_type="current",
            asset_allocation={
                "equity": 70.0,
                "fixed_income": 25.0,
                "cash": 5.0
            },
            geographic_allocation={
                "USA": 50.0,
                "Europe": 30.0,
                "Asia": 20.0
            },
            currency_allocation={
                "USD": 60.0,
                "EUR": 30.0,
                "GBP": 10.0
            },
            expected_return=0.08,
            portfolio_volatility=0.15,
            sharpe_ratio=1.2,
            value_at_risk_95=-0.12,
            expected_shortfall_95=-0.18,
            max_drawdown=-0.25,
            diversification_ratio=0.85
        )
        
        db_session.add(analysis)
        db_session.commit()
        
        # Verify analysis was created
        retrieved_analysis = db_session.query(PortfolioAnalysis).filter(
            PortfolioAnalysis.portfolio_id == sample_portfolio.id
        ).first()
        
        assert retrieved_analysis is not None
        assert retrieved_analysis.analysis_type == "current"
        assert retrieved_analysis.expected_return == 0.08
        assert retrieved_analysis.sharpe_ratio == 1.2
        assert retrieved_analysis.asset_allocation["equity"] == 70.0
    
    def test_portfolio_holdings_relationship(self, db_session, sample_portfolio):
        """Test portfolio-holdings relationship"""
        # Create multiple holdings
        holding1 = Holding(
            portfolio_id=sample_portfolio.id,
            symbol="AAPL",
            name="Apple Inc.",
            asset_type="stock",
            quantity=100.0,
            current_value=18000.00
        )
        
        holding2 = Holding(
            portfolio_id=sample_portfolio.id,
            symbol="GOOGL",
            name="Alphabet Inc.",
            asset_type="stock",
            quantity=50.0,
            current_value=15000.00
        )
        
        db_session.add_all([holding1, holding2])
        db_session.commit()
        
        # Test relationship
        portfolio = db_session.query(Portfolio).filter(
            Portfolio.id == sample_portfolio.id
        ).first()
        
        assert len(portfolio.holdings) == 2
        symbols = [h.symbol for h in portfolio.holdings]
        assert "AAPL" in symbols
        assert "GOOGL" in symbols
    
    def test_user_portfolios_relationship(self, db_session, sample_user):
        """Test user-portfolios relationship"""
        # Create multiple portfolios for the same user
        portfolio1 = Portfolio(
            name="Growth Portfolio",
            user_id=sample_user.id,
            total_value=75000.0
        )
        
        portfolio2 = Portfolio(
            name="Income Portfolio",
            user_id=sample_user.id,
            total_value=50000.0
        )
        
        db_session.add_all([portfolio1, portfolio2])
        db_session.commit()
        
        # Test relationship
        user = db_session.query(User).filter(User.id == sample_user.id).first()
        
        assert len(user.portfolios) == 2
        portfolio_names = [p.name for p in user.portfolios]
        assert "Growth Portfolio" in portfolio_names
        assert "Income Portfolio" in portfolio_names
    
    def test_cascade_delete(self, db_session, sample_user):
        """Test cascade delete functionality"""
        # Create portfolio with holdings
        portfolio = Portfolio(
            name="Delete Test Portfolio",
            user_id=sample_user.id,
            total_value=25000.0
        )
        db_session.add(portfolio)
        db_session.commit()
        
        # Add holdings
        holding1 = Holding(
            portfolio_id=portfolio.id,
            symbol="TEST1",
            name="Test Stock 1",
            asset_type="stock",
            quantity=100.0,
            current_value=10000.00
        )
        
        holding2 = Holding(
            portfolio_id=portfolio.id,
            symbol="TEST2",
            name="Test Stock 2",
            asset_type="stock",
            quantity=50.0,
            current_value=15000.00
        )
        
        db_session.add_all([holding1, holding2])
        db_session.commit()
        
        # Verify holdings exist
        holdings_count = db_session.query(Holding).filter(
            Holding.portfolio_id == portfolio.id
        ).count()
        assert holdings_count == 2
        
        # Delete portfolio
        db_session.delete(portfolio)
        db_session.commit()
        
        # Verify holdings were cascaded deleted
        holdings_count_after = db_session.query(Holding).filter(
            Holding.portfolio_id == portfolio.id
        ).count()
        assert holdings_count_after == 0