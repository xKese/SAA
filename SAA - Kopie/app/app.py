"""
SAA Portfolio Management System - Main Flask Application
"""

from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import asyncio
import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional

from config.settings import (
    SECRET_KEY, DATABASE_URL, CORS_ORIGINS,
    SESSION_TYPE, DEBUG
)
from app.models.portfolio import Base, User, Portfolio, Holding, Conversation
from app.assistants.portfolio_analyst import PortfolioAnalystAssistant
from app.assistants.portfolio_optimizer import PortfolioOptimizerAssistant
from app.services.market_data import MarketDataService

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = SECRET_KEY
app.config['SESSION_TYPE'] = SESSION_TYPE

# Enable CORS
CORS(app, origins=CORS_ORIGINS)

# Initialize SocketIO for real-time chat
socketio = SocketIO(app, cors_allowed_origins=CORS_ORIGINS, async_mode='threading')

# Initialize database
engine = create_engine(DATABASE_URL)
Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Initialize assistants
analyst_assistant = PortfolioAnalystAssistant()
optimizer_assistant = PortfolioOptimizerAssistant()
market_service = MarketDataService()

# Store active sessions
active_sessions = {}


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_or_create_user(db: Session, session_id: str) -> User:
    """Get existing user or create new one based on session"""
    user = db.query(User).filter(User.user_id == session_id).first()
    if not user:
        user = User(
            user_id=session_id,
            email=f"{session_id}@temp.com",
            name="Guest User"
        )
        db.add(user)
        db.commit()
    return user


@app.route('/')
def index():
    """Main application page"""
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    return render_template('index.html')


@app.route('/api/portfolio', methods=['GET', 'POST'])
def manage_portfolio():
    """Get or create portfolio"""
    db = next(get_db())
    user = get_or_create_user(db, session.get('session_id'))
    
    if request.method == 'GET':
        # Get user's portfolios
        portfolios = db.query(Portfolio).filter(Portfolio.user_id == user.id).all()
        return jsonify({
            'portfolios': [
                {
                    'id': p.portfolio_id,
                    'name': p.name,
                    'total_value': p.total_value,
                    'currency': p.currency,
                    'holdings_count': len(p.holdings)
                } for p in portfolios
            ]
        })
    
    elif request.method == 'POST':
        # Create new portfolio
        data = request.json
        portfolio = Portfolio(
            name=data.get('name', 'My Portfolio'),
            description=data.get('description', ''),
            user_id=user.id,
            currency=data.get('currency', 'EUR'),
            risk_tolerance=data.get('risk_tolerance', 'moderate'),
            investment_horizon=data.get('investment_horizon', 5)
        )
        db.add(portfolio)
        db.commit()
        
        return jsonify({
            'portfolio_id': portfolio.portfolio_id,
            'message': 'Portfolio created successfully'
        })


@app.route('/api/portfolio/<portfolio_id>/holdings', methods=['GET', 'POST', 'PUT', 'DELETE'])
def manage_holdings(portfolio_id):
    """Manage portfolio holdings"""
    db = next(get_db())
    portfolio = db.query(Portfolio).filter(Portfolio.portfolio_id == portfolio_id).first()
    
    if not portfolio:
        return jsonify({'error': 'Portfolio not found'}), 404
    
    if request.method == 'GET':
        # Get all holdings
        holdings = [{
            'id': h.id,
            'symbol': h.symbol,
            'name': h.name,
            'quantity': h.quantity,
            'current_value': h.current_value,
            'asset_type': h.asset_type
        } for h in portfolio.holdings]
        
        return jsonify({'holdings': holdings})
    
    elif request.method == 'POST':
        # Add new holding
        data = request.json
        holding = Holding(
            portfolio_id=portfolio.id,
            symbol=data['symbol'],
            name=data.get('name', data['symbol']),
            quantity=data['quantity'],
            average_cost=data['average_cost'],
            asset_type=data.get('asset_type', 'stock')
        )
        db.add(holding)
        
        # Update portfolio total value
        portfolio.total_value = sum(h.current_value or 0 for h in portfolio.holdings)
        db.commit()
        
        return jsonify({'message': 'Holding added successfully'})
    
    return jsonify({'error': 'Method not allowed'}), 405


@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    session_id = session.get('session_id', str(uuid.uuid4()))
    join_room(session_id)
    active_sessions[request.sid] = session_id
    emit('connected', {'session_id': session_id})


@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    if request.sid in active_sessions:
        session_id = active_sessions[request.sid]
        leave_room(session_id)
        del active_sessions[request.sid]


@socketio.on('chat_message')
def handle_chat_message(data):
    """Handle incoming chat messages"""
    session_id = active_sessions.get(request.sid)
    if not session_id:
        emit('error', {'message': 'Session not found'})
        return
    
    assistant_type = data.get('assistant', 'analyst')
    message = data.get('message', '')
    portfolio_id = data.get('portfolio_id')
    
    # Get portfolio data if provided
    portfolio_data = None
    if portfolio_id:
        db = next(get_db())
        portfolio = db.query(Portfolio).filter(Portfolio.portfolio_id == portfolio_id).first()
        if portfolio:
            portfolio_data = {
                'portfolio_id': portfolio.portfolio_id,
                'total_value': portfolio.total_value,
                'currency': portfolio.currency,
                'risk_tolerance': portfolio.risk_tolerance,
                'investment_horizon': portfolio.investment_horizon,
                'holdings': [
                    {
                        'symbol': h.symbol,
                        'name': h.name,
                        'quantity': h.quantity,
                        'current_value': h.current_value,
                        'asset_type': h.asset_type,
                        'asset_class': h.asset_class
                    } for h in portfolio.holdings
                ]
            }
    
    # Process message with appropriate assistant
    asyncio.run(process_assistant_message(
        session_id,
        assistant_type,
        message,
        portfolio_data
    ))


async def process_assistant_message(session_id: str, 
                                   assistant_type: str,
                                   message: str,
                                   portfolio_data: Optional[Dict[str, Any]]):
    """Process message with the appropriate assistant"""
    try:
        # Show typing indicator
        socketio.emit('assistant_typing', {'assistant': assistant_type}, room=session_id)
        
        if assistant_type == 'analyst':
            # Use Portfolio Analyst
            if portfolio_data:
                response = await analyst_assistant.analyze_portfolio(portfolio_data, message)
            else:
                response = {
                    'analysis': "Please select or create a portfolio first to begin analysis.",
                    'status': 'no_portfolio'
                }
        
        elif assistant_type == 'optimizer':
            # Use Portfolio Optimizer
            if portfolio_data:
                # Extract constraints from message or use defaults
                constraints = {
                    'risk_tolerance': portfolio_data.get('risk_tolerance', 'moderate'),
                    'investment_horizon': portfolio_data.get('investment_horizon', 5)
                }
                response = await optimizer_assistant.optimize_portfolio(portfolio_data, constraints, message)
            else:
                response = {
                    'optimization': "Please select or create a portfolio first to begin optimization.",
                    'status': 'no_portfolio'
                }
        
        else:
            response = {'error': 'Unknown assistant type'}
        
        # Send response back to client
        socketio.emit('assistant_response', {
            'assistant': assistant_type,
            'response': response,
            'timestamp': datetime.utcnow().isoformat()
        }, room=session_id)
        
        # Save conversation to database
        save_conversation(session_id, assistant_type, message, response)
        
    except Exception as e:
        socketio.emit('error', {
            'message': f'Error processing message: {str(e)}'
        }, room=session_id)


def save_conversation(session_id: str, assistant_type: str, 
                     user_message: str, assistant_response: Dict[str, Any]):
    """Save conversation to database"""
    try:
        db = next(get_db())
        user = get_or_create_user(db, session_id)
        
        # Find or create conversation
        conversation = db.query(Conversation).filter(
            Conversation.user_id == user.id,
            Conversation.assistant_type == assistant_type
        ).first()
        
        if not conversation:
            conversation = Conversation(
                user_id=user.id,
                assistant_type=assistant_type,
                messages=[]
            )
            db.add(conversation)
        
        # Append new messages
        messages = conversation.messages or []
        messages.append({
            'role': 'user',
            'content': user_message,
            'timestamp': datetime.utcnow().isoformat()
        })
        messages.append({
            'role': 'assistant',
            'content': assistant_response,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        conversation.messages = messages
        conversation.last_message_at = datetime.utcnow()
        db.commit()
        
    except Exception as e:
        print(f"Error saving conversation: {e}")


@app.route('/api/market/search', methods=['POST'])
async def search_assets():
    """Search for assets"""
    data = request.json
    query = data.get('query', '')
    
    results = await market_service.search_assets(query)
    return jsonify({'results': results})


@app.route('/api/market/price/<symbol>')
async def get_asset_price(symbol):
    """Get current price for an asset"""
    data = await market_service.get_asset_data(symbol)
    return jsonify(data)


@app.route('/api/market/indicators')
async def get_market_indicators():
    """Get major market indicators"""
    indicators = await market_service.get_market_indicators()
    return jsonify(indicators)


@app.route('/api/conversation/history')
def get_conversation_history():
    """Get conversation history for current user"""
    db = next(get_db())
    user = get_or_create_user(db, session.get('session_id'))
    
    conversations = db.query(Conversation).filter(
        Conversation.user_id == user.id
    ).all()
    
    history = []
    for conv in conversations:
        history.append({
            'assistant': conv.assistant_type,
            'messages': conv.messages[-10:] if conv.messages else [],  # Last 10 messages
            'last_message': conv.last_message_at.isoformat() if conv.last_message_at else None
        })
    
    return jsonify({'history': history})


@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat()
    })


if __name__ == '__main__':
    socketio.run(app, debug=DEBUG, host='0.0.0.0', port=5000)