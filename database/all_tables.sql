CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,

    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30),

    password_hash TEXT NOT NULL,

    role user_role NOT NULL,
    status account_status NOT NULL DEFAULT 'ACTIVE',

    email_verified BOOLEAN NOT NULL DEFAULT FALSE,

    last_login_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE buyer_profiles (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL UNIQUE,

    preferred_business_category VARCHAR(100),
    preferred_location VARCHAR(150),
    budget_min DECIMAL(14,2),
    budget_max DECIMAL(14,2),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_buyer_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE seller_profiles (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL UNIQUE,

    nic_or_passport VARCHAR(100),
    address TEXT,
    business_owner_type VARCHAR(100),

    verification_status verification_status NOT NULL DEFAULT 'PENDING',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_seller_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE seller_verifications (
    id BIGSERIAL PRIMARY KEY,

    seller_id BIGINT NOT NULL,

    document_type VARCHAR(100) NOT NULL,
    document_url TEXT NOT NULL,

    status verification_status NOT NULL DEFAULT 'PENDING',

    reviewed_by BIGINT,
    review_note TEXT,

    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,

    CONSTRAINT fk_verification_seller
        FOREIGN KEY (seller_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_verification_reviewer
        FOREIGN KEY (reviewed_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE business_categories (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE businesses (
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

    status business_status NOT NULL DEFAULT 'DRAFT',

    approved_by BIGINT,
    approved_at TIMESTAMP,
    rejection_reason TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_business_seller
        FOREIGN KEY (seller_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_business_category
        FOREIGN KEY (category_id)
        REFERENCES business_categories(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_business_approved_by
        FOREIGN KEY (approved_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE business_financials (
    id BIGSERIAL PRIMARY KEY,

    business_id BIGINT NOT NULL UNIQUE,

    monthly_revenue DECIMAL(14,2),
    monthly_profit DECIMAL(14,2),

    yearly_revenue DECIMAL(14,2),
    yearly_profit DECIMAL(14,2),

    assets_value DECIMAL(14,2),
    liabilities DECIMAL(14,2),
    inventory_value DECIMAL(14,2),

    financial_note TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_financial_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id)
        ON DELETE CASCADE
);

CREATE TABLE business_images (
    id BIGSERIAL PRIMARY KEY,

    business_id BIGINT NOT NULL,

    image_url TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_image_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id)
        ON DELETE CASCADE
);

CREATE TABLE business_documents (
    id BIGSERIAL PRIMARY KEY,

    business_id BIGINT NOT NULL,

    document_name VARCHAR(150) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    document_url TEXT NOT NULL,

    is_private BOOLEAN NOT NULL DEFAULT TRUE,

    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_document_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id)
        ON DELETE CASCADE
);

CREATE TABLE inquiries (
    id BIGSERIAL PRIMARY KEY,

    business_id BIGINT NOT NULL,
    buyer_id BIGINT NOT NULL,
    seller_id BIGINT NOT NULL,

    initial_message TEXT NOT NULL,

    status inquiry_status NOT NULL DEFAULT 'OPEN',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_inquiry_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_inquiry_buyer
        FOREIGN KEY (buyer_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_inquiry_seller
        FOREIGN KEY (seller_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,

    inquiry_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,

    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_message_inquiry
        FOREIGN KEY (inquiry_id)
        REFERENCES inquiries(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_message_sender
        FOREIGN KEY (sender_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE offers (
    id BIGSERIAL PRIMARY KEY,

    business_id BIGINT NOT NULL,
    buyer_id BIGINT NOT NULL,
    seller_id BIGINT NOT NULL,

    offer_amount DECIMAL(14,2) NOT NULL,
    message TEXT,

    status offer_status NOT NULL DEFAULT 'PENDING',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_offer_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_offer_buyer
        FOREIGN KEY (buyer_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_offer_seller
        FOREIGN KEY (seller_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE deals (
    id BIGSERIAL PRIMARY KEY,

    business_id BIGINT NOT NULL UNIQUE,
    buyer_id BIGINT NOT NULL,
    seller_id BIGINT NOT NULL,
    offer_id BIGINT,

    final_price DECIMAL(14,2) NOT NULL,

    status deal_status NOT NULL DEFAULT 'NEGOTIATION',

    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    CONSTRAINT fk_deal_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_deal_buyer
        FOREIGN KEY (buyer_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_deal_seller
        FOREIGN KEY (seller_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_deal_offer
        FOREIGN KEY (offer_id)
        REFERENCES offers(id)
        ON DELETE SET NULL
);

CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,

    deal_id BIGINT NOT NULL UNIQUE,

    payer_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,

    amount DECIMAL(14,2) NOT NULL,
    platform_commission DECIMAL(14,2) DEFAULT 0,

    payment_method VARCHAR(100),
    transaction_reference VARCHAR(150),

    status payment_status NOT NULL DEFAULT 'PENDING',

    verified_by BIGINT,
    verified_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_deal
        FOREIGN KEY (deal_id)
        REFERENCES deals(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_payment_payer
        FOREIGN KEY (payer_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_payment_receiver
        FOREIGN KEY (receiver_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_payment_verified_by
        FOREIGN KEY (verified_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE saved_businesses (
    id BIGSERIAL PRIMARY KEY,

    buyer_id BIGINT NOT NULL,
    business_id BIGINT NOT NULL,

    saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_saved_buyer
        FOREIGN KEY (buyer_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_saved_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_saved_business UNIQUE (buyer_id, business_id)
);

CREATE TABLE reports (
    id BIGSERIAL PRIMARY KEY,

    reporter_id BIGINT NOT NULL,
    reported_user_id BIGINT,
    business_id BIGINT,

    reason VARCHAR(200) NOT NULL,
    description TEXT,

    status report_status NOT NULL DEFAULT 'PENDING',

    reviewed_by BIGINT,
    reviewed_at TIMESTAMP,
    review_note TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reporter
        FOREIGN KEY (reporter_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_reported_user
        FOREIGN KEY (reported_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_report_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_report_reviewed_by
        FOREIGN KEY (reviewed_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE support_tickets (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,
    assigned_agent_id BIGINT,

    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,

    status ticket_status NOT NULL DEFAULT 'OPEN',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ticket_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ticket_agent
        FOREIGN KEY (assigned_agent_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,

    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,

    status notification_status NOT NULL DEFAULT 'UNREAD',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,

    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT,

    action VARCHAR(150) NOT NULL,
    entity_type VARCHAR(100),
    entity_id BIGINT,

    description TEXT,
    ip_address VARCHAR(100),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

