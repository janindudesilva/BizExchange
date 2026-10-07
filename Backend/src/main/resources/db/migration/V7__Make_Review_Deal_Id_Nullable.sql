-- ====================================================================
-- V7: Allow reviews without deal_id for direct seller inquiry reviews
-- ====================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reviews' AND column_name = 'deal_id'
    ) THEN
        ALTER TABLE reviews ALTER COLUMN deal_id DROP NOT NULL;
    END IF;
END $$;
