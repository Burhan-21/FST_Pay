-- V15: WebAuthn FIDO2 Biometric Credentials and Approval Audit Fields

CREATE TABLE IF NOT EXISTS user_webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id VARCHAR(255) NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    algorithm VARCHAR(50) NOT NULL DEFAULT 'ES256',
    device_name VARCHAR(100),
    sign_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_webauthn_user_id ON user_webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_cred_id ON user_webauthn_credentials(credential_id);

ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE transaction_approvals 
    ADD COLUMN IF NOT EXISTS biometric_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS biometric_auth_method VARCHAR(50),
    ADD COLUMN IF NOT EXISTS biometric_credential_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS biometric_verified_at TIMESTAMP WITH TIME ZONE;
