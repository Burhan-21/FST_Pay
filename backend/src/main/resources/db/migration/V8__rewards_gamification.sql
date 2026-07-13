-- V8: Gamification XP, Badges, and Redemptions

-- 1. Alter reward_points table
ALTER TABLE reward_points ADD COLUMN xp INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE reward_points ADD COLUMN level INTEGER DEFAULT 1 NOT NULL;

-- 2. Create badges table
CREATE TABLE badges (
    id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    icon VARCHAR(50),
    requirement_type VARCHAR(50) NOT NULL,
    requirement_value INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL
);

-- 3. Create user_badges junction table
CREATE TABLE user_badges (
    user_id UUID NOT NULL,
    badge_id UUID NOT NULL,
    unlocked_at TIMESTAMP NOT NULL,
    PRIMARY KEY (user_id, badge_id),
    CONSTRAINT fk_user_badges_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_badges_badge FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
);

-- 4. Create reward_items table (Catalog)
CREATE TABLE reward_items (
    id UUID PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    cost_points INTEGER NOT NULL,
    stock INTEGER NOT NULL,
    code VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL
);

-- 5. Create reward_redemptions table
CREATE TABLE reward_redemptions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    item_id UUID NOT NULL,
    code_claimed VARCHAR(100) NOT NULL,
    redeemed_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_redemptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_redemptions_item FOREIGN KEY (item_id) REFERENCES reward_items(id) ON DELETE CASCADE
);

-- Seed Badges
INSERT INTO badges (id, name, display_name, description, icon, requirement_type, requirement_value, created_at) VALUES
('a0000000-0000-0000-0000-000000000001', 'SAVER_NOVICE', 'Saver Novice', 'Reach at least 1 completed savings goal', '🎯', 'GOALS_COMPLETED', 1, CURRENT_TIMESTAMP),
('a0000000-0000-0000-0000-000000000002', 'SAVER_EXPERT', 'Saver Expert', 'Reach at least 3 completed savings goals', '🏆', 'GOALS_COMPLETED', 3, CURRENT_TIMESTAMP),
('a0000000-0000-0000-0000-000000000003', 'STREAK_STARTER', 'Streak Starter', 'Maintain a 3-day daily streak check-in', '🔥', 'STREAK_DAYS', 3, CURRENT_TIMESTAMP),
('a0000000-0000-0000-0000-000000000004', 'STREAKER_PRO', 'Streaker Pro', 'Maintain a 7-day daily streak check-in', '⚡', 'STREAK_DAYS', 7, CURRENT_TIMESTAMP),
('a0000000-0000-0000-0000-000000000005', 'BUDGET_MASTER', 'Budget Master', 'Attain a Financial Health Score of 80+', '👑', 'HEALTH_SCORE', 80, CURRENT_TIMESTAMP);

-- Seed Reward Items
INSERT INTO reward_items (id, title, description, cost_points, stock, code, created_at) VALUES
('b0000000-0000-0000-0000-000000000001', '₹50 Amazon Gift Card', 'Get ₹50 Amazon Pay voucher credited instantly', 500, 20, 'AMZN-PAY-50-FST-XYZ123', CURRENT_TIMESTAMP),
('b0000000-0000-0000-0000-000000000002', '₹100 Google Play Code', 'Get ₹100 Google Play recharge voucher code', 1000, 10, 'GPLAY-100-VAL-ABC987', CURRENT_TIMESTAMP),
('b0000000-0000-0000-0000-000000000003', 'Holographic Card Skin', 'Unlock premium Holographic visual style for your virtual prepaid card', 250, 9999, 'SKIN-HOLO-UNLOCK-777', CURRENT_TIMESTAMP),
('b0000000-0000-0000-0000-000000000004', 'Retro Clay Card Skin', 'Unlock cool Glassmorphism Clay style for your virtual prepaid card', 150, 9999, 'SKIN-CLAY-UNLOCK-888', CURRENT_TIMESTAMP);
