ALTER TABLE outbox_events ADD COLUMN causation_id VARCHAR(255);

CREATE TABLE processed_events (
    event_id UUID PRIMARY KEY,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL
);
