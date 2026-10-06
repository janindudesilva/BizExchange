CREATE TABLE IF NOT EXISTS password_change_otps (
    id BIGSERIAL PRIMARY KEY,
    
    user_id BIGINT NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMP,
    
    attempt_count VARCHAR(3) DEFAULT '0',
    
    CONSTRAINT fk_password_otp_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_otp_user_id ON password_change_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_password_otp_code ON password_change_otps(otp_code);
CREATE INDEX IF NOT EXISTS idx_password_otp_expires_at ON password_change_otps(expires_at);
