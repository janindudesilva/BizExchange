-- ====================================================================
-- V8: Drop NOT NULL constraint on legacy reviews table columns
-- ====================================================================

DO $$
DECLARE
    col_name text;
BEGIN
    FOR col_name IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'reviews' 
          AND column_name NOT IN ('id', 'seller_id', 'buyer_id', 'rating', 'created_at', 'updated_at')
          AND is_nullable = 'NO'
    LOOP
        EXECUTE 'ALTER TABLE reviews ALTER COLUMN ' || quote_ident(col_name) || ' DROP NOT NULL';
    END LOOP;
END $$;
