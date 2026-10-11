-- ====================================================================
-- V10: Create Offers and Deals Tables with Confirmation, Cancellation, and Integrity Constraints
-- ====================================================================

-- 1. Ensure deal_status enum includes IN_PROGRESS if postgres enum exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deal_status') THEN
        ALTER TYPE deal_status ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
    END IF;
END $$;

-- 2. Offers Table
CREATE TABLE IF NOT EXISTS offers (
    id BIGSERIAL PRIMARY KEY,
    business_id BIGINT NOT NULL,
    buyer_id BIGINT NOT NULL,
    seller_id BIGINT NOT NULL,
    inquiry_id BIGINT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'LKR',
    message TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_offers_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_offers_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_offers_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_offers_inquiry FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE SET NULL
);

-- 3. Deals Table
CREATE TABLE IF NOT EXISTS deals (
    id BIGSERIAL PRIMARY KEY,
    business_id BIGINT NOT NULL,
    buyer_id BIGINT NOT NULL,
    seller_id BIGINT NOT NULL,
    offer_id BIGINT NOT NULL,
    agreed_price NUMERIC(15, 2) NOT NULL CHECK (agreed_price > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'LKR',
    status VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS',
    buyer_confirmed_at TIMESTAMP,
    seller_confirmed_at TIMESTAMP,
    cancellation_requested_by BIGINT,
    cancellation_reason TEXT,
    cancellation_requested_at TIMESTAMP,
    notes TEXT,
    closed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_deals_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_deals_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_deals_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_deals_offer FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_deals_cancellation_user FOREIGN KEY (cancellation_requested_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uk_deals_offer UNIQUE (offer_id)
);

-- Reconcile offers columns for legacy databases where offers table pre-existed
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
        WHERE table_name = 'offers' AND column_name = 'status' AND data_type = 'USER-DEFINED'
    ) THEN
        ALTER TABLE offers ALTER COLUMN status TYPE VARCHAR(30) USING status::text;
    END IF;
END $$;

-- Reconcile deals columns for legacy databases where deals table pre-existed
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
        WHERE table_name = 'deals' AND column_name = 'status' AND data_type = 'USER-DEFINED'
    ) THEN
        ALTER TABLE deals ALTER COLUMN status TYPE VARCHAR(30) USING status::text;
    END IF;
END $$;

-- 4. Reconcile deal_id column in reviews table
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reviews' AND column_name = 'deal_id'
    ) THEN
        ALTER TABLE reviews ADD COLUMN deal_id BIGINT REFERENCES deals(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Indexes for Offers
CREATE INDEX IF NOT EXISTS idx_offers_business_id ON offers(business_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer_id ON offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_seller_id ON offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_created_at ON offers(created_at DESC);

-- Unique index to prevent duplicate pending offers from the same buyer on the same business
CREATE UNIQUE INDEX IF NOT EXISTS uk_pending_offer_buyer_business
ON offers (buyer_id, business_id)
WHERE status = 'PENDING';

-- 6. Indexes for Deals
CREATE INDEX IF NOT EXISTS idx_deals_business_id ON deals(business_id);
CREATE INDEX IF NOT EXISTS idx_deals_buyer_id ON deals(buyer_id);
CREATE INDEX IF NOT EXISTS idx_deals_seller_id ON deals(seller_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_deal_id ON reviews(deal_id);

-- Unique index to prevent concurrent acceptances creating multiple active deals for the same business
CREATE UNIQUE INDEX IF NOT EXISTS uk_active_deal_business
ON deals (business_id)
WHERE status = 'IN_PROGRESS';
