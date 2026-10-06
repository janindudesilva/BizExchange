-- V4: Security, Performance Indexes and Unique Constraints
-- Safe deduplication and idempotent constraints

-- 1. Deduplicate reviews if any exist before adding unique constraint on (buyer_id, seller_id)
DELETE FROM reviews r1
USING reviews r2
WHERE r1.buyer_id = r2.buyer_id
  AND r1.seller_id = r2.seller_id
  AND r1.id < r2.id;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_review_buyer_seller'
    ) THEN
        ALTER TABLE reviews
        ADD CONSTRAINT uk_review_buyer_seller UNIQUE (buyer_id, seller_id);
    END IF;
END $$;

-- 2. Deduplicate saved_businesses if any exist before adding unique constraint on (buyer_id, business_id)
DELETE FROM saved_businesses s1
USING saved_businesses s2
WHERE s1.buyer_id = s2.buyer_id
  AND s1.business_id = s2.business_id
  AND s1.id < s2.id;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_saved_business_buyer_business'
    ) THEN
        ALTER TABLE saved_businesses
        ADD CONSTRAINT uk_saved_business_buyer_business UNIQUE (buyer_id, business_id);
    END IF;
END $$;

-- 3. Indexes for Businesses
CREATE INDEX IF NOT EXISTS idx_business_seller_id ON businesses(seller_id);
CREATE INDEX IF NOT EXISTS idx_business_category_id ON businesses(category_id);
CREATE INDEX IF NOT EXISTS idx_business_status_verification ON businesses(status, verification_status);
CREATE INDEX IF NOT EXISTS idx_business_created_at ON businesses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_price ON businesses(asking_price);
CREATE INDEX IF NOT EXISTS idx_business_location ON businesses(location);

-- 4. Indexes for Business Files
CREATE INDEX IF NOT EXISTS idx_business_files_business_id ON business_files(business_id);
CREATE INDEX IF NOT EXISTS idx_business_files_type ON business_files(file_type);

-- 5. Indexes for Inquiries
CREATE INDEX IF NOT EXISTS idx_inquiry_business_id ON inquiries(business_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_buyer_id ON inquiries(buyer_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_seller_id ON inquiries(seller_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiry_created_at ON inquiries(created_at DESC);

-- 6. Indexes for Messages
CREATE INDEX IF NOT EXISTS idx_messages_inquiry_id ON messages(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at ASC);

-- 7. Indexes for Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_seller_id ON reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_reviews_buyer_id ON reviews(buyer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- 8. Indexes for Saved Businesses
CREATE INDEX IF NOT EXISTS idx_saved_businesses_buyer_id ON saved_businesses(buyer_id);
CREATE INDEX IF NOT EXISTS idx_saved_businesses_business_id ON saved_businesses(business_id);
CREATE INDEX IF NOT EXISTS idx_saved_businesses_saved_at ON saved_businesses(saved_at DESC);

-- 9. Indexes for Support Tickets & Messages
CREATE INDEX IF NOT EXISTS idx_ticket_created_by ON support_tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_ticket_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ticket_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);

-- 10. Indexes for Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 11. Indexes for Verification Requests
CREATE INDEX IF NOT EXISTS idx_verification_requests_business ON verification_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_officer ON verification_requests(officer_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
