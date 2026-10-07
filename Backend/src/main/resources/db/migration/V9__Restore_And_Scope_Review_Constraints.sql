-- ====================================================================
-- V9: Explicitly enforce NOT NULL constraints on core reviews table columns
-- ====================================================================

DO $$
BEGIN
    -- Ensure required columns for reviews retain NOT NULL constraints
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'seller_id') THEN
        ALTER TABLE reviews ALTER COLUMN seller_id SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'buyer_id') THEN
        ALTER TABLE reviews ALTER COLUMN buyer_id SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'rating') THEN
        ALTER TABLE reviews ALTER COLUMN rating SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'created_at') THEN
        ALTER TABLE reviews ALTER COLUMN created_at SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'updated_at') THEN
        ALTER TABLE reviews ALTER COLUMN updated_at SET NOT NULL;
    END IF;
END $$;
