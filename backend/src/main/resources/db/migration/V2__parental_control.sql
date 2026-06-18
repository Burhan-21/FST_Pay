ALTER TABLE users ADD COLUMN parental_control_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN parental_max_txn_amount NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN parental_restricted_categories VARCHAR(255) DEFAULT '';
ALTER TABLE users ADD COLUMN parental_pin VARCHAR(255) DEFAULT '';
