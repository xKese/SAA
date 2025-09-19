-- Migration: Create liquidity optimization tables
-- File: migrations/create_liquidity_optimization_tables.sql

-- Neue Tabelle für Optimierungsvorschläge
CREATE TABLE IF NOT EXISTS optimization_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES portfolios(id),
  liquidity_amount DECIMAL(20,2),
  optimization_strategy VARCHAR(50),
  proposal_data JSONB,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  executed_at TIMESTAMP,
  execution_details JSONB
);

-- Neue Tabelle für Trade-Historie
CREATE TABLE IF NOT EXISTS trade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES portfolios(id),
  proposal_id UUID REFERENCES optimization_proposals(id),
  instrument_isin VARCHAR(12),
  instrument_name TEXT,
  trade_type VARCHAR(10), -- 'BUY' oder 'SELL'
  quantity DECIMAL(20,8),
  price DECIMAL(20,4),
  value DECIMAL(20,2),
  currency VARCHAR(3),
  executed_at TIMESTAMP,
  execution_status VARCHAR(20)
);

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_optimization_portfolio ON optimization_proposals(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_portfolio ON trade_history(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_proposal ON trade_history(proposal_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_executed_at ON trade_history(executed_at);
CREATE INDEX IF NOT EXISTS idx_optimization_status ON optimization_proposals(status);
CREATE INDEX IF NOT EXISTS idx_optimization_created_at ON optimization_proposals(created_at);