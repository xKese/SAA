"""
Test configuration and fixtures for the SAA Portfolio Management System
"""

import pytest
import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.portfolio import Base


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def test_db_engine():
    """Create test database engine"""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture(scope="function")
def db_session(test_db_engine):
    """Create database session for testing"""
    Session = sessionmaker(bind=test_db_engine)
    session = Session()
    
    yield session
    
    # Cleanup
    session.rollback()
    session.close()


# Test configuration
pytest_plugins = ['pytest_asyncio']