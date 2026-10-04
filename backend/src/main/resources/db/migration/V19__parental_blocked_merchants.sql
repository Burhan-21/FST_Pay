-- Add parental blocked merchants column to users table
ALTER TABLE users ADD COLUMN parental_blocked_merchants VARCHAR(500) DEFAULT '';

