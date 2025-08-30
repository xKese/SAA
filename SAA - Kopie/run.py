#!/usr/bin/env python3
"""
SAA Portfolio Management System - Application Launcher
"""

import os
import sys
from pathlib import Path

# Add the app directory to the Python path
app_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(app_dir))

# Import and run the Flask application
from app.app import app, socketio

if __name__ == '__main__':
    # Check if environment file exists
    env_file = app_dir / '.env'
    if not env_file.exists():
        print("⚠️  Warning: .env file not found!")
        print("Please copy .env.example to .env and configure your settings.")
        print("The application will run with default settings.")
    
    # Create necessary directories
    data_dir = app_dir / 'data'
    logs_dir = app_dir / 'logs'
    sessions_dir = data_dir / 'sessions'
    uploads_dir = data_dir / 'uploads'
    
    for directory in [data_dir, logs_dir, sessions_dir, uploads_dir]:
        directory.mkdir(parents=True, exist_ok=True)
    
    print("🚀 Starting SAA Portfolio Management System...")
    print("📊 Portfolio Analyst and Optimizer AI assistants ready")
    print("🌐 Access the application at: http://localhost:5000")
    
    # Run the application
    socketio.run(
        app,
        debug=os.getenv('DEBUG', 'False').lower() == 'true',
        host='0.0.0.0',
        port=int(os.getenv('PORT', 5000))
    )