-- ============================================================================
-- L'Agence Institutional Real Estate Platform - Database DDL Schema (PostgreSQL)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users & Investor Profiles
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'investor', -- 'investor', 'admin'
    investor_type VARCHAR(64) DEFAULT 'individual_investor',
    kyc_status VARCHAR(32) NOT NULL DEFAULT 'unverified', -- 'unverified', 'pending', 'verified', 'rejected'
    wallet_balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
    country VARCHAR(64),
    phone_number VARCHAR(64),
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Properties & SPV Vehicles
CREATE TABLE IF NOT EXISTS properties (
    id VARCHAR(64) PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    city VARCHAR(128) NOT NULL,
    country VARCHAR(128) NOT NULL,
    type VARCHAR(64) NOT NULL, -- 'Residential', 'Commercial', 'Coliving', 'Vacation Rental'
    status VARCHAR(32) NOT NULL DEFAULT 'funding', -- 'funding', 'funded', 'upcoming', 'hidden'
    target_amount NUMERIC(18, 2) NOT NULL,
    funded_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    token_price NUMERIC(18, 2) NOT NULL DEFAULT 100.00,
    total_tokens INTEGER NOT NULL,
    available_tokens INTEGER NOT NULL,
    estimated_annual_yield NUMERIC(5, 2) NOT NULL,
    capital_appreciation_yield NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    duration_months INTEGER NOT NULL DEFAULT 36,
    token_ticker VARCHAR(32) NOT NULL,
    blockchain_network VARCHAR(64) NOT NULL DEFAULT 'Polygon POS',
    token_contract_address VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tokenization Cap Table Holdings
CREATE TABLE IF NOT EXISTS spv_token_holdings (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tokens_owned INTEGER NOT NULL DEFAULT 0,
    total_invested_eur NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    ownership_percentage NUMERIC(7, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, property_id)
);

-- Financial Transactions & Double-Entry Ledger
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL, -- 'deposit', 'withdrawal', 'investment', 'distribution', 'refund'
    amount NUMERIC(18, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
    status VARCHAR(32) NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'approved', 'rejected'
    method VARCHAR(128),
    reference VARCHAR(255),
    property_id VARCHAR(64) REFERENCES properties(id),
    tx_hash VARCHAR(255),
    balance_after NUMERIC(18, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Property Legal Documents Hub
CREATE TABLE IF NOT EXISTS property_documents (
    id VARCHAR(64) PRIMARY KEY,
    property_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL, -- 'Legal', 'Financial', 'RICS Appraisal', 'Insurance'
    size VARCHAR(32),
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Compliance Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    admin_id VARCHAR(64),
    admin_email VARCHAR(255) NOT NULL,
    action VARCHAR(128) NOT NULL,
    details TEXT NOT NULL,
    category VARCHAR(32) DEFAULT 'system',
    severity VARCHAR(32) DEFAULT 'info',
    ip_address VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
