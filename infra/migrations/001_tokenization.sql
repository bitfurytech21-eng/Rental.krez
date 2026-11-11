-- Migration 001: Tokenization Cap Table & Pro-Rata Yield Distribution Engine
-- Adds SPV tokenization parameters, Solana SPL contract tracking, and pro-rata distribution schedules.

ALTER TABLE properties ADD COLUMN IF NOT EXISTS solana_usdc_mint VARCHAR(128) DEFAULT 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS solana_spl_token_program VARCHAR(128) DEFAULT 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS solana_token_2022_program VARCHAR(128) DEFAULT 'TokenzQdBNbLqP5VEhdKAS6EPFLC1PHnBqCXEPpxuEb';

-- Daily Payment Configuration per SPV Vehicle
CREATE TABLE IF NOT EXISTS spv_distribution_configs (
    id VARCHAR(64) PRIMARY KEY,
    property_id VARCHAR(64) UNIQUE NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    approved_annual_percent NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    daily_rate_percent NUMERIC(8, 6) NOT NULL DEFAULT 0.027397,
    schedule VARCHAR(32) NOT NULL DEFAULT 'daily',
    distributable_funds_eur NUMERIC(18, 2) NOT NULL DEFAULT 50000.00,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Executed Dividend Runs Log
CREATE TABLE IF NOT EXISTS spv_distribution_runs (
    id VARCHAR(64) PRIMARY KEY,
    run_date DATE NOT NULL,
    total_disbursed_eur NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    property_count INTEGER NOT NULL DEFAULT 0,
    investor_count INTEGER NOT NULL DEFAULT 0,
    executed_by VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
