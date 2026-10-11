-- ====================================================================
-- V11: Create Reports Table for Buyer Reporting Workflow
-- ====================================================================

CREATE TABLE IF NOT EXISTS reports (
    id BIGSERIAL PRIMARY KEY,
    reporter_id BIGINT NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id BIGINT NOT NULL,
    category VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    resolution_notes TEXT,
    admin_internal_notes TEXT,
    resolved_by BIGINT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_reports_resolved_by FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_reports_target_type CHECK (target_type IN ('BUSINESS', 'SELLER')),
    CONSTRAINT chk_reports_category CHECK (category IN ('SCAM_OR_FRAUD', 'MISLEADING_INFORMATION', 'SUSPICIOUS_DOCUMENTS', 'OTHER')),
    CONSTRAINT chk_reports_status CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'))
);

-- Reconcile reports columns for legacy databases where reports table pre-existed
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
        WHERE table_name = 'reports' AND column_name = 'status' AND data_type = 'USER-DEFINED'
    ) THEN
        ALTER TABLE reports ALTER COLUMN status TYPE VARCHAR(32) USING status::text;
    END IF;
END $$;

-- Indexes for Reports
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Unique partial index to prevent duplicate active reports by the same buyer for the same target
CREATE UNIQUE INDEX IF NOT EXISTS uk_active_report_buyer_target
ON reports (reporter_id, target_type, target_id)
WHERE status IN ('OPEN', 'UNDER_REVIEW');
