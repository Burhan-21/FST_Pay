-- Add detailed spending limits to users table
ALTER TABLE users ADD COLUMN parental_daily_limit NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN parental_weekly_limit NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN parental_monthly_limit NUMERIC(15, 2) DEFAULT 0.00;

-- Parent Invitations
CREATE TABLE parent_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES users(id),
    parent_email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    relationship VARCHAR(20) NOT NULL, -- MOTHER, FATHER, GUARDIAN, OTHER
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    resent_count INT DEFAULT 0
);
CREATE INDEX idx_parent_invitations_token ON parent_invitations(token);
CREATE INDEX idx_parent_invitations_parent_email ON parent_invitations(parent_email);

-- Parent-Child Links
CREATE TABLE parent_child_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES users(id),
    child_id UUID NOT NULL REFERENCES users(id),
    relationship VARCHAR(20) NOT NULL, -- MOTHER, FATHER, GUARDIAN, OTHER
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    UNIQUE(parent_id, child_id)
);
CREATE INDEX idx_parent_child_links_parent ON parent_child_links(parent_id);
CREATE INDEX idx_parent_child_links_child ON parent_child_links(child_id);

-- Transaction Approvals
CREATE TABLE transaction_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES users(id),
    child_id UUID NOT NULL REFERENCES users(id),
    request_type VARCHAR(30) NOT NULL, -- SPEND, CARD_FREEZE, CARD_UNFREEZE, CARD_GENERATE, GOAL_WITHDRAW, TRANSFER
    amount NUMERIC(15, 2),
    category VARCHAR(50),
    merchant VARCHAR(255),
    description TEXT,
    target_id VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    parent_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_at TIMESTAMPTZ
);
CREATE INDEX idx_transaction_approvals_parent ON transaction_approvals(parent_id);
CREATE INDEX idx_transaction_approvals_child ON transaction_approvals(child_id);
CREATE INDEX idx_transaction_approvals_status ON transaction_approvals(status);

-- Parent Notifications
CREATE TABLE parent_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES users(id),
    child_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL, -- POCKET_MONEY, APPROVAL_REQUEST, APPROVAL_DECISION, REPORT_GENERATED, SECURITY_ALERT
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_parent_notifications_parent ON parent_notifications(parent_id);
CREATE INDEX idx_parent_notifications_is_read ON parent_notifications(is_read);
