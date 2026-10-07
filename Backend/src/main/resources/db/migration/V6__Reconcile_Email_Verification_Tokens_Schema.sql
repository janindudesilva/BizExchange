-- ====================================================================
-- V6: Reconcile email_verification_tokens columns with EmailVerificationToken entity
-- ====================================================================

-- 1. Rename expiry_date to expires_at if expiry_date exists and expires_at does not
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'email_verification_tokens' AND column_name = 'expiry_date'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'email_verification_tokens' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE email_verification_tokens RENAME COLUMN expiry_date TO expires_at;
    END IF;
END $$;

-- 2. Add expires_at if it still doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'email_verification_tokens' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE email_verification_tokens ADD COLUMN expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '24 hours');
    END IF;
END $$;

-- 3. Add verified_at if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'email_verification_tokens' AND column_name = 'verified_at'
    ) THEN
        ALTER TABLE email_verification_tokens ADD COLUMN verified_at TIMESTAMP;
    END IF;
END $$;

-- 4. Add created_at if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'email_verification_tokens' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE email_verification_tokens ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- 5. Add updated_at to reviews if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reviews' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE reviews ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;
