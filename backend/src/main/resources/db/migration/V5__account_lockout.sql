-- Add account lockout columns for security
ALTER TABLE users ADD COLUMN login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMP NULL;

-- Create index for efficient lockout checks
CREATE INDEX idx_users_locked_until ON users(locked_until);
