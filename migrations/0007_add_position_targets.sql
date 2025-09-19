-- Migration: Add position targets table for individual security position targets
-- Date: 2024-12-09

-- Create position_targets table
CREATE TABLE IF NOT EXISTS position_targets (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id VARCHAR(255) NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    target_structure_id VARCHAR(255) REFERENCES portfolio_targets(id) ON DELETE SET NULL,
    position_name TEXT NOT NULL,
    isin TEXT,
    target_percentage DECIMAL(5,2) NOT NULL CHECK (target_percentage >= 0 AND target_percentage <= 100),
    target_value DECIMAL(15,2),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    is_active TEXT DEFAULT 'true',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_position_targets_portfolio_id ON position_targets(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_position_targets_target_structure_id ON position_targets(target_structure_id);
CREATE INDEX IF NOT EXISTS idx_position_targets_position_name ON position_targets(position_name);
CREATE INDEX IF NOT EXISTS idx_position_targets_isin ON position_targets(isin);

-- Add a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_position_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_position_targets_updated_at
    BEFORE UPDATE ON position_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_position_targets_updated_at();

-- Add comment to table
COMMENT ON TABLE position_targets IS 'Individual security position targets for portfolio rebalancing';
COMMENT ON COLUMN position_targets.position_name IS 'Name of the security position';
COMMENT ON COLUMN position_targets.isin IS 'Optional ISIN for exact matching';
COMMENT ON COLUMN position_targets.target_percentage IS 'Target allocation percentage (0-100)';
COMMENT ON COLUMN position_targets.target_value IS 'Calculated target value in EUR';
COMMENT ON COLUMN position_targets.priority IS 'Priority level for rebalancing (high, medium, low)';