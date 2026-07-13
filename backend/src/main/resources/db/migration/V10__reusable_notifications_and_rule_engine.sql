-- Drop parent_notifications if it exists from V9
DROP TABLE IF EXISTS parent_notifications;

-- Create generic notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id),
    sender_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL, -- POCKET_MONEY, APPROVAL_REQUEST, APPROVAL_DECISION, REPORT_GENERATED, SECURITY_ALERT, REWARD, SYSTEM
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Create notification preferences table
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    notification_type VARCHAR(50) NOT NULL,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(user_id, notification_type)
);
CREATE INDEX idx_notification_prefs_user ON notification_preferences(user_id);

-- Create expanded wallet daily summaries table
CREATE TABLE wallet_daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    summary_date DATE NOT NULL,
    total_spent NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_received NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_sent NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    transaction_count INT NOT NULL DEFAULT 0,
    income NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    expense NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(wallet_id, summary_date)
);
CREATE INDEX idx_wallet_daily_summaries_wallet_date ON wallet_daily_summaries(wallet_id, summary_date);

-- Create system audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- PARENT_LINKED, INVITATION_ACCEPTED, POCKET_MONEY_SENT, LIMIT_CHANGED, etc.
    description TEXT NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
