-- V18: Webhook Retry Dead-Letter Queue (DLQ) and Resilience Engineering

CREATE TABLE IF NOT EXISTS webhook_dlq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_type VARCHAR(50) NOT NULL DEFAULT 'MERCHANT_SETTLEMENT',
    reference_id VARCHAR(100) NOT NULL,
    merchant_id VARCHAR(100),
    amount DECIMAL(15, 2),
    payload TEXT NOT NULL,
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 5,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_RETRY',
    circuit_breaker_tripped BOOLEAN NOT NULL DEFAULT FALSE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    last_attempted_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_dlq_status_next_retry ON webhook_dlq(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_webhook_dlq_reference ON webhook_dlq(reference_id);
