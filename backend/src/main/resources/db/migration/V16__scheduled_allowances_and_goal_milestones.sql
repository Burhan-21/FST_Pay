-- V16: Scheduled Allowances, Auto-Sweeps, and Savings Goal Milestones

ALTER TABLE wallet_goals
    ADD COLUMN IF NOT EXISTS last_milestone_awarded INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS scheduled_allowances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    day_of_week VARCHAR(20),
    day_of_month INT,
    target_goal_id UUID REFERENCES wallet_goals(id) ON DELETE SET NULL,
    note VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    next_run_date DATE NOT NULL,
    last_run_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_allowance_active_next_run ON scheduled_allowances(active, next_run_date);
CREATE INDEX IF NOT EXISTS idx_allowance_parent ON scheduled_allowances(parent_id);
CREATE INDEX IF NOT EXISTS idx_allowance_child ON scheduled_allowances(child_id);

-- Seed new badges for milestone achievements and allowance auto-sweeps
INSERT INTO badges (id, name, display_name, description, icon, requirement_type, requirement_value, created_at) VALUES
('a0000000-0000-0000-0000-000000000006', 'MILESTONE_CRUSHER', 'Milestone Crusher', 'Reach savings goal milestones (25%, 50%, 75%)', '🚀', 'MILESTONES_REACHED', 3, CURRENT_TIMESTAMP),
('a0000000-0000-0000-0000-000000000007', 'ALLOWANCE_CHAMPION', 'Allowance Champion', 'Complete 3 scheduled allowance auto-sweeps into goals', '💎', 'ALLOWANCE_SWEEPS', 3, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;
