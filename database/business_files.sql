-- Unified file storage used by the backend (BusinessFile entity).
-- Run this if uploads fail because business_files does not exist yet.

CREATE TABLE IF NOT EXISTS business_files (
    id BIGSERIAL PRIMARY KEY,

    business_id BIGINT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100),
    data BYTEA NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_business_file_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_business_files_business_id
    ON business_files (business_id);
