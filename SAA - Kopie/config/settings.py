"""
Application Configuration Settings
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Application Settings
APP_NAME = "SAA Portfolio Management System"
APP_VERSION = "1.0.0"
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")

# Database Configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{BASE_DIR}/data/portfolio.db"
)

# Claude AI Configuration
CLAUDE_API_KEY_ANALYST = os.getenv("CLAUDE_API_KEY_ANALYST")
CLAUDE_API_KEY_OPTIMIZER = os.getenv("CLAUDE_API_KEY_OPTIMIZER")
CLAUDE_MODEL = "claude-3-opus-20240229"
CLAUDE_MAX_TOKENS = 4096
CLAUDE_TEMPERATURE = 0.7

# Financial Data API Configuration
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
YAHOO_FINANCE_ENABLED = True

# Portfolio Analysis Settings
DEFAULT_RISK_FREE_RATE = 0.03  # 3% annual risk-free rate
DEFAULT_CONFIDENCE_LEVEL = 0.95  # 95% confidence for VaR calculations
DEFAULT_TIME_HORIZON = 252  # Trading days in a year

# Cache Configuration
CACHE_TYPE = "simple"
CACHE_DEFAULT_TIMEOUT = 3600  # 1 hour

# CORS Settings
CORS_ORIGINS = ["http://localhost:3000", "http://localhost:5000"]

# Session Configuration
SESSION_TYPE = "filesystem"
SESSION_FILE_DIR = f"{BASE_DIR}/data/sessions"
SESSION_PERMANENT = False
PERMANENT_SESSION_LIFETIME = 3600  # 1 hour

# Logging Configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = f"{BASE_DIR}/logs/app.log"
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# Security Settings
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# File Upload Settings
UPLOAD_FOLDER = f"{BASE_DIR}/data/uploads"
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
ALLOWED_EXTENSIONS = {"csv", "xlsx", "json"}

# Prompt File Paths
PORTFOLIO_ANALYST_PROMPT = f"{BASE_DIR}/Claude AI Agents/portfolio_analysis.md"
PORTFOLIO_OPTIMIZER_PROMPT = f"{BASE_DIR}/Claude AI Agents/portfolio_optimizer.md"