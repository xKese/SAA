-- Migration: Add investment_universe table for storing extracted fund names
-- Date: 2025-01-10

CREATE TABLE IF NOT EXISTS investment_universe (
  id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL UNIQUE,
  factsheet_path TEXT NOT NULL,
  extracted_name TEXT, -- Name extracted by Claude AI
  display_name TEXT, -- The name to display (extractedName or fallback)
  isin TEXT,
  asset_class TEXT NOT NULL,
  category TEXT NOT NULL,
  last_name_extraction TIMESTAMP,
  last_analyzed TIMESTAMP,
  factsheet_data JSON, -- Additional extracted data
  confidence DECIMAL(3, 2), -- 0.00 to 1.00
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_investment_universe_file_name ON investment_universe(file_name);
CREATE INDEX idx_investment_universe_isin ON investment_universe(isin);
CREATE INDEX idx_investment_universe_asset_class ON investment_universe(asset_class);
CREATE INDEX idx_investment_universe_category ON investment_universe(category);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_investment_universe_updated_at
  BEFORE UPDATE ON investment_universe
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();