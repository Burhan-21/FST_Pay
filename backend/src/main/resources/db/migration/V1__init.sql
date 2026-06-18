-- USERS
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    phone           VARCHAR(15),
    date_of_birth   DATE,
    avatar_url      TEXT,
    role            VARCHAR(20) DEFAULT 'USER',  -- USER, ADMIN
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- WALLETS (1:1 with user)
CREATE TABLE wallets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID UNIQUE NOT NULL REFERENCES users(id),
    balance         DECIMAL(15,2) DEFAULT 0.00,
    currency        VARCHAR(3) DEFAULT 'INR',
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- VIRTUAL CARDS
CREATE TABLE virtual_cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    card_number     VARCHAR(64) NOT NULL,       -- encrypted/tokenized
    card_holder     VARCHAR(100) NOT NULL,
    expiry_month    INT NOT NULL,
    expiry_year     INT NOT NULL,
    cvv_hash        VARCHAR(255) NOT NULL,
    card_type       VARCHAR(20) DEFAULT 'PREPAID',
    status          VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, FROZEN, EXPIRED
    spending_limit  DECIMAL(15,2),
    daily_limit     DECIMAL(15,2),
    is_one_time     BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- VIRTUAL CARD MERCHANT LOCKS
CREATE TABLE virtual_card_merchant_locks (
    card_id         UUID NOT NULL REFERENCES virtual_cards(id) ON DELETE CASCADE,
    merchant_mcc    VARCHAR(50) NOT NULL,
    PRIMARY KEY (card_id, merchant_mcc)
);

-- TRANSACTIONS
CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id       UUID NOT NULL REFERENCES wallets(id),
    card_id         UUID REFERENCES virtual_cards(id),
    type            VARCHAR(20) NOT NULL,       -- CREDIT, DEBIT
    category        VARCHAR(50),                -- FOOD, TRANSPORT, SHOPPING, etc.
    amount          DECIMAL(15,2) NOT NULL,
    balance_after   DECIMAL(15,2) NOT NULL,
    description     TEXT,
    merchant        VARCHAR(255),
    reference_id    VARCHAR(100) UNIQUE,
    status          VARCHAR(20) DEFAULT 'COMPLETED',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- REWARD POINTS
CREATE TABLE reward_points (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    points          INT DEFAULT 0,
    streak_days     INT DEFAULT 0,
    last_streak_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- REWARD HISTORY
CREATE TABLE reward_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    points_change   INT NOT NULL,
    reason          VARCHAR(100) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- REFRESH TOKENS
CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    token           VARCHAR(512) UNIQUE NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- AI COACH SESSIONS
CREATE TABLE ai_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    prompt          TEXT NOT NULL,
    response        TEXT NOT NULL,
    tokens_used     INT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_virtual_cards_user_id ON virtual_cards(user_id);
CREATE INDEX idx_reward_history_user_id ON reward_history(user_id);
