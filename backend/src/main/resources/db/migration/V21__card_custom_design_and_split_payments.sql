-- V21: Expand virtual card customization storage and add split payments support
ALTER TABLE virtual_cards ALTER COLUMN card_design TYPE TEXT;

CREATE TABLE IF NOT EXISTS split_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    split_count INT NOT NULL,
    user_share NUMERIC(15, 2) NOT NULL,
    per_person_amount NUMERIC(15, 2) NOT NULL,
    merchant VARCHAR(255) NOT NULL,
    note VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_split_payments_user_id ON split_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_split_payments_created_at ON split_payments(created_at);
