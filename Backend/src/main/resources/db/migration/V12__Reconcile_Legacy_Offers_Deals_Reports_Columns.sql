-- ====================================================================
-- V12: Reconcile Legacy Pre-Baseline Schema Columns for Offers, Deals, and Reports
-- ====================================================================

-- 1. Reconcile deals columns for databases where legacy deals table pre-existed
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'agreed_price') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'final_price') THEN
            ALTER TABLE deals RENAME COLUMN final_price TO agreed_price;
        ELSE
            ALTER TABLE deals ADD COLUMN agreed_price NUMERIC(15, 2) NOT NULL DEFAULT 1.00 CHECK (agreed_price > 0);
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'currency') THEN
        ALTER TABLE deals ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'LKR';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'buyer_confirmed_at') THEN
        ALTER TABLE deals ADD COLUMN buyer_confirmed_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'seller_confirmed_at') THEN
        ALTER TABLE deals ADD COLUMN seller_confirmed_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'cancellation_requested_by') THEN
        ALTER TABLE deals ADD COLUMN cancellation_requested_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'cancellation_reason') THEN
        ALTER TABLE deals ADD COLUMN cancellation_reason TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'cancellation_requested_at') THEN
        ALTER TABLE deals ADD COLUMN cancellation_requested_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'notes') THEN
        ALTER TABLE deals ADD COLUMN notes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'closed_at') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'completed_at') THEN
            ALTER TABLE deals RENAME COLUMN completed_at TO closed_at;
        ELSE
            ALTER TABLE deals ADD COLUMN closed_at TIMESTAMP;
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'created_at') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'started_at') THEN
            ALTER TABLE deals RENAME COLUMN started_at TO created_at;
        ELSE
            ALTER TABLE deals ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'updated_at') THEN
        ALTER TABLE deals ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'deals' AND column_name = 'status' AND (data_type = 'USER-DEFINED' OR udt_name = 'deal_status')
    ) THEN
        DROP INDEX IF EXISTS uk_active_deal_business;
        ALTER TABLE deals ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE deals ALTER COLUMN status TYPE VARCHAR(30) USING status::text;
        ALTER TABLE deals ALTER COLUMN status SET DEFAULT 'IN_PROGRESS';
        CREATE UNIQUE INDEX IF NOT EXISTS uk_active_deal_business
        ON deals (business_id)
        WHERE status = 'IN_PROGRESS';
    END IF;
    ALTER TABLE deals ALTER COLUMN status SET DEFAULT 'IN_PROGRESS';
END $$;

-- 2. Reconcile offers columns for databases where legacy offers table pre-existed
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'amount') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'offer_amount') THEN
            ALTER TABLE offers RENAME COLUMN offer_amount TO amount;
        ELSE
            ALTER TABLE offers ADD COLUMN amount NUMERIC(15, 2) NOT NULL DEFAULT 1.00 CHECK (amount > 0);
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'currency') THEN
        ALTER TABLE offers ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'LKR';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'inquiry_id') THEN
        ALTER TABLE offers ADD COLUMN inquiry_id BIGINT REFERENCES inquiries(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'rejection_reason') THEN
        ALTER TABLE offers ADD COLUMN rejection_reason TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'expires_at') THEN
        ALTER TABLE offers ADD COLUMN expires_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'created_at') THEN
        ALTER TABLE offers ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'updated_at') THEN
        ALTER TABLE offers ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'offers' AND column_name = 'status' AND (data_type = 'USER-DEFINED' OR udt_name = 'offer_status')
    ) THEN
        DROP INDEX IF EXISTS uk_pending_offer_buyer_business;
        ALTER TABLE offers ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE offers ALTER COLUMN status TYPE VARCHAR(30) USING status::text;
        ALTER TABLE offers ALTER COLUMN status SET DEFAULT 'PENDING';
        CREATE UNIQUE INDEX IF NOT EXISTS uk_pending_offer_buyer_business
        ON offers (buyer_id, business_id)
        WHERE status = 'PENDING';
    END IF;
    ALTER TABLE offers ALTER COLUMN status SET DEFAULT 'PENDING';
END $$;

-- 3. Reconcile reports columns for databases where legacy reports table pre-existed
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'target_type') THEN
        ALTER TABLE reports ADD COLUMN target_type VARCHAR(32);
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'business_id') THEN
            UPDATE reports SET target_type = 'BUSINESS' WHERE business_id IS NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'reported_user_id') THEN
            UPDATE reports SET target_type = 'SELLER' WHERE reported_user_id IS NOT NULL AND target_type IS NULL;
        END IF;
        UPDATE reports SET target_type = 'BUSINESS' WHERE target_type IS NULL;
        ALTER TABLE reports ALTER COLUMN target_type SET NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'target_id') THEN
        ALTER TABLE reports ADD COLUMN target_id BIGINT;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'business_id') THEN
            UPDATE reports SET target_id = business_id WHERE business_id IS NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'reported_user_id') THEN
            UPDATE reports SET target_id = reported_user_id WHERE reported_user_id IS NOT NULL AND target_id IS NULL;
        END IF;
        UPDATE reports SET target_id = 1 WHERE target_id IS NULL;
        ALTER TABLE reports ALTER COLUMN target_id SET NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'category') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'reason') THEN
            ALTER TABLE reports RENAME COLUMN reason TO category;
            ALTER TABLE reports ALTER COLUMN category TYPE VARCHAR(64);
        ELSE
            ALTER TABLE reports ADD COLUMN category VARCHAR(64) NOT NULL DEFAULT 'OTHER';
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'resolution_notes') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'review_note') THEN
            ALTER TABLE reports RENAME COLUMN review_note TO resolution_notes;
        ELSE
            ALTER TABLE reports ADD COLUMN resolution_notes TEXT;
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'admin_internal_notes') THEN
        ALTER TABLE reports ADD COLUMN admin_internal_notes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'resolved_by') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'reviewed_by') THEN
            ALTER TABLE reports RENAME COLUMN reviewed_by TO resolved_by;
        ELSE
            ALTER TABLE reports ADD COLUMN resolved_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'resolved_at') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'reviewed_at') THEN
            ALTER TABLE reports RENAME COLUMN reviewed_at TO resolved_at;
        ELSE
            ALTER TABLE reports ADD COLUMN resolved_at TIMESTAMP;
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'updated_at') THEN
        ALTER TABLE reports ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reports' AND column_name = 'status' AND (data_type = 'USER-DEFINED' OR udt_name = 'report_status')
    ) THEN
        DROP INDEX IF EXISTS uk_active_report_buyer_target;
        ALTER TABLE reports ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE reports ALTER COLUMN status TYPE VARCHAR(32) USING status::text;
        ALTER TABLE reports ALTER COLUMN status SET DEFAULT 'OPEN';
        CREATE UNIQUE INDEX IF NOT EXISTS uk_active_report_buyer_target
        ON reports (reporter_id, target_type, target_id)
        WHERE status IN ('OPEN', 'UNDER_REVIEW');
    END IF;
    ALTER TABLE reports ALTER COLUMN status SET DEFAULT 'OPEN';
END $$;

-- 4. Ensure required indexes exist
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_created_at ON offers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
