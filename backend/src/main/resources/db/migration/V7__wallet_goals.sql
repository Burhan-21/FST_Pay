CREATE TABLE wallet_goals (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name             VARCHAR(255) NOT NULL,
    description      TEXT,
    target_amount    DECIMAL(15,2) NOT NULL,
    current_amount   DECIMAL(15,2) DEFAULT 0.00,
    allocated_amount DECIMAL(15,2) DEFAULT 0.00,
    withdrawn_amount DECIMAL(15,2) DEFAULT 0.00,
    target_date      DATE NOT NULL,
    priority         VARCHAR(20) DEFAULT 'MEDIUM',
    icon             VARCHAR(10) DEFAULT '🎯',
    color            VARCHAR(50),
    status           VARCHAR(20) DEFAULT 'ACTIVE',
    completed_at     TIMESTAMPTZ,
    cancelled_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);
