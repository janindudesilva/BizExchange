CREATE TYPE user_role AS ENUM (
    'BUYER',
    'SELLER',
    'ADMIN',
    'SUPPORT_AGENT',
    'VERIFICATION_OFFICER'
);

CREATE TYPE account_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'DELETED'
);

CREATE TYPE verification_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);

CREATE TYPE business_status AS ENUM (
    'DRAFT',
    'PENDING_REVIEW',
    'APPROVED',
    'REJECTED',
    'SOLD',
    'ARCHIVED'
);

CREATE TYPE inquiry_status AS ENUM (
    'PENDING_APPROVAL',
    'ACTIVE',
    'REJECTED',
    'CLOSED'
);

CREATE TYPE offer_status AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'WITHDRAWN'
);

CREATE TYPE deal_status AS ENUM (
    'NEGOTIATION',
    'DUE_DILIGENCE',
    'PAYMENT_PENDING',
    'COMPLETED',
    'CANCELLED'
);

CREATE TYPE payment_status AS ENUM (
    'PENDING',
    'VERIFIED',
    'FAILED',
    'REFUNDED'
);

CREATE TYPE ticket_status AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED'
);

CREATE TYPE report_status AS ENUM (
    'PENDING',
    'REVIEWED',
    'DISMISSED',
    'ACTION_TAKEN'
);

CREATE TYPE notification_status AS ENUM (
    'UNREAD',
    'READ'
);