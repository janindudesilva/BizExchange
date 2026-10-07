-- ====================================================================
-- V5: Add Token Version, Safe Column Reconciliation, and Concurrency Index
-- ====================================================================

-- 1. Ensure token_version exists on users table for session revocation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'token_version'
    ) THEN
        ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 1;
    END IF;
END $$;

-- 2. Ensure password_change_otps has otp_hash and integer attempt_count
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'password_change_otps' AND column_name = 'otp_hash'
    ) THEN
        ALTER TABLE password_change_otps ADD COLUMN otp_hash VARCHAR(72);
        -- If existing table had otp_code, copy over placeholder if needed
        UPDATE password_change_otps SET otp_hash = '$2a$10$eO1vQW9z1rVw0Z5A9mK8uO7X7fK3o1l7yF1g2h3i4j5k6l7m8n9o0' WHERE otp_hash IS NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'password_change_otps' AND column_name = 'attempt_count' AND data_type = 'character varying'
    ) THEN
        ALTER TABLE password_change_otps ALTER COLUMN attempt_count DROP DEFAULT;
        ALTER TABLE password_change_otps ALTER COLUMN attempt_count TYPE INT USING (
            CASE WHEN attempt_count ~ '^[0-9]+$' THEN attempt_count::INT ELSE 0 END
        );
        ALTER TABLE password_change_otps ALTER COLUMN attempt_count SET DEFAULT 0;
    END IF;
END $$;

-- 3. Ensure verification_status enum in PostgreSQL includes NEEDS_MORE_INFORMATION
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'NEEDS_MORE_INFORMATION';
    END IF;
END $$;

-- 4. Deduplicate any open inquiries before creating unique partial index
-- Keep only the newest active/pending inquiry per buyer & business if any duplicates exist
DELETE FROM inquiries i1
USING inquiries i2
WHERE i1.buyer_id = i2.buyer_id
  AND i1.business_id = i2.business_id
  AND i1.status IN ('PENDING_APPROVAL', 'ACTIVE')
  AND i2.status IN ('PENDING_APPROVAL', 'ACTIVE')
  AND i1.id < i2.id;

-- 5. Concurrency Protection: at most one open inquiry per buyer and business
CREATE UNIQUE INDEX IF NOT EXISTS uk_open_inquiry_buyer_business
ON inquiries (buyer_id, business_id)
WHERE status IN ('PENDING_APPROVAL', 'ACTIVE');
