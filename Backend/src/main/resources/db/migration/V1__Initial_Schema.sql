-- ====================================================================
-- V1: Initial Schema for BizExchange Platform
-- Fully idempotent with IF NOT EXISTS for fresh or existing databases
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Types (if not already created)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('BUYER', 'SELLER', 'ADMIN', 'SUPPORT_AGENT', 'VERIFICATION_OFFICER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
        CREATE TYPE account_status AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED', 'PENDING_VERIFICATION');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE verification_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_MORE_INFORMATION');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_status') THEN
        CREATE TYPE business_status AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SOLD', 'ARCHIVED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inquiry_status') THEN
        CREATE TYPE inquiry_status AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'CLOSED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_status') THEN
        CREATE TYPE offer_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deal_status') THEN
        CREATE TYPE deal_status AS ENUM ('NEGOTIATION', 'DUE_DILIGENCE', 'PAYMENT_PENDING', 'COMPLETED', 'CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'REFUNDED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
        CREATE TYPE ticket_status AS ENUM ('OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
        CREATE TYPE ticket_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
        CREATE TYPE report_status AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED', 'ACTION_TAKEN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
        CREATE TYPE notification_status AS ENUM ('UNREAD', 'READ');
    END IF;
END $$;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30),
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    token_version INT NOT NULL DEFAULT 1,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Buyer Profiles
CREATE TABLE IF NOT EXISTS buyer_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    preferred_business_category VARCHAR(100),
    preferred_location VARCHAR(150),
    budget_min DECIMAL(14,2),
    budget_max DECIMAL(14,2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_buyer_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Seller Profiles
CREATE TABLE IF NOT EXISTS seller_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    nic_or_passport VARCHAR(100),
    address TEXT,
    business_owner_type VARCHAR(100),
    verification_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    reviewed_by BIGINT,
    review_notes TEXT,
    flagged_suspicious BOOLEAN DEFAULT FALSE,
    rejection_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_seller_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_seller_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Seller Verifications
CREATE TABLE IF NOT EXISTS seller_verifications (
    id BIGSERIAL PRIMARY KEY,
    seller_id BIGINT NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    document_url TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    reviewed_by BIGINT,
    review_note TEXT,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    CONSTRAINT fk_verification_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_verification_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. Business Categories
CREATE TABLE IF NOT EXISTS business_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Businesses Table
CREATE TABLE IF NOT EXISTS businesses (
    id BIGSERIAL PRIMARY KEY,
    seller_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(200) NOT NULL,
    address TEXT,
    asking_price DECIMAL(14,2) NOT NULL,
    business_age_years INT,
    number_of_employees INT,
    reason_for_selling TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW',
    verification_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    approved_by BIGINT,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_business_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_business_category FOREIGN KEY (category_id) REFERENCES business_categories(id),
    CONSTRAINT fk_business_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. Business Files (Photos, Documents, Reports with binary data)
CREATE TABLE IF NOT EXISTS business_files (
    id BIGSERIAL PRIMARY KEY,
    business_id BIGINT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100),
    data BYTEA NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_business_file_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- 8. Business Financials & Images & Documents (Structured extensions)
CREATE TABLE IF NOT EXISTS business_financials (
    id BIGSERIAL PRIMARY KEY,
    business_id BIGINT NOT NULL,
    financial_year INT NOT NULL,
    yearly_revenue DECIMAL(14,2),
    yearly_profit DECIMAL(14,2),
    assets_value DECIMAL(14,2),
    liabilities DECIMAL(14,2),
    inventory_value DECIMAL(14,2),
    financial_note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_financial_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS business_images (
    id BIGSERIAL PRIMARY KEY,
    business_id BIGINT NOT NULL,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_image_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS business_documents (
    id BIGSERIAL PRIMARY KEY,
    business_id BIGINT NOT NULL,
    document_name VARCHAR(150) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    document_url TEXT NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT TRUE,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_document_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- 9. Inquiries Table
CREATE TABLE IF NOT EXISTS inquiries (
    id BIGSERIAL PRIMARY KEY,
    business_id BIGINT NOT NULL,
    buyer_id BIGINT NOT NULL,
    seller_id BIGINT NOT NULL,
    initial_message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inquiry_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_inquiry_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_inquiry_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    inquiry_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_message_inquiry FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE,
    CONSTRAINT fk_message_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id BIGSERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE,
    created_by BIGINT NOT NULL,
    assigned_to BIGINT,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    category VARCHAR(100),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_ticket_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ticket_assignee FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    message TEXT NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tm_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_tm_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 12. Reviews & Saved Businesses Table
CREATE TABLE IF NOT EXISTS reviews (
    id BIGSERIAL PRIMARY KEY,
    seller_id BIGINT NOT NULL,
    buyer_id BIGINT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_businesses (
    id BIGSERIAL PRIMARY KEY,
    buyer_id BIGINT NOT NULL,
    business_id BIGINT NOT NULL,
    saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_saved_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_saved_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- 13. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'UNREAD',
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 14. Verification Requests Table
CREATE TABLE IF NOT EXISTS verification_requests (
    id BIGSERIAL PRIMARY KEY,
    business_id BIGINT NOT NULL,
    officer_id BIGINT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    remarks TEXT,
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vr_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_vr_officer FOREIGN KEY (officer_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 15. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    action VARCHAR(150) NOT NULL,
    entity_type VARCHAR(100),
    entity_id BIGINT,
    description TEXT,
    ip_address VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 16. Auth Tokens Table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    CONSTRAINT fk_email_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    otp_expires_at TIMESTAMP NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    reset_token VARCHAR(255),
    reset_token_expires_at TIMESTAMP,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reset_request_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
