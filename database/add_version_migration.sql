-- ====================================================================
-- Migration: Add version column for Optimistic Locking (@Version)
-- Tables affected: businesses, support_tickets, seller_profiles
-- Safe to run on existing databases (idempotent with IF NOT EXISTS)
-- ====================================================================

DO $$
BEGIN
    -- 1. Businesses
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' AND column_name = 'version'
    ) THEN
        ALTER TABLE businesses ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added version column to businesses table';
    END IF;

    -- 2. Support Tickets
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_tickets' AND column_name = 'version'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added version column to support_tickets table';
    END IF;

    -- 3. Seller Profiles
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'seller_profiles' AND column_name = 'version'
    ) THEN
        ALTER TABLE seller_profiles ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added version column to seller_profiles table';
    END IF;
END $$;

-- Verification Query:
-- SELECT table_name, column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name IN ('businesses', 'support_tickets', 'seller_profiles')
--   AND column_name = 'version';
