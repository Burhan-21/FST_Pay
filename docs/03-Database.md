# FST Pay — Database Schema

**Database:** PostgreSQL 16  
**Migrations:** Flyway (6 migration files)  
**Naming:** snake_case, plural table names

## Entity Relationship Overview

```
users (1) ── (1) wallets
users (1) ── (N) virtual_cards
users (1) ── (N) refresh_tokens
users (1) ── (N) reward_points
users (1) ── (N) reward_history
users (1) ── (N) ai_sessions
users (1) ── (N) password_reset_tokens
users (1) ── (N) audit_logs
wallets (1) ── (N) transactions
virtual_cards (1) ── (N) transactions
virtual_cards (1) ── (N) virtual_card_merchant_locks
```

## Tables

### users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique user identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| password_hash | VARCHAR(255) | NOT NULL | BCrypt hashed password |
| full_name | VARCHAR(100) | NOT NULL | Display name |
| phone | VARCHAR(15) | | Contact number |
| date_of_birth | DATE | | For age verification (min 12) |
| avatar_url | TEXT | | Profile picture URL |
| role | VARCHAR(20) | DEFAULT 'USER' | USER or ADMIN |
| is_active | BOOLEAN | DEFAULT true | Account active flag |
| login_attempts | INTEGER | DEFAULT 0 | Failed login counter |
| locked_until | TIMESTAMP | NULL | Account lock expiry |
| parental_control_enabled | BOOLEAN | DEFAULT FALSE | V2 |
| parental_max_txn_amount | NUMERIC(15,2) | DEFAULT 0.00 | V2 |
| parental_restricted_categories | VARCHAR(255) | DEFAULT '' | V2 |
| parental_pin | VARCHAR(255) | DEFAULT '' | V2 |
| parent_name | VARCHAR(255) | | V3 |
| parent_email | VARCHAR(255) | | V3 |
| parent_phone | VARCHAR(255) | | V3 |
| parent_dob | DATE | | V3 |
| parent_gender | VARCHAR(50) | | V3 |
| parent_age | INTEGER | | V3 |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** idx_users_locked_until(locked_until)

### wallets

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | UNIQUE, NOT NULL, FK → users(id) | One wallet per user |
| balance | DECIMAL(15,2) | DEFAULT 0.00 | Current balance |
| currency | VARCHAR(3) | DEFAULT 'INR' | ISO 4217 currency code |
| is_active | BOOLEAN | DEFAULT true | |
| version | INTEGER | DEFAULT 0 | Optimistic locking (V6) |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### virtual_cards

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL, FK → users(id) | Card owner |
| card_number | VARCHAR(64) | NOT NULL | Encrypted/tokenized PAN |
| card_holder | VARCHAR(100) | NOT NULL | Name on card |
| expiry_month | INT | NOT NULL | MM |
| expiry_year | INT | NOT NULL | YYYY |
| cvv_hash | VARCHAR(255) | NOT NULL | SHA-256 of CVV |
| card_type | VARCHAR(20) | DEFAULT 'PREPAID' | Card scheme |
| status | VARCHAR(20) | DEFAULT 'ACTIVE' | ACTIVE, FROZEN, EXPIRED |
| spending_limit | DECIMAL(15,2) | NULL | Per-card cap |
| daily_limit | DECIMAL(15,2) | NULL | Daily cap |
| is_one_time | BOOLEAN | DEFAULT false | Single-use card |
| card_design | VARCHAR(500) | NULL | Design theme (V4) |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** idx_virtual_cards_user_id(user_id)

### virtual_card_merchant_locks

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| card_id | UUID | PK, FK → virtual_cards(id) ON DELETE CASCADE | |
| merchant_mcc | VARCHAR(50) | PK | Merchant category code |

### transactions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| wallet_id | UUID | NOT NULL, FK → wallets(id) | Source wallet |
| card_id | UUID | FK → virtual_cards(id) | Card used (nullable) |
| type | VARCHAR(20) | NOT NULL | CREDIT or DEBIT |
| category | VARCHAR(50) | | FOOD, TRANSPORT, etc. |
| amount | DECIMAL(15,2) | NOT NULL | Transaction amount |
| balance_after | DECIMAL(15,2) | NOT NULL | Wallet balance after |
| description | TEXT | | User description |
| merchant | VARCHAR(255) | | Merchant name |
| reference_id | VARCHAR(100) | UNIQUE | External ref ID |
| status | VARCHAR(20) | DEFAULT 'COMPLETED' | PENDING, COMPLETED, FAILED |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** idx_transactions_wallet_id(wallet_id), idx_transactions_created_at(created_at DESC), idx_transactions_category(category)

### refresh_tokens

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL, FK → users(id) | Token owner |
| token | VARCHAR(512) | UNIQUE, NOT NULL | JWT refresh token |
| expires_at | TIMESTAMPTZ | NOT NULL | Expiry timestamp |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### reward_points

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL, FK → users(id) | |
| points | INT | DEFAULT 0 | Total reward points |
| streak_days | INT | DEFAULT 0 | Consecutive day streak |
| last_streak_at | TIMESTAMPTZ | | Last streak update |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### reward_history

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL, FK → users(id) | |
| points_change | INT | NOT NULL | +/- points delta |
| reason | VARCHAR(100) | NOT NULL | Earning/spending reason |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** idx_reward_history_user_id(user_id)

### ai_sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL, FK → users(id) | |
| prompt | TEXT | NOT NULL | User input to AI |
| response | TEXT | NOT NULL | AI response |
| tokens_used | INT | | Token count |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### password_reset_tokens

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | |
| token_hash | VARCHAR(64) | NOT NULL | SHA-256 hashed token |
| expires_at | TIMESTAMPTZ | NOT NULL | |
| used | BOOLEAN | DEFAULT false | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** idx_password_reset_tokens_user(user_id), idx_password_reset_tokens_hash(token_hash), idx_password_reset_tokens_expires(expires_at)

### audit_logs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| email | VARCHAR(255) | | User email |
| event_type | VARCHAR(50) | NOT NULL | LOGIN_SUCCESS, LOGIN_FAILED, etc. |
| details | TEXT | | Human-readable details |
| ip_address | VARCHAR(45) | | Client IP |
| user_agent | VARCHAR(500) | | Browser/device UA |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** idx_audit_logs_email(email), idx_audit_logs_event_type(event_type), idx_audit_logs_created_at(created_at)

## Key Design Decisions

- **UUID primary keys** — safe for distributed systems, no sequential ID guessing
- **TIMESTAMPTZ** — all timestamps store timezone for global users
- **DECIMAL(15,2)** — exact precision for all monetary values, no float errors
- **Optimistic locking** — `wallets.version` prevents concurrent balance updates
- **Card number encryption** — PAN stored encrypted, not plaintext
- **Token hashing** — password reset tokens stored as SHA-256 hash only
- **Audit logging** — all auth events logged for security analysis
- **Flyway migrations** — versioned, repeatable, no manual DB changes
